import { apiRequest } from "./api.client";

export type SupportMessage = {
  id: string;
  sender_role: "customer" | "admin";
  body: string;
  created_at: string;
  read_at: string | null;
};

type SupportConversation = {
  id: string;
  display_name: string;
  visitor_type: "guest" | "customer";
  last_message_at: string;
  has_unread: boolean;
};

function messagesPath(conversationId?: string) {
  return conversationId
    ? "/support/admin/conversations/" +
        encodeURIComponent(conversationId) +
        "/messages"
    : "/support/messages";
}

export async function getSupportMessages(
  signal: AbortSignal,
  conversationId?: string,
) {
  const { messages } = await apiRequest<{ messages: SupportMessage[] }>(
    messagesPath(conversationId),
    { signal },
  );
  return messages;
}

export async function sendSupportMessage(
  body: string,
  conversationId?: string,
) {
  const { message } = await apiRequest<{ message: SupportMessage }>(
    messagesPath(conversationId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
  return message;
}

export async function getSupportConversations(signal: AbortSignal) {
  const { conversations } = await apiRequest<{
    conversations: SupportConversation[];
  }>("/support/admin/conversations", { signal });
  return conversations;
}

export function markSupportThreadRead(
  throughMessageId: string,
  conversationId?: string,
  signal?: AbortSignal,
) {
  return apiRequest<void>(messagesPath(conversationId) + "/read", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ throughMessageId }),
    signal,
  });
}

export function requestGuestSupportEmail(email: string) {
  return apiRequest<{ message: string }>("/support/guest-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function confirmGuestSupportEmail(token: string) {
  return apiRequest<{ message: string }>("/support/guest-email/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}
