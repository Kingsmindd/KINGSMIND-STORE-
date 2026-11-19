import sharp from "sharp";
import { ProductValidationError } from "../validations/product.validation.js";

export async function processProductImage(
  file: Express.Multer.File | undefined,
): Promise<Buffer> {
  if (!file) {
    throw new ProductValidationError("A product image is required.");
  }

  if (file.buffer.length === 0) {
    throw new ProductValidationError("The uploaded image is empty.");
  }

  try {
    const image = sharp(file.buffer, {
      limitInputPixels: 16_000_000,
      failOn: "warning",
    });

    const metadata = await image.metadata();

    if (
      metadata.format !== "jpeg" &&
      metadata.format !== "png" &&
      metadata.format !== "webp"
    ) {
      throw new ProductValidationError("Upload a JPEG, PNG, or WebP image.");
    }

    if (!metadata.width || !metadata.height) {
      throw new ProductValidationError(
        "The image dimensions could not be read.",
      );
    }

    if ((metadata.pages ?? 1) > 1) {
      throw new ProductValidationError(
        "Animated or multipage images are not supported.",
      );
    }

    return await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (error: unknown) {
    if (error instanceof ProductValidationError) {
      throw error;
    }

    throw new ProductValidationError(
      "The image could not be processed. Upload a valid JPEG, PNG, or WebP image up to 16 megapixels.",
    );
  }
}
