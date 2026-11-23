import { ActionNotice } from "../../components/ui/AppNotifications";
import { useEffect, useState } from "react";
import { resolveImageUrl } from "../../config/api";
import { getAdminProducts } from "../../services/product.service";
import type { AdminProductListResponse } from "../../types/product.types";
import { Link, useLocation, useNavigate } from "react-router";

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminProductListResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void getAdminProducts(page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error ? error.message : "Could not load products.",
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
  const location = useLocation();
  const navigate = useNavigate();

  const [showUpdatedNotice, setShowUpdatedNotice] = useState(
    () => location.state?.productUpdated === true,
  );

  useEffect(() => {
    if (location.state?.productUpdated === true) {
      // Consume the message so it doesn't replay on refresh.
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!showUpdatedNotice) return;

    const timeout = window.setTimeout(() => setShowUpdatedNotice(false), 4000);

    return () => window.clearTimeout(timeout);
  }, [showUpdatedNotice]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
      {showUpdatedNotice && (
        <ActionNotice message="Product updated." />
      )}
      <p className="text-xs font-bold tracking-widest text-[#688746]">
        KINGSMIND ADMIN
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">
        Manage products
      </h1>
      <p className="mt-4 text-stone-600">
        View products that are live in the store and drafts that are hidden.
      </p>

      <Link
        to="/admin/products/new"
        className="mt-6 inline-flex rounded-md bg-[#17352a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244b3c]"
      >
        Create product
      </Link>

      {error && (
        <p role="alert" className="mt-8 text-red-800">
          {error}
        </p>
      )}
      {!result && !error && (
        <p role="status" className="mt-8">
          Loading products…
        </p>
      )}

      {result && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {result.products.length === 0 && <p>No products on this page.</p>}

            {result.products.map((product) => (
              <article
                key={product.id}
                className="flex items-start gap-4 border border-stone-200 bg-white p-4"
              >
                {product.image_url ? (
                  <img
                    src={resolveImageUrl(product.image_url)}
                    alt={product.name}
                    loading="lazy"
                    className="h-20 w-20 shrink-0 bg-[#e9ebdf] object-contain"
                  />
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center bg-[#e9ebdf] text-xs text-stone-600">
                    No image
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="wrap-break-word font-semibold">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {product.currency}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      product.is_active
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {product.is_active ? "Published" : "Hidden"}
                  </span>
                  <Link
                    to={`/admin/products/${product.id}`}
                    className="mt-3 block text-sm font-semibold underline underline-offset-4"
                  >
                    Open product
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <nav
            aria-label="Product pages"
            className="mt-8 flex justify-between text-sm"
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() => changePage(page - 1)}
              className="cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={!result.hasMore || page >= 100000}
              onClick={() => changePage(page + 1)}
              className="cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
