import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import {
  ProductError,
  listProductsService,
  getProductDetailsService,
  createProductService,
  createProductVariantService,
  publishProductService,
  unpublishProductService,
  listAdminProductsService,
  getAdminProductDetailsService,
  updateProductService,
  updateProductImageService,
  updateProductVariantPriceService,
  deleteProductService,
} from "../services/product.service.js";

import {
  ProductValidationError,
  validateCreateProductInput,
  validateCreateVariantInput,
  validateUpdateProductInput,
  validateVariantPrice,
} from "../validations/product.validation.js";
import { processProductImage } from "../services/product-image.service.js";
import {
  saveProductImage,
  deleteProductImage,
} from "../services/product-image-storage.service.js";

export function createProductController(pool: Pool) {
  async function listProductsController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const rawPage = req.query.page;
      let page = 1;

      if (rawPage !== undefined) {
        if (typeof rawPage !== "string" || !/^[1-9][0-9]{0,5}$/.test(rawPage)) {
          throw new ProductError(
            "Page must be a whole number between 1 and 100000.",
            400,
          );
        }

        page = Number(rawPage);
      }

      const rawSearch = req.query.search;

      if (rawSearch !== undefined && typeof rawSearch !== "string") {
        throw new ProductError("Search must be text.", 400);
      }

      const search = (rawSearch ?? "").trim();

      if (search.length > 100) {
        throw new ProductError(
          "Search must contain no more than 100 characters.",
          400,
        );
      }

      const result = await listProductsService(pool, page, search);

      res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof ProductError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function getProductDetailsController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const productId = req.params.productId;

      if (
        typeof productId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          productId,
        )
      ) {
        throw new ProductError("Invalid product ID.", 400);
      }

      const product = await getProductDetailsService(pool, productId);

      res.status(200).json({ product });
    } catch (error: unknown) {
      if (error instanceof ProductError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function createProductControllerHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const body: unknown = req.body;
      const input = validateCreateProductInput(body);

      const image = await processProductImage(req.file);
      const imageKey = await saveProductImage(image);

      const product = await createProductService(pool, input, imageKey).catch(
        async (error: unknown) => {
          try {
            await deleteProductImage(imageKey);
          } catch {
            console.error(
              "Could not clean up the image after product creation failed.",
            );
          }

          throw error;
        },
      );

      res.status(201).json({
        message:
          "Product draft created. Add variants and prices before publishing.",
        product,
      });
    } catch (error: unknown) {
      if (error instanceof ProductValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (error instanceof ProductError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function createProductVariantController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const productId = req.params.productId;

      if (
        typeof productId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          productId,
        )
      ) {
        throw new ProductValidationError("Invalid product ID.");
      }

      const body: unknown = req.body;
      const input = validateCreateVariantInput(body);

      const variant = await createProductVariantService(pool, productId, input);

      res.status(201).json({
        message: "Product variant and price created.",
        variant,
      });
    } catch (error: unknown) {
      if (error instanceof ProductValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof ProductError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function updateProductVariantPriceController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const { productId, variantId } = req.params;
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (typeof productId !== "string" || !uuidPattern.test(productId)) {
        throw new ProductValidationError("Invalid product ID.");
      }

      if (typeof variantId !== "string" || !uuidPattern.test(variantId)) {
        throw new ProductValidationError("Invalid variant ID.");
      }

      const body = req.body as { amountMinor?: unknown } | undefined;
      const amountMinor = validateVariantPrice(body?.amountMinor);
      const price = await updateProductVariantPriceService(
        pool,
        productId,
        variantId,
        amountMinor,
      );

      res.status(200).json({ message: "Variant price updated.", price });
    } catch (error: unknown) {
      if (error instanceof ProductValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof ProductError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function publishProductController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const productId = req.params.productId;

      if (
        typeof productId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          productId,
        )
      ) {
        throw new ProductError("Invalid product ID.", 400);
      }

      const product = await publishProductService(pool, productId);

      res.status(200).json({
        message: "Product published.",
        product,
      });
    } catch (error: unknown) {
      if (error instanceof ProductError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function listAdminProductsController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const rawPage = req.query.page;

      if (
        rawPage !== undefined &&
        (typeof rawPage !== "string" || !/^[1-9][0-9]{0,5}$/.test(rawPage))
      ) {
        throw new ProductError(
          "Page must be a whole number between 1 and 100000.",
          400,
        );
      }

      const page = rawPage === undefined ? 1 : Number(rawPage);
      res.status(200).json(await listAdminProductsService(pool, page));
    } catch (error: unknown) {
      if (error instanceof ProductError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function unpublishProductController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const productId = req.params.productId;

      if (
        typeof productId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          productId,
        )
      ) {
        throw new ProductError("Invalid product ID.", 400);
      }

      const product = await unpublishProductService(pool, productId);
      res.status(200).json({ message: "Product unpublished.", product });
    } catch (error: unknown) {
      if (error instanceof ProductError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  //ADMIN PRODUCT HANDLER

  function adminProductHandler(action: "details" | "update") {
    return async function (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      res.setHeader("Cache-Control", "no-store");

      try {
        const productId = req.params.productId;

        if (
          typeof productId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            productId,
          )
        ) {
          throw new ProductError("Invalid product ID.", 400);
        }

        const product =
          action === "details"
            ? await getAdminProductDetailsService(pool, productId)
            : await updateProductService(
                pool,
                productId,
                validateUpdateProductInput(req.body),
              );

        res.status(200).json({ product });
      } catch (error: unknown) {
        if (error instanceof ProductValidationError) {
          res.status(400).json({ error: error.message });
          return;
        }

        if (error instanceof ProductError) {
          res.status(error.statusCode).json({ error: error.message });
          return;
        }

        next(error);
      }
    };
  }

  async function deleteProductController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const { productId } = req.params;
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (typeof productId !== "string" || !uuidPattern.test(productId)) {
        throw new ProductValidationError("Invalid product ID.");
      }

      const { image_key } = await deleteProductService(pool, productId);

      if (image_key) {
        try {
          await deleteProductImage(image_key);
        } catch (error: unknown) {
          console.error("Could not remove the deleted product image.", error);
        }
      }

      res.status(204).end();
    } catch (error: unknown) {
      if (error instanceof ProductValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof ProductError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function updateProductImageController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const productId = req.params.productId;

      if (
        typeof productId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          productId,
        )
      ) {
        throw new ProductValidationError("Invalid product ID.");
      }

      const image = await processProductImage(req.file);
      const imageKey = await saveProductImage(image);

      const product = await updateProductImageService(
        pool,
        productId,
        imageKey,
      ).catch(async (error: unknown) => {
        try {
          await deleteProductImage(imageKey);
        } catch {
          console.error("Could not clean up the replacement product image.");
        }

        throw error;
      });

      res.status(200).json({ message: "Product picture updated.", product });
    } catch (error: unknown) {
      if (error instanceof ProductValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof ProductError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  return {
    listProductsController,
    getProductDetailsController,
    createProductControllerHandler,
    createProductVariantController,
    updateProductVariantPriceController,
    publishProductController,
    listAdminProductsController,
    deleteProductController,
    updateProductImageController,
    unpublishProductController,
    getAdminProductDetailsController: adminProductHandler("details"),
    updateProductController: adminProductHandler("update"),
  };
}
