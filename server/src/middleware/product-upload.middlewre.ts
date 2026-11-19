import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const parseProductImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 3,
    fieldSize: 20 * 1024,
    parts: 4,
  },
}).single("image");

export function uploadProductImage(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("Cache-Control", "no-store");

  parseProductImage(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: "Product image must not exceed 5 MiB.",
        });
        return;
      }

      res.status(400).json({
        error:
          "Upload one image using the image field, with only name, description, and currency as text fields.",
      });
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
}
