import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import {
  verifyAccountEmail,
  resendAccountVerification,
} from "../../services/auth.service";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/api.client";

export default function VerifyEmailPage() {
  const { user, refreshAccount } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get("token") || "";
  const hasValidTokenFormat = /^[a-f0-9]{64}$/.test(token);
  const [fromSettings] = useState(
    () => location.state?.fromSettings === true && !searchParams.has("token"),
  );

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkRejected, setLinkRejected] = useState(false);
  const unavailableLink = !verified && (
    linkRejected || (searchParams.has("token") && !hasValidTokenFormat)
  );
  const verificationRequest = useRef<{
    token: string;
    promise: Promise<{ message: string; refreshFailed: boolean }>;
  } | null>(null);
  const verifyingLink = hasValidTokenFormat && !verified && !error && !busy && !linkRejected;

  useEffect(() => {
    if (!message || verified) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [message, verified]);

  useEffect(() => {
    if (!hasValidTokenFormat) return;
    let active = true;

    // Reuse the request when React replays effects in development.
    if (verificationRequest.current?.token !== token) {
      verificationRequest.current = {
        token,
        promise: verifyAccountEmail(token).then(async (result) => {
          let refreshFailed = false;
          if (user) {
            try {
              await refreshAccount();
            } catch {
              refreshFailed = true;
            }
          }
          return { message: result.message, refreshFailed };
        }),
      };
    }

    void verificationRequest.current.promise.then(
      (result) => {
        if (!active) return;
        setVerified(true);
        setMessage(result.message);
        toast.success(result.message, { id: "email-verification" });
        setError(
          result.refreshFailed
            ? "Email verified. Refresh the page to update your account status."
            : null,
        );
        setSearchParams({}, { replace: true });
      },
      (error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 400) {
          setLinkRejected(true);
        }
        setError(
          error instanceof Error
            ? error.message
            : "Verification could not be completed. Request a new link below.",
        );
      },
    );

    return () => {
      active = false;
    };
  }, [token, hasValidTokenFormat, user, refreshAccount, setSearchParams]);

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    setMessage("");

    try {
      const result = await resendAccountVerification(email.trim());
      setMessage(result.message);
      toast.success(result.message, { id: "email-verification" });
      setSearchParams({}, { replace: true });
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "The verification request could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg px-5 py-10 sm:py-14">
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <header className="border-b border-[#d9ded4] bg-[#edf0e7] p-6 sm:p-8">
      <div className="mb-5 grid size-12 place-items-center rounded-2xl border border-[#17352a]/15 bg-white text-[#17352a]">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-6">
          {verified ? (
            <path d="m5 12 4 4L19 6" />
          ) : unavailableLink ? (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6M12 17h.01" />
            </>
          ) : (
            <>
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m4 7 8 6 8-6" />
            </>
          )}
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[#17352a]">
        {verified
          ? "Email verified"
          : unavailableLink
            ? "Verification link unavailable"
            : verifyingLink
              ? "Verifying your email…"
              : "Verify your email"}
      </h1>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        {verified
          ? "Your email address has been confirmed."
          : unavailableLink
            ? "This link may have expired, already been used, or been replaced by a newer email."
          : verifyingLink
            ? "We’re confirming your verification link."
            : "Confirm your email address before placing an order."}
      </p>
      </header>
      <div className="p-6 sm:p-8">

      {message && verified && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
        >
          {message}
        </p>
      )}

      {error && !unavailableLink && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {error}
        </p>
      )}

      {verified ? (
        <a
          href="/#collection"
          className="flex min-h-12 items-center justify-center rounded-xl bg-[#17352a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#244b3c]"
        >
          Continue shopping
        </a>
      ) : unavailableLink ? (
        <div>
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            If you’ve already verified your email, you can continue shopping.
            Otherwise, request a new link and use the latest verification email.
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setLinkRejected(false);
              setSearchParams({}, { replace: true });
            }}
            className="mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#17352a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244b3c]"
          >
            Request a new link
          </button>
          <Link to="/#collection" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-[#17352a] hover:bg-stone-50">
            Continue shopping
          </Link>
        </div>
      ) : verifyingLink ? (
        <p role="status" className="rounded-xl bg-[#f1f2eb] px-4 py-5 text-sm leading-6 text-[#17352a]">
          Confirming your email address. Please wait…
        </p>
      ) : (
        <>

          <form
            onSubmit={handleResend}
            className={hasValidTokenFormat ? "border-t border-stone-200 pt-6" : ""}
            aria-busy={busy}
          >
            <h2 className="font-semibold text-[#17352a]">
              {hasValidTokenFormat ? "Need a fresh link?" : "Request a verification email"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              Enter your account email to request a fresh link.
            </p>

            <label
              htmlFor="verification-email"
              className="mt-5 block text-sm font-semibold"
            >
              Email address
            </label>

            <input
              id="verification-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              disabled={busy}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a] disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={busy}
              className={`mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                hasValidTokenFormat
                  ? "border border-stone-300 bg-white text-[#17352a] hover:bg-stone-50"
                  : "bg-[#17352a] text-white hover:bg-[#244b3c]"
              }`}
            >
              {busy ? "Please wait…" : "Send verification email"}
            </button>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              If the email doesn’t arrive, check your spam or junk folder.
            </p>
          </form>
        </>
      )}
      </div>
      </div>
      {(fromSettings || !user) && (
      <Link to={fromSettings ? "/account/settings" : "/login"} className="mx-auto mt-5 flex min-h-11 w-fit items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#17352a] hover:bg-[#edf0e7]">
        <span aria-hidden="true">←</span>
        {fromSettings ? "Back to settings" : "Back to sign in"}
      </Link>
      )}
    </section>
  );
}
