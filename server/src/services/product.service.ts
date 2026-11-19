import type { Pool } from "pg";
import type {
  CreateProductInput,
  CreateVariantInput,
  UpdateProductInput,
} from "../validations/product.validation.js";

export class ProductError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ProductError";
  }
}

type ProductSummary = {
  id: string;
  name: string;
  description: string | null;
  currency: "NGN" | "USD";
  from_price_minor: string;
  image_url: string | null;
  in_stock: boolean;
  created_at: Date;
};

type ProductDetails = {
  id: string;
  name: string;
  description: string | null;
  currency: "NGN" | "USD";
  image_url: string | null;
  created_at: Date;
};

type ProductVariant = {
  id: string;
  sku: string;
  size: string | null;
  colour: string | null;
  stock_quantity: number;
  amount_minor: string;
  in_stock: boolean;
};

type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  currency: "NGN" | "USD";
  image_url: string | null;
  is_active: boolean;
  image_key: string | null;
  requires_delivery_quote: boolean;
  created_at: Date;
};

type AdminProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  colour: string | null;
  stock_quantity: number;
  currency: "NGN" | "USD";
  is_active: boolean;
  amount_minor: string;
};

export async function listProductsService(
  pool: Pool,
  page: number = 1,
  search: string = "",
): Promise<{
  products: ProductSummary[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw new ProductError(
      "Page must be a whole number between 1 and 100000.",
      400,
    );
  }

  const searchTerm = search.trim();

  if (searchTerm.length > 100) {
    throw new ProductError(
      "Search must contain no more than 100 characters.",
      400,
    );
  }
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const result = await pool.query<ProductSummary>(
    `SELECT
       p.id,
       p.name,
       p.description,
       ('/uploads/products/' || p.image_key) AS image_url,
       p.currency,
       MIN(pr.amount_minor)::text AS from_price_minor,
       BOOL_OR(v.stock_quantity > 0) AS in_stock,
       p.created_at
     FROM products AS p
     JOIN product_variants AS v
       ON v.product_id = p.id
       AND v.currency = p.currency
       AND v.is_active = TRUE
     JOIN product_variant_prices AS pr
       ON pr.variant_id = v.id
       AND pr.currency = p.currency
    WHERE p.is_active = TRUE
      AND (
     $3::text = ''
     OR strpos(
      lower(p.name || ' ' || COALESCE(p.description, '')),
      lower($3::text)
     ) > 0
     )
     GROUP BY p.id
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT $1 OFFSET $2`,
    [pageSize + 1, offset, searchTerm],
  );

  return {
    products: result.rows.slice(0, pageSize),
    page,
    pageSize,
    hasMore: result.rows.length > pageSize,
  };
}

export async function getProductDetailsService(
  pool: Pool,
  productId: string,
): Promise<ProductDetails & { variants: ProductVariant[] }> {
  const result = await pool.query<ProductDetails>(
    `SELECT
     id,
     name,
     description,
     currency,
     created_at,
     ('/uploads/products/' || image_key) AS image_url
   FROM products
   WHERE id = $1
     AND is_active = TRUE`,
    [productId],
  );

  const product = result.rows[0];

  if (!product) {
    throw new ProductError("Product not found.", 404);
  }

  const variantsResult = await pool.query<ProductVariant>(
    `SELECT
       v.id,
       v.sku,
       v.size,
       v.colour,
       v.stock_quantity,
       pr.amount_minor::text AS amount_minor,
       (v.stock_quantity > 0) AS in_stock
     FROM product_variants AS v
     JOIN products AS p
       ON p.id = v.product_id
       AND p.currency = v.currency
     JOIN product_variant_prices AS pr
       ON pr.variant_id = v.id
       AND pr.currency = v.currency
     WHERE v.product_id = $1
       AND p.is_active = TRUE
       AND v.is_active = TRUE
     ORDER BY v.created_at, v.id`,
    [product.id],
  );

  if (variantsResult.rows.length === 0) {
    throw new ProductError("Product not found.", 404);
  }

  return {
    ...product,
    variants: variantsResult.rows,
  };
}

export async function createProductService(
  pool: Pool,
  input: CreateProductInput,
  imageKey: string,
): Promise<AdminProduct> {
  const result = await pool.query<AdminProduct>(
    `INSERT INTO products (
       name,
       description,
       currency,
       is_active,
       requires_delivery_quote,
       image_key
     )
     VALUES ($1, $2, $3, FALSE, TRUE, $4)
     RETURNING
       id,
       name,
       description,
       currency,
       is_active,
       requires_delivery_quote,
       image_key,
       ('/uploads/products/' || image_key) AS image_url,
       created_at`,
    [input.name, input.description, input.currency, imageKey],
  );

  const product = result.rows[0];

  if (!product) {
    throw new Error("Product creation returned no row.");
  }

  return product;
}

export async function createProductVariantService(
  pool: Pool,
  productId: string,
  input: CreateVariantInput,
): Promise<AdminProductVariant> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query<{
      id: string;
      currency: "NGN" | "USD";
    }>(
      `SELECT id, currency
       FROM products
       WHERE id = $1
       FOR UPDATE`,
      [productId],
    );

    const product = productResult.rows[0];

    if (!product) {
      throw new ProductError("Product not found.", 404);
    }

    const existingVariant = await client.query(
      `SELECT 1 FROM product_variants WHERE product_id = $1 LIMIT 1`,
      [productId],
    );

    if (existingVariant.rows.length > 0) {
      throw new ProductError("This product already has a variant.", 409);
    }

    const variantResult = await client.query<
      Omit<AdminProductVariant, "amount_minor">
    >(
      `INSERT INTO product_variants (
         product_id,
         sku,
         size,
         colour,
         stock_quantity,
         currency,
         is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING
         id,
         product_id,
         sku,
         size,
         colour,
         stock_quantity,
         currency,
         is_active`,
      [
        product.id,
        input.sku,
        input.size,
        input.colour,
        input.stockQuantity,
        product.currency,
      ],
    );

    const variant = variantResult.rows[0];

    if (!variant) {
      throw new Error("Variant creation returned no row.");
    }

    const priceResult = await client.query<{
      amount_minor: string;
    }>(
      `INSERT INTO product_variant_prices (
         variant_id,
         currency,
         amount_minor
       )
       VALUES ($1, $2, $3)
       RETURNING amount_minor::text AS amount_minor`,
      [variant.id, product.currency, input.amountMinor.toString()],
    );

    const price = priceResult.rows[0];

    if (!price) {
      throw new Error("Variant price creation returned no row.");
    }

    await client.query("COMMIT");

    return {
      ...variant,
      amount_minor: price.amount_minor,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    if (error instanceof Error && "code" in error && error.code === "23505") {
      throw new ProductError("A variant with this SKU already exists.", 409);
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function updateProductVariantPriceService(
  pool: Pool,
  productId: string,
  variantId: string,
  amountMinor: bigint,
): Promise<{ amount_minor: string }> {
  const result = await pool.query<{ amount_minor: string }>(
    `UPDATE product_variant_prices AS price
     SET amount_minor = $3
     FROM product_variants AS variant
     WHERE variant.id = $2
       AND variant.product_id = $1
       AND price.variant_id = variant.id
       AND price.currency = variant.currency
     RETURNING price.amount_minor::text AS amount_minor`,
    [productId, variantId, amountMinor.toString()],
  );

  const price = result.rows[0];

  if (!price) {
    throw new ProductError("Variant price not found for this product.", 404);
  }

  return price;
}

export async function publishProductService(
  pool: Pool,
  productId: string,
): Promise<AdminProduct> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query<{
      is_active: boolean;
      image_key: string | null;
    }>(
      `SELECT is_active, image_key
       FROM products
       WHERE id = $1
       FOR UPDATE`,
      [productId],
    );

    const product = productResult.rows[0];

    if (!product) {
      throw new ProductError("Product not found.", 404);
    }

    if (product.is_active) {
      throw new ProductError("This product is already published.", 409);
    }

    if (!product.image_key) {
      throw new ProductError("Add a product image before publishing.", 409);
    }

    const variantResult = await client.query<{ id: string }>(
      `SELECT v.id
       FROM product_variants AS v
       JOIN product_variant_prices AS pr
         ON pr.variant_id = v.id
         AND pr.currency = v.currency
       JOIN products AS p
         ON p.id = v.product_id
         AND p.currency = v.currency
       WHERE p.id = $1
         AND v.is_active = TRUE
         AND pr.amount_minor > 0
       LIMIT 1`,
      [productId],
    );

    if (variantResult.rows.length === 0) {
      throw new ProductError(
        "Add at least one active variant with a price before publishing.",
        409,
      );
    }

    const updated = await client.query<AdminProduct>(
      `UPDATE products
       SET is_active = TRUE
       WHERE id = $1
       RETURNING
         id,
         name,
         description,
         currency,
         is_active,
         requires_delivery_quote,
         image_key,
         ('/uploads/products/' || image_key) AS image_url,
         created_at`,
      [productId],
    );

    const published = updated.rows[0];

    if (!published) {
      throw new Error("Product publishing returned no row.");
    }

    await client.query("COMMIT");

    return published;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const adminProductColumns = `
  id,
  name,
  description,
  currency,
  is_active,
  requires_delivery_quote,
  image_key,
  ('/uploads/products/' || image_key) AS image_url,
  created_at
`;

type AdminVariantDetails = Omit<AdminProductVariant, "amount_minor"> & {
  amount_minor: string | null;
};

export async function getAdminProductDetailsService(
  pool: Pool,
  productId: string,
): Promise<AdminProduct & { variants: AdminVariantDetails[] }> {
  const result = await pool.query<AdminProduct>(
    `SELECT ${adminProductColumns}
     FROM products
     WHERE id = $1`,
    [productId],
  );

  const product = result.rows[0];

  if (!product) {
    throw new ProductError("Product not found.", 404);
  }

  const variants = await pool.query<AdminVariantDetails>(
    `SELECT
       v.id, v.product_id, v.sku, v.size, v.colour,
       v.stock_quantity, v.currency, v.is_active,
       pr.amount_minor::text AS amount_minor
     FROM product_variants AS v
     LEFT JOIN product_variant_prices AS pr
       ON pr.variant_id = v.id AND pr.currency = v.currency
     WHERE v.product_id = $1
     ORDER BY v.created_at, v.id`,
    [productId],
  );

  return { ...product, variants: variants.rows };
}

export async function updateProductService(
  pool: Pool,
  productId: string,
  input: UpdateProductInput,
): Promise<AdminProduct> {
  const result = await pool.query<AdminProduct>(
    `UPDATE products
     SET name = COALESCE($2::text, name),
         description = CASE
           WHEN $3::boolean THEN $4::text
           ELSE description
         END
     WHERE id = $1
     RETURNING ${adminProductColumns}`,
    [
      productId,
      input.name ?? null,
      input.description !== undefined,
      input.description ?? null,
    ],
  );

  const product = result.rows[0];

  if (!product) {
    throw new ProductError("Product not found.", 404);
  }

  return product;
}

export async function listAdminProductsService(pool: Pool, page = 1) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw new ProductError(
      "Page must be a whole number between 1 and 100000.",
      400,
    );
  }

  const pageSize = 20;
  const result = await pool.query<AdminProduct>(
    `SELECT ${adminProductColumns}
     FROM products
     ORDER BY created_at DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [pageSize + 1, (page - 1) * pageSize],
  );

  return {
    products: result.rows.slice(0, pageSize),
    page,
    pageSize,
    hasMore: result.rows.length > pageSize,
  };
}

export async function unpublishProductService(
  pool: Pool,
  productId: string,
): Promise<AdminProduct> {
  const result = await pool.query<AdminProduct>(
    `UPDATE products
     SET is_active = FALSE
     WHERE id = $1
     RETURNING ${adminProductColumns}`,
    [productId],
  );

  const product = result.rows[0];

  if (!product) {
    throw new ProductError("Product not found.", 404);
  }

  return product;
}

export async function updateProductImageService(
  pool: Pool,
  productId: string,
  imageKey: string,
): Promise<AdminProduct> {
  const result = await pool.query<AdminProduct>(
    `UPDATE products
     SET image_key = $2
     WHERE id = $1
     RETURNING ${adminProductColumns}`,
    [productId, imageKey],
  );

  const product = result.rows[0];

  if (!product) {
    throw new ProductError("Product not found.", 404);
  }

  return product;
}

export async function deleteProductService(
  pool: Pool,
  productId: string,
): Promise<{ image_key: string | null }> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ image_key: string | null }>(
      `SELECT image_key
       FROM products
       WHERE id = $1
       FOR UPDATE`,
      [productId],
    );

    const product = result.rows[0];

    if (!product) {
      throw new ProductError("Product not found.", 404);
    }

    await client.query(
      `DELETE FROM product_variant_prices AS price
       USING product_variants AS variant
       WHERE price.variant_id = variant.id
         AND variant.product_id = $1`,
      [productId],
    );

    await client.query(`DELETE FROM product_variants WHERE product_id = $1`, [
      productId,
    ]);

    await client.query(`DELETE FROM products WHERE id = $1`, [productId]);

    await client.query("COMMIT");
    return product;
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    if (error instanceof Error && "code" in error && error.code === "23503") {
      throw new ProductError(
        "This product has order history. Unpublish it to remove it from the shop.",
        409,
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
