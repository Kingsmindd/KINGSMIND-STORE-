import type { Pool } from "pg";

export class AdminCustomerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AdminCustomerError";
  }
}

type CustomerAccount = {
  id: string;
  role: "customer" | "admin";
  suspended_at: Date | null;
};

type AdminCustomerListItem = {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  suspended_at: Date | null;
};

export async function listAdminCustomersService(pool: Pool, page = 1) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw new AdminCustomerError(
      "Page must be a whole number between 1 and 100000.",
      400,
    );
  }

  const pageSize = 20;
  const result = await pool.query<AdminCustomerListItem>(
    `SELECT id, name, email, created_at, suspended_at
     FROM users
     WHERE role = 'customer'
     ORDER BY created_at DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [pageSize + 1, (page - 1) * pageSize],
  );

  return {
    customers: result.rows.slice(0, pageSize),
    page,
    pageSize,
    hasMore: result.rows.length > pageSize,
  };
}

export async function suspendCustomerService(
  pool: Pool,
  customerId: string,
): Promise<CustomerAccount> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<CustomerAccount>(
      `SELECT id, role, suspended_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [customerId],
    );

    const customer = result.rows[0];

    if (!customer) {
      throw new AdminCustomerError("Customer account not found.", 404);
    }

    if (customer.role !== "customer") {
      throw new AdminCustomerError(
        "Only customer accounts can be suspended.",
        403,
      );
    }

    const updated = await client.query<CustomerAccount>(
      `UPDATE users
       SET suspended_at = COALESCE(suspended_at, NOW()),
        auth_version = auth_version + 1
       WHERE id = $1
       RETURNING id, role, suspended_at`,
      [customerId],
    );

    const suspendedCustomer = updated.rows[0];

    if (!suspendedCustomer) {
      throw new Error("Customer suspension returned no row.");
    }

    await client.query(
      `DELETE FROM user_sessions
       WHERE sess ->> 'userId' = $1`,
      [customerId],
    );

    await client.query("COMMIT");

    return suspendedCustomer;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function reactivateCustomerService(
  pool: Pool,
  customerId: string,
): Promise<CustomerAccount> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<CustomerAccount>(
      `SELECT id, role, suspended_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [customerId],
    );

    const customer = result.rows[0];

    if (!customer) {
      throw new AdminCustomerError("Customer account not found.", 404);
    }

    if (customer.role !== "customer") {
      throw new AdminCustomerError(
        "Only customer accounts can be reactivated.",
        403,
      );
    }

    if (customer.suspended_at === null) {
      throw new AdminCustomerError(
        "This customer account is already active.",
        409,
      );
    }

    await client.query(
      `DELETE FROM user_sessions
       WHERE sess ->> 'userId' = $1`,
      [customerId],
    );

    const updated = await client.query<CustomerAccount>(
      `UPDATE users
       SET suspended_at = NULL,
        auth_version = auth_version + 1
       WHERE id = $1
       RETURNING id, role, suspended_at`,
      [customerId],
    );

    const reactivatedCustomer = updated.rows[0];

    if (!reactivatedCustomer) {
      throw new Error("Customer reactivation returned no row.");
    }

    await client.query("COMMIT");

    return reactivatedCustomer;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCustomerService(
  pool: Pool,
  customerId: string,
): Promise<{ id: string }> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<CustomerAccount>(
      `SELECT id, role, suspended_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [customerId],
    );

    const customer = result.rows[0];

    if (!customer) {
      throw new AdminCustomerError("Customer account not found.", 404);
    }

    if (customer.role !== "customer") {
      throw new AdminCustomerError(
        "Only customer accounts can be deleted.",
        403,
      );
    }

    await client.query<{ id: string }>(
      `SELECT id
       FROM orders
       WHERE user_id = $1
       ORDER BY id
       FOR UPDATE`,
      [customerId],
    );

    const unresolvedResult = await client.query<{ id: string }>(
      `SELECT id
       FROM orders
       WHERE user_id = $1
         AND (
           status IS NULL
           OR status NOT IN ('delivered', 'cancelled')
         )
       LIMIT 1`,
      [customerId],
    );

    if (unresolvedResult.rows.length > 0) {
      throw new AdminCustomerError(
        "This customer account cannot be deleted while it has unresolved orders.",
        409,
      );
    }

    await client.query(
      `DELETE FROM user_sessions
       WHERE sess ->> 'userId' = $1`,
      [customerId],
    );

    const deleted = await client.query<{ id: string }>(
      `DELETE FROM users
       WHERE id = $1
         AND role = 'customer'
       RETURNING id`,
      [customerId],
    );

    const deletedCustomer = deleted.rows[0];

    if (!deletedCustomer) {
      throw new Error("Customer deletion returned no row.");
    }

    await client.query("COMMIT");

    return deletedCustomer;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
