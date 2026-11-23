import { ActionNotice } from "../../components/ui/AppNotifications";
import BackLink from "../../components/ui/BackLink";
import { useState, type FormEvent } from "react";
import { requestPasswordReset } from "../../services/auth.service";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "").trim();

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not request a reset link.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-5 py-14 md:py-20">
      <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
      <p className="mt-2 text-sm text-stone-600">
        Enter your email to request a password reset link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={submitting}
            className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-4 py-3"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full cursor-pointer rounded-md bg-[#17352a] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {message && (
        <ActionNotice message={message} type={"success"} />
      )}
      {error && (
        <ActionNotice message={error} type={"error"} />
      )}

      <BackLink to="/login">Back to sign in</BackLink>
    </section>
  );
}
