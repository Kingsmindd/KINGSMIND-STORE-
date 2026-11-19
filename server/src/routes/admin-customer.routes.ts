import { Router } from "express";
import type { Pool } from "pg";
import { createAdminCustomerController } from "../controllers/admin-customer.controller.js";
import {
  createRequireAuth,
  createRequireAdmin,
} from "../middleware/auth.middleware.js";
import { requireCsrf } from "../middleware/csrf.middleware.js";

export function createAdminCustomerRouter(pool: Pool): Router {
  const router = Router();

  const requireAuth = createRequireAuth(pool);
  const requireAdmin = createRequireAdmin(pool);

  const {
    suspendCustomerController,
    reactivateCustomerController,
    deleteCustomerController,
    listAdminCustomersController,
  } = createAdminCustomerController(pool);

  router.get("/", requireAuth, requireAdmin, listAdminCustomersController);

  router.use(requireAuth, requireCsrf, requireAdmin);

  router.post("/:customerId/suspend", suspendCustomerController);

  router.post("/:customerId/reactivate", reactivateCustomerController);

  router.delete("/:customerId", deleteCustomerController);
  return router;
}
