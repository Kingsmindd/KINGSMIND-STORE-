import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import {
  renderGuestSupportVerificationEmail,
  sendEmail,
} from "./email.service";

type Conversation = { id: string };

export async function openCustomerConversation(
  pool: Pool,
  customerId: string,
): Promise<Conversation> {
  const { rows } = await pool.query<Conversation>(
    `INSERT INTO support_conversations (customer_id)
     VALUES ($1)
     ON CONFLICT (customer_id) DO UPDATE
       SET customer_id = EXCLUDED.customer_id
     RETURNING id`,
    [customerId],
  );

  return rows[0];
}

export async function createGuestConversation(
  pool: Pool,
): Promise<{ id: string; token: string }> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { rows } = await pool.query<Conversation>(
    `INSERT INTO support_conversations (guest_access_token_hash)
     VALUES ($1)
     RETURNING id`,
    [tokenHash],
  );

  return { id: rows[0].id, token };
}

export async function findGuestConversation(
  pool: Pool,
  token: unknown,
): Promise<Conversation | null> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { rows } = await pool.query<Conversation>(
    `SELECT id
     FROM support_conversations
     WHERE customer_id IS NULL AND guest_access_token_hash = $1`,
    [tokenHash],
  );

  return rows[0] ?? null;
}

export async function findCustomerConversation(
  pool: Pool,
  customerId: string,
): Promise<Conversation | null> {
  const { rows } = await pool.query<Conversation>(
    `SELECT id FROM support_conversations WHERE customer_id = $1`,
    [customerId],
  );

  return rows[0] ?? null;
}

export async function listSupportConversations(pool: Pool) {
  const { rows } = await pool.query<{
    id: string;
    display_name: string;
    visitor_type: "guest" | "customer";
    last_message_at: Date;
    has_unread: boolean;
  }>(
    `SELECT sc.id,
            COALESCE(u.name, 'Guest visitor') AS display_name,
            CASE WHEN sc.customer_id IS NULL THEN 'guest'
                 ELSE 'customer' END AS visitor_type,
            latest.created_at AS last_message_at,
            EXISTS (
              SELECT 1
              FROM support_messages AS unread
              WHERE unread.conversation_id = sc.id
                AND unread.sender_role = 'customer'
                AND unread.read_at IS NULL
            ) AS has_unread
     FROM support_conversations AS sc
     LEFT JOIN users AS u ON u.id = sc.customer_id
     JOIN LATERAL (
       SELECT id, created_at
       FROM support_messages
       WHERE conversation_id = sc.id
       ORDER BY id DESC
       LIMIT 1
     ) AS latest ON true
     ORDER BY latest.created_at DESC, latest.id DESC`,
  );

  return rows;
}

export async function findSupportConversation(
  pool: Pool,
  id: string,
): Promise<Conversation | null> {
  const { rows } = await pool.query<Conversation>(
    `SELECT id FROM support_conversations WHERE id = $1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function requestGuestSupportEmail(
  pool: Pool,
  conversationId: string,
  email: string,
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) throw new Error("FRONTEND_URL is missing.");

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const link = new URL("/support", frontendUrl);
  link.searchParams.set("verifyEmail", token);

  const result = await pool.query(
    `UPDATE support_conversations
     SET guest_email = $2,
         guest_email_token_hash = $3,
         guest_email_token_expires_at = now() + interval '30 minutes'
     WHERE id = $1
       AND customer_id IS NULL
       AND guest_email_verified_at IS NULL`,
    [conversationId, email, tokenHash],
  );

  if (result.rowCount !== 1) return false;

  await sendEmail({
    to: email,
    subject: "Confirm your KINGSMIND Support email",
    text: `Confirm your email for support replies: ${link}`,
    html: renderGuestSupportVerificationEmail(link),
  });

  return true;
}

export async function confirmGuestSupportEmail(
  pool: Pool,
  conversationId: string,
  token: string,
): Promise<boolean> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const result = await pool.query(
    `UPDATE support_conversations
     SET guest_email_verified_at = now(),
         guest_email_token_hash = NULL,
         guest_email_token_expires_at = NULL
     WHERE id = $1
       AND customer_id IS NULL
       AND guest_email IS NOT NULL
       AND guest_email_verified_at IS NULL
       AND guest_email_token_hash = $2
       AND guest_email_token_expires_at > now()`,
    [conversationId, tokenHash],
  );

  return result.rowCount === 1;
}
