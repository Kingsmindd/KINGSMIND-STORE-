import type { Pool } from "pg";
import { renderSupportEmail, sendEmail } from "./email.service.js";

const MAX_SEND_ATTEMPTS = 5;

type PendingEmail = {
  message_id: string;
  recipient_email: string;
  attempts: number;
  conversation_id: string;
  sender_role: "customer" | "admin";
};

async function deliverNextEmail(
  pool: Pool,
  frontendUrl: string,
): Promise<boolean> {
  const { rows } = await pool.query<PendingEmail>(
    `WITH pending AS (
       SELECT message_id
       FROM support_email_notifications
       WHERE sent_at IS NULL AND next_attempt_at <= now() AND attempts < $1
       ORDER BY next_attempt_at, message_id
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE support_email_notifications AS n
     SET attempts = n.attempts + 1,
         next_attempt_at = now() + interval '2 minutes'
     FROM pending, support_messages AS m
     WHERE n.message_id = pending.message_id
       AND m.id = n.message_id
     RETURNING n.message_id::text, n.recipient_email, n.attempts,
               m.conversation_id, m.sender_role`,
    [MAX_SEND_ATTEMPTS],
  );

  const email = rows[0];
  if (!email) return false;

  const toAdmin = email.sender_role === "customer";
  const path = toAdmin ? `/admin/support/${email.conversation_id}` : "/support";
  const link = new URL(path, frontendUrl);
  const subject = toAdmin
    ? "New message in the KINGSMIND Support inbox"
    : "KINGSMIND Support replied to your message";

  try {
    await sendEmail({
      to: email.recipient_email,
      subject,
      html: renderSupportEmail(link, toAdmin),
      text: `${subject}.\n\nOpen the conversation:\n${link}`,
    });
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Unknown send error";

    if (email.attempts >= MAX_SEND_ATTEMPTS) {
      console.error("Support email reached its retry limit", {
        messageId: email.message_id,
        attempts: email.attempts,
        reason,
      });
      return true;
    }

    const retryInSeconds = 30 * 2 ** (email.attempts - 1);

    await pool.query(
      `UPDATE support_email_notifications
       SET next_attempt_at = now() + $3::integer * interval '1 second'
       WHERE message_id = $1 AND attempts = $2 AND sent_at IS NULL`,
      [email.message_id, email.attempts, retryInSeconds],
    );

    console.warn("Support email retry scheduled", {
      messageId: email.message_id,
      attempts: email.attempts,
      retryInSeconds,
      reason,
    });
    return true;
  }

  await pool.query(
    `UPDATE support_email_notifications
     SET sent_at = now()
     WHERE message_id = $1 AND attempts = $2 AND sent_at IS NULL`,
    [email.message_id, email.attempts],
  );

  return true;
}

export function startSupportEmailWorker(pool: Pool, frontendUrl: string): void {
  async function run() {
    try {
      for (let count = 0; count < 10; count += 1) {
        if (!(await deliverNextEmail(pool, frontendUrl))) break;
      }
    } catch (error) {
      console.error("Support email worker failed", error);
    } finally {
      setTimeout(() => void run(), 5000).unref();
    }
  }

  void run();
}
