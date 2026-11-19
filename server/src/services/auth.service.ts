import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

const SCRYPT_OPTIONS = {
  N: 131072,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
};

const HASH_VERSION = "scrypt-v1";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  created_at: Date;
  email_verified_at: Date | null;
};

type RegisterInput = {
  name: unknown;
  email: unknown;
  password: unknown;
};

type LoginInput = {
  email: unknown;
  password: unknown;
};

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");

  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

  return `${HASH_VERSION}:${salt}:${key.toString("hex")}`;
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [version, salt, hash, extra] = storedHash.split(":");

  if (
    version !== HASH_VERSION ||
    !salt ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !hash ||
    !/^[a-f0-9]{128}$/.test(hash) ||
    extra !== undefined
  ) {
    return false;
  }

  const suppliedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

  return timingSafeEqual(Buffer.from(hash, "hex"), suppliedKey);
}

export async function registerService(
  pool: Pool,
  input: RegisterInput,
): Promise<PublicUser> {
  const { name, email, password } = input;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    throw new AuthError("Name, email, and password are required.", 400);
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanName.length < 1 || cleanName.length > 100) {
    throw new AuthError("Name must contain between 1 and 100 characters.", 400);
  }

  if (
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    throw new AuthError("Enter a valid email address.", 400);
  }

  if (password.length < 15 || password.length > 128) {
    throw new AuthError(
      "Password must contain between 15 and 128 characters.",
      400,
    );
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    cleanEmail,
  ]);

  if (existing.rows.length > 0) {
    throw new AuthError("An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(password);

  try {
    const result = await pool.query<PublicUser>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, name, email, role, created_at`,
      [cleanName, cleanEmail, passwordHash],
    );

    return result.rows[0];
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      throw new AuthError("An account with this email already exists.", 409);
    }

    throw error;
  }
}

// LOGIN FUNCTION SERVICE

export async function loginService(
  pool: Pool,
  input: LoginInput,
): Promise<PublicUser & { auth_version: number }> {
  const { email, password } = input;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim().length === 0 ||
    email.trim().length > 254 ||
    password.length === 0 ||
    password.length > 128
  ) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const cleanEmail = email.trim().toLowerCase();

  const result = await pool.query<
    PublicUser & {
      password_hash: string;
      suspended_at: Date | null;
      auth_version: number;
    }
  >(
    `SELECT id, name, email, role, created_at, password_hash ,  email_verified_at , suspended_at ,   auth_version
     FROM users
     WHERE email = $1`,
    [cleanEmail],
  );

  const user = result.rows[0];

  const storedHash =
    user?.password_hash ??
    `${HASH_VERSION}:${"0".repeat(32)}:${"0".repeat(128)}`;
  const passwordMatches = await verifyPassword(password, storedHash);

  if (!user || !passwordMatches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  if (user.suspended_at !== null) {
    throw new AuthError(
      "Your account has been suspended. Please contact support.",
      403,
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    email_verified_at: user.email_verified_at,
    auth_version: user.auth_version,
  };
}

// GET A CURRENT USER FUNCTION

export async function getCurrentUserService(
  pool: Pool,
  userId: string,
  expectedAuthVersion?: number,
): Promise<PublicUser> {
  const result = await pool.query<
    PublicUser & {
      suspended_at: Date | null;
      auth_version: number;
    }
  >(
    `SELECT
     id,
     name,
     email,
     role,
     created_at,
     email_verified_at,
     suspended_at,
       auth_version
   FROM users
   WHERE id = $1`,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AuthError("Please log in to continue.", 401);
  }

  if (user.suspended_at !== null) {
    throw new AuthError(
      "Your account has been suspended. Please contact support.",
      403,
    );
  }

  if (
    expectedAuthVersion !== undefined &&
    user.auth_version !== expectedAuthVersion
  ) {
    throw new AuthError(
      "Your session is no longer valid. Please log in again.",
      401,
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    email_verified_at: user.email_verified_at,
  };
}

export async function changePasswordService(
  pool: Pool,
  userId: string,
  authVersion: number,
  input: { currentPassword: unknown; newPassword: unknown },
): Promise<void> {
  const { currentPassword, newPassword } = input;

  if (
    typeof currentPassword !== "string" ||
    currentPassword.length === 0 ||
    currentPassword.length > 128
  ) {
    throw new AuthError("Enter your current password.", 400);
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < 15 ||
    newPassword.length > 128
  ) {
    throw new AuthError(
      "New password must contain between 15 and 128 characters.",
      400,
    );
  }

  if (currentPassword === newPassword) {
    throw new AuthError("Choose a different new password.", 400);
  }

  const account = await pool.query<{ password_hash: string }>(
    `SELECT password_hash
     FROM users
     WHERE id = $1 AND auth_version = $2 AND suspended_at IS NULL`,
    [userId, authVersion],
  );

  const user = account.rows[0];

  if (!user) {
    throw new AuthError(
      "Your session is no longer valid. Please sign in again.",
      401,
    );
  }

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw new AuthError("Current password is incorrect.", 400);
  }

  const passwordHash = await hashPassword(newPassword);

  const updated = await pool.query(
    `UPDATE users
     SET password_hash = $3, auth_version = auth_version + 1
     WHERE id = $1 AND auth_version = $2 AND suspended_at IS NULL`,
    [userId, authVersion, passwordHash],
  );

  if (updated.rowCount !== 1) {
    throw new AuthError(
      "Your session is no longer valid. Please sign in again.",
      401,
    );
  }
}

// RESET PASSWORD SERVICE

export async function resetPasswordService(
  pool: Pool,
  token: unknown,
  newPassword: unknown,
): Promise<void> {
  const invalidLinkMessage =
    "This reset link is invalid or expired. Request a new one.";

  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AuthError(invalidLinkMessage, 400);
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < 15 ||
    newPassword.length > 128
  ) {
    throw new AuthError(
      "New password must contain between 15 and 128 characters.",
      400,
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ user_id: string }>(
      `DELETE FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > now()
       RETURNING user_id`,
      [tokenHash],
    );

    const reset = result.rows[0];

    if (!reset) {
      throw new AuthError(invalidLinkMessage, 400);
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await client.query(
      `UPDATE users
       SET password_hash = $2, auth_version = auth_version + 1
       WHERE id = $1
         AND suspended_at IS NULL
         AND email_verified_at IS NOT NULL`,
      [reset.user_id, passwordHash],
    );

    if (updated.rowCount !== 1) {
      throw new AuthError(invalidLinkMessage, 400);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// UPDATE NAME

export async function updateAccountNameService(
  pool: Pool,
  userId: string,
  authVersion: number,
  value: unknown,
): Promise<PublicUser> {
  const name = typeof value === "string" ? value.trim() : "";

  if (name.length < 1 || name.length > 100) {
    throw new AuthError("Name must contain between 1 and 100 characters.", 400);
  }

  const { rows } = await pool.query<PublicUser>(
    `UPDATE users
     SET name = $3
     WHERE id = $1 AND auth_version = $2 AND suspended_at IS NULL
     RETURNING id, name, email, role, created_at, email_verified_at`,
    [userId, authVersion, name],
  );

  const user = rows[0];
  if (!user) {
    throw new AuthError("Please sign in again.", 401);
  }

  return user;
}
