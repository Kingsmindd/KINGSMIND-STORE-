import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import PasswordInput from "../../components/ui/PasswordInput";

export default function LoginPage() {
  const { user, loading, error: sessionError, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const passwordChanged: unknown = location.state?.passwordChanged;

  if (loading) {
    return (
      <p role="status" className="mx-auto max-w-7xl px-5 py-16">
        Checking your session…
      </p>
    );
  }

  if (user) {
    const from: unknown = location.state?.from;
    const customerPath =
      /^\/(?:support|checkout|account\/(?:settings|password)|orders(?:\/[^/\\?#]+)?)$/;
    const adminPath =
      /^\/admin\/(?:customers|exchange-rate|(?:orders|products|support)(?:\/[^/\\?#]+)?)$/;

    const canReturn =
      typeof from === "string" &&
      (customerPath.test(from) || (user.role === "admin" && adminPath.test(from)));
    const destination = canReturn ? from : "/";

    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await login({ email: email.trim(), password });
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg px-5 py-10 sm:py-14">
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <header className="border-b border-[#d9ded4] bg-[#edf0e7] p-6 sm:p-8">
      <div className="mb-5 grid size-12 place-items-center rounded-2xl border border-[#17352a]/15 bg-white text-[#17352a]">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-6">
          <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M13 8l4 4-4 4M8 12h12" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[#17352a]">
        Welcome back
      </h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Sign in to place orders and keep track of your kit.
      </p>
      </header>
      <div className="p-6 sm:p-8">

      <form onSubmit={handleSubmit} aria-busy={submitting}>
        {typeof passwordChanged === "string" && (
          <p
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
          >
            {passwordChanged}
          </p>
        )}
        {(error || sessionError) && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          >
            {error || sessionError}
          </p>
        )}

        <fieldset disabled={submitting} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold">
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 transition-colors placeholder:text-stone-400 focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a] disabled:opacity-60"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="password" className="block text-sm font-semibold">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="rounded-sm text-xs font-semibold text-[#17352a] underline underline-offset-4 hover:text-[#527137]"
              >
                Forgot password?
              </Link>
            </div>

            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 rounded-xl text-base text-stone-900 focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a]"
            />
          </div>

          <button
            type="submit"
            className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#17352a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </fieldset>
      </form>

      <div className="mt-6 border-t border-stone-200 pt-5">
      <p className="text-center text-sm text-stone-600">
        New to KINGSMIND?
      </p>
        <Link to="/register" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 py-3 text-center text-sm font-semibold text-[#17352a] transition-colors hover:border-[#17352a] hover:bg-stone-50">
          Create an account
        </Link>
      </div>
      </div>
      </div>
      <Link
        to="/#collection"
        className="mx-auto mt-5 flex min-h-11 w-fit items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#17352a] hover:bg-[#edf0e7]"
      >
        <span aria-hidden="true">←</span>
        Continue browsing
      </Link>
    </section>
  );
}
