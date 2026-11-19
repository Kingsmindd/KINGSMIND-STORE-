import "dotenv/config";
import { Pool } from "pg";
import { sendEmailVerification } from "../services/email.verification";

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    throw new Error("Provide your test account's email address.");
  }

  const pool = new Pool({
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query<{
      id: string;
      email: string;
      email_verified_at: Date | null;
    }>(
      `SELECT id, email, email_verified_at
       FROM users
       WHERE email = $1`,
      [email],
    );

    const user = result.rows[0];

    if (!user) {
      throw new Error("No account exists with that email address.");
    }

    if (user.email_verified_at !== null) {
      throw new Error("This account's email is already verified.");
    }

    await sendEmailVerification(pool, user.id, user.email);

    console.log("Brevo accepted the verification email.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Verification email test failed.",
  );

  process.exitCode = 1;
});
