import { Router } from "express";
import type { Pool } from "pg";
import { createProductController } from "../controllers/product.controller.js";
import {
  createRequireAuth,
  createRequireAdmin,
} from "../middleware/auth.middleware.js";
import { requireCsrf } from "../middleware/csrf.middleware.js";
import { uploadProductImage } from "../middleware/product-upload.middlewre.js";

export function createProductRouter(pool: Pool): Router {
  const router = Router();
  const requireAuth = createRequireAuth(pool);
  const requireAdmin = createRequireAdmin(pool);

  const {
    listProductsController,
    getProductDetailsController,
    createProductControllerHandler,
    createProductVariantController,
    publishProductController,
    listAdminProductsController,
    unpublishProductController,
    getAdminProductDetailsController,
    updateProductController,
    updateProductImageController,
    updateProductVariantPriceController,
    deleteProductController,
  } = createProductController(pool);

  router.get("/", listProductsController);

  router.get("/admin", requireAuth, requireAdmin, listAdminProductsController);
  router.get(
    "/admin/:productId",
    requireAuth,
    requireAdmin,
    getAdminProductDetailsController,
  );

  router.patch(
    "/admin/:productId",
    requireAuth,
    requireCsrf,
    requireAdmin,
    updateProductController,
  );

  router.patch(
    "/admin/:productId/image",
    requireAuth,
    requireCsrf,
    requireAdmin,
    uploadProductImage,
    updateProductImageController,
  );

  router.delete(
    "/admin/:productId",
    requireAuth,
    requireCsrf,
    requireAdmin,
    deleteProductController,
  );
  router.get("/:productId", getProductDetailsController);
  router.post(
    "/",
    requireAuth,
    requireCsrf,
    requireAdmin,
    uploadProductImage,
    createProductControllerHandler,
  );

  router.post(
    "/:productId/variants",
    requireAuth,
    requireCsrf,
    requireAdmin,
    createProductVariantController,
  );

  router.patch(
    "/:productId/variants/:variantId/price",
    requireAuth,
    requireCsrf,
    requireAdmin,
    updateProductVariantPriceController,
  );

  router.post(
    "/:productId/publish",
    requireAuth,
    requireCsrf,
    requireAdmin,
    publishProductController,
  );

  router.post(
    "/:productId/unpublish",
    requireAuth,
    requireCsrf,
    requireAdmin,
    unpublishProductController,
  );
  return router;
}
