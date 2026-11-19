import type { Pool } from "pg";

type SenderRole = "customer" | "admin";

type SupportMessage = {
  id: string;
  sender_role: SenderRole;
  body: string;
  created_at: Date;
  read_at: Date | null;
};

export async function saveSupportMessage(
  pool: Pool,
  input: {
    conversationId: string;
    senderRole: SenderRole;
    body: string;
  },
): Promise<SupportMessage | null> {
  const { rows } = await pool.query<SupportMessage>(
    `WITH conversation AS (
       SELECT sc.id,
         CASE
           WHEN $2 = 'customer' THEN $4::text
           WHEN sc.customer_id IS NOT NULL
             AND u.email_verified_at IS NOT NULL THEN u.email
           WHEN sc.customer_id IS NULL
             AND sc.guest_email_verified_at IS NOT NULL THEN sc.guest_email
         END AS recipient_email
       FROM support_conversations AS sc
       LEFT JOIN users AS u ON u.id = sc.customer_id
       WHERE sc.id = $1
     ),
     message AS (
       INSERT INTO support_messages (conversation_id, sender_role, body)
       SELECT id, $2, $3 FROM conversation
       RETURNING id, sender_role, body, created_at, read_at
     ),
     notification AS (
       INSERT INTO support_email_notifications (message_id, recipient_email)
       SELECT message.id, conversation.recipient_email
       FROM message CROSS JOIN conversation
       WHERE conversation.recipient_email IS NOT NULL
     )
     SELECT id::text AS id, sender_role, body, created_at, read_at
     FROM message`,
    [
      input.conversationId,
      input.senderRole,
      input.body,
      process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || null,
    ],
  );

  return rows[0] ?? null;
}

export async function listSupportMessages(
  pool: Pool,
  conversationId: string,
): Promise<SupportMessage[]> {
  const { rows } = await pool.query<SupportMessage>(
    `SELECT id::text AS id, sender_role, body, created_at, read_at
     FROM support_messages
     WHERE conversation_id = $1
     ORDER BY support_messages.id DESC
     LIMIT 100`,
    [conversationId],
  );

  return rows.reverse();
}

export async function markSupportMessagesRead(
  pool: Pool,
  conversationId: string,
  readerRole: SenderRole,
  throughMessageId: string,
): Promise<void> {
  const incomingRole = readerRole === "admin" ? "customer" : "admin";

  await pool.query(
    `UPDATE support_messages
     SET read_at = now()
     WHERE conversation_id = $1
       AND sender_role = $2
       AND read_at IS NULL
       AND id <= $3::bigint`,
    [conversationId, incomingRole, throughMessageId],
  );
}
