import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { sendEmail, renderAccountEmail } from "./email.service.js";
import { AuthError } from "./auth.service.js";

export async function createEmailVerificationToken(
  pool: Pool,
  userId: string,
): Promise<string> {
  const token = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await pool.query(
    `INSERT INTO email_verification_tokens
       (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET
       token_hash = EXCLUDED.token_hash,
       expires_at = EXCLUDED.expires_at,
       created_at = NOW()`,
    [userId, tokenHash, expiresAt],
  );

  return token;
}

// SEND EMAIL VERIFICATION

export async function sendEmailVerification(
  pool: Pool,
  userId: string,
  email: string,
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is missing.");
  }

  const verificationUrl = new URL("/verify-email", frontendUrl);

  const token = await createEmailVerificationToken(pool, userId);

  verificationUrl.searchParams.set("token", token);

  await sendEmail({
    html: renderAccountEmail("verify", verificationUrl),
    to: email,
    subject: "Verify your KINGSMIND Store email",
    text: [
      "Please verify your KINGSMIND Store email address.",
      "",
      verificationUrl.toString(),
      "",
      "This link expires in 30 minutes.",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
  });
}

// VERIFY EMAIL TOKEN

export async function verifyEmailToken(
  pool: Pool,
  token: unknown,
): Promise<void> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AuthError("This verification link is invalid or expired.", 400);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ user_id: string }>(
      `DELETE FROM email_verification_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
       RETURNING user_id`,
      [tokenHash],
    );

    const record = result.rows[0];

    if (!record) {
      throw new AuthError("This verification link is invalid or expired.", 400);
    }

    await client.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, NOW())
       WHERE id = $1`,
      [record.user_id],
    );

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

//  RESEND EMAIL VERIFICATION

export async function resendEmailVerification(
  pool: Pool,
  email: unknown,
): Promise<void> {
  if (typeof email !== "string") {
    throw new AuthError("Enter a valid email address.", 400);
  }

  const cleanEmail = email.trim().toLowerCase();

  if (
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    throw new AuthError("Enter a valid email address.", 400);
  }

  const result = await pool.query<{
    id: string;
    email: string;
  }>(
    `SELECT id, email
     FROM users
     WHERE email = $1
       AND email_verified_at IS NULL`,
    [cleanEmail],
  );

  const user = result.rows[0];

  if (!user) {
    return;
  }

  await sendEmailVerification(pool, user.id, user.email);
}
