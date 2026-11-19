import type { Pool } from "pg";
import type { CheckoutItemInput } from "../validations/checkout.validation.js";

type CartProduct = {
  productId: string;
  variantId: string;
  name: string;
  option: string;
  imageUrl: string | null;
  currency: "NGN" | "USD";
  unitPriceMinor: string;
  availableStock: number;
};

export async function resolveSavedCartItems(
  pool: Pool,
  items: CheckoutItemInput[],
) {
  const { rows } = await pool.query<CartProduct>(
    `SELECT p.id AS "productId",
            v.id AS "variantId",
            p.name,
            COALESCE(NULLIF(concat_ws(' / ', v.size, v.colour), ''), v.sku) AS option,
            ('/uploads/products/' || p.image_key) AS "imageUrl",
            pr.currency,
            pr.amount_minor::text AS "unitPriceMinor",
            v.stock_quantity AS "availableStock"
     FROM product_variants AS v
     JOIN products AS p ON p.id = v.product_id
     JOIN product_variant_prices AS pr
       ON pr.variant_id = v.id AND pr.currency = p.currency
     WHERE v.id = ANY($1::uuid[])
       AND p.is_active = true
       AND v.is_active = true
       AND v.stock_quantity > 0
       AND pr.amount_minor > 0`,
    [items.map((item) => item.variantId)],
  );

  const products = new Map(rows.map((row) => [row.variantId, row]));
  const cartItems: (CartProduct & { quantity: number })[] = [];
  let unavailableCount = 0;
  let adjustedCount = 0;

  for (const item of items) {
    const product = products.get(item.variantId.toLowerCase());

    if (!product) {
      unavailableCount += 1;
      continue;
    }

    const quantity = Math.min(item.quantity, product.availableStock);
    if (quantity !== item.quantity) adjustedCount += 1;

    cartItems.push({ ...product, quantity });
  }

  return { cartItems, unavailableCount, adjustedCount };
}
