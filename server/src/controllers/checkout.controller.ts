import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import {
  CheckoutValidationError,
  validateCheckoutInput,
  validateCheckoutItems,
} from "../validations/checkout.validation.js";
import {
  CheckoutError,
  createCheckoutService,
  previewCheckoutService,
} from "../services/checkout.service.js";

export function createCheckoutController(pool: Pool) {
  async function checkoutController(
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

      const body: unknown = req.body;
      const input = validateCheckoutInput(body);

      const order = await createCheckoutService(pool, userId, input);

      res.setHeader("Cache-Control", "no-store");

      res.status(201).json({
        message:
          "Order created. Awaiting a delivery quote. Payment is due on delivery.",
        order,
      });
    } catch (error: unknown) {
      if (error instanceof CheckoutValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (error instanceof CheckoutError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function checkoutPreviewController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const items = validateCheckoutItems(req.body?.items);
      const preview = await previewCheckoutService(pool, items);
      res.json({ preview });
    } catch (error: unknown) {
      if (error instanceof CheckoutValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof CheckoutError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  return { checkoutController, checkoutPreviewController };
}
