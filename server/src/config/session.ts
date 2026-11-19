import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Pool } from "pg";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    loggedInAt?: number;
    csrfToken?: string;
    authVersion?: number;
  }
}

const PgSessionStore = connectPgSimple(session);

export function createSessionMiddleware(pool: Pool) {
  const secret = process.env.SESSION_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SESSION_SECRET must be set to a strong random secret.");
  }

  const isProduction = process.env.NODE_ENV === "production";

  return session({
    name: "kingsmind.sid",
    secret,
    store: new PgSessionStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 60 * 1000,
      path: "/",
    },
  });
}
