import { Router } from "express";
import type { Pool } from "pg";
import { createCheckoutController } from "../controllers/checkout.controller.js";
import {
  createRequireAdmin,
  createRequireAuth,
  createRequireVerifiedEmail,
} from "../middleware/auth.middleware.js";
import { requireCsrf } from "../middleware/csrf.middleware.js";
import { createExchangeRateController } from "../controllers/exchange-rate.controller.js";

export function createCheckoutRouter(pool: Pool): Router {
  const router = Router();
  const requireAuth = createRequireAuth(pool);
  const requireAdmin = createRequireAdmin(pool);
  const { getExchangeRate, updateExchangeRate } =
    createExchangeRateController(pool);

  const { checkoutController, checkoutPreviewController } =
    createCheckoutController(pool);
  const requireVerifiedEmail = createRequireVerifiedEmail(pool);

  router.post(
    "/",
    requireAuth,
    requireCsrf,
    requireVerifiedEmail,
    checkoutController,
  );

  router.get("/exchange-rate", requireAuth, requireAdmin, getExchangeRate);

  router.put(
    "/exchange-rate",
    requireAuth,
    requireCsrf,
    requireAdmin,
    updateExchangeRate,
  );

  router.post(
    "/preview",
    requireAuth,
    requireCsrf,
    requireVerifiedEmail,
    checkoutPreviewController,
  );
  return router;
}
