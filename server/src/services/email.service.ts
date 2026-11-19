type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM_ADDRESS;
  const senderName = process.env.EMAIL_FROM_NAME;

  if (!apiKey || !senderEmail || !senderName) {
    throw new Error("Email configuration is missing.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: input.to }],
      subject: input.subject,
      ...(input.html
        ? { htmlContent: input.html }
        : { textContent: input.text }),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Brevo rejected the email request: HTTP ${response.status}.`,
    );
  }
}

export function renderAccountEmail(
  action: "verify" | "reset",
  url: URL,
): string {
  const verify = action === "verify";
  const title = verify ? "Verify your email" : "Reset your password";
  const description = verify
    ? "Confirm your email address to finish setting up your KINGSMIND Store account."
    : "Use the button below to choose a new password for your KINGSMIND Store account.";
  const button = verify ? "Verify email address" : "Choose a new password";
  const ignore = verify
    ? "If you didn't create this account, you can ignore this email."
    : "If you didn't request a password reset, you can ignore this email.";

  return renderActionEmail(
    url,
    title,
    description,
    button,
    ignore,
    "This link expires in 30 minutes.",
  );
}

export function renderSupportEmail(url: URL, toAdmin: boolean): string {
  return renderActionEmail(
    url,
    toAdmin ? "New support message" : "KINGSMIND Support replied",
    toAdmin
      ? "A visitor sent a message. Open the support inbox to read it and reply."
      : "You have a new reply. Open your support chat to read it.",
    toAdmin ? "Open support inbox" : "Open support chat",
    "You received this email because there’s a new message in a support conversation.",
  );
}

export function renderGuestSupportVerificationEmail(url: URL): string {
  return renderActionEmail(
    url,
    "Confirm your support email",
    "Confirm this address to receive an email when KINGSMIND Support replies.",
    "Confirm email",
    "If you didn’t request reply emails, you can ignore this message.",
    "This link expires in 30 minutes.",
  );
}

function renderActionEmail(
  url: URL,
  title: string,
  description: string,
  button: string,
  footer: string,
  expiry?: string,
): string {
  const href = url.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  return `<!doctype html>
<html lang="en">
<body style="margin:0;background:#f4f5f1;color:#18241e;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:540px;background:#fff;border:1px solid #dee5dd;">
          <tr>
            <td style="padding:18px 24px;background:#17352a;color:#fff;font-size:18px;font-weight:bold;">
              KINGSMIND Store
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h1 style="margin:0 0 12px;font-size:26px;">${title}</h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">${description}</p>
              <a href="${href}"
                style="display:inline-block;background:#17352a;color:#fff;padding:13px 20px;border-radius:8px;font-size:16px;font-weight:bold;text-decoration:none;">
                ${button}
              </a>
              ${expiry ? `<p style="margin:20px 0 8px;font-size:14px;color:#4c5b51;">${expiry}</p>` : ""}
              <p style="margin:${expiry ? "0" : "20px 0 0"};font-size:14px;color:#4c5b51;">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
