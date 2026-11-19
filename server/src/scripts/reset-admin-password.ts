import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { Pool } from "pg";

async function main(): Promise<void> {
  const email = process.env.RESET_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.RESET_ADMIN_PASSWORD;

  if (!email || !password || password.length < 15 || password.length > 128) {
    throw new Error("Provide an email and a password of 15–128 characters.");
  }

  const salt = randomBytes(16).toString("hex");

  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });

  const hash = `scrypt-v1:${salt}:${key.toString("hex")}`;
  const pool = new Pool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ id: string }>(
      `UPDATE users
       SET password_hash = $1
       WHERE email = $2 AND role = 'admin'
       RETURNING id`,
      [hash, email],
    );

    const admin = result.rows[0];

    if (!admin) {
      throw new Error("No admin account found with that email.");
    }

    await client.query(
      `DELETE FROM user_sessions
       WHERE sess ->> 'userId' = $1`,
      [admin.id],
    );

    await client.query("COMMIT");
    console.log("Admin password reset. Existing admin sessions cleared.");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Reset failed.");
  process.exitCode = 1;
});
