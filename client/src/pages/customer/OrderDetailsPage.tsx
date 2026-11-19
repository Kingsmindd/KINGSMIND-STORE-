import BackLink from "../../components/ui/BackLink";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import {
  getMyOrder,
  getAdminOrder,
  saveDeliveryQuote,
  confirmOrder,
  shipOrder,
  completeOrderDelivery,
  cancelOrder,
  removeDeliveryQuote,
} from "../../services/order.service";
import type { CustomerOrderDetails } from "../../types/order.types";
import { formatMoney } from "../../utils/formatMoney";
import type { FormEvent } from "react";

type Result =
  | { id: string; order: CustomerOrderDetails }
  | { id: string; error: string };

const primaryActionClass =
  "flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#17352a] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] disabled:cursor-not-allowed disabled:opacity-50";
const dialogClass =
  "m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-[#17352a] shadow-xl backdrop:bg-black/40 sm:p-7";

export default function OrderDetailsPage({
  mode = "customer",
}: {
  mode?: "customer" | "admin";
}) {
  const { orderId = "" } = useParams();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrder() {
      try {
        const fetchOrder = mode === "admin" ? getAdminOrder : getMyOrder;
        const order = await fetchOrder(orderId, controller.signal);

        if (!controller.signal.aborted) {
          setResult({ id: orderId, order });
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setResult({
            id: orderId,
            error:
              error instanceof Error
                ? error.message
                : "This order could not be loaded.",
          });
        }
      }
    }

    void loadOrder();
    return () => controller.abort();
  }, [orderId, mode]);

  const current = result?.id === orderId ? result : null;
  const order = current && "order" in current ? current.order : null;
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const cancelDialogRef = useRef<HTMLDialogElement>(null);
  const deliveryDialogRef = useRef<HTMLDialogElement>(null);
  const removeQuoteDialogRef = useRef<HTMLDialogElement>(null);
  const [removingQuote, setRemovingQuote] = useState(false);
  const [removeQuoteError, setRemoveQuoteError] = useState("");
  const canCompleteDelivery =
    mode === "admin" &&
    order?.status === "shipped" &&
    order.payment_status === "uncollected" &&
    order.total_minor !== null &&
    BigInt(order.total_minor) > 0n;
  const [shipping, setShipping] = useState(false);
  const [shipError, setShipError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [completionError, setCompletionError] = useState("");
  const canQuote =
    mode === "admin" &&
    order?.payment_status === "uncollected" &&
    (order.status === "awaiting_delivery_quote" || order.status === "pending");

  const canCancel =
    mode === "admin" &&
    order?.payment_status === "uncollected" &&
    (order.status === "awaiting_delivery_quote" ||
      order.status === "pending" ||
      order.status === "confirmed");

  const orderActionBusy =
    quoteSaving || confirming || shipping || completing || cancelling;

  async function handleQuoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !canQuote || quoteSaving) return;

    setQuoteError("");
    setQuoteMessage("");

    const amount = quoteAmount.trim();

    if (!/^\d{1,17}(?:\.\d{1,2})?$/.test(amount)) {
      setQuoteError(
        "Enter a non-negative amount with up to two decimal places.",
      );
      return;
    }

    const [whole, fraction = ""] = amount.split(".");
    const shippingMinor =
      BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));

    if (shippingMinor > 9223372036854775807n) {
      setQuoteError("The delivery fee is too large.");
      return;
    }

    setQuoteSaving(true);

    try {
      await saveDeliveryQuote(
        order.id,
        shippingMinor.toString(),
        order.status === "pending",
      );

      try {
        const updated = await getAdminOrder(order.id);
        setResult({ id: order.id, order: updated });
        setQuoteAmount("");
        setQuoteMessage("Delivery quote saved.");
      } catch {
        setResult({
          id: order.id,
          error:
            "The quote was saved, but the order could not be reloaded. Refresh this page to see the updated total.",
        });
      }
    } catch (error: unknown) {
      setQuoteError(
        error instanceof Error
          ? error.message
          : "The quote could not be saved.",
      );
    } finally {
      setQuoteSaving(false);
    }
  }
  async function handleConfirmOrder() {
    if (
      mode !== "admin" ||
      !order ||
      order.status !== "pending" ||
      order.payment_status !== "uncollected" ||
      quoteSaving ||
      confirming
    )
      return;

    setConfirming(true);
    setConfirmError("");

    try {
      await confirmOrder(order.id);

      try {
        const updated = await getAdminOrder(order.id);
        setResult({ id: order.id, order: updated });
      } catch {
        setResult({
          id: order.id,
          error:
            "The order was confirmed. Refresh this page to see its updated status.",
        });
      }
    } catch (error: unknown) {
      setConfirmError(
        error instanceof Error
          ? error.message
          : "The order could not be confirmed.",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function handleShipOrder() {
    if (
      mode !== "admin" ||
      !order ||
      order.status !== "confirmed" ||
      order.payment_status !== "uncollected" ||
      shipping ||
      confirming
    )
      return;

    setShipping(true);
    setShipError("");

    try {
      await shipOrder(order.id);

      try {
        const updated = await getAdminOrder(order.id);
        setResult({ id: order.id, order: updated });
      } catch {
        setResult({
          id: order.id,
          error:
            "The order was marked as shipped. Refresh to see its updated status.",
        });
      }
    } catch (error: unknown) {
      setShipError(
        error instanceof Error
          ? error.message
          : "The order could not be shipped.",
      );
    } finally {
      setShipping(false);
    }
  }

  async function handleCompleteDelivery() {
    if (!order || !canCompleteDelivery || completing) return;

    setCompleting(true);
    setCompletionError("");

    try {
      await completeOrderDelivery(order.id);
      deliveryDialogRef.current?.close();

      try {
        const updated = await getAdminOrder(order.id);
        setResult({ id: order.id, order: updated });
      } catch {
        setResult({
          id: order.id,
          error:
            "Delivery and payment were recorded. Refresh to see the updated order.",
        });
      }
    } catch (error: unknown) {
      setCompletionError(
        error instanceof Error
          ? error.message
          : "Delivery and payment could not be recorded.",
      );
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancelOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !canCancel || orderActionBusy) return;

    const reason = cancelReason.trim();
    setCancelError("");

    if (!reason) {
      setCancelError("Enter a cancellation reason.");
      return;
    }

    setCancelling(true);

    try {
      await cancelOrder(order.id, reason);

      try {
        const updated = await getAdminOrder(order.id);
        setResult({ id: order.id, order: updated });
        setCancelReason("");
      } catch {
        setResult({
          id: order.id,
          error: "The order was cancelled. Refresh to see its updated status.",
        });
      }
    } catch (error: unknown) {
      setCancelError(
        error instanceof Error
          ? error.message
          : "The order could not be cancelled.",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function handleRemoveQuote() {
    if (!order || !canQuote || order.status !== "pending" || orderActionBusy)
      return;

    setRemovingQuote(true);
    setRemoveQuoteError("");

    try {
      await removeDeliveryQuote(order.id);
      removeQuoteDialogRef.current?.close();

      try {
        const updated = await getAdminOrder(order.id);
        setResult({ id: order.id, order: updated });
        setQuoteAmount("");
        setQuoteError("");
        setQuoteMessage("Delivery quote removed.");
      } catch {
        setResult({
          id: order.id,
          error: "The quote was removed. Refresh to see the updated order.",
        });
      }
    } catch (error: unknown) {
      setRemoveQuoteError(
        error instanceof Error
          ? error.message
          : "The quote could not be removed.",
      );
    } finally {
      setRemovingQuote(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
      <BackLink to={mode === "admin" ? "/admin/orders" : "/orders"}>
        {mode === "admin" ? "Back to order queue" : "Back to my orders"}
      </BackLink>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#17352a] sm:text-4xl">Order details</h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {mode === "admin"
          ? "Review the items, delivery details and order status."
          : "Track your order and review your delivery and payment details."}
      </p>

      {!current && (
        <p role="status" className="mt-7 rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center text-sm text-stone-600">
          Loading your order…
        </p>
      )}

      {current && "error" in current && (
        <p role="alert" className="mt-7 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-800">
          {current.error}
        </p>
      )}

      {order && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d9ded4] bg-[#edf0e7] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium text-stone-500">Order reference</p>
              <p className="mt-1 break-all font-mono text-xs leading-5 text-[#17352a]">{order.id}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          {order.cancellation_reason && (
            <p className="mt-4 wrap-break-word rounded-xl border border-stone-200 bg-white px-5 py-4 text-sm leading-6 text-stone-600">
              Cancellation reason: {order.cancellation_reason}
            </p>
          )}

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
            <div className="min-w-0 space-y-6">
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-200 px-5 py-5 text-lg font-bold text-[#17352a] sm:px-6">Ordered items</h2>
              <ul className="divide-y divide-stone-100 px-5 sm:px-6">
                {order.items.map((item) => (
                  <li
                    key={item.variant_id}
                    className="flex flex-wrap items-start justify-between gap-3 py-5 sm:gap-5"
                  >
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="wrap-break-word text-sm font-semibold leading-6 text-[#17352a] sm:text-base">{item.product_name}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {[item.colour, item.size].filter(Boolean).join(" / ") ||
                          item.sku}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">
                        {item.quantity} ×{" "}
                        {formatMoney(item.unit_price_minor, order.currency)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#17352a] tabular-nums sm:text-base">
                      {formatMoney(item.line_total_minor, order.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-200 px-5 py-5 text-lg font-bold text-[#17352a] sm:px-6">Delivery address</h2>
              <address className="wrap-break-word px-5 py-5 text-sm leading-7 text-stone-600 not-italic sm:px-6">
                <p className="font-semibold text-[#17352a]">{order.shippingAddress.recipient_name}</p>
                <p>{order.shippingAddress.address_line1}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                <p>Nigeria</p>
                <p className="mt-3 border-t border-stone-100 pt-3">{order.shippingAddress.phone}</p>
              </address>
            </section>
            </div>

            <aside className="min-w-0 overflow-hidden rounded-2xl border border-[#d9ded4] bg-white shadow-sm">
              <h2 className="border-b border-[#d9ded4] bg-[#edf0e7] px-5 py-5 text-lg font-bold text-[#17352a] sm:px-6">Order summary</h2>
              <div className="space-y-6 p-5 sm:p-6">

              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Subtotal</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatMoney(order.subtotal_minor, order.currency)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Delivery</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {order.shipping_minor !== null
                      ? formatMoney(order.shipping_minor, order.currency)
                      : "Not quoted"}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-3 border-t border-stone-200 pt-4 text-base font-bold text-[#17352a]">
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {order.total_minor !== null
                      ? formatMoney(order.total_minor, order.currency)
                      : "Not determined"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Payment</dt>
                  <dd className="text-right">
                    {order.payment_status === "collected"
                      ? "Collected"
                      : order.status === "cancelled"
                        ? "Not collected"
                        : "Pay on delivery"}
                  </dd>
                </div>
              </dl>

              {canQuote && (
                <form
                  onSubmit={handleQuoteSubmit}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                >
                  <h3 className="mb-4 text-sm font-bold text-[#17352a]">
                    {order.status === "pending" ? "Update delivery quote" : "Set delivery quote"}
                  </h3>
                  <label
                    htmlFor="quote-amount"
                    className="block text-sm font-semibold"
                  >
                    Delivery fee ({order.currency})
                  </label>

                  <input
                    id="quote-amount"
                    type="text"
                    inputMode="decimal"
                    required
                    maxLength={20}
                    placeholder="e.g. 3000.00"
                    value={quoteAmount}
                    disabled={quoteSaving}
                    onChange={(event) => setQuoteAmount(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-base focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a]"
                  />

                  {quoteError && (
                    <p role="alert" className="mt-3 text-sm text-red-800">
                      {quoteError}
                    </p>
                  )}

                  {quoteMessage && (
                    <p role="status" className="mt-3 text-sm text-emerald-800">
                      {quoteMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={quoteSaving}
                    className={`mt-4 ${primaryActionClass}`}
                  >
                    {quoteSaving
                      ? "Saving quote…"
                      : order.status === "pending"
                        ? "Update delivery quote"
                        : "Set delivery quote"}
                  </button>
                </form>
              )}

              {canQuote && order.status === "pending" && (
                <>
                  <button
                    type="button"
                    disabled={orderActionBusy}
                    onClick={() => {
                      setRemoveQuoteError("");
                      removeQuoteDialogRef.current?.showModal();
                    }}
                    className="min-h-11 w-full cursor-pointer rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove delivery quote
                  </button>

                  <dialog
                    ref={removeQuoteDialogRef}
                    aria-labelledby="remove-quote-title"
                    onCancel={(event) => {
                      if (removingQuote) event.preventDefault();
                    }}
                    className={dialogClass}
                  >
                    <h2 id="remove-quote-title" className="text-xl font-bold">
                      Remove this delivery quote?
                    </h2>
                    <p className="mt-2 text-sm text-stone-600">
                      The order will wait for a new delivery quote before it can
                      be confirmed.
                    </p>

                    {removeQuoteError && (
                      <p role="alert" className="mt-3 text-sm text-red-800">
                        {removeQuoteError}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        autoFocus
                        disabled={removingQuote}
                        onClick={() => removeQuoteDialogRef.current?.close()}
                        className="cursor-pointer rounded border border-stone-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed"
                      >
                        Keep quote
                      </button>
                      <button
                        type="button"
                        disabled={orderActionBusy}
                        onClick={handleRemoveQuote}
                        className="cursor-pointer rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingQuote ? "Removing…" : "Remove quote"}
                      </button>
                    </div>
                  </dialog>
                </>
              )}
              {mode === "admin" &&
                order.status === "pending" &&
                order.payment_status === "uncollected" && (
                  <div className="border-t border-stone-300 pt-5">
                    <p className="text-sm text-stone-600">
                      Confirming this order allocates its stock. Payment is
                      still due on delivery.
                    </p>

                    {confirmError && (
                      <p role="alert" className="mt-3 text-sm text-red-800">
                        {confirmError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleConfirmOrder}
                      disabled={confirming || quoteSaving}
                      className={`mt-4 ${primaryActionClass}`}
                    >
                      {confirming ? "Confirming…" : "Confirm order"}
                    </button>
                  </div>
                )}

              {mode === "admin" &&
                order.status === "confirmed" &&
                order.payment_status === "uncollected" && (
                  <div className="border-t border-stone-300 pt-5">
                    {shipError && (
                      <p role="alert" className="mb-3 text-sm text-red-800">
                        {shipError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleShipOrder}
                      disabled={shipping || confirming}
                      className={primaryActionClass}
                    >
                      {shipping ? "Updating…" : "Mark as shipped"}
                    </button>
                  </div>
                )}
              {canCompleteDelivery && (
                <>
                  <button
                    type="button"
                    disabled={orderActionBusy}
                    onClick={() => {
                      setCompletionError("");
                      deliveryDialogRef.current?.showModal();
                    }}
                    className={primaryActionClass}
                  >
                    Mark delivered & payment received
                  </button>

                  <dialog
                    ref={deliveryDialogRef}
                    aria-labelledby="complete-delivery-title"
                    onCancel={(event) => {
                      if (completing) event.preventDefault();
                    }}
                    className={dialogClass}
                  >
                    <h2
                      id="complete-delivery-title"
                      className="text-xl font-bold"
                    >
                      Confirm delivery and payment
                    </h2>

                    <p className="mt-2 text-sm text-stone-600">
                      Confirm only if the customer has received the order and
                      paid in full.
                    </p>

                    {completionError && (
                      <p role="alert" className="mt-3 text-sm text-red-800">
                        {completionError}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        disabled={completing}
                        onClick={() => deliveryDialogRef.current?.close()}
                        className="cursor-pointer rounded border border-stone-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed"
                      >
                        Go back
                      </button>

                      <button
                        type="button"
                        disabled={orderActionBusy}
                        onClick={handleCompleteDelivery}
                        className="cursor-pointer rounded bg-[#17352a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {completing
                          ? "Recording…"
                          : "Confirm delivery and payment"}
                      </button>
                    </div>
                  </dialog>
                </>
              )}

              {canCancel && (
                <>
                  <button
                    type="button"
                    disabled={orderActionBusy}
                    onClick={() => {
                      setCancelReason("");
                      setCancelError("");
                      cancelDialogRef.current?.showModal();
                    }}
                    className="min-h-12 w-full cursor-pointer rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel order
                  </button>

                  <dialog
                    ref={cancelDialogRef}
                    aria-labelledby="cancel-order-title"
                    onCancel={(event) => {
                      if (cancelling) event.preventDefault();
                    }}
                    className={dialogClass}
                  >
                    <form onSubmit={handleCancelOrder}>
                      <h2 id="cancel-order-title" className="text-xl font-bold">
                        Cancel this order?
                      </h2>

                      <p className="mt-2 text-sm text-stone-600">
                        The customer will see the reason you enter below.
                      </p>

                      <label
                        htmlFor="cancel-reason"
                        className="mt-5 block text-sm font-semibold"
                      >
                        Cancellation reason
                      </label>
                      <textarea
                        id="cancel-reason"
                        required
                        maxLength={500}
                        rows={3}
                        value={cancelReason}
                        disabled={orderActionBusy}
                        onChange={(event) =>
                          setCancelReason(event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-stone-300 p-3 text-base focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a]"
                      />

                      {cancelError && (
                        <p role="alert" className="mt-3 text-sm text-red-800">
                          {cancelError}
                        </p>
                      )}

                      <div className="mt-5 flex flex-wrap justify-end gap-3">
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={() => cancelDialogRef.current?.close()}
                          className="min-h-11 w-full cursor-pointer rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-[#17352a] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          Keep order
                        </button>

                        <button
                          type="submit"
                          disabled={orderActionBusy || !cancelReason.trim()}
                          className="min-h-11 w-full cursor-pointer rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          {cancelling ? "Cancelling…" : "Confirm cancellation"}
                        </button>
                      </div>
                    </form>
                  </dialog>
                </>
              )}
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
