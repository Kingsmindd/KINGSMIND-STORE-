import type { Pool, PoolClient } from "pg";
import type { DeliveryQuoteInput } from "../validations/order.validation.js";
import type { CancelOrderInput } from "../validations/order.validation.js";

export class OrderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

type OrderQuoteRow = {
  id: string;
  status: string;
  currency: "NGN" | "USD";
  subtotal_minor: string;
  payment_status: "uncollected" | "collected";
};

type QuotedOrder = {
  id: string;
  status: "pending";
  currency: "NGN" | "USD";
  subtotal_minor: string;
  shipping_minor: string;
  total_minor: string;
};

export async function confirmDeliveryQuoteService(
  pool: Pool,
  orderId: string,
  input: DeliveryQuoteInput,
  action: "create" | "edit" = "create",
): Promise<QuotedOrder> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<OrderQuoteRow>(
      `SELECT id, status, currency, subtotal_minor, payment_status
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId],
    );

    const order = result.rows[0];

    if (!order) {
      throw new OrderError("Order not found.", 404);
    }

    if (order.payment_status !== "uncollected") {
      throw new OrderError(
        "Delivery quotes cannot be changed after payment has been collected.",
        409,
      );
    }

    if (action === "create" && order.status !== "awaiting_delivery_quote") {
      throw new OrderError(
        "Only orders awaiting a delivery quote can be quoted.",
        409,
      );
    }

    if (action === "edit" && order.status !== "pending") {
      throw new OrderError(
        "Only pending orders can have their delivery quote edited.",
        409,
      );
    }

    const subtotal = BigInt(order.subtotal_minor);
    const shipping = input.shippingMinor;
    const total = subtotal + shipping;
    const maxAmount = 9223372036854775807n;

    if (shipping < 0n || shipping > maxAmount || total > maxAmount) {
      throw new OrderError("Delivery fee or order total is invalid.", 400);
    }

    const updated = await client.query<QuotedOrder>(
      `UPDATE orders
       SET shipping_minor = $2,
           total_minor = $3,
           status = 'pending'
       WHERE id = $1
       RETURNING
         id,
         status,
         currency,
         subtotal_minor,
         shipping_minor,
         total_minor`,
      [orderId, shipping.toString(), total.toString()],
    );

    const quotedOrder = updated.rows[0];

    if (!quotedOrder) {
      throw new Error("Delivery quote update returned no row.");
    }

    await client.query("COMMIT");

    return quotedOrder;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

type UnquotedOrder = {
  id: string;
  status: "awaiting_delivery_quote";
  currency: "NGN" | "USD";
  subtotal_minor: string;
  shipping_minor: null;
  total_minor: null;
};

export async function deleteDeliveryQuoteService(
  pool: Pool,
  orderId: string,
): Promise<UnquotedOrder> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<OrderQuoteRow>(
      `SELECT id, status, currency, subtotal_minor, payment_status
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId],
    );

    const order = result.rows[0];

    if (!order) {
      throw new OrderError("Order not found.", 404);
    }
    if (order.payment_status !== "uncollected") {
      throw new OrderError(
        "Delivery quotes cannot be changed after payment has been collected.",
        409,
      );
    }
    if (order.status !== "pending") {
      throw new OrderError(
        "Only pending orders with an existing delivery quote can have that quote deleted.",
        409,
      );
    }
    const updated = await client.query<UnquotedOrder>(
      `UPDATE orders
       SET shipping_minor = NULL,
           total_minor = NULL,
           status = 'awaiting_delivery_quote'
       WHERE id = $1
       RETURNING
         id,
         status,
         currency,
         subtotal_minor,
         shipping_minor,
         total_minor`,
      [orderId],
    );

    const unquotedOrder = updated.rows[0];

    if (!unquotedOrder) {
      throw new Error("Delivery quote deletion returned no row.");
    }

    await client.query("COMMIT");

    return unquotedOrder;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

type CustomerOrderItem = {
  variant_id: string;
  product_name: string;
  sku: string;
  size: string | null;
  colour: string | null;
  quantity: number;
  unit_price_minor: string;
  line_total_minor: string;
};

type CustomerOrderAddress = {
  recipient_name: string;
  phone: string;
  address_line1: string;
  city: string;
  state: string;
  country_code: "NG";
};

type CustomerOrder = {
  id: string;
  status: string;
  currency: "NGN" | "USD";
  subtotal_minor: string;
  shipping_minor: string | null;
  total_minor: string | null;
  created_at: Date;
  payment_method: "payment_on_delivery";
  payment_status: "uncollected" | "collected";
  payment_collected_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
};

export async function getCustomerOrderService(
  pool: Pool,
  userId: string,
  orderId: string,
): Promise<
  CustomerOrder & {
    items: CustomerOrderItem[];
    shippingAddress: CustomerOrderAddress;
  }
> {
  const result = await pool.query<CustomerOrder>(
    `SELECT
     id,
     status,
     currency,
     subtotal_minor,
     shipping_minor,
     total_minor,
     created_at,
     payment_method,
     payment_status,
     payment_collected_at,
     cancelled_at,
     cancellation_reason
   FROM orders
   WHERE id = $1 AND user_id = $2`,
    [orderId, userId],
  );
  const order = result.rows[0];

  if (!order) {
    throw new OrderError("Order not found.", 404);
  }

  const itemsResult = await pool.query<CustomerOrderItem>(
    `SELECT
     variant_id,
     product_name,
     sku,
     size,
     colour,
     quantity,
     unit_price_minor,
     line_total_minor
   FROM order_items
   WHERE order_id = $1
   ORDER BY id`,
    [order.id],
  );

  const addressResult = await pool.query<CustomerOrderAddress>(
    `SELECT
     recipient_name,
     phone,
     address_line1,
     city,
     state,
     country_code
   FROM order_shipping_addresses
   WHERE order_id = $1`,
    [order.id],
  );

  const shippingAddress = addressResult.rows[0];

  if (!shippingAddress) {
    throw new Error("Order shipping address is missing.");
  }

  return {
    ...order,
    items: itemsResult.rows,
    shippingAddress,
  };
}

type CancelledOrder = {
  id: string;
  status: "cancelled";
  currency: "NGN" | "USD";
  subtotal_minor: string;
  shipping_minor: string | null;
  total_minor: string | null;
  cancelled_at: Date;
  cancelled_by: string;
  cancellation_reason: string;
};

async function allocateOrderStock(
  client: PoolClient,
  orderId: string,
  currency: "NGN" | "USD",
): Promise<void> {
  const result = await client.query<{
    variant_id: string;
    quantity: number;
    stock_quantity: number;
    product_is_active: boolean;
    variant_is_active: boolean;
    product_currency: "NGN" | "USD";
    variant_currency: "NGN" | "USD";
    listed_currency: "NGN" | "USD" | null;
  }>(
    `SELECT
       oi.variant_id,
       oi.quantity,
       v.stock_quantity,
       p.is_active AS product_is_active,
       v.is_active AS variant_is_active,
       p.currency AS product_currency,
       v.currency AS variant_currency,
       oi.listed_currency
     FROM order_items AS oi
     JOIN product_variants AS v ON v.id = oi.variant_id
     JOIN products AS p ON p.id = v.product_id
     WHERE oi.order_id = $1
     ORDER BY v.id
     FOR UPDATE OF p, v`,
    [orderId],
  );

  if (result.rows.length === 0) {
    throw new OrderError("An order without items cannot be confirmed.", 409);
  }

  for (const item of result.rows) {
    if (!item.product_is_active || !item.variant_is_active) {
      throw new OrderError("An order item is no longer available.", 409);
    }

    const listedCurrency = item.listed_currency ?? currency;

    if (
      item.product_currency !== listedCurrency ||
      item.variant_currency !== listedCurrency
    ) {
      throw new OrderError(
        "An order item's currency no longer matches its original listing.",
        409,
      );
    }

    if (item.stock_quantity < item.quantity) {
      throw new OrderError(
        "There is not enough stock to confirm this order.",
        409,
      );
    }
  }

  for (const item of result.rows) {
    const updated = await client.query<{ id: string }>(
      `UPDATE product_variants
       SET stock_quantity = stock_quantity - $2
       WHERE id = $1
         AND stock_quantity >= $2
       RETURNING id`,
      [item.variant_id, item.quantity],
    );

    if (!updated.rows[0]) {
      throw new OrderError(
        "There is not enough stock to confirm this order.",
        409,
      );
    }

    await client.query(
      `INSERT INTO order_stock_allocations (
         order_id,
         variant_id,
         quantity
       )
       VALUES ($1, $2, $3)`,
      [orderId, item.variant_id, item.quantity],
    );
  }
}

type ConfirmedOrder = {
  id: string;
  status: "confirmed";
  currency: "NGN" | "USD";
  subtotal_minor: string;
  shipping_minor: string;
  total_minor: string;
  payment_method: "payment_on_delivery";
  payment_status: "uncollected";
};

export async function confirmOrderService(
  pool: Pool,
  orderId: string,
): Promise<ConfirmedOrder> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<
      OrderQuoteRow & {
        shipping_minor: string | null;
        total_minor: string | null;
        payment_method: string;
      }
    >(
      `SELECT
         id,
         status,
         currency,
         subtotal_minor,
         shipping_minor,
         total_minor,
         payment_method,
         payment_status
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId],
    );

    const order = result.rows[0];

    if (!order) {
      throw new OrderError("Order not found.", 404);
    }

    if (order.status !== "pending") {
      throw new OrderError("Only pending orders can be confirmed.", 409);
    }

    if (order.shipping_minor === null || order.total_minor === null) {
      throw new OrderError(
        "A delivery quote is required before confirming the order.",
        409,
      );
    }

    if (
      order.payment_method !== "payment_on_delivery" ||
      order.payment_status !== "uncollected"
    ) {
      throw new OrderError(
        "Only uncollected payment-on-delivery orders can be confirmed.",
        409,
      );
    }

    const allocations = await client.query<{ order_id: string }>(
      `SELECT order_id
       FROM order_stock_allocations
       WHERE order_id = $1
       LIMIT 1`,
      [orderId],
    );

    if (allocations.rows.length > 0) {
      throw new OrderError(
        "This order already has stock allocation records.",
        409,
      );
    }

    await allocateOrderStock(client, orderId, order.currency);

    const updated = await client.query<ConfirmedOrder>(
      `UPDATE orders
       SET status = 'confirmed'
       WHERE id = $1
       RETURNING
         id,
         status,
         currency,
         subtotal_minor,
         shipping_minor,
         total_minor,
         payment_method,
         payment_status`,
      [orderId],
    );

    const confirmedOrder = updated.rows[0];

    if (!confirmedOrder) {
      throw new Error("Order confirmation returned no row.");
    }

    await client.query("COMMIT");

    return confirmedOrder;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelOrderService(
  pool: Pool,
  orderId: string,
  adminId: string,
  input: CancelOrderInput,
): Promise<CancelledOrder> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<
      OrderQuoteRow & {
        payment_status: "uncollected" | "collected";
      }
    >(
      `SELECT id, status, currency, subtotal_minor, payment_status
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId],
    );

    const order = result.rows[0];

    if (!order) {
      throw new OrderError("Order not found.", 404);
    }
    if (order.payment_status !== "uncollected") {
      throw new OrderError(
        "An order with collected payment cannot be cancelled. A return or refund process is required.",
        409,
      );
    }
    const cancellableStatuses = [
      "awaiting_delivery_quote",
      "pending",
      "confirmed",
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new OrderError(
        "Only orders awaiting a delivery quote, pending orders, or confirmed orders can be cancelled.",
        409,
      );
    }

    const allocationsResult = await client.query<{
      variant_id: string;
      quantity: number;
    }>(
      `SELECT variant_id, quantity
   FROM order_stock_allocations
   WHERE order_id = $1
     AND status = 'allocated'
   ORDER BY variant_id
   FOR UPDATE`,
      [orderId],
    );

    for (const allocation of allocationsResult.rows) {
      const restored = await client.query<{ id: string }>(
        `UPDATE product_variants
     SET stock_quantity = stock_quantity + $2
     WHERE id = $1
       AND stock_quantity <= 2147483647 - $2
     RETURNING id`,
        [allocation.variant_id, allocation.quantity],
      );

      if (!restored.rows[0]) {
        throw new OrderError(
          "Allocated stock could not be restored. The order was not cancelled.",
          409,
        );
      }
    }

    await client.query(
      `UPDATE order_stock_allocations
   SET status = 'released',
       released_at = NOW()
   WHERE order_id = $1
     AND status = 'allocated'`,
      [orderId],
    );

    const updated = await client.query<CancelledOrder>(
      `UPDATE orders
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancelled_by = $2,
           cancellation_reason = $3
       WHERE id = $1
       RETURNING
         id,
         status,
         currency,
         subtotal_minor,
         shipping_minor,
         total_minor,
         cancelled_at,
         cancelled_by,
         cancellation_reason`,
      [orderId, adminId, input.reason],
    );

    const cancelledOrder = updated.rows[0];

    if (!cancelledOrder) {
      throw new Error("Order cancellation returned no row.");
    }

    await client.query("COMMIT");

    return cancelledOrder;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

type AdminOrderSummary = CustomerOrder & {
  user_id: string | null;
};

export async function listAdminOrdersService(
  pool: Pool,
  page: number = 1,
): Promise<{
  orders: AdminOrderSummary[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw new OrderError(
      "Page must be a whole number between 1 and 100000.",
      400,
    );
  }

  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const result = await pool.query<AdminOrderSummary>(
    `SELECT
       id,
       user_id,
       status,
       currency,
       subtotal_minor,
       shipping_minor,
       total_minor,
       created_at,
       payment_method,
       payment_status,
       payment_collected_at,
       cancelled_at,
       cancellation_reason
     FROM orders
     ORDER BY created_at DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [pageSize + 1, offset],
  );

  return {
    orders: result.rows.slice(0, pageSize),
    page,
    pageSize,
    hasMore: result.rows.length > pageSize,
  };
}

export async function getAdminOrderService(
  pool: Pool,
  orderId: string,
): Promise<
  AdminOrderSummary & {
    items: CustomerOrderItem[];
    shippingAddress: CustomerOrderAddress;
  }
> {
  const result = await pool.query<AdminOrderSummary>(
    `SELECT
       id,
       user_id,
       status,
       currency,
       subtotal_minor,
       shipping_minor,
       total_minor,
       created_at,
       payment_method,
       payment_status,
       payment_collected_at,
       cancelled_at,
       cancellation_reason
     FROM orders
     WHERE id = $1`,
    [orderId],
  );

  const order = result.rows[0];

  if (!order) {
    throw new OrderError("Order not found.", 404);
  }

  const itemsResult = await pool.query<CustomerOrderItem>(
    `SELECT
       variant_id,
       product_name,
       sku,
       size,
       colour,
       quantity,
       unit_price_minor,
       line_total_minor
     FROM order_items
     WHERE order_id = $1
     ORDER BY id`,
    [order.id],
  );

  const addressResult = await pool.query<CustomerOrderAddress>(
    `SELECT
       recipient_name,
       phone,
       address_line1,
       city,
       state,
       country_code
     FROM order_shipping_addresses
     WHERE order_id = $1`,
    [order.id],
  );

  const shippingAddress = addressResult.rows[0];

  if (!shippingAddress) {
    throw new Error("Order shipping address is missing.");
  }

  return {
    ...order,
    items: itemsResult.rows,
    shippingAddress,
  };
}

type ShippedOrder = {
  id: string;
  status: "shipped";
  currency: "NGN" | "USD";
  total_minor: string;
  payment_method: "payment_on_delivery";
  payment_status: "uncollected";
  shipped_at: Date;
  shipped_by: string;
};

export async function shipOrderService(
  pool: Pool,
  orderId: string,
  adminId: string,
): Promise<ShippedOrder> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<
      OrderQuoteRow & {
        payment_method: string;
        total_minor: string | null;
      }
    >(
      `SELECT
         id,
         status,
         currency,
         subtotal_minor,
         total_minor,
         payment_method,
         payment_status
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId],
    );

    const order = result.rows[0];

    if (!order) {
      throw new OrderError("Order not found.", 404);
    }

    if (order.status !== "confirmed") {
      throw new OrderError("Only confirmed orders can be shipped.", 409);
    }

    if (
      order.payment_method !== "payment_on_delivery" ||
      order.payment_status !== "uncollected" ||
      order.total_minor === null
    ) {
      throw new OrderError(
        "The order's payment details are not valid for shipping.",
        409,
      );
    }

    const itemsResult = await client.query<{
      variant_id: string;
      quantity: number;
    }>(
      `SELECT variant_id, quantity
       FROM order_items
       WHERE order_id = $1
       ORDER BY variant_id
       FOR UPDATE`,
      [orderId],
    );

    const allocationsResult = await client.query<{
      variant_id: string;
      quantity: number;
      status: string;
    }>(
      `SELECT variant_id, quantity, status
       FROM order_stock_allocations
       WHERE order_id = $1
       ORDER BY variant_id
       FOR UPDATE`,
      [orderId],
    );

    const allocationsByVariant = new Map(
      allocationsResult.rows.map((allocation) => [
        allocation.variant_id,
        allocation,
      ]),
    );

    if (
      itemsResult.rows.length === 0 ||
      itemsResult.rows.length !== allocationsResult.rows.length
    ) {
      throw new OrderError(
        "The order does not have matching stock allocations.",
        409,
      );
    }

    for (const item of itemsResult.rows) {
      const allocation = allocationsByVariant.get(item.variant_id);

      if (
        !allocation ||
        allocation.status !== "allocated" ||
        allocation.quantity !== item.quantity
      ) {
        throw new OrderError(
          "The order does not have matching stock allocations.",
          409,
        );
      }
    }

    await client.query(
      `UPDATE order_stock_allocations
       SET status = 'consumed',
           consumed_at = NOW()
       WHERE order_id = $1
         AND status = 'allocated'`,
      [orderId],
    );

    const updated = await client.query<ShippedOrder>(
      `UPDATE orders
       SET status = 'shipped',
           shipped_at = NOW(),
           shipped_by = $2
       WHERE id = $1
       RETURNING
         id,
         status,
         currency,
         total_minor,
         payment_method,
         payment_status,
         shipped_at,
         shipped_by`,
      [orderId, adminId],
    );

    const shippedOrder = updated.rows[0];

    if (!shippedOrder) {
      throw new Error("Order shipping update returned no row.");
    }

    await client.query("COMMIT");

    return shippedOrder;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

type CompletedOrder = {
  id: string;
  status: "delivered";
  payment_status: "collected";
  delivered_at: Date;
  delivered_by: string;
  payment_collected_at: Date;
  payment_collected_by: string;
};

export async function completeDeliveryService(
  pool: Pool,
  orderId: string,
  adminId: string,
): Promise<CompletedOrder> {
  const result = await pool.query<CompletedOrder>(
    `UPDATE orders
     SET status = 'delivered',
         delivered_at = NOW(),
         delivered_by = $2,
         payment_status = 'collected',
         payment_collected_at = NOW(),
         payment_collected_by = $2
     WHERE id = $1
       AND status = 'shipped'
       AND payment_method = 'payment_on_delivery'
       AND payment_status = 'uncollected'
       AND total_minor > 0
     RETURNING id, status, payment_status,
               delivered_at, delivered_by,
               payment_collected_at, payment_collected_by`,
    [orderId, adminId],
  );

  const order = result.rows[0];

  if (order) {
    return order;
  }

  const existing = await pool.query("SELECT 1 FROM orders WHERE id = $1", [
    orderId,
  ]);

  if (existing.rows.length === 0) {
    throw new OrderError("Order not found.", 404);
  }

  throw new OrderError(
    "Only shipped orders with a positive, uncollected amount due on delivery can be completed.",
    409,
  );
}

export async function listCustomerOrdersService(
  pool: Pool,
  userId: string,
  page = 1,
) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw new OrderError(
      "Page must be a whole number between 1 and 100000.",
      400,
    );
  }

  const pageSize = 20;

  const result = await pool.query<CustomerOrder>(
    `SELECT
       id, status, currency, subtotal_minor, shipping_minor,
       total_minor, created_at, payment_method, payment_status,
       payment_collected_at, cancelled_at, cancellation_reason
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize + 1, (page - 1) * pageSize],
  );

  return {
    orders: result.rows.slice(0, pageSize),
    page,
    pageSize,
    hasMore: result.rows.length > pageSize,
  };
}
