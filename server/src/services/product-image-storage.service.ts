import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

export const productImageDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "products",
);

function getImagePath(imageKey: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$/.test(
      imageKey,
    )
  ) {
    throw new Error("Invalid product image key.");
  }

  return path.join(productImageDirectory, imageKey);
}

export async function saveProductImage(image: Buffer): Promise<string> {
  await mkdir(productImageDirectory, { recursive: true });

  const imageKey = `${randomUUID()}.webp`;
  const imagePath = getImagePath(imageKey);

  await writeFile(imagePath, image, { flag: "wx" });

  return imageKey;
}

export async function deleteProductImage(imageKey: string): Promise<void> {
  try {
    await unlink(getImagePath(imageKey));
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}
