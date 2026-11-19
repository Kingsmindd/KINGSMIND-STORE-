import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import {
  AuthError,
  registerService,
  loginService,
  getCurrentUserService,
  changePasswordService,
} from "../services/auth.service.js";
import { sendEmailVerification } from "../services/email.verification.js";

export function createAuthController(pool: Pool) {
  async function registerController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body: unknown = req.body;

      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new AuthError("Provide a valid JSON request body.", 400);
      }

      const { name, email, password } = body as Record<string, unknown>;

      const user = await registerService(pool, {
        name,
        email,
        password,
      });

      let verificationEmailSent = false;

      try {
        await sendEmailVerification(pool, user.id, user.email);
        verificationEmailSent = true;
      } catch {
        console.error("Could not send the registration verification email.");
      }

      res.status(201).json({
        message: verificationEmailSent
          ? "Account created. Please check your email to verify your account."
          : "Account created, but we could not send the verification email. Please request another verification email.",
        verificationEmailSent,
        user,
      });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function changePasswordController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const { userId, authVersion } = req.session;

      if (!userId || typeof authVersion !== "number") {
        throw new AuthError("Please sign in again.", 401);
      }

      const body = req.body as
        | { currentPassword?: unknown; newPassword?: unknown }
        | null
        | undefined;

      await changePasswordService(pool, userId, authVersion, {
        currentPassword: body?.currentPassword,
        newPassword: body?.newPassword,
      });

      req.session.authVersion = authVersion + 1;

      await new Promise<void>((resolve, reject) => {
        req.session.save((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      res.status(200).json({ message: "Password changed successfully." });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function loginController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body: unknown = req.body;

      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new AuthError("Provide a valid JSON request body.", 400);
      }

      const { email, password } = body as Record<string, unknown>;

      const { auth_version, ...user } = await loginService(pool, {
        email,
        password,
      });

      // Replace any existing session with a new session ID.
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error: unknown) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      // Store only the user's ID in the session.
      req.session.userId = user.id;
      req.session.loggedInAt = Date.now();
      req.session.authVersion = auth_version;

      // Confirm PostgreSQL saved the session before responding.
      await new Promise<void>((resolve, reject) => {
        req.session.save((error: unknown) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      res.setHeader("Cache-Control", "no-store");

      res.status(200).json({
        message: "Logged in successfully.",
        user,
      });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  // ME CONTROLLER

  async function meController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.session?.userId;

      if (!userId) {
        throw new AuthError("Please log in to continue.", 401);
      }

      const user = await getCurrentUserService(pool, userId);

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ user });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function logoutController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        req.session.destroy((error: unknown) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      res.clearCookie("kingsmind.sid", {
        path: "/",
      });

      res.setHeader("Cache-Control", "no-store");

      res.status(200).json({
        message: "Logged out successfully.",
      });
    } catch (error: unknown) {
      next(error);
    }
  }
  return {
    registerController,
    loginController,
    meController,
    logoutController,
    changePasswordController,
  };
}
