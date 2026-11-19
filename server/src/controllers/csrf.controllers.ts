import { randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function csrfTokenController(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("Cache-Control", "no-store");

  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString("hex");
  }

  const csrfToken = req.session.csrfToken;

  req.session.save((error: unknown) => {
    if (error) {
      next(error);
      return;
    }

    res.status(200).json({ csrfToken });
  });
}
