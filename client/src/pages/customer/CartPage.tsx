import { ActionNotice } from "../../components/ui/AppNotifications";
import BackLink from "../../components/ui/BackLink";
import { Link } from "react-router";
import { useCart } from "../../hooks/useCart";
import { resolveImageUrl } from "../../config/api";
import { formatMoney } from "../../utils/formatMoney";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getSavedCart, saveCart } from "../../services/saved-cart.service";

export default function CartPage() {
  const {
    items,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
    restoreCart,
    ready,
  } = useCart();
  const clearDialogRef = useRef<HTMLDialogElement>(null);

  const { user } = useAuth();
  const userId = user?.id;
  const [hasSavedCart, setHasSavedCart] = useState<boolean | null>(null);
  const [savedCartRestored, setSavedCartRestored] = useState(false);
  const [pending, setPending] = useState<"save" | "resume" | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    void getSavedCart()
      .then(({ draft }) => {
        if (active) setHasSavedCart((current) => current ?? Boolean(draft));
      })
      .catch(() => {
        if (active) {
          setFeedback(
            (current) =>
              current ?? {
                text: "Could not check for a saved cart.",
                isError: true,
              },
          );
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(
      () => setFeedback(null),
      feedback.isError ? 6000 : 4000,
    );
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function handleSavedCart(action: "save" | "resume") {
    if (pending) return;

    setPending(action);
    setFeedback(null);

    try {
      if (action === "save") {
        await saveCart(
          items.map(({ variantId, quantity }) => ({ variantId, quantity })),
        );
        setHasSavedCart(true);
        setSavedCartRestored(false);
        setFeedback({ text: "Cart saved to your account.", isError: false });
        return;
      }

      const result = await getSavedCart();

      if (!result.draft) {
        setHasSavedCart(false);
        setFeedback({
          text: "You don’t have a saved cart yet.",
          isError: false,
        });
        return;
      }

      if (result.cartItems.length === 0) {
        setFeedback({
          text: "There are no available items in your saved cart.",
          isError: true,
        });
        return;
      }

      restoreCart(result.cartItems);
      setSavedCartRestored(true);
      const notes = ["Saved cart restored."];
      if (result.unavailableCount > 0)
        notes.push("Unavailable items were skipped.");
      if (result.adjustedCount > 0)
        notes.push("Some quantities were reduced to match current stock.");
      setFeedback({ text: notes.join(" "), isError: false });
    } catch (error: unknown) {
      setFeedback({
        text:
          error instanceof Error
            ? error.message
            : "Could not update your saved cart.",
        isError: true,
      });
    } finally {
      setPending(null);
    }
  }

  const savedCartControls = user && (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending !== null || items.length === 0}
        onClick={() => void handleSavedCart("save")}
        className="min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-[#17352a] transition-colors hover:border-[#17352a] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending === "save" ? "Saving…" : "Save cart"}
      </button>

      {hasSavedCart && !savedCartRestored && (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void handleSavedCart("resume")}
          className="min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-[#17352a] transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "resume"
            ? "Loading…"
            : items.length > 0
              ? "Replace with saved cart"
              : "Resume saved cart"}
        </button>
      )}

      {feedback && (
        <ActionNotice message={feedback.text} type={feedback.isError ? "error" : "success"} />
      )}
    </div>
  );
  if (!ready) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <BackLink to="/#collection">Back to collection</BackLink>
        <h1 className="text-3xl font-bold tracking-tight">Your cart</h1>
        <p role="status" className="mt-6 rounded-2xl border border-stone-200 bg-white px-5 py-8 text-sm text-stone-600">
          Loading your cart…
        </p>
      </section>
    );
  }
  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <BackLink to="/">Back to collection</BackLink>
        <div className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-12 text-center sm:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your cart is empty.
        </h1>

        <p role="status" className="mt-5 text-stone-600">
          Find something for your next game.
        </p>

        {savedCartControls}

        <Link
          to="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#17352a] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#244b3c]"
        >
          Explore the collection
        </Link>
        </div>
      </section>
    );
  }

  const subtotals = new Map<"NGN" | "USD", bigint>();

  for (const item of items) {
    const lineTotal = BigInt(item.unitPriceMinor) * BigInt(item.quantity);
    subtotals.set(
      item.currency,
      (subtotals.get(item.currency) ?? 0n) + lineTotal,
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-16">
      <BackLink to="/">Back to collection</BackLink>
      <div className="flex flex-nowrap items-center justify-between gap-3 sm:gap-5">
        <h1 className="whitespace-nowrap text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Your cart
        </h1>

        <button
          type="button"
          onClick={() => clearDialogRef.current?.showModal()}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:px-4 sm:py-2 sm:text-sm lg:min-h-12 lg:rounded-xl lg:px-6 lg:py-3 lg:text-base"
        >
          Clear cart
        </button>
      </div>



        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-stone-600">
              {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
            </p>
            {items.map((item) => {
              const lineTotal =
                BigInt(item.unitPriceMinor) * BigInt(item.quantity);

              return (
                <article
                  key={item.variantId}
                  className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:gap-5 sm:p-5"
                >
                  <Link
                    to={`/products/${item.productId}`}
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f1f2eb] p-2 sm:h-32 sm:w-32 sm:p-3"
                  >
                    {item.imageUrl ? (
                      <img
                        src={resolveImageUrl(item.imageUrl)}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-stone-500">No image</span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item.productId}`}
                      className="wrap-break-word font-semibold leading-snug text-[#17352a] hover:underline"
                    >
                      {item.name}
                    </Link>

                    <p className="mt-1 text-sm text-stone-600">{item.option}</p>

                    <p className="mt-2 text-xs text-stone-500 sm:text-sm">
                      {formatMoney(item.unitPriceMinor, item.currency)} each
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                      <div
                        role="group"
                        aria-label={`Quantity for ${item.name}, ${item.option}`}
                        className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
                      >
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity - 1)
                          }
                          className="h-11 w-9 cursor-pointer text-lg text-[#17352a] transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-30 sm:w-11"
                        >
                          −
                        </button>

                        <span className="min-w-7 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={
                            item.quantity >= Math.min(item.availableStock, 100)
                          }
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity + 1)
                          }
                          className="h-11 w-9 cursor-pointer text-lg text-[#17352a] transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-30 sm:w-11"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        aria-label={`Remove ${item.name} from cart`}
                        className="min-h-11 cursor-pointer rounded-md px-1 text-xs font-medium text-red-700 underline underline-offset-4 hover:text-red-900 sm:text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <p className="mt-4 border-t border-stone-100 pt-3 text-base font-bold text-[#17352a] tabular-nums sm:text-lg">
                      {formatMoney(lineTotal.toString(), item.currency)}
                    </p>
                  </div>
                </article>
              );
            })}
            {savedCartControls}
          </div>

          <aside className="overflow-hidden rounded-2xl border border-[#d9ded4] bg-white shadow-sm lg:sticky lg:top-16">
            <h2 className="border-b border-[#d9ded4] bg-[#edf0e7] px-5 py-5 text-xl font-bold text-[#17352a] sm:px-6">Order summary</h2>
            <div className="p-5 sm:p-6">

            <dl className="space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Items</dt>
                <dd>{itemCount}</dd>
              </div>

              {Array.from(subtotals, ([currency, subtotal]) => (
                <div key={currency} className="flex justify-between gap-4">
                  <dt>{currency} subtotal</dt>
                  <dd className="text-right font-bold text-[#17352a] tabular-nums">
                    {formatMoney(subtotal.toString(), currency)}
                  </dd>
                </div>
              ))}

              <div className="flex justify-between gap-4">
                <dt>Delivery</dt>
                <dd className="text-right">Quoted after checkout</dd>
              </div>
            </dl>

            <p className="mt-5 border-t border-stone-200 pt-5 text-sm leading-6 text-stone-600">
              Payment is due on delivery. Prices and availability are checked at
              checkout.
            </p>

            <Link
              to="/checkout"
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#17352a] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] sm:text-base"
            >
              Continue to checkout
            </Link>

            <Link
              to="/"
              className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 py-3 text-center text-sm font-semibold text-[#17352a] transition-colors hover:bg-stone-50"
            >
              Continue shopping
            </Link>
            </div>
          </aside>
        </div>
      <dialog
        ref={clearDialogRef}
        aria-labelledby="clear-cart-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50"
      >
        <h2 id="clear-cart-title" className="text-xl font-semibold">
          Clear your cart?
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          This removes all items from your current cart.
        </p>

        <form
          method="dialog"
          className="mt-5 flex flex-wrap justify-end gap-3"
          onSubmit={(event) => {
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            if (
              submitter instanceof HTMLButtonElement &&
              submitter.value === "clear"
            ) {
              event.preventDefault();
              clearDialogRef.current?.close();
              clearCart();
            }
          }}
        >
          <button
            type="submit"
            autoFocus
            className="cursor-pointer rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold"
          >
            Keep items
          </button>
          <button
            type="submit"
            value="clear"
            className="cursor-pointer rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Clear cart
          </button>
        </form>
      </dialog>
    </section>
  );
}
