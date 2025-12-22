import { LambdaCompiler } from "./utils/lambda-compiler";
import { logger } from "./utils/logger";
import path from "path";
import { DeploymentOptions } from "./types";
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DescribeStacksCommand,
  DescribeStackEventsCommand,
  waitUntilStackCreateComplete,
  waitUntilStackUpdateComplete,
} from "@aws-sdk/client-cloudformation";
import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
} from "@aws-sdk/client-cloudfront";
import { readFileSync } from "fs";
import { getAwsCredentials } from "./utils/aws-credentials";
import { S3BucketManager } from "./utils/s3-bucket-manager";

const APP_NAME = "appbuilderstudio";

// ============================================================================
// DNS STACK DEPLOYMENT (us-east-1 for CloudFront certificates)
// ============================================================================

async function deployDNSStack(
  domainName: string,
  hostedZoneId: string,
  stage: string,
  credentials: any,
  cloudFrontDomainName?: string
): Promise<string> {
  const stackName = `${APP_NAME}-dns-${stage}`;
  const templateBucketName = `${APP_NAME}-dns-templates-${stage}`;

  logger.info(`Deploying DNS stack to us-east-1 for domain: ${domainName}`);

  // Create clients for us-east-1 (required for CloudFront certificates)
  const s3UsEast1 = new S3Client({ region: "us-east-1", credentials });
  const cfnUsEast1 = new CloudFormationClient({
    region: "us-east-1",
    credentials,
  });

  // Create S3 bucket for DNS template in us-east-1 (if it doesn't exist)
  try {
    await s3UsEast1.send(new HeadBucketCommand({ Bucket: templateBucketName }));
    logger.debug(`Using existing DNS template bucket: ${templateBucketName}`);
  } catch {
    logger.info(
      `Creating DNS template bucket in us-east-1: ${templateBucketName}`
    );
    await s3UsEast1.send(
      new CreateBucketCommand({
        Bucket: templateBucketName,
      })
    );
  }

  // Upload DNS template to S3
  const dnsTemplatePath = path.join(__dirname, "resources/DNS/dns.yaml");
  const dnsTemplateContent = readFileSync(dnsTemplatePath, "utf8");

  await s3UsEast1.send(
    new PutObjectCommand({
      Bucket: templateBucketName,
      Key: "dns.yaml",
      Body: dnsTemplateContent,
      ContentType: "application/x-yaml",
    })
  );
  logger.debug("DNS template uploaded to us-east-1");

  // Parameters for DNS stack
  const parameters = [
    { ParameterKey: "Stage", ParameterValue: stage },
    { ParameterKey: "DomainName", ParameterValue: domainName },
    { ParameterKey: "HostedZoneId", ParameterValue: hostedZoneId },
    {
      ParameterKey: "CloudFrontDomainName",
      ParameterValue: cloudFrontDomainName || "",
    },
  ];

  // Check if stack exists
  let stackExists = false;
  try {
    await cfnUsEast1.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    stackExists = true;
  } catch (e: any) {
    if (!e.message.includes("does not exist")) {
      throw e;
    }
  }

  if (stackExists) {
    try {
      logger.info(`Updating DNS stack: ${stackName}`);
      await cfnUsEast1.send(
        new UpdateStackCommand({
          StackName: stackName,
          TemplateURL: `https://${templateBucketName}.s3.amazonaws.com/dns.yaml`,
          Parameters: parameters,
          Capabilities: ["CAPABILITY_NAMED_IAM"],
        })
      );
      logger.info("Waiting for DNS stack update...");
      await waitForDNSStackComplete(cfnUsEast1, stackName, "UPDATE");
    } catch (e: any) {
      if (e.message.includes("No updates are to be performed")) {
        logger.info("DNS stack is already up to date");
      } else {
        throw e;
      }
    }
  } else {
    logger.info(`Creating DNS stack: ${stackName}`);
    await cfnUsEast1.send(
      new CreateStackCommand({
        StackName: stackName,
        TemplateURL: `https://${templateBucketName}.s3.amazonaws.com/dns.yaml`,
        Parameters: parameters,
        Capabilities: ["CAPABILITY_NAMED_IAM"],
      })
    );
    // Wait for creation (certificate validation can take a few minutes)
    logger.info("Waiting for DNS stack creation and certificate validation...");
    await waitForDNSStackComplete(cfnUsEast1, stackName, "CREATE");
  }

  // Get certificate ARN from outputs
  const describeResult = await cfnUsEast1.send(
    new DescribeStacksCommand({ StackName: stackName })
  );
  const outputs = describeResult.Stacks?.[0]?.Outputs || [];
  const certArn =
    outputs.find((o) => o.OutputKey === "CertificateArn")?.OutputValue || "";

  if (certArn) {
    logger.success(
      `DNS stack deployed with certificate: ${certArn.substring(0, 60)}...`
    );
  } else {
    logger.info(
      "DNS stack deployed (certificate may not be created for non-prod stage)"
    );
  }

  return certArn;
}

async function waitForDNSStackComplete(
  cfn: CloudFormationClient,
  stackName: string,
  operation: "CREATE" | "UPDATE"
): Promise<void> {
  const maxAttempts = 60; // 10 minutes max (certificate validation can take time)
  const delayMs = 10000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await cfn.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    const status = result.Stacks?.[0]?.StackStatus;

    if (status === `${operation}_COMPLETE`) {
      return;
    }

    if (status?.includes("FAILED") || status?.includes("ROLLBACK")) {
      const events = await cfn.send(
        new DescribeStackEventsCommand({ StackName: stackName })
      );
      const failedEvent = events.StackEvents?.find((e) =>
        e.ResourceStatus?.includes("FAILED")
      );
      throw new Error(
        `DNS stack ${operation.toLowerCase()} failed: ${failedEvent?.ResourceStatusReason || status}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(
    `Timeout waiting for DNS stack ${operation.toLowerCase()}`
  );
}

// ============================================================================
// CLOUDFRONT UPDATE WITH CUSTOM DOMAIN
// ============================================================================

async function updateCloudFrontWithDomain(
  distributionId: string,
  certificateArn: string,
  domainName: string,
  region: string,
  credentials: any
): Promise<void> {
  const cfClient = new CloudFrontClient({ region, credentials });

  logger.info(
    `Updating CloudFront distribution ${distributionId} with custom domain...`
  );

  // Get current distribution config
  const getConfigResult = await cfClient.send(
    new GetDistributionConfigCommand({ Id: distributionId })
  );

  const config = getConfigResult.DistributionConfig;
  const etag = getConfigResult.ETag;

  if (!config || !etag) {
    throw new Error("Failed to get CloudFront distribution config");
  }

  // Update configuration with custom domain and certificate
  config.Aliases = {
    Quantity: 2,
    Items: [domainName, `www.${domainName}`],
  };

  config.ViewerCertificate = {
    ACMCertificateArn: certificateArn,
    SSLSupportMethod: "sni-only",
    MinimumProtocolVersion: "TLSv1.2_2021",
    Certificate: certificateArn,
    CertificateSource: "acm",
  };

  // Update the distribution
  await cfClient.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    })
  );

  logger.success(`CloudFront distribution updated with custom domain: ${domainName}`);
}

// ============================================================================
// MAIN DEPLOYMENT FUNCTION
// ============================================================================

export async function deployAppBuilderStudio(
  options: DeploymentOptions
): Promise<void> {
  const {
    stage,
    region = "ap-southeast-2",
    domainName = "",
    hostedZoneId = "",
  } = options;

  logger.info("Starting App Builder Studio deployment...");

  // Validate domain configuration
  const hasCustomDomain = domainName && hostedZoneId;
  if (domainName && !hostedZoneId) {
    logger.error("--hosted-zone-id is required when --domain-name is specified");
    throw new Error("Missing hosted zone ID");
  }
  if (hostedZoneId && !domainName) {
    logger.error("--domain-name is required when --hosted-zone-id is specified");
    throw new Error("Missing domain name");
  }

  // Validate AWS credentials
  const credentials = await getAwsCredentials();

  // Get template bucket name
  const templateBucketName = `nlmonorepo-appbuilderstudio-templates-${stage}`;
  const stackName = `nlmonorepo-appbuilderstudio-${stage}`;

  const s3 = new S3Client({ region, credentials });
  const cloudformation = new CloudFormationClient({ region, credentials });

  // Store certificate ARN for later use
  let certificateArn = "";

  // ============================================================================
  // Phase 1: Deploy DNS stack first (if custom domain configured)
  // ============================================================================
  if (hasCustomDomain && stage === "prod") {
    logger.info("\n--- Phase 1: DNS & Certificate Setup ---");
    certificateArn = await deployDNSStack(
      domainName,
      hostedZoneId,
      stage,
      credentials,
      undefined // CloudFront domain not available yet
    );

    if (!certificateArn) {
      logger.warning(
        "Certificate not created - domain configuration will be skipped"
      );
    }
  } else if (hasCustomDomain && stage !== "prod") {
    logger.warning("Custom domain configuration is only supported for prod stage");
    logger.warning("Skipping DNS setup for dev stage");
  }

  // ============================================================================
  // Phase 2: Main Infrastructure Deployment
  // ============================================================================
  logger.info("\n--- Phase 2: Main Infrastructure Deployment ---");

  // 0. Ensure template bucket exists before uploading Lambda functions
  logger.info("Ensuring S3 template bucket exists...");
  const s3BucketManager = new S3BucketManager(region);
  const bucketExists =
    await s3BucketManager.ensureBucketExists(templateBucketName);
  if (!bucketExists) {
    throw new Error(`Failed to create template bucket ${templateBucketName}`);
  }

  // 1. Compile Lambda functions
  const baseLambdaDir = path.resolve(__dirname, "../backend/lambda");
  const outputDir = path.resolve(__dirname, "../backend/lambda/dist");

  const lambdaCompiler = new LambdaCompiler({
    logger,
    baseLambdaDir,
    outputDir,
    s3BucketName: templateBucketName,
    s3KeyPrefix: "lambdas",
    stage,
    appName: "appbuilderstudio",
    region,
    debugMode: true,
  });

  try {
    await lambdaCompiler.compileLambdaFunctions();
    logger.success("✓ Lambda functions compiled and uploaded successfully");
  } catch (error: any) {
    logger.error(`Failed to compile Lambda functions: ${error.message}`);
    throw error;
  }

  // 2. Upload CloudFormation templates
  logger.info("Uploading CloudFormation templates...");
  const templatesDir = __dirname; // Templates are in the deploy folder itself

  const templates = [
    { local: "cfn-template.yaml", s3Key: "cfn-template.yaml" },
    { local: "resources/S3/s3.yaml", s3Key: "resources/S3/s3.yaml" },
    {
      local: "resources/Lambda/lambda.yaml",
      s3Key: "resources/Lambda/lambda.yaml",
    },
    {
      local: "resources/CloudFront/cloudfront.yaml",
      s3Key: "resources/CloudFront/cloudfront.yaml",
    },
  ];

  for (const template of templates) {
    const content = readFileSync(
      path.join(templatesDir, template.local),
      "utf8"
    );
    await s3.send(
      new PutObjectCommand({
        Bucket: templateBucketName,
        Key: template.s3Key,
        Body: content,
        ContentType: "application/x-yaml",
      })
    );
    logger.success(`✓ Uploaded ${template.local}`);
  }

  // 3. Deploy CloudFormation stack
  logger.info("Deploying CloudFormation stack...");
  const templateUrl = `https://${templateBucketName}.s3.${region}.amazonaws.com/cfn-template.yaml`;

  const parameters = [
    { ParameterKey: "Stage", ParameterValue: stage },
    { ParameterKey: "AppName", ParameterValue: "appbuilderstudio" },
    { ParameterKey: "TemplateBucketName", ParameterValue: templateBucketName },
    { ParameterKey: "LogRetentionInDays", ParameterValue: "14" },
  ];

  let cloudFrontDistributionId = "";
  let cloudFrontDomainName = "";

  try {
    // Check if stack exists
    let stackExists = false;
    try {
      await cloudformation.send(
        new DescribeStacksCommand({ StackName: stackName })
      );
      stackExists = true;
    } catch (e: any) {
      if (!e.message.includes("does not exist")) {
        throw e;
      }
    }

    if (stackExists) {
      logger.info("Stack exists, updating...");
      await cloudformation.send(
        new UpdateStackCommand({
          StackName: stackName,
          TemplateURL: templateUrl,
          Parameters: parameters,
          Capabilities: ["CAPABILITY_NAMED_IAM"],
        })
      );

      logger.info("Waiting for stack update to complete...");
      await waitUntilStackUpdateComplete(
        { client: cloudformation, maxWaitTime: 600 },
        { StackName: stackName }
      );
      logger.success("✓ Stack updated successfully");
    } else {
      logger.info("Creating new stack...");
      await cloudformation.send(
        new CreateStackCommand({
          StackName: stackName,
          TemplateURL: templateUrl,
          Parameters: parameters,
          Capabilities: ["CAPABILITY_NAMED_IAM"],
          DisableRollback: true,
        })
      );

      logger.info("Waiting for stack creation to complete...");
      await waitUntilStackCreateComplete(
        { client: cloudformation, maxWaitTime: 600 },
        { StackName: stackName }
      );
      logger.success("✓ Stack created successfully");
    }

    // Get stack outputs
    const describeResult = await cloudformation.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    const stack = describeResult.Stacks?.[0];
    if (stack?.Outputs) {
      logger.info("\nStack Outputs:");
      for (const output of stack.Outputs) {
        logger.info(`  ${output.OutputKey}: ${output.OutputValue}`);

        // Capture CloudFront info for DNS setup
        if (output.OutputKey === "CloudFrontDistributionId") {
          cloudFrontDistributionId = output.OutputValue || "";
        }
        if (output.OutputKey === "CloudFrontDomainName") {
          cloudFrontDomainName = output.OutputValue || "";
        }
      }
    }
  } catch (error: any) {
    if (error.message.includes("No updates are to be performed")) {
      logger.info("Stack is already up to date");

      // Still need to get outputs
      const describeResult = await cloudformation.send(
        new DescribeStacksCommand({ StackName: stackName })
      );
      const stack = describeResult.Stacks?.[0];
      if (stack?.Outputs) {
        for (const output of stack.Outputs) {
          if (output.OutputKey === "CloudFrontDistributionId") {
            cloudFrontDistributionId = output.OutputValue || "";
          }
          if (output.OutputKey === "CloudFrontDomainName") {
            cloudFrontDomainName = output.OutputValue || "";
          }
        }
      }
    } else {
      logger.error(`CloudFormation deployment failed: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // Phase 3: Configure custom domain on CloudFront (if applicable)
  // ============================================================================
  if (hasCustomDomain && stage === "prod" && certificateArn) {
    logger.info("\n--- Phase 3: Custom Domain Configuration ---");

    if (cloudFrontDistributionId && cloudFrontDomainName) {
      // Update CloudFront with certificate and domain aliases
      await updateCloudFrontWithDomain(
        cloudFrontDistributionId,
        certificateArn,
        domainName,
        region,
        credentials
      );

      // Update DNS stack with CloudFront domain to create Route53 records
      await deployDNSStack(
        domainName,
        hostedZoneId,
        stage,
        credentials,
        cloudFrontDomainName
      );

      logger.success("\nCustom domain configuration complete!");
      logger.info(`Your site will be available at: https://${domainName}`);
      logger.info(`(DNS propagation may take a few minutes)`);
    } else {
      logger.warning(
        "CloudFront distribution ID or domain name not found in stack outputs"
      );
      logger.warning("Skipping custom domain configuration");
    }
  }

  // ============================================================================
  // Phase 4: Deploy Email Infrastructure (if custom domain configured)
  // ============================================================================
  if (hasCustomDomain && stage === "prod") {
    logger.info("\n--- Phase 4: Email Infrastructure ---");
    await deployEmailStack(
      domainName,
      hostedZoneId,
      stage,
      credentials,
      templateBucketName
    );
  }

  logger.success("\nApp Builder Studio deployment completed successfully");
}

// ============================================================================
// EMAIL STACK DEPLOYMENT (us-east-1 for SES receiving)
// ============================================================================

async function deployEmailStack(
  domainName: string,
  hostedZoneId: string,
  stage: string,
  credentials: any,
  templateBucketName: string
): Promise<void> {
  const stackName = `${APP_NAME}-email-${stage}`;
  const emailTemplateBucketName = `${APP_NAME}-email-templates-${stage}`;

  logger.info(`Deploying Email stack to us-east-1 for domain: ${domainName}`);

  // Create clients for us-east-1 (required for SES receiving)
  const s3UsEast1 = new S3Client({ region: "us-east-1", credentials });
  const cfnUsEast1 = new CloudFormationClient({
    region: "us-east-1",
    credentials,
  });

  // Create S3 bucket for email template in us-east-1 (if it doesn't exist)
  try {
    await s3UsEast1.send(new HeadBucketCommand({ Bucket: emailTemplateBucketName }));
    logger.debug(`Using existing email template bucket: ${emailTemplateBucketName}`);
  } catch {
    logger.info(
      `Creating email template bucket in us-east-1: ${emailTemplateBucketName}`
    );
    await s3UsEast1.send(
      new CreateBucketCommand({
        Bucket: emailTemplateBucketName,
      })
    );
  }

  // Compile and upload email forwarder Lambda
  logger.info("Compiling email forwarder Lambda...");
  const baseLambdaDir = path.resolve(__dirname, "../backend/lambda");
  const outputDir = path.resolve(__dirname, "../backend/lambda/dist");

  const emailLambdaCompiler = new LambdaCompiler({
    logger,
    baseLambdaDir,
    outputDir,
    s3BucketName: emailTemplateBucketName,
    s3KeyPrefix: "lambdas",
    stage,
    appName: "appbuilderstudio",
    region: "us-east-1",
    debugMode: true,
  });

  try {
    // Compile only the email forwarder
    await emailLambdaCompiler.compileSingleLambda("emailForwarder");
    logger.success("✓ Email forwarder Lambda compiled and uploaded");
  } catch (error: any) {
    logger.warning(`Email forwarder compilation: ${error.message}`);
  }

  // Upload Email template to S3
  const emailTemplatePath = path.join(__dirname, "resources/Email/email.yaml");
  const emailTemplateContent = readFileSync(emailTemplatePath, "utf8");

  await s3UsEast1.send(
    new PutObjectCommand({
      Bucket: emailTemplateBucketName,
      Key: "email.yaml",
      Body: emailTemplateContent,
      ContentType: "application/x-yaml",
    })
  );
  logger.debug("Email template uploaded to us-east-1");

  // Get forward email from environment or use default
  const forwardToEmail = process.env.FORWARD_TO_EMAIL || "vesnathan+dev@gmail.com";

  // Parameters for Email stack
  const parameters = [
    { ParameterKey: "Stage", ParameterValue: stage },
    { ParameterKey: "DomainName", ParameterValue: domainName },
    { ParameterKey: "HostedZoneId", ParameterValue: hostedZoneId },
    { ParameterKey: "ForwardToEmail", ParameterValue: forwardToEmail },
    { ParameterKey: "TemplateBucketName", ParameterValue: emailTemplateBucketName },
  ];

  // Check if stack exists
  let stackExists = false;
  try {
    await cfnUsEast1.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    stackExists = true;
  } catch (e: any) {
    if (!e.message.includes("does not exist")) {
      throw e;
    }
  }

  if (stackExists) {
    try {
      logger.info(`Updating Email stack: ${stackName}`);
      await cfnUsEast1.send(
        new UpdateStackCommand({
          StackName: stackName,
          TemplateURL: `https://${emailTemplateBucketName}.s3.amazonaws.com/email.yaml`,
          Parameters: parameters,
          Capabilities: ["CAPABILITY_NAMED_IAM"],
        })
      );
      logger.info("Waiting for Email stack update...");
      await waitForDNSStackComplete(cfnUsEast1, stackName, "UPDATE");
    } catch (e: any) {
      if (e.message.includes("No updates are to be performed")) {
        logger.info("Email stack is already up to date");
      } else {
        throw e;
      }
    }
  } else {
    logger.info(`Creating Email stack: ${stackName}`);
    await cfnUsEast1.send(
      new CreateStackCommand({
        StackName: stackName,
        TemplateURL: `https://${emailTemplateBucketName}.s3.amazonaws.com/email.yaml`,
        Parameters: parameters,
        Capabilities: ["CAPABILITY_NAMED_IAM"],
      })
    );
    logger.info("Waiting for Email stack creation...");
    await waitForDNSStackComplete(cfnUsEast1, stackName, "CREATE");
  }

  // Get outputs
  const describeResult = await cfnUsEast1.send(
    new DescribeStacksCommand({ StackName: stackName })
  );
  const outputs = describeResult.Stacks?.[0]?.Outputs || [];

  const smtpUsername = outputs.find((o) => o.OutputKey === "SMTPUsername")?.OutputValue;
  const smtpSecretKey = outputs.find((o) => o.OutputKey === "SMTPSecretAccessKey")?.OutputValue;
  const ruleSetName = outputs.find((o) => o.OutputKey === "ReceiptRuleSetName")?.OutputValue;

  if (smtpUsername && smtpSecretKey) {
    // Convert secret key to SMTP password
    const smtpPassword = convertToSMTPPassword(smtpSecretKey, "us-east-1");
    logger.success("\n=== Gmail SMTP Configuration ===");
    logger.info("SMTP Server: email-smtp.us-east-1.amazonaws.com");
    logger.info("Port: 587");
    logger.info(`Username: ${smtpUsername}`);
    logger.info(`Password: ${smtpPassword}`);
    logger.info("================================\n");
  }

  // Activate the receipt rule set
  if (ruleSetName) {
    logger.info(`Activating SES receipt rule set: ${ruleSetName}`);
    try {
      const { SESClient, SetActiveReceiptRuleSetCommand } = await import("@aws-sdk/client-ses");
      const sesClient = new SESClient({ region: "us-east-1", credentials });
      await sesClient.send(new SetActiveReceiptRuleSetCommand({
        RuleSetName: ruleSetName,
      }));
      logger.success("✓ SES receipt rule set activated");
    } catch (e: any) {
      logger.warning(`Could not activate rule set: ${e.message}`);
    }
  }

  logger.success("Email infrastructure deployed successfully");
  logger.info(`Emails to hello@${domainName} will be forwarded to ${forwardToEmail}`);
}

// Convert AWS secret access key to SES SMTP password
function convertToSMTPPassword(secretAccessKey: string, region: string): string {
  const crypto = require("crypto");

  const date = "11111111";
  const service = "ses";
  const terminal = "aws4_request";
  const message = "SendRawEmail";
  const version = Buffer.from([0x04]);

  const sign = (key: Buffer, msg: string): Buffer => {
    return crypto.createHmac("sha256", key).update(msg).digest();
  };

  let signature = sign(Buffer.from("AWS4" + secretAccessKey), date);
  signature = sign(signature, region);
  signature = sign(signature, service);
  signature = sign(signature, terminal);
  signature = sign(signature, message);

  const signatureAndVersion = Buffer.concat([version, signature]);
  return signatureAndVersion.toString("base64");
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

import { Command } from "commander";

const program = new Command();
program
  .option("--stage <stage>", "Deployment stage", "dev")
  .option("--region <region>", "AWS region", "ap-southeast-2")
  .option("--domain-name <domain>", "Custom domain name (e.g., appbuilderstudio.com)")
  .option("--hosted-zone-id <zoneId>", "Route53 Hosted Zone ID for the domain")
  .option("--debug", "Enable debug mode")
  .parse(process.argv);

const options = program.opts();

// Run deployment
deployAppBuilderStudio({
  stage: options.stage,
  region: options.region,
  domainName: options.domainName,
  hostedZoneId: options.hostedZoneId,
  debugMode: options.debug,
}).catch((error) => {
  logger.error(`Deployment failed: ${error.message}`);
  process.exit(1);
});
