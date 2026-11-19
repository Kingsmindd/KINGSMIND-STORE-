import BackLink from "../../components/ui/BackLink";
import { useState, type FormEvent, useEffect } from "react";
import PasswordInput from "../../components/ui/PasswordInput";
import { useAuth } from "../../hooks/useAuth";

export default function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!success) return;

    const timeout = window.setTimeout(() => setSuccess(""), 4000);

    return () => window.clearTimeout(timeout);
  }, [success]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSuccess("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    const currentPassword = String(fields.get("currentPassword") ?? "");
    const newPassword = String(fields.get("newPassword") ?? "");
    const confirmation = String(fields.get("confirmation") ?? "");

    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await changePassword({ currentPassword, newPassword });
      form.reset();
      setSuccess("Password changed successfully.");
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not change your password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-5 py-14 md:py-20">
      <BackLink to="/account/settings">Back to settings</BackLink>
      <h1 className="text-3xl font-bold tracking-tight">Change password</h1>
      <p className="mt-2 text-sm text-stone-600">
        Use 15 to 128 characters for your new password.
      </p>

      <form onSubmit={handleSubmit} className="mt-6">
        <fieldset disabled={submitting} className="space-y-5">
          <label
            className="block text-sm font-semibold"
            htmlFor="current-password"
          >
            Current password
            <PasswordInput
              id="current-password"
              name="currentPassword"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>

          <label className="block text-sm font-semibold" htmlFor="new-password">
            New password
            <PasswordInput
              id="new-password"
              name="newPassword"
              autoComplete="new-password"
              minLength={15}
              maxLength={128}
              required
            />
          </label>

          <label
            className="block text-sm font-semibold"
            htmlFor="confirm-password"
          >
            Confirm new password
            <PasswordInput
              id="confirm-password"
              name="confirmation"
              autoComplete="new-password"
              minLength={15}
              maxLength={128}
              required
            />
          </label>

          <button
            type="submit"
            className="w-full cursor-pointer rounded-md bg-[#17352a] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Changing password…" : "Change password"}
          </button>
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-800">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="mt-4 text-sm text-emerald-800">
            {success}
          </p>
        )}
      </form>
    </section>
  );
}
