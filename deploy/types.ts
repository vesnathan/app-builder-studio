/**
 * Deployment options for App Builder Studio
 */
export interface DeploymentOptions {
  stage: string;
  region?: string;
  autoDeleteFailedStacks?: boolean;
  skipFrontendBuild?: boolean;
  skipResolversBuild?: boolean;
  skipUpload?: boolean;
  skipInvalidation?: boolean;
  skipUserSetup?: boolean;
  debugMode?: boolean;
  adminEmail?: string;
  skipUserCreation?: boolean;
  roleArn?: string;
  tags?: { [key: string]: string };
  disableRollback?: boolean;
  skipWAF?: boolean;
  domainName?: string;
  hostedZoneId?: string;
}
