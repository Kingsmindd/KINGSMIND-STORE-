import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";

const actionClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-center text-sm font-semibold text-[#17352a] transition-colors hover:border-[#17352a] hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a]";

export default function SettingsPage() {
  const { user, updateName } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!message && !error) return;

    const timeout = window.setTimeout(
      () => {
        setMessage("");
        setError("");
      },
      error ? 6000 : 4000,
    );

    return () => window.clearTimeout(timeout);
  }, [message, error]);

  if (!user) return null;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingName || saving) return;

    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") ?? "").trim();

    setMessage("");
    setError("");

    if (!name) {
      setError("Enter your name.");
      return;
    }

    setSaving(true);

    try {
      await updateName(name);
      setEditingName(false);
      setMessage("Name updated.");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Could not update your name.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-5 py-10 md:px-8 md:py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[#17352a] sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Manage your profile and account security.
        </p>
      </header>

      <form
        onSubmit={handleSave}
        className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-4 border-b border-stone-200 bg-[#edf0e7] p-5 sm:px-6">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full border border-[#17352a]/15 bg-white text-lg font-bold text-[#17352a]">
            {Array.from(user.name.trim())[0]?.toLocaleUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#17352a]">Profile</h2>
            <p className="mt-0.5 text-sm text-stone-600">Your account name</p>
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
        {editingName ? (
          <>
            <label className="block text-sm font-semibold">
              Name
              <input
                name="name"
                defaultValue={user.name}
                autoComplete="name"
                autoFocus
                maxLength={100}
                required
                disabled={saving}
                className="mt-2 block min-h-12 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a] disabled:opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 w-full cursor-pointer rounded-lg bg-[#17352a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Saving…" : "Save name"}
            </button>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <dl className="min-w-0 flex-1">
              <dt className="text-xs font-medium text-stone-500">Full name</dt>
              <dd className="mt-1 wrap-break-word text-base font-semibold text-[#17352a]">
                {user.name}
              </dd>
            </dl>
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setEditingName(true);
              }}
              className={actionClass}
            >
              Edit name
            </button>
          </div>
        )}
        {message && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            {error}
          </p>
        )}
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-stone-200 bg-[#edf0e7] p-5 sm:px-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#17352a]/15 bg-white text-[#17352a]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-6">
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-bold text-[#17352a]">Account security</h2>
            <p className="mt-0.5 text-sm text-stone-600">Email verification and password</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Email address</h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                user.email_verified_at
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {user.email_verified_at ? "Verified" : "Verification pending"}
            </span>
          </div>

          <p className="mt-3 wrap-break-word text-sm text-stone-600">
            {user.email}
          </p>

          {!user.email_verified_at && (
            <Link
              to="/verify-email"
              state={{ fromSettings: true }}
              className={`mt-4 w-full sm:w-auto ${actionClass}`}
            >
              Verify email or request a new link
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 p-5 sm:p-6">
          <div>
            <h3 className="text-sm font-semibold">Password</h3>
            <p className="mt-1 text-sm text-stone-500">Update your account password.</p>
          </div>
          <Link
            to="/account/password"
            className={`w-full sm:w-auto ${actionClass}`}
          >
            Change password
          </Link>
        </div>
      </section>
    </section>
  );
}
