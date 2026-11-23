import { ActionNotice } from "../ui/AppNotifications";
import { resolveImageUrl } from "../../config/api";
import type { ProductSummary } from "../../types/product.types";
import { formatMoney } from "../../utils/formatMoney";
import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import { getProductDetails } from "../../services/product.service";
import { useCart } from "../../hooks/useCart";

type ProductCardProps = {
  product: ProductSummary;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, ready } = useCart();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 6000);
    return () => window.clearTimeout(timer);
  }, [error]);

  async function handleAdd() {
    if (!ready || request.current || !product.in_stock) return;
    const controller = new AbortController();
    request.current = controller;
    setAdding(true);
    setError("");

    try {
      const details = await getProductDetails(product.id, controller.signal);
      if (controller.signal.aborted) return;
      const selected = details.variants.find((variant) => variant.in_stock);
      if (!selected) {
        setError("This product is currently sold out.");
        return;
      }
      addItem({
        productId: details.id,
        variantId: selected.id,
        name: details.name,
        option: [selected.colour, selected.size].filter(Boolean).join(" / ") || selected.sku,
        imageUrl: details.image_url,
        currency: details.currency,
        unitPriceMinor: selected.amount_minor,
        availableStock: selected.stock_quantity,
        quantity: 1,
      });
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : "Could not add this product. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) setAdding(false);
      request.current = null;
    }
  }

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-colors hover:border-[#688746]">
    <Link
      to={`/products/${product.id}`}
      className="group flex min-w-0 flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#17352a]"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#edf0e7] p-6 sm:p-8">
        {!product.in_stock && (
          <span className="absolute top-3 left-3 z-10 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">
            Sold out
          </span>
        )}

        {product.image_url ? (
          <img
            src={resolveImageUrl(product.image_url)}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-sm text-stone-500">Image coming soon</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
      <h3 className="wrap-break-word text-base font-semibold leading-6 tracking-tight group-hover:underline sm:text-lg">
        {product.name}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
        {product.description}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs font-semibold tracking-wide text-stone-500">Price</span>
        <span className="text-xl font-bold tracking-tight text-[#17352a] tabular-nums">
          {formatMoney(product.from_price_minor, product.currency)}
        </span>
      </p>
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border border-stone-200 text-lg text-[#17352a] group-hover:border-[#688746] group-hover:bg-[#edf0e7]">↗</span>
      </div>
      </div>
    </Link>
    <div className="px-5 pb-5">
      <button
        type="button"
        disabled={!ready || adding || !product.in_stock}
        aria-label={`Add ${product.name} to cart`}
        onClick={() => void handleAdd()}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#17352a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {adding ? "Adding…" : !product.in_stock ? "Sold out" : ready ? "Add to cart" : "Preparing cart…"}
      </button>
      {error && <ActionNotice message={error} type={"error"} />}
    </div>
    </article>
  );
}
