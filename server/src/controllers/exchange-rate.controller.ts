import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import {
  getUsdToNgnRate,
  saveUsdToNgnRate,
} from "../services/exchange-rate.service.js";

export function createExchangeRateController(pool: Pool) {
  async function getExchangeRate(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const exchangeRate = await getUsdToNgnRate(pool);
      res.json({ exchangeRate });
    } catch (error: unknown) {
      next(error);
    }
  }

  async function updateExchangeRate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    const rawRate: unknown = req.body?.rate;
    const rate = typeof rawRate === "string" ? rawRate.trim() : "";

    if (!/^\d{1,12}(\.\d{1,6})?$/.test(rate) || !/[1-9]/.test(rate)) {
      res.status(400).json({
        error: "Enter a positive rate with up to six decimal places.",
      });
      return;
    }

    try {
      const exchangeRate = await saveUsdToNgnRate(pool, rate);
      res.json({ exchangeRate });
    } catch (error: unknown) {
      next(error);
    }
  }

  return { getExchangeRate, updateExchangeRate };
}
