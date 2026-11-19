import { Router } from "express";
import type { Pool } from "pg";
import { createAuthController } from "../controllers/auth.controller.js";
import { csrfTokenController } from "../controllers/csrf.controllers.js";
import { createEmailVerificationController } from "../controllers/email.controller.verification.js";
import {
  changePasswordLimiter,
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resetPasswordLimiter,
  verificationResendLimiter,
} from "../middleware/auth-rate-middleware.js";
import { requireCsrf } from "../middleware/csrf.middleware.js";

import {
  createRequireAuth,
  createRequireAdmin,
  createRequireVerifiedEmail,
} from "../middleware/auth.middleware.js";
import { sendPasswordResetLink } from "../services/password-reset.service.js";
import {
  AuthError,
  resetPasswordService,
  updateAccountNameService,
} from "../services/auth.service.js";

export function createAuthRouter(pool: Pool): Router {
  const { verifyEmailController, resendVerificationController } =
    createEmailVerificationController(pool);
  const router = Router();
  const requireAuth = createRequireAuth(pool);
  const requireAdmin = createRequireAdmin(pool);
  const requireVerifiedEmail = createRequireVerifiedEmail(pool);
  const {
    registerController,
    loginController,
    meController,
    logoutController,
    changePasswordController,
  } = createAuthController(pool);

  router.get("/csrf-token", csrfTokenController);

  router.post("/register", registerLimiter, requireCsrf, registerController);

  router.post("/login", loginLimiter, requireCsrf, loginController);

  router.post(
    "/forgot-password",
    forgotPasswordLimiter,
    requireCsrf,
    (req, res) => {
      res.setHeader("Cache-Control", "no-store");

      const rawEmail: unknown = req.body?.email;
      const email =
        typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Enter a valid email address." });
        return;
      }

      void sendPasswordResetLink(pool, email).catch(() => {
        console.error("Could not process a password reset request.");
      });

      res.status(202).json({
        message:
          "If this email is eligible, a password reset link will be sent.",
      });
    },
  );

  // RESET PASSWORD

  router.post(
    "/reset-password",
    resetPasswordLimiter,
    requireCsrf,
    async (req, res, next) => {
      res.setHeader("Cache-Control", "no-store");

      try {
        await resetPasswordService(
          pool,
          req.body?.token,
          req.body?.newPassword,
        );

        res.status(200).json({
          message:
            "Password reset successfully. Sign in with your new password.",
        });
      } catch (error: unknown) {
        if (error instanceof AuthError) {
          res.status(error.statusCode).json({ error: error.message });
          return;
        }

        next(error);
      }
    },
  );

  router.get("/me", requireAuth, meController);

  router.patch("/me", requireAuth, requireCsrf, async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");

    try {
      const { userId, authVersion } = req.session;

      if (!userId || typeof authVersion !== "number") {
        throw new AuthError("Please sign in again.", 401);
      }

      const user = await updateAccountNameService(
        pool,
        userId,
        authVersion,
        req.body?.name,
      );

      res.json({ user });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  });

  router.post("/logout", requireCsrf, logoutController);

  router.post(
    "/change-password",
    requireAuth,
    requireCsrf,
    changePasswordLimiter,
    changePasswordController,
  );

  router.get("/admin-check", requireAuth, requireAdmin, (_req, res) => {
    res.status(200).json({
      message: "Admin access granted.",
    });
  });

  router.post("/verify-email", requireCsrf, verifyEmailController);

  router.post(
    "/resend-verification",
    verificationResendLimiter,
    requireCsrf,
    resendVerificationController,
  );

  router.get(
    "/verified-check",
    requireAuth,
    requireVerifiedEmail,
    (_req, res) => {
      res.status(200).json({
        message: "Verified email access granted.",
      });
    },
  );

  return router;
}
