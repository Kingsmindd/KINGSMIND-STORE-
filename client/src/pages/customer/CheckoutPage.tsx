import { ActionNotice } from "../../components/ui/AppNotifications";
import toast from "react-hot-toast";
import BackLink from "../../components/ui/BackLink";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { ApiError } from "../../services/api.client";
import { createOrder, getCheckoutPreview } from "../../services/order.service";
import { formatMoney } from "../../utils/formatMoney";
import { resolveImageUrl } from "../../config/api";
import type {
  CheckoutPreview,
  CreatedOrder,
  ShippingAddress,
} from "../../types/order.types";

const addressFields: {
  key: keyof ShippingAddress;
  label: string;
  autoComplete: string;
  maxLength: number;
  type?: string;
}[] = [
  {
    key: "recipientName",
    label: "Recipient name",
    autoComplete: "shipping name",
    maxLength: 200,
  },
  {
    key: "phone",
    label: "Phone number",
    autoComplete: "shipping tel",
    maxLength: 30,
    type: "tel",
  },
  {
    key: "addressLine1",
    label: "Street address",
    autoComplete: "shipping address-line1",
    maxLength: 250,
  },
  {
    key: "city",
    label: "City",
    autoComplete: "shipping address-level2",
    maxLength: 100,
  },
  {
    key: "state",
    label: "State",
    autoComplete: "shipping address-level1",
    maxLength: 100,
  },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();

  const [address, setAddress] = useState<ShippingAddress>({
    recipientName: user?.name || "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CreatedOrder | null>(null);

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const emailVerified = Boolean(user?.email_verified_at);

  useEffect(() => {
    if (!emailVerified || order || items.length === 0) return;

    const controller = new AbortController();

    async function loadPreview() {
      setPreview(null);
      setPreviewError("");
      setPreviewLoading(true);

      try {
        const result = await getCheckoutPreview(
          items.map(({ variantId, quantity }) => ({ variantId, quantity })),
          controller.signal,
        );

        if (!controller.signal.aborted) setPreview(result);
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setPreviewError(
            error instanceof Error
              ? error.message
              : "Could not load the price preview.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    }

    void loadPreview();
    return () => controller.abort();
  }, [emailVerified, items, order, previewRevision]);

  if (!user) return null;

  if (order) {
    return (
      <section className="mx-auto max-w-xl px-5 py-10 sm:py-14">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <header className="border-b border-[#d9ded4] bg-[#edf0e7] p-6 sm:p-8">
        <div aria-hidden="true" className="mb-5 grid size-12 place-items-center rounded-full border border-emerald-200 bg-white text-xl font-bold text-[#17352a]">✓</div>
        <h1 className="text-3xl font-bold tracking-tight text-[#17352a]">
          Your order is received
        </h1>

        <p className="mt-3 text-sm leading-7 text-stone-600">
          Your order is awaiting a delivery quote. Payment is due on delivery.
        </p>
        </header>

        <div className="p-6 sm:p-8">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-xs font-medium text-stone-500">Order reference</p>
          <p className="mt-2 break-all font-mono text-xs leading-6">{order.id}</p>

          <dl className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4 text-sm">
            <dt className="text-stone-600">Product subtotal</dt>
            <dd className="font-bold text-[#17352a] tabular-nums">{formatMoney(order.subtotal_minor, order.currency)}</dd>
          </dl>

          <p className="mt-2 text-sm text-stone-600">
            Delivery and final total have not been determined yet.
          </p>
          </div>
        <Link
          to="/orders"
          className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-[#17352a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244b3c]"
        >
          View my orders
        </Link>

        <Link
          to="/#collection"
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-[#17352a] hover:bg-stone-50"
        >
          Continue shopping
        </Link>
        </div>
        </div>
      </section>
    );
  }

  if (!user.email_verified_at) {
    return (
      <section className="mx-auto max-w-xl px-5 py-10 sm:py-14">
        <BackLink to="/cart">Back to cart</BackLink>
        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="mb-6 grid size-14 place-items-center rounded-2xl border border-[#d9ded4] bg-[#edf0e7] text-[#17352a]">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-7">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#17352a] sm:text-3xl">
              Verify your email to continue
            </h1>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Confirm your email address before placing your order.
              Open the verification link in your inbox, or request a new one.
            </p>
            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs font-medium text-stone-500">Your email address</p>
              <p className="mt-1 wrap-break-word text-sm font-semibold text-[#17352a]">
                {user.email}
              </p>
            </div>
            <Link
              to="/verify-email"
              className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-[#17352a] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a]"
            >
              Verify email or request a new link
            </Link>
          </div>
          <p className="border-t border-[#d9ded4] bg-[#f1f2eb] px-6 py-4 text-sm leading-6 text-[#17352a] sm:px-8">
            Your cart remains saved while you verify your email.
          </p>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-xl px-5 py-12">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-bold">Your cart is empty.</h1>
        <Link to="/#collection" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#17352a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244b3c]">
          Browse the collection
        </Link>
        </div>
      </section>
    );
  }

  const reviewedPreview =
    preview &&
    preview.items.length === items.length &&
    preview.items.every(
      (line, index) =>
        line.variantId.toLowerCase() === items[index].variantId.toLowerCase() &&
        line.quantity === items[index].quantity,
    )
      ? preview
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !reviewedPreview) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await createOrder({
        currency: reviewedPreview.currency,
        pricingFingerprint: reviewedPreview.pricing_fingerprint,
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shippingAddress: {
          recipientName: address.recipientName.trim(),
          phone: address.phone.trim(),
          addressLine1: address.addressLine1.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
        },
      });

      setOrder(created);
      clearCart(true);
      toast.success("Order placed. Awaiting your delivery quote.", { id: "checkout-result" });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setPreview(null);
        setPreviewRevision((revision) => revision + 1);
      }

      setError(
        error instanceof Error
          ? error.message
          : "The order could not be placed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
      <BackLink to="/cart">Back to cart</BackLink>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#17352a] sm:text-4xl">Checkout</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
        Add your delivery details and review your order. Payment is due on delivery.
      </p>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
        <form id="checkout-form" onSubmit={handleSubmit} aria-busy={submitting} className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 bg-[#edf0e7] px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold text-[#17352a]">Delivery details</h2>
          </div>
          <div className="p-5 sm:p-6">

          {error && (
            <ActionNotice message={error} type="error" />
          )}

          <fieldset disabled={submitting} className="grid gap-5 sm:grid-cols-2">
            {addressFields.map((field) => (
              <div key={field.key} className={field.key === "addressLine1" ? "sm:col-span-2" : ""}>
                <label
                  htmlFor={field.key}
                  className="block text-sm font-semibold"
                >
                  {field.label}
                </label>
                <input
                  id={field.key}
                  name={field.key}
                  type={field.type || "text"}
                  autoComplete={field.autoComplete}
                  required
                  maxLength={field.maxLength}
                  value={address[field.key]}
                  onChange={(event) =>
                    setAddress((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a] disabled:opacity-60"
                />
              </div>
            ))}

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 sm:col-span-2">
              <p className="text-xs text-stone-500">Delivery country</p>
              <p className="mt-1 text-sm font-semibold text-[#17352a]">Nigeria</p>
            </div>
          </fieldset>
          </div>
        </form>

        <aside className="min-w-0 overflow-hidden rounded-2xl border border-[#d9ded4] bg-white shadow-sm lg:sticky lg:top-36">
          <h2 className="border-b border-[#d9ded4] bg-[#edf0e7] px-5 py-5 text-lg font-bold text-[#17352a] sm:px-6">Your order</h2>
          <div className="p-5 sm:p-6">

          <ul className="divide-y divide-stone-100">
            {items.map((item, index) => (
              <li key={item.variantId} className="flex gap-3 py-4 text-sm first:pt-0">
                {item.imageUrl && (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#f1f2eb] p-2">
                    <img src={resolveImageUrl(item.imageUrl)} alt="" className="h-full w-full object-contain" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                <p className="wrap-break-word font-semibold text-[#17352a]">{item.name}</p>
                <p className="mt-1 text-stone-600">
                  {item.option} · Quantity {item.quantity}
                </p>
                {reviewedPreview && (
                  <>
                    <p className="mt-1 text-stone-600">
                      {formatMoney(
                        reviewedPreview.items[index].listed_unit_price_minor,
                        reviewedPreview.items[index].listed_currency,
                      )}{" "}
                      each
                    </p>
                    <p className="mt-2 font-bold text-[#17352a] tabular-nums">
                      {formatMoney(reviewedPreview.items[index].line_total_minor, "NGN")}
                    </p>
                  </>
                )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-stone-200 pt-5">
            <p className="flex flex-wrap justify-between gap-3 text-sm font-semibold">
              <span>Subtotal in NGN</span>
              <span className="font-bold text-[#17352a] tabular-nums">
                {reviewedPreview
                  ? formatMoney(reviewedPreview.subtotal_minor, "NGN")
                  : "—"}
              </span>
            </p>
            <p className="mt-3 flex flex-wrap justify-between gap-3 text-sm">
              <span className="text-stone-600">Delivery</span>
              <span className="text-right font-medium">Quoted after checkout</span>
            </p>

            {previewLoading && (
              <p role="status" className="mt-3 text-sm text-stone-600">
                Checking prices…
              </p>
            )}

            {previewError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                <p role="alert">Price preview unavailable. {previewError}</p>
                <button
                  type="button"
                  onClick={() => setPreviewRevision((revision) => revision + 1)}
                  className="mt-2 cursor-pointer font-semibold underline"
                >
                  Retry price preview
                </button>
              </div>
            )}

            {reviewedPreview?.usd_to_ngn_rate && (
              <p className="mt-3 text-sm text-stone-600">
                USD prices use ₦{reviewedPreview.usd_to_ngn_rate} per $1.
              </p>
            )}

            <p className="mt-5 rounded-xl bg-[#f1f2eb] px-4 py-3 text-sm leading-6 text-stone-600">
              Pay on delivery. Your delivery fee will be quoted after checkout.
              Prices and availability are checked when you place the order.
            </p>
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting || !reviewedPreview}
              className="mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#17352a] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Placing order…" : "Place order"}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-stone-500">Payment is due on delivery.</p>
          </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
