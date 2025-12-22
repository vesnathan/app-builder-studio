import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

const s3 = new S3Client({ region: "us-east-1" });
// Use ap-southeast-2 for sending since that's where the domain is verified
const ses = new SESClient({ region: "ap-southeast-2" });

// Configuration from environment variables
const EMAIL_BUCKET = process.env.EMAIL_BUCKET || "";
const FORWARD_TO = process.env.FORWARD_TO || "";
const FORWARD_FROM = process.env.FORWARD_FROM || "";

interface SESMailRecord {
  eventSource: string;
  eventVersion: string;
  ses: {
    mail: {
      messageId: string;
      commonHeaders: {
        from: string[];
        to: string[];
        subject?: string;
      };
    };
    receipt: {
      recipients: string[];
    };
  };
}

interface SESEvent {
  Records: SESMailRecord[];
}

async function streamToString(
  stream: NodeJS.ReadableStream,
): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export const handler = async (event: SESEvent) => {
  console.log("Received SES event:", JSON.stringify(event, null, 2));

  if (!EMAIL_BUCKET || !FORWARD_TO || !FORWARD_FROM) {
    console.error("Missing required environment variables");
    throw new Error("Missing required environment variables");
  }

  for (const record of event.Records) {
    const sesRecord = record.ses;
    const messageId = sesRecord.mail.messageId;
    const recipients = sesRecord.receipt.recipients;

    console.log(`Processing email ${messageId} for recipients:`, recipients);

    try {
      // Get the email from S3
      const s3Response = await s3.send(
        new GetObjectCommand({
          Bucket: EMAIL_BUCKET,
          Key: messageId,
        }),
      );

      if (!s3Response.Body) {
        throw new Error("Empty email body from S3");
      }

      // Read the email content
      const emailContent = await streamToString(
        s3Response.Body as NodeJS.ReadableStream,
      );

      // Modify headers for forwarding
      let modifiedEmail = emailContent;

      // Get original sender info
      const originalFrom = sesRecord.mail.commonHeaders.from?.[0] || "";
      const originalSubject =
        sesRecord.mail.commonHeaders.subject || "(no subject)";

      console.log(`Forwarding email from ${originalFrom}: ${originalSubject}`);

      // Use the original recipient address as the From address (e.g., hello@, webmaster@)
      // Fall back to FORWARD_FROM if no recipient found
      const forwardFromAddress = recipients[0] || FORWARD_FROM;

      // Check if this is a bounce/notification email (empty source or MAILER-DAEMON)
      const isBounceOrNotification =
        !originalFrom ||
        originalFrom.includes("MAILER-DAEMON") ||
        originalFrom.includes("postmaster@");

      // Remove Return-Path header - SES requires this to be a verified address
      // We set Source in the API call which handles this properly
      modifiedEmail = modifiedEmail.replace(/^Return-Path: .+\r?\n/m, "");

      // Replace the "From" header to pass SPF/DKIM
      // Keep original sender in Reply-To and X-Original-From (if valid)
      if (isBounceOrNotification) {
        // For bounce emails, don't add Reply-To since there's no valid address
        modifiedEmail = modifiedEmail.replace(
          /^From: .+$/m,
          `From: ${forwardFromAddress}\r\nX-Original-From: ${originalFrom || "bounce notification"}`,
        );
      } else {
        modifiedEmail = modifiedEmail.replace(
          /^From: .+$/m,
          `From: ${forwardFromAddress}\r\nReply-To: ${originalFrom}\r\nX-Original-From: ${originalFrom}`,
        );
      }

      // Update To header
      modifiedEmail = modifiedEmail.replace(/^To: .+$/m, `To: ${FORWARD_TO}`);

      // Send the forwarded email
      await ses.send(
        new SendRawEmailCommand({
          RawMessage: {
            Data: Buffer.from(modifiedEmail),
          },
          Destinations: [FORWARD_TO],
          Source: forwardFromAddress,
        }),
      );

      console.log(`Successfully forwarded email ${messageId} to ${FORWARD_TO}`);
    } catch (error) {
      console.error(`Error forwarding email ${messageId}:`, error);
      throw error;
    }
  }

  return { status: "success" };
};
