import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import {
  confirmGuestSupportEmail,
  requestGuestSupportEmail,
} from "../../services/support-chat.service";

export default function GuestSupportEmail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get("verifyEmail");
  const isConfirmation = token !== null;
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  useEffect(() => {
    if (!feedback) return;

    const timeout = window.setTimeout(
      () => setFeedback(null),
      feedback.isError ? 6000 : 4000,
    );

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function removeConfirmationToken() {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("verifyEmail");
        return next;
      },
      { replace: true },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "").trim();

    setBusy(true);
    setFeedback(null);

    try {
      const result = isConfirmation
        ? await confirmGuestSupportEmail(token)
        : await requestGuestSupportEmail(email);

      if (isConfirmation) {
        setConfirmed(true);
        removeConfirmationToken();
      }

      setFeedback({ text: result.message, isError: false });
    } catch (error: unknown) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not update reply emails.",
        isError: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold text-[#17352a]">
        {isConfirmation ? "Confirm your support email" : "Email me when you reply"}
      </h2>

      {confirmed ? (
        <p className="mt-2 text-sm text-emerald-800">Reply emails are enabled.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {isConfirmation ? (
            <p className="text-sm text-stone-600">
              Confirm in the browser where you started this chat.
            </p>
          ) : (
            <>
              <p className="text-sm text-stone-600">
                Send a chat message first, then add your email for reply notifications.
              </p>
              <label className="block text-sm font-semibold">
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={busy}
                  className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
            </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer rounded-lg bg-[#17352a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Please wait…" : isConfirmation ? "Confirm email" : "Send confirmation email"}
            </button>
            {isConfirmation && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setFeedback(null);
                  removeConfirmationToken();
                }}
                className="cursor-pointer text-sm font-semibold text-[#17352a] underline disabled:cursor-not-allowed"
              >
                Request a new link
              </button>
            )}
          </div>
        </form>
      )}

      {feedback && (
        <p
          role={feedback.isError ? "alert" : "status"}
          className={feedback.isError ? "mt-3 text-sm text-red-800" : "mt-3 text-sm text-emerald-800"}
        >
          {feedback.text}
        </p>
      )}
    </section>
  );
}
