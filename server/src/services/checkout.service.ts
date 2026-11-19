import type { Pool, PoolClient } from "pg";
import type {
  CheckoutInput,
  CheckoutItemInput,
} from "../validations/checkout.validation.js";
import { getUsdToNgnRate } from "./exchange-rate.service.js";
import { createHash } from "crypto";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

type CheckoutVariantRow = {
  variant_id: string;
  product_name: string;
  sku: string;
  size: string | null;
  colour: string | null;
  stock_quantity: number;
  product_is_active: boolean;
  variant_is_active: boolean;
  currency: "NGN" | "USD";
  amount_minor: string | null;
};

async function getCheckoutVariants(
  client: Pool | PoolClient,
  variantIds: string[],
  lockRows = true,
): Promise<CheckoutVariantRow[]> {
  const result = await client.query<CheckoutVariantRow>(
    `SELECT
       v.id AS variant_id,
       p.name AS product_name,
       v.sku,
       v.size,
       v.colour,
       v.stock_quantity,
       p.is_active AS product_is_active,
       v.is_active AS variant_is_active,
       p.currency,
       pr.amount_minor
     FROM product_variants AS v
     JOIN products AS p
       ON p.id = v.product_id
     JOIN product_variant_prices AS pr
       ON pr.variant_id = v.id
       AND pr.currency = p.currency
     WHERE v.id = ANY($1::uuid[])
     ORDER BY v.id
     ${lockRows ? "FOR UPDATE OF p, v, pr" : ""}`,
    [variantIds],
  );

  return result.rows;
}

function priceCheckoutItems(
  items: CheckoutItemInput[],
  variants: CheckoutVariantRow[],
  currency: CheckoutInput["currency"],
  usdToNgnRate: string | null = null,
) {
  const variantsById = new Map(
    variants.map((variant) => [variant.variant_id, variant]),
  );

  const rateScale = 1_000_000n;
  const [whole, fraction = ""] = (usdToNgnRate ?? "0").split(".");
  const scaledRate =
    BigInt(whole) * rateScale + BigInt(fraction.padEnd(6, "0"));
  let subtotal = 0n;

  const lines = items.map((item) => {
    const variant = variantsById.get(item.variantId);

    if (
      !variant ||
      !variant.product_is_active ||
      !variant.variant_is_active ||
      variant.amount_minor === null
    ) {
      throw new CheckoutError("One or more items are unavailable.", 409);
    }

    if (item.quantity > variant.stock_quantity) {
      throw new CheckoutError(`Not enough stock for ${variant.sku}.`, 409);
    }

    const listedPrice = BigInt(variant.amount_minor);
    if (listedPrice <= 0n) {
      throw new CheckoutError("One or more items have an invalid price.", 409);
    }

    let unitPrice = listedPrice;

    if (variant.currency !== currency) {
      if (
        currency !== "NGN" ||
        variant.currency !== "USD" ||
        scaledRate <= 0n
      ) {
        throw new CheckoutError(
          "Checkout cannot convert this item's price. Check the exchange rate.",
          409,
        );
      }

      unitPrice = (listedPrice * scaledRate + rateScale / 2n) / rateScale;

      if (unitPrice === 0n) {
        throw new CheckoutError("An item converts to less than one kobo.", 409);
      }
    }

    const lineTotal = unitPrice * BigInt(item.quantity);
    subtotal += lineTotal;

    return {
      variantId: item.variantId,
      quantity: item.quantity,
      listed_currency: variant.currency,
      listed_unit_price_minor: listedPrice.toString(),
      unit_price_minor: unitPrice.toString(),
      line_total_minor: lineTotal.toString(),
    };
  });

  if (subtotal > 9223372036854775807n) {
    throw new CheckoutError("Order total is too large.", 400);
  }

  return { lines, subtotal };
}

function createPricingFingerprint(
  rate: string | null,
  lines: ReturnType<typeof priceCheckoutItems>["lines"],
): string {
  return createHash("sha256")
    .update(JSON.stringify({ currency: "NGN", rate, lines }))
    .digest("hex");
}

export async function previewCheckoutService(
  pool: Pool,
  items: CheckoutItemInput[],
) {
  const variants = await getCheckoutVariants(
    pool,
    items.map((item) => item.variantId),
    false,
  );

  const needsConversion = variants.some(
    (variant) => variant.currency === "USD",
  );
  const exchangeRate = needsConversion ? await getUsdToNgnRate(pool) : null;
  const rate = exchangeRate?.rate ?? null;
  const { lines, subtotal } = priceCheckoutItems(items, variants, "NGN", rate);

  return {
    currency: "NGN" as const,
    usd_to_ngn_rate: rate,
    subtotal_minor: subtotal.toString(),
    items: lines,
    pricing_fingerprint: createPricingFingerprint(rate, lines),
  };
}

type UnquotedOrder = {
  id: string;
  status: "awaiting_delivery_quote";
  currency: "NGN" | "USD";
  subtotal_minor: string;
  shipping_minor: null;
  total_minor: null;
};

async function insertUnquotedOrder(
  client: PoolClient,
  userId: string,
  currency: CheckoutInput["currency"],
  subtotal: bigint,
  rate: string | null,
): Promise<UnquotedOrder> {
  const result = await client.query<UnquotedOrder>(
    `INSERT INTO orders (
       user_id,
       status,
       currency,
       subtotal_minor,
       shipping_minor,
       total_minor,
       usd_to_ngn_rate
     )
     VALUES ($1, 'awaiting_delivery_quote', $2, $3, NULL, NULL, $4)
     RETURNING
       id,
       status,
       currency,
       subtotal_minor,
       shipping_minor,
       total_minor`,
    [userId, currency, subtotal.toString(), rate],
  );

  const order = result.rows[0];

  if (!order) {
    throw new Error("Order creation returned no row.");
  }

  return order;
}

async function insertOrderItems(
  client: PoolClient,
  orderId: string,
  lines: ReturnType<typeof priceCheckoutItems>["lines"],
  variants: CheckoutVariantRow[],
): Promise<void> {
  const variantsById = new Map(
    variants.map((variant) => [variant.variant_id, variant]),
  );

  for (const item of lines) {
    const variant = variantsById.get(item.variantId);

    if (!variant) {
      throw new Error("Validated order item is missing its variant.");
    }

    await client.query(
      `INSERT INTO order_items (
         order_id,
         variant_id,
         product_name,
         sku,
         size,
         colour,
         quantity,
         unit_price_minor,
         line_total_minor,
         listed_currency,
         listed_unit_price_minor
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        orderId,
        variant.variant_id,
        variant.product_name,
        variant.sku,
        variant.size,
        variant.colour,
        item.quantity,
        item.unit_price_minor,
        item.line_total_minor,
        item.listed_currency,
        item.listed_unit_price_minor,
      ],
    );
  }
}

async function insertShippingAddress(
  client: PoolClient,
  orderId: string,
  address: CheckoutInput["shippingAddress"],
): Promise<void> {
  await client.query(
    `INSERT INTO order_shipping_addresses (
       order_id,
       recipient_name,
       phone,
       address_line1,
       city,
       state,
       country_code
     )
     VALUES ($1, $2, $3, $4, $5, $6, 'NG')`,
    [
      orderId,
      address.recipientName,
      address.phone,
      address.addressLine1,
      address.city,
      address.state,
    ],
  );
}

export async function createCheckoutService(
  pool: Pool,
  userId: string,
  input: CheckoutInput,
): Promise<UnquotedOrder> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const accountResult = await client.query<{
      id: string;
      suspended_at: Date | null;
    }>(
      `SELECT id, suspended_at
   FROM users
   WHERE id = $1
   FOR UPDATE`,
      [userId],
    );

    const account = accountResult.rows[0];

    if (!account) {
      throw new CheckoutError("Please log in to continue.", 401);
    }

    if (account.suspended_at !== null) {
      throw new CheckoutError(
        "Your account has been suspended. Please contact support.",
        403,
      );
    }

    const variantIds = input.items.map((item) => item.variantId);
    const variants = await getCheckoutVariants(client, variantIds);

    const needsConversion =
      input.currency === "NGN" &&
      variants.some((variant) => variant.currency === "USD");

    if (needsConversion && !input.pricingFingerprint) {
      throw new CheckoutError(
        "Review the checkout prices before placing your order.",
        409,
      );
    }

    const exchangeRate = needsConversion ? await getUsdToNgnRate(client) : null;
    const rate = exchangeRate?.rate ?? null;
    const { subtotal, lines } = priceCheckoutItems(
      input.items,
      variants,
      input.currency,
      rate,
    );

    if (
      input.pricingFingerprint &&
      input.pricingFingerprint !== createPricingFingerprint(rate, lines)
    ) {
      throw new CheckoutError(
        "Checkout prices changed. Review the updated total.",
        409,
      );
    }

    const order = await insertUnquotedOrder(
      client,
      userId,
      input.currency,
      subtotal,
      rate,
    );

    await insertOrderItems(client, order.id, lines, variants);
    await insertShippingAddress(client, order.id, input.shippingAddress);

    await client.query("COMMIT");

    return order;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
