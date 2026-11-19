import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getMyOrders } from "../../services/order.service";
import type { CustomerOrder } from "../../types/order.types";
import { formatMoney } from "../../utils/formatMoney";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const pageButtonClass =
  "min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-3 font-semibold transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      try {
        const result = await getMyOrders(page, controller.signal);

        if (!controller.signal.aborted) {
          setOrders(result.orders);
          setHasMore(result.hasMore);
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : "Your orders could not be loaded.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => controller.abort();
  }, [page, attempt]);

  function changePage(nextPage: number) {
    if (loading || nextPage < 1 || nextPage === page) return;

    setLoading(true);
    setError(null);
    setPage(nextPage);
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-[#17352a] sm:text-4xl">My orders</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
        Keep track of your orders, delivery quotes, and payment status.
      </p>

      {loading && (
        <p role="status" className="mt-7 rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center text-sm text-stone-600">
          Loading your orders…
        </p>
      )}

      {!loading && error && (
        <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 sm:p-6">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              setAttempt((value) => value + 1);
            }}
            className="mt-4 cursor-pointer font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {orders.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-stone-200 bg-white px-5 py-12 text-center sm:p-12">
              <h2 className="text-xl font-bold text-[#17352a]">
                {page === 1 ? "Your orders will appear here" : "No orders on this page"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {page === 1
                  ? "Explore the collection and place your first order."
                  : "Go back to the previous page to see your orders."}
              </p>
              <Link
                to="/#collection"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#17352a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244b3c]"
              >
                Explore the collection
              </Link>
            </div>
          ) : (
            <div className="mt-7 space-y-5">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-[#edf0e7] px-5 py-4 sm:px-6">
                    <div>
                      <p className="text-xs font-medium text-stone-500">Placed on</p>
                      <time dateTime={order.created_at} className="mt-1 block text-sm font-semibold text-[#17352a]">
                        {dateFormat.format(new Date(order.created_at))}
                      </time>
                    </div>

                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="p-5 sm:p-6">
                  <p className="text-xs font-medium text-stone-500">Order reference</p>
                  <p className="mt-1 break-all font-mono text-xs leading-5 text-stone-600">{order.id}</p>

                  <dl className="mt-5 grid gap-4 rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm sm:grid-cols-3 sm:gap-5">
                    <div>
                      <dt className="text-xs text-stone-500">Subtotal</dt>
                      <dd className="mt-1.5 font-semibold text-[#17352a] tabular-nums">
                        {formatMoney(order.subtotal_minor, order.currency)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-stone-500">
                        Total including delivery
                      </dt>
                      <dd className="mt-1.5 font-bold text-[#17352a] tabular-nums">
                        {order.total_minor !== null
                          ? formatMoney(order.total_minor, order.currency)
                          : order.status === "cancelled"
                            ? "Not determined"
                            : "Awaiting quote"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-stone-500">Payment</dt>
                      <dd className="mt-1.5 font-semibold text-[#17352a]">
                        {order.payment_status === "collected"
                          ? "Collected"
                          : "Not collected"}
                      </dd>
                    </div>
                  </dl>

                  {order.cancellation_reason && (
                    <p className="mt-4 wrap-break-word rounded-lg border border-stone-200 px-4 py-3 text-sm leading-6 text-stone-600">
                      Cancellation reason: {order.cancellation_reason}
                    </p>
                  )}
                  <div className="mt-5 flex justify-end">
                  <Link
                    to={`/orders/${order.id}`}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-4 rounded-lg bg-[#17352a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] sm:w-auto"
                  >
                    View order details
                    <span aria-hidden="true">→</span>
                  </Link>
                  </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <nav
            aria-label="Order pages"
            className="mt-8 flex items-center justify-between gap-3 border-t border-[#d9ded4] pt-5 text-sm"
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() => changePage(page - 1)}
              className={pageButtonClass}
            >
              ← Previous
            </button>

            <span className="text-stone-600">Page {page}</span>

            <button
              type="button"
              disabled={!hasMore}
              onClick={() => changePage(page + 1)}
              className={pageButtonClass}
            >
              Next →
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
