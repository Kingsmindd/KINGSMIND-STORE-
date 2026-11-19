import { useEffect, useState } from "react";
import { getAdminOrders } from "../../services/order.service";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import { formatMoney } from "../../utils/formatMoney";
import { Link } from "react-router";

type OrderPage = Awaited<ReturnType<typeof getAdminOrders>>;

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<OrderPage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void getAdminOrders(page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : "The order queue could not be loaded.",
          );
        }
      });

    return () => controller.abort();
  }, [page]);

  function changePage(nextPage: number) {
    setResult(null);
    setError("");
    setPage(nextPage);
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
      <p className="text-xs font-bold tracking-widest text-[#688746]">
        KINGSMIND ADMIN
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Order queue</h1>
      <p className="mt-4 text-stone-600">
        Review customer orders, delivery quotes, and payment status.
      </p>

      {error && (
        <p role="alert" className="mt-8 text-red-800">
          {error}
        </p>
      )}

      {!result && !error && (
        <p role="status" className="mt-8">
          Loading orders…
        </p>
      )}

      {result && (
        <>
          <div className="mt-8 space-y-4">
            {result.orders.length === 0 && <p>No orders on this page.</p>}

            {result.orders.map((order) => (
              <article
                key={order.id}
                className="flex flex-wrap items-start justify-between gap-4 border border-[#d9ded4] bg-white p-5"
              >
                <div className="min-w-0">
                  <OrderStatusBadge status={order.status} />
                  <p className="mt-3 break-all font-mono text-xs text-stone-600">
                    {order.id}
                  </p>
                </div>

                <div>
                  <p className="font-semibold">
                    {order.total_minor === null
                      ? "Total not determined"
                      : formatMoney(order.total_minor, order.currency)}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {order.payment_status === "collected"
                      ? "Payment collected"
                      : "Payment not collected"}
                  </p>
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="mt-3 inline-block text-sm font-semibold underline"
                  >
                    View order
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <nav aria-label="Order pages" className="mt-8 flex justify-between">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => changePage(page - 1)}
              className="font-semibold disabled:opacity-40"
            >
              ← Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={!result.hasMore || page >= 100000}
              onClick={() => changePage(page + 1)}
              className="font-semibold disabled:opacity-40"
            >
              Next →
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
