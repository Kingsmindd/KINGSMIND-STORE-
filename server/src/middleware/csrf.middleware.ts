import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("Cache-Control", "no-store");

  const expectedToken = req.session?.csrfToken;
  const suppliedToken = req.get("X-CSRF-Token");

  if (
    typeof expectedToken !== "string" ||
    typeof suppliedToken !== "string" ||
    !/^[a-f0-9]{64}$/.test(expectedToken) ||
    !/^[a-f0-9]{64}$/.test(suppliedToken)
  ) {
    res.status(403).json({
      error: "Invalid CSRF token.",
    });
    return;
  }

  const matches = timingSafeEqual(
    Buffer.from(expectedToken, "hex"),
    Buffer.from(suppliedToken, "hex"),
  );

  if (!matches) {
    res.status(403).json({
      error: "Invalid CSRF token.",
    });
    return;
  }

  next();
}
