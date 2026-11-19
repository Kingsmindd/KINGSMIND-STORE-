import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { cloudinary } from "../config/cloudinary.js";

export const productImageDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "products",
);

function getPublicId(imageKey: unknown): string | null {
  if (
    typeof imageKey !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$/.test(
      imageKey,
    )
  ) {
    return null;
  }

  return `kingsmind/products/${imageKey.slice(0, -5)}`;
}

export function getProductImageUrl(imageKey: unknown): string | null {
  const publicId = getPublicId(imageKey);

  if (!publicId) return null;

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    type: "upload",
    format: "webp",
  });
}

export async function saveProductImage(image: Buffer): Promise<string> {
  const imageKey = `${randomUUID()}.webp`;
  const publicId = getPublicId(imageKey);

  if (!publicId) {
    throw new Error("Invalid product image key.");
  }

  await cloudinary.uploader.upload(
    `data:image/webp;base64,${image.toString("base64")}`,
    {
      public_id: publicId,
      resource_type: "image",
      format: "webp",
      overwrite: false,
      timeout: 30000,
    },
  );

  return imageKey;
}

export async function deleteProductImage(imageKey: string): Promise<void> {
  const publicId = getPublicId(imageKey);

  if (!publicId) {
    throw new Error("Invalid product image key.");
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("The product image could not be deleted.");
  }

  // Clean up an older locally stored picture when one exists.
  try {
    await unlink(path.join(productImageDirectory, imageKey));
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}
