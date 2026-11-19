import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import PasswordInput from "../../components/ui/PasswordInput";
import { resetPassword } from "../../services/auth.service";

const linkClass = "mt-4 inline-block font-semibold text-[#17352a] underline";

export default function ResetPasswordPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = searchParams.get("token");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || submitting) return;

    const fields = new FormData(event.currentTarget);
    const newPassword = String(fields.get("newPassword") ?? "");
    const confirmation = String(fields.get("confirmation") ?? "");

    if (newPassword !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await resetPassword(token, newPassword);
      setMessage(result.message);
      setSearchParams({}, { replace: true });
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not reset your password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-5 py-14 md:py-20">
      <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>

      {message ? (
        <>
          <p role="status" className="mt-4 text-emerald-800">
            {message}
          </p>
          <Link to="/login" reloadDocument className={linkClass}>
            Sign in
          </Link>
        </>
      ) : !token || !/^[a-f0-9]{64}$/.test(token) ? (
        <p role="alert" className="mt-4 text-red-800">
          This reset link is invalid. Request a new one below.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6">
          <fieldset disabled={submitting} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="text-sm font-semibold">
                New password
              </label>
              <PasswordInput
                id="reset-password"
                name="newPassword"
                autoComplete="new-password"
                minLength={15}
                maxLength={128}
                required
              />
              <p className="mt-1 text-sm text-stone-600">
                Use 15 to 128 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="reset-confirmation"
                className="text-sm font-semibold"
              >
                Confirm new password
              </label>
              <PasswordInput
                id="reset-confirmation"
                name="confirmation"
                autoComplete="new-password"
                minLength={15}
                maxLength={128}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer rounded-md bg-[#17352a] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Resetting…" : "Reset password"}
            </button>
          </fieldset>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-800">
              {error}
            </p>
          )}
        </form>
      )}

      {!message && (
        <Link to="/forgot-password" className={linkClass}>
          Request a new link
        </Link>
      )}
    </section>
  );
}
