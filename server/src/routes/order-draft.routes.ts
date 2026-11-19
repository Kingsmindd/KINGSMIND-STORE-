import { Router } from "express";
import type { Pool } from "pg";
import { createOrderDraftController } from "../controllers/order-draft.controller.js";
import { createRequireAuth } from "../middleware/auth.middleware.js";
import { requireCsrf } from "../middleware/csrf.middleware.js";

export function createOrderDraftRouter(pool: Pool): Router {
  const router = Router();
  const requireAuth = createRequireAuth(pool);
  const { getDraft, saveDraft, deleteDraft } = createOrderDraftController(pool);

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/", requireAuth, getDraft);
  router.post("/", requireAuth, requireCsrf, saveDraft);
  router.delete("/", requireAuth, requireCsrf, deleteDraft);

  return router;
}
