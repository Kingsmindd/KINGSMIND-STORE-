import type { Pool, PoolClient } from "pg";

type ExchangeRate = {
  rate: string;
  updated_at: Date;
};

export async function getUsdToNgnRate(
  db: Pool | PoolClient,
): Promise<ExchangeRate | null> {
  const result = await db.query<ExchangeRate>(
    `SELECT rate::text AS rate, updated_at
     FROM store_exchange_rates
     WHERE currency_pair = 'USD_NGN'`,
  );

  return result.rows[0] ?? null;
}

export async function saveUsdToNgnRate(
  pool: Pool,
  rate: string,
): Promise<ExchangeRate> {
  const result = await pool.query<ExchangeRate>(
    `INSERT INTO store_exchange_rates (currency_pair, rate)
     VALUES ('USD_NGN', $1)
     ON CONFLICT (currency_pair) DO UPDATE
     SET rate = EXCLUDED.rate, updated_at = now()
     RETURNING rate::text AS rate, updated_at`,
    [rate],
  );

  return result.rows[0];
}
