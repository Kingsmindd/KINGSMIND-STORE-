import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import {
  CheckoutValidationError,
  validateCheckoutItems,
  validateShippingAddress,
} from "../validations/checkout.validation.js";
import { resolveSavedCartItems } from "../services/order-draft.service.js";

function validateDraftInput(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CheckoutValidationError("Provide a valid checkout draft.");
  }

  const { currency, items, shippingAddress } = value as Record<string, unknown>;

  if (currency !== "NGN" && currency !== "USD") {
    throw new CheckoutValidationError("Currency must be NGN or USD.");
  }

  return {
    currency,
    items:
      Array.isArray(items) && items.length === 0
        ? []
        : validateCheckoutItems(items),
    shippingAddress:
      shippingAddress === undefined || shippingAddress === null
        ? null
        : validateShippingAddress(shippingAddress),
  };
}

export function createOrderDraftController(pool: Pool) {
  async function getDraft(req: Request, res: Response): Promise<void> {
    const { rows } = await pool.query<{
      payload: ReturnType<typeof validateDraftInput>;
      updated_at: Date;
    }>(
      `SELECT payload, updated_at
     FROM order_drafts
     WHERE user_id = $1`,
      [req.session.userId],
    );

    const draft = rows[0];

    if (!draft) {
      res.json({
        draft: null,
        cartItems: [],
        unavailableCount: 0,
        adjustedCount: 0,
      });
      return;
    }

    const restored = await resolveSavedCartItems(pool, draft.payload.items);
    res.json({ draft, ...restored });
  }

  async function saveDraft(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = validateDraftInput(req.body);

      const result = await pool.query(
        `INSERT INTO order_drafts (user_id, payload)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (user_id) DO UPDATE
         SET payload = EXCLUDED.payload,
             updated_at = NOW()
         RETURNING payload, updated_at`,
        [req.session.userId, JSON.stringify(payload)],
      );

      res.status(200).json({ draft: result.rows[0] });
    } catch (error: unknown) {
      if (error instanceof CheckoutValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function deleteDraft(req: Request, res: Response): Promise<void> {
    await pool.query("DELETE FROM order_drafts WHERE user_id = $1", [
      req.session.userId,
    ]);

    res.status(204).end();
  }

  return { getDraft, saveDraft, deleteDraft };
}
