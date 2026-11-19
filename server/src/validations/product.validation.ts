export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

export type CreateProductInput = {
  name: string;
  description: string | null;
  currency: "NGN" | "USD";
};

export function validateCreateProductInput(value: unknown): CreateProductInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProductValidationError("Provide a valid product request.");
  }

  const body = value as Record<string, unknown>;

  if (typeof body.name !== "string") {
    throw new ProductValidationError("Product name is required.");
  }

  const name = body.name.trim();

  if (
    name.length === 0 ||
    Array.from(name).length > 200 ||
    name.includes("\u0000")
  ) {
    throw new ProductValidationError(
      "Product name must contain 1 to 200 characters and no null characters.",
    );
  }

  let description: string | null = null;

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") {
      throw new ProductValidationError("Product description must be text.");
    }

    const text = body.description.trim();

    if (Array.from(text).length > 5000 || text.includes("\u0000")) {
      throw new ProductValidationError(
        "Product description must contain at most 5000 characters and no null characters.",
      );
    }

    description = text.length > 0 ? text : null;
  }

  if (body.currency !== "NGN" && body.currency !== "USD") {
    throw new ProductValidationError("Currency must be NGN or USD.");
  }

  return {
    name,
    description,
    currency: body.currency,
  };
}

export type CreateVariantInput = {
  sku: string;
  size: string | null;
  colour: string | null;
  stockQuantity: number;
  amountMinor: bigint;
};

function readOptionalVariantText(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ProductValidationError(`${field} must be text.`);
  }

  const text = value.trim();

  if (Array.from(text).length > 100 || text.includes("\u0000")) {
    throw new ProductValidationError(
      `${field} must contain at most 100 characters and no null characters.`,
    );
  }

  return text.length > 0 ? text : null;
}

export function validateCreateVariantInput(value: unknown): CreateVariantInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProductValidationError("Provide a valid variant request.");
  }

  const body = value as Record<string, unknown>;

  if (typeof body.sku !== "string") {
    throw new ProductValidationError("SKU is required.");
  }

  const sku = body.sku.trim();

  if (
    sku.length === 0 ||
    Array.from(sku).length > 100 ||
    sku.includes("\u0000")
  ) {
    throw new ProductValidationError(
      "SKU must contain 1 to 100 characters and no null characters.",
    );
  }

  const stockQuantity = body.stockQuantity;

  if (
    typeof stockQuantity !== "number" ||
    !Number.isInteger(stockQuantity) ||
    stockQuantity < 0 ||
    stockQuantity > 2147483647
  ) {
    throw new ProductValidationError(
      "Stock quantity must be a whole number between 0 and 2147483647.",
    );
  }
  const amountMinor = validateVariantPrice(body.amountMinor);

  return {
    sku,
    size: readOptionalVariantText(body.size, "Size"),
    colour: readOptionalVariantText(body.colour, "Colour"),
    stockQuantity,
    amountMinor,
  };
}

export function validateVariantPrice(value: unknown): bigint {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,18}$/.test(value)) {
    throw new ProductValidationError(
      "Price must be a positive whole-number string in minor currency units.",
    );
  }

  const amountMinor = BigInt(value);

  if (amountMinor > 9223372036854775807n) {
    throw new ProductValidationError("Price is too large.");
  }

  return amountMinor;
}

export type UpdateProductInput = {
  name?: string;
  description?: string | null;
};

export function validateUpdateProductInput(value: unknown): UpdateProductInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProductValidationError("Provide a valid product update.");
  }

  const body = value as Record<string, unknown>;
  const keys = Object.keys(body);

  if (
    keys.length === 0 ||
    keys.some((key) => key !== "name" && key !== "description")
  ) {
    throw new ProductValidationError(
      "Provide a name, a description, or both. Other fields cannot be edited here.",
    );
  }

  const input: UpdateProductInput = {};

  if ("name" in body) {
    if (typeof body.name !== "string") {
      throw new ProductValidationError("Product name must be text.");
    }

    const name = body.name.trim();

    if (!name || Array.from(name).length > 200 || name.includes("\u0000")) {
      throw new ProductValidationError(
        "Product name must contain 1 to 200 characters and no null characters.",
      );
    }

    input.name = name;
  }

  if ("description" in body) {
    if (body.description === null) {
      input.description = null;
    } else {
      if (typeof body.description !== "string") {
        throw new ProductValidationError(
          "Product description must be text or null.",
        );
      }

      const description = body.description.trim();

      if (
        Array.from(description).length > 5000 ||
        description.includes("\u0000")
      ) {
        throw new ProductValidationError(
          "Product description must contain at most 5000 characters and no null characters.",
        );
      }

      input.description = description || null;
    }
  }

  return input;
}
