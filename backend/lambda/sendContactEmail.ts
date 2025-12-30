import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const ses = new SESClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const ssm = new SSMClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

// Cache the secret key after first fetch
let cachedRecaptchaSecretKey: string | null = null;

async function getRecaptchaSecretKey(): Promise<string> {
  if (cachedRecaptchaSecretKey) {
    console.log("Using cached reCAPTCHA secret key");
    return cachedRecaptchaSecretKey;
  }

  try {
    console.log("Fetching reCAPTCHA secret from SSM...");
    const command = new GetParameterCommand({
      Name: "/app-builder-studio/recaptcha-secret-key",
      WithDecryption: true,
    });
    const response = await ssm.send(command);
    console.log("SSM response received, has value:", !!response.Parameter?.Value);
    cachedRecaptchaSecretKey = response.Parameter?.Value || "";
    if (!cachedRecaptchaSecretKey) {
      console.warn("SSM returned empty value, using test key");
      return "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
    }
    return cachedRecaptchaSecretKey;
  } catch (error) {
    console.error("Failed to fetch reCAPTCHA secret from SSM:", error);
    // Fallback to test key if SSM fails
    return "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
  }
}

interface ContactFormData {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  recaptchaToken?: string;
  formType?: string;
  // Quote form fields
  firstName?: string;
  lastName?: string;
  serviceType?: string;
  businessType?: string;
  currentWebsite?: string;
  companyName?: string;
  industry?: string;
  timeline?: string;
  description?: string;
}

// Verify reCAPTCHA token
async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!token) {
    console.warn("No reCAPTCHA token provided");
    return false;
  }

  try {
    const secretKey = await getRecaptchaSecretKey();
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      },
    );

    const data = (await response.json()) as {
      success: boolean;
      score?: number;
      [key: string]: unknown;
    };
    console.log("reCAPTCHA verification result:", data);

    // Accept if score is above 0.5 (or if using test keys)
    return (
      data.success &&
      ((data.score && data.score >= 0.5) || secretKey.includes("Test"))
    );
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // Handle CORS preflight
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  try {
    const body: ContactFormData = JSON.parse(event.body || "{}");

    // Verify reCAPTCHA token
    const isVerified = await verifyRecaptcha(body.recaptchaToken || "");
    if (!isVerified) {
      console.warn("reCAPTCHA verification failed");
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "reCAPTCHA verification failed. Please try again.",
        }),
      };
    }

    // Determine if this is a contact form or quote form
    const isQuoteForm =
      body.formType === "quote" ||
      (body.firstName && body.lastName && body.serviceType);
    const subject = isQuoteForm
      ? "New Quote Request - App Builder Studio"
      : "New Contact Form Submission - App Builder Studio";

    // Build email body
    let emailBody = "";
    if (isQuoteForm) {
      emailBody = `
New Quote Request

CONTACT DETAILS:
Name: ${body.firstName} ${body.lastName}
Email: ${body.email}
Phone: ${body.phone || "Not provided"}

BUSINESS INFORMATION:
Business Type: ${body.businessType || "Not provided"}
Company Name: ${body.companyName || "Not provided"}
Industry: ${body.industry || "Not provided"}
Current Website: ${body.currentWebsite || "None"}

SERVICE DETAILS:
Service Type: ${body.serviceType}
Timeline: ${body.timeline || "Not specified"}

PROJECT DETAILS:
${body.description}
      `.trim();
    } else {
      emailBody = `
New Contact Form Submission

Name: ${body.name}
Email: ${body.email}
Phone: ${body.phone || "Not provided"}

Message:
${body.message}
      `.trim();
    }

    // Send email via SES
    console.log("Sending email via SES...");
    console.log("From:", process.env.FROM_EMAIL || "noreply@appbuilderstudio.com");
    console.log("To:", process.env.TO_EMAIL || "hello@appbuilderstudio.com");

    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL || "noreply@appbuilderstudio.com",
      Destination: {
        ToAddresses: [process.env.TO_EMAIL || "hello@appbuilderstudio.com"],
      },
      ReplyToAddresses: body.email ? [body.email] : undefined,
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: emailBody,
            Charset: "UTF-8",
          },
        },
      },
    });

    const result = await ses.send(command);
    console.log("SES send result:", result.MessageId);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Email sent successfully" }),
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to send email" }),
    };
  }
};
