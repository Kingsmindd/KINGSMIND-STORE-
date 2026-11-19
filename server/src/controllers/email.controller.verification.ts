import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import { AuthError } from "../services/auth.service.js";
import {
  verifyEmailToken,
  resendEmailVerification,
} from "../services/email.verification.js";

export function createEmailVerificationController(pool: Pool) {
  async function verifyEmailController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const body: unknown = req.body;

      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new AuthError("Provide a valid JSON request body.", 400);
      }

      const { token } = body as Record<string, unknown>;

      await verifyEmailToken(pool, token);

      res.status(200).json({
        message: "Email verified successfully.",
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

  async function resendVerificationController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const body: unknown = req.body;

      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new AuthError("Provide a valid JSON request body.", 400);
      }

      const { email } = body as Record<string, unknown>;

      try {
        await resendEmailVerification(pool, email);
      } catch (error: unknown) {
        if (error instanceof AuthError) {
          throw error;
        }

        console.error("Verification email resend could not be completed.");
      }

      res.status(200).json({
        message:
          "Check your inbox for your verification email. Open the link to confirm your email address.",
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

  return { verifyEmailController, resendVerificationController };
}
