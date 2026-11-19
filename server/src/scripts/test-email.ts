import "dotenv/config";
import { sendEmail } from "../services/email.service.js";

async function main(): Promise<void> {
  const recipient = process.env.EMAIL_FROM_ADDRESS;

  if (!recipient) {
    throw new Error("EMAIL_FROM_ADDRESS is missing.");
  }

  await sendEmail({
    to: recipient,
    subject: "KINGSMIND email test",
    text: "Your backend successfully connected to Brevo.",
  });

  console.log("Brevo accepted the test email.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Email test failed.");

  process.exitCode = 1;
});
