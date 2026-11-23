import toast from "react-hot-toast";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { registerAccount } from "../../services/auth.service";
import type { RegisterResponse } from "../../types/auth.types";
import PasswordInput from "../../components/ui/PasswordInput";

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const passwordLength = password.length;
  const meetsMinimum = passwordLength >= 15;
  const passwordProgress = Math.min((passwordLength / 15) * 100, 100);
  const emailLooksValid =
    email.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (loading) {
    return (
      <p role="status" className="px-5 py-16 text-center">
        Checking your session…
      </p>
    );
  }

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await registerAccount({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      setPassword("");
      setResult(response);
      toast.success(response.verificationEmailSent ? "Account created. Check your email for verification." : "Account created. Request another verification email to continue.", { id: "registration-result" });
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Account creation failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 transition-colors focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a] disabled:opacity-60";
  const passwordClass =
    "min-h-12 rounded-xl text-base text-stone-900 focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a]";

  return (
    <section className="mx-auto max-w-lg px-5 py-10 sm:py-14">
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <header className="border-b border-[#d9ded4] bg-[#edf0e7] p-6 sm:p-8">
      <div className="mb-5 grid size-12 place-items-center rounded-2xl border border-[#17352a]/15 bg-white text-[#17352a]">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-6">
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21v-2a7 7 0 0 1 14 0v2M20 8v6M17 11h6" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[#17352a]">
        Join KINGSMIND
      </h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Create an account to order your kit and track deliveries.
      </p>
      </header>
      <div className="p-6 sm:p-8">

      {result ? (
        <div>
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-900"
          >
            <p className="font-semibold">Your account has been created.</p>
            <p className="mt-2 text-stone-600">{result.message}</p>
          </div>

          <Link
            to="/login"
            className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-[#17352a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#244b3c]"
          >
            Go to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} aria-busy={submitting}>
          {error && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
            >
              {error}
            </p>
          )}

          <fieldset disabled={submitting} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold">
                Your name
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold">
                Email address
              </label>

              <div className="relative mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  aria-describedby="email-help"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`min-h-12 w-full rounded-xl border bg-white py-3 pr-12 pl-4 text-base text-stone-900 transition-colors focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a] disabled:opacity-60 ${
                    emailLooksValid ? "border-emerald-600" : "border-stone-300"
                  }`}
                />

                {emailLooksValid && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-emerald-600"
                  >
                    <path
                      d="m4 10 4 4 8-8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <p
                id="email-help"
                role="status"
                className={`mt-2 text-xs ${
                  emailLooksValid ? "text-emerald-700" : "text-stone-600"
                }`}
              >
                {emailLooksValid
                  ? "Email format looks valid"
                  : "Enter your email address, such as name@example.com"}
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold">
                Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={15}
                maxLength={128}
                aria-describedby="password-help"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={passwordClass}
              />
              <div id="password-help" className="mt-3">
                <div
                  role="progressbar"
                  aria-label="Password minimum length"
                  aria-valuemin={0}
                  aria-valuemax={15}
                  aria-valuenow={Math.min(passwordLength, 15)}
                  aria-valuetext={
                    meetsMinimum
                      ? "Minimum password length reached"
                      : `${passwordLength} of 15 required characters`
                  }
                  className="h-2 overflow-hidden rounded-full bg-stone-200"
                >
                  <div
                    style={{ width: `${passwordProgress}%` }}
                    className={`h-full rounded-full transition-all duration-200 motion-reduce:transition-none ${
                      meetsMinimum ? "bg-emerald-600" : "bg-amber-400"
                    }`}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <p
                    role="status"
                    className={`flex items-center gap-1.5 ${
                      meetsMinimum ? "text-emerald-700" : "text-stone-600"
                    }`}
                  >
                    {meetsMinimum && (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path
                          d="m4 10 4 4 8-8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}

                    {meetsMinimum
                      ? "Minimum length met"
                      : "Use at least 15 characters"}
                  </p>

                  <span className="shrink-0 text-stone-500">
                    {passwordLength} characters
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-semibold"
              >
                Confirm password
              </label>

              <PasswordInput
                id="confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={15}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={passwordClass}
              />
            </div>

            <button
              type="submit"
              className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#17352a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </fieldset>
        </form>
      )}

      {!result && (
        <div className="mt-6 border-t border-stone-200 pt-5">
          <p className="text-center text-sm text-stone-600">
            Already have an account?
          </p>
          <Link to="/login" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-[#17352a] transition-colors hover:border-[#17352a] hover:bg-stone-50">
            Sign in
          </Link>
        </div>
      )}
      </div>
      </div>
      <Link to="/#collection" className="mx-auto mt-5 flex min-h-11 w-fit items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#17352a] hover:bg-[#edf0e7]">
        <span aria-hidden="true">←</span>
        Continue browsing
      </Link>
    </section>
  );
}
