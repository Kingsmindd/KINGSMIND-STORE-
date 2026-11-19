import { Router } from "express";
import type { Pool } from "pg";
import { createOrderController } from "../controllers/order.controller.js";
import {
  createRequireAuth,
  createRequireAdmin,
} from "../middleware/auth.middleware.js";
import { requireCsrf } from "../middleware/csrf.middleware.js";

export function createOrderRouter(pool: Pool): Router {
  const router = Router();
  const requireAuth = createRequireAuth(pool);

  const requireAdmin = createRequireAdmin(pool);
  const {
    confirmDeliveryQuoteController,
    getCustomerOrderController,
    deleteDeliveryQuoteController,
    editDeliveryQuoteController,
    cancelOrderController,
    listAdminOrdersController,
    getAdminOrderController,
    confirmOrderController,
    shipOrderController,
    completeDeliveryController,
    listCustomerOrdersController,
  } = createOrderController(pool);

  router.get("/", requireAuth, listCustomerOrdersController);

  router.get("/admin", requireAuth, requireAdmin, listAdminOrdersController);

  router.get(
    "/admin/:orderId",
    requireAuth,
    requireAdmin,
    getAdminOrderController,
  );

  router.patch(
    "/:orderId/delivery-quote",
    requireAuth,
    requireCsrf,
    requireAdmin,
    editDeliveryQuoteController,
  );

  router.delete(
    "/:orderId/delivery-quote",
    requireAuth,
    requireCsrf,
    requireAdmin,
    deleteDeliveryQuoteController,
  );

  router.post(
    "/:orderId/delivery-quote",
    requireAuth,
    requireCsrf,
    requireAdmin,
    confirmDeliveryQuoteController,
  );

  router.get("/:orderId", requireAuth, getCustomerOrderController);

  router.post(
    "/:orderId/cancel",
    requireAuth,
    requireCsrf,
    requireAdmin,
    cancelOrderController,
  );

  router.post(
    "/:orderId/confirm",
    requireAuth,
    requireCsrf,
    requireAdmin,
    confirmOrderController,
  );

  router.post(
    "/:orderId/ship",
    requireAuth,
    requireCsrf,
    requireAdmin,
    shipOrderController,
  );

  router.post(
    "/:orderId/complete-delivery",
    requireAuth,
    requireCsrf,
    requireAdmin,
    completeDeliveryController,
  );
  return router;
}
