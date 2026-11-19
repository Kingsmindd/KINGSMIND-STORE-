import BackLink from "../../components/ui/BackLink";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import GuestSupportEmail from "./GuestSupportEmail";
import {
  getSupportConversations,
  getSupportMessages,
  markSupportThreadRead,
  sendSupportMessage,
  type SupportMessage,
} from "../../services/support-chat.service";

const dayFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
});
const timeFormat = new Intl.DateTimeFormat("en-NG", {
  timeStyle: "short",
});

function useSupportFeed<T>(
  load: ((signal: AbortSignal) => Promise<T[]>) | null,
  refresh = 0,
  validate?: (entries: T[]) => void,
) {
  const [entries, setEntries] = useState<T[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!load) return;

    const controller = new AbortController();
    let timeout: number | undefined;

    async function poll(fetchEntries: (signal: AbortSignal) => Promise<T[]>) {
      try {
        const result = await fetchEntries(controller.signal);
        if (!controller.signal.aborted) {
          validate?.(result);
          setEntries(result);
          setError("");
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not load support chat.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          timeout = window.setTimeout(() => void poll(fetchEntries), 5000);
        }
      }
    }

    void poll(load);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [load, refresh, validate]);

  return { entries, setEntries, error };
}

function SupportThread({
  conversationId,
  senderName = "Customer",
}: {
  conversationId?: string;
  senderName?: string;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const lastSentId = useRef<string | null>(null);
  const loadMessages = useCallback(
    (signal: AbortSignal) => getSupportMessages(signal, conversationId),
    [conversationId],
  );
  const validateHistory = useCallback((messages: SupportMessage[]) => {
    const sentId = lastSentId.current;
    const oldest = messages[0];
    if (
      sentId &&
      !messages.some((message) => message.id === sentId) &&
      !(messages.length === 100 && oldest && BigInt(oldest.id) > BigInt(sentId))
    ) {
      throw new Error(
        "Your message was sent. We’re still syncing your conversation history.",
      );
    }
  }, []);
  const { entries, setEntries, error } = useSupportFeed<SupportMessage>(
    loadMessages,
    refresh,
    validateHistory,
  );
  const ownRole = conversationId ? "admin" : "customer";
  const messageList = useRef<HTMLDivElement>(null);
  const latestMessageId = entries?.at(-1)?.id;

  useEffect(() => {
    const list = messageList.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [latestMessageId]);

  useEffect(() => {
    const latestUnread = entries?.findLast(
      (message) => message.sender_role !== ownRole && message.read_at === null,
    );
    if (!latestUnread) return;

    const controller = new AbortController();

    function markVisibleThreadRead() {
      if (document.visibilityState !== "visible") return;

      void markSupportThreadRead(
        latestUnread!.id,
        conversationId,
        controller.signal,
      ).catch(() => {});
    }

    markVisibleThreadRead();
    document.addEventListener("visibilitychange", markVisibleThreadRead);

    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", markVisibleThreadRead);
    };
  }, [entries, ownRole, conversationId]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = body.trim();
    if (sending || !text) return;

    setSending(true);
    setSendError("");

    try {
      const message = await sendSupportMessage(text, conversationId);
      lastSentId.current = message.id;
      setEntries((current) =>
        [
          ...(current ?? []).filter((entry) => entry.id !== message.id),
          message,
        ].slice(-100),
      );
      setBody("");
      setRefresh((value) => value + 1);
    } catch (error: unknown) {
      setSendError(
        error instanceof Error ? error.message : "Could not send the message.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-w-0 rounded-xl border border-stone-200 bg-white">
      <h2 className="px-4 py-3 text-sm font-semibold text-stone-900 sm:px-6">
        Conversation history
      </h2>
      <div
        ref={messageList}
        className="min-h-44 max-h-112 overflow-y-auto border-t border-stone-200 bg-stone-50 p-4 sm:p-6"
      >
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-800">
            {error}
          </p>
        )}
        {!entries && !error && <p role="status">Loading messages…</p>}
        {entries?.length === 0 && (
          <p className="text-sm text-stone-600">
            Send a message to start the conversation.
          </p>
        )}

        <ol aria-label="Messages" className="space-y-3">
          {entries?.map((message, index) => {
            const outgoing = message.sender_role === ownRole;
            const sentAt = new Date(message.created_at);
            const day = dayFormat.format(sentAt);
            const previous = entries[index - 1];
            const startsDay =
              !previous || dayFormat.format(new Date(previous.created_at)) !== day;

            return (
              <li key={message.id}>
                {startsDay && (
                  <p className="mb-3 text-center text-xs font-medium text-stone-600">
                    {day}
                  </p>
                )}
                <div className={outgoing ? "flex justify-end" : "flex"}>
                  <div
                    className={
                      "max-w-[90%] min-w-0 rounded-xl px-4 py-3 sm:max-w-[80%] " +
                      (outgoing
                        ? "bg-[#17352a] text-white"
                        : "border border-stone-200 bg-white text-stone-900")
                    }
                  >
                    <p className="text-xs font-semibold">
                      {outgoing
                        ? "You"
                        : message.sender_role === "admin"
                          ? "KINGSMIND support"
                          : senderName}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm">
                      {message.body}
                    </p>
                    <time
                      dateTime={message.created_at}
                      className="mt-1 block text-xs opacity-80"
                    >
                      {timeFormat.format(sentAt)}
                    </time>
                    {outgoing && (
                      <span
                        className={
                          "mt-1 block text-right text-xs font-semibold " +
                          (message.read_at
                            ? "text-emerald-200"
                            : "text-stone-200")
                        }
                      >
                        <span aria-hidden="true">
                          {message.read_at ? "✓✓" : "✓"}
                        </span>{" "}
                        {message.read_at ? "Read" : "Delivered"}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <form
        onSubmit={handleSend}
        className="space-y-3 border-t border-stone-200 p-4 sm:p-6"
      >
        <label
          htmlFor="support-message"
          className="block text-sm font-semibold"
        >
          Your message
        </label>
        <textarea
          id="support-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          rows={3}
          required
          disabled={sending}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
        />
        {sendError && (
          <p role="alert" className="text-sm text-red-800">
            {sendError}
          </p>
        )}
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="cursor-pointer rounded-lg bg-[#17352a] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}

export function SupportChatLauncher() {
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const isAdmin = user?.role === "admin";
  const { entries: conversations, error: inboxError } = useSupportFeed(
    isAdmin ? getSupportConversations : null,
  );
  const { entries: messages } = useSupportFeed(
    !isAdmin && !open ? getSupportMessages : null,
  );
  const selectedConversation = conversations?.find(
    (conversation) => conversation.id === conversationId,
  );
  const unreadCount = isAdmin
    ? conversations?.filter((conversation) => conversation.has_unread).length ?? 0
    : messages?.filter((message) => message.sender_role === "admin" && !message.read_at).length ?? 0;
  const label = isAdmin ? "Support inbox" : "Support chat";
  const unreadItem = isAdmin ? "conversation" : "message";
  const unreadLabel = unreadCount
    ? `, ${unreadCount} unread ${unreadItem}${unreadCount === 1 ? "" : "s"}`
    : "";

  return (
    <>
      <button
        type="button"
        aria-label={`Open ${label.toLowerCase()}${unreadLabel}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="support-chat-dialog"
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
        className="fixed right-4 bottom-4 z-60 grid size-14 cursor-pointer place-items-center rounded-2xl border border-[#d7afa0] bg-[#fff8f2] text-[#8c392d] shadow-lg shadow-[#48221b]/20 transition-colors hover:border-[#b56d5b] hover:bg-[#f8e8dd] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8c392d] sm:right-6 sm:bottom-6 sm:size-16"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 32 32"
          className="size-8"
          fill="none"
        >
          <rect x="3" y="7" width="26" height="18" rx="4" fill="currentColor" />
          <path
            d="m5 10 9.35 7.1a2.75 2.75 0 0 0 3.3 0L27 10"
            stroke="#fff8f2"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-[#fff8f2] bg-red-700 px-1 text-xs leading-none font-bold text-white tabular-nums"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <dialog
        id="support-chat-dialog"
        ref={dialogRef}
        aria-labelledby="support-chat-title"
        onClose={() => {
          setOpen(false);
          setConversationId(undefined);
        }}
        className="fixed inset-auto right-4 bottom-4 m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white text-stone-900 shadow-xl backdrop:bg-black/20 sm:right-6 sm:bottom-6 sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-[#17352a] px-4 py-2 text-white">
          <h2 id="support-chat-title" className="font-semibold">
            {isAdmin ? label : "KINGSMIND support"}
          </h2>
          <button
            type="button"
            aria-label={`Close ${label.toLowerCase()}`}
            onClick={() => dialogRef.current?.close()}
            className="grid size-10 cursor-pointer place-items-center rounded-lg text-2xl hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {open && (
          <div className="bg-stone-50 p-3">
            {isAdmin ? (
              conversationId ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConversationId(undefined)}
                    className="mb-3 cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-[#17352a] hover:bg-stone-200"
                  >
                    ← Back to conversations
                  </button>
                  <SupportThread
                    key={conversationId}
                    conversationId={conversationId}
                    senderName={
                      selectedConversation?.visitor_type === "guest"
                        ? "Visitor"
                        : selectedConversation?.display_name
                    }
                  />
                </>
              ) : (
                <>
                  {inboxError && <p role="alert" className="p-2 text-sm text-red-800">{inboxError}</p>}
                  {!conversations && !inboxError && (
                    <p role="status" className="p-2 text-sm">Loading conversations…</p>
                  )}
                  {conversations?.length === 0 && (
                    <p className="p-2 text-sm text-stone-600">No conversations yet.</p>
                  )}
                  <ul aria-label="Support conversations" className="space-y-2">
                    {conversations?.map((conversation) => (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => setConversationId(conversation.id)}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3 text-left text-sm hover:bg-stone-100"
                        >
                          <span className="min-w-0 wrap-break-word font-semibold">
                            {conversation.display_name}
                          </span>
                          {conversation.has_unread && (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                              Unread
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )
            ) : (
              <>
                <SupportThread />
                {!user && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer rounded-lg px-2 py-2 font-semibold text-[#17352a]">
                      Email notifications for replies
                    </summary>
                    <GuestSupportEmail />
                  </details>
                )}
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}

export default function SupportChatPage() {
  const { user } = useAuth();

  return (
    <section className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Support chat</h1>
      <SupportThread key={user?.id ?? "guest"} />
      {!user && <GuestSupportEmail />}
    </section>
  );
}

/// SUPPORT INBOX PAGE

export function SupportInboxPage() {
  const { conversationId } = useParams();
  const { entries, error } = useSupportFeed(getSupportConversations);
  const selectedConversation = entries?.find(
    (conversation) => conversation.id === conversationId,
  );
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      {conversationId && <BackLink to="/admin/support">Back to support inbox</BackLink>}
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Support inbox</h1>
      <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <nav
          aria-label="Support conversations"
          className="rounded-xl border border-stone-200 bg-white p-3"
        >
          {error && (
            <p role="alert" className="p-2 text-sm text-red-800">
              {error}
            </p>
          )}
          {!entries && !error && (
            <p role="status" className="p-2 text-sm">
              Loading conversations…
            </p>
          )}
          {entries?.length === 0 && (
            <p className="p-2 text-sm">No conversations yet.</p>
          )}
          <ul className="space-y-1">
            {entries?.map((conversation) => {
              const selected = conversation.id === conversationId;

              return (
                <li key={conversation.id}>
                  <Link
                    to={"/admin/support/" + conversation.id}
                    aria-current={selected ? "page" : undefined}
                    className={
                      "block rounded-lg px-3 py-2 text-sm " +
                      (selected ? "bg-[#e9ebdf]" : "hover:bg-stone-50")
                    }
                  >
                    <span className="block wrap-break-word font-semibold">
                      {conversation.display_name}
                    </span>
                    <span className="text-stone-600">
                      {conversation.visitor_type === "guest"
                        ? "Guest"
                        : "Customer"}
                      {conversation.has_unread && " · Unread"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {conversationId ? (
          <SupportThread
            key={conversationId}
            conversationId={conversationId}
            senderName={
              selectedConversation?.visitor_type === "guest"
                ? "Visitor"
                : selectedConversation?.display_name
            }
          />
        ) : (
          <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            Select a conversation to view messages and reply.
          </p>
        )}
      </div>
    </section>
  );
}
