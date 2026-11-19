import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { renderAccountEmail, sendEmail } from "./email.service.js";

export async function sendPasswordResetLink(
  pool: Pool,
  email: string,
): Promise<void> {
  const result = await pool.query<{ id: string; email: string }>(
    `SELECT id, email
     FROM users
     WHERE email = $1
       AND email_verified_at IS NOT NULL
       AND suspended_at IS NULL`,
    [email],
  );

  const user = result.rows[0];
  if (!user) return;

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is missing.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const resetUrl = new URL("/reset-password", frontendUrl);
  resetUrl.searchParams.set("token", token);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '30 minutes')
     ON CONFLICT (user_id)
     DO UPDATE SET
       token_hash = EXCLUDED.token_hash,
       expires_at = EXCLUDED.expires_at,
       created_at = now()`,
    [user.id, tokenHash],
  );

  await sendEmail({
    html: renderAccountEmail("reset", resetUrl),
    to: user.email,
    subject: "Reset your KINGSMIND Store password",
    text: [
      "Use this link to choose a new password.",
      "",
      resetUrl.toString(),
      "",
      "This link expires in 30 minutes.",
      "If you did not request a reset, you can ignore this email.",
    ].join("\n"),
  });
}
