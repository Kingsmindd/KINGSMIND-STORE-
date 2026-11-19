import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import { AuthError, getCurrentUserService } from "../services/auth.service";

const ABSOLUTE_SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
export function createRequireAuth(pool: Pool) {
  return async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    const userId = req.session?.userId;

    if (!userId) {
      res.status(401).json({
        error: "Please log in to continue.",
      });
      return;
    }

    const loggedInAt = req.session.loggedInAt;
    const now = Date.now();

    if (
      typeof loggedInAt !== "number" ||
      !Number.isFinite(loggedInAt) ||
      loggedInAt > now ||
      now - loggedInAt >= ABSOLUTE_SESSION_LIFETIME_MS
    ) {
      req.session.destroy((error: unknown) => {
        if (error) {
          next(error);
          return;
        }

        res.clearCookie("kingsmind.sid", { path: "/" });
        res.status(401).json({
          error: "Your session has expired. Please log in again.",
        });
      });

      return;
    }

    try {
      const authVersion = req.session.authVersion;

      if (
        typeof authVersion !== "number" ||
        !Number.isSafeInteger(authVersion) ||
        authVersion < 0
      ) {
        throw new AuthError(
          "Your session is no longer valid. Please log in again.",
          401,
        );
      }

      await getCurrentUserService(pool, userId, authVersion);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        req.session.destroy((sessionError: unknown) => {
          if (sessionError) {
            next(sessionError);
            return;
          }

          res.clearCookie("kingsmind.sid", { path: "/" });
          res.status(error.statusCode).json({
            error: error.message,
          });
        });

        return;
      }

      next(error);
      return;
    }

    next();
  };
}

export function createRequireVerifiedEmail(pool: Pool) {
  return async function requireVerifiedEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const userId = req.session?.userId;

      if (!userId) {
        res.status(401).json({
          error: "Please log in to continue.",
        });
        return;
      }

      const user = await getCurrentUserService(pool, userId);

      if (user.email_verified_at === null) {
        res.status(403).json({
          error: "Please verify your email before placing an order.",
        });
        return;
      }

      next();
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  };
}

export function createRequireAdmin(pool: Pool) {
  return async function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.session?.userId;

      if (!userId) {
        res.status(401).json({
          error: "Please log in to continue.",
        });
        return;
      }

      const user = await getCurrentUserService(pool, userId);

      if (user.email_verified_at === null) {
        res.status(403).json({
          error: "Please verify your email before accessing admin features.",
        });
        return;
      }

      if (user.role !== "admin") {
        res.status(403).json({
          error: "Admin access required.",
        });
        return;
      }

      next();
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  };
}
