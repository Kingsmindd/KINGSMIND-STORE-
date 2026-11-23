import BackLink from "../../components/ui/BackLink";
import { useState } from "react";
import { useParams } from "react-router";
import { useProductDetails } from "../../hooks/useProductDetails";
import { resolveImageUrl } from "../../config/api";
import { formatMoney } from "../../utils/formatMoney";
import VariantSelector from "../../components/products/VariantSelector";
import { useCart } from "../../hooks/useCart";

export default function ProductDetailsPage() {
  const { productId = "" } = useParams();
  const { product, loading, error } = useProductDetails(productId);
  const [selectedId, setSelectedId] = useState("");
  const { addItem,
    ready } = useCart();

  if (loading) {
    return (
      <p role="status" className="mx-auto max-w-7xl px-5 py-20 text-stone-600">
        Loading product…
      </p>
    );
  }

  if (error || !product) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-20">
        <h1 className="text-3xl font-bold">Product unavailable</h1>
        <p role="alert" className="mt-4 text-stone-600">
          {error || "This product could not be found."}
        </p>
        <BackLink to="/">Back to collection</BackLink>
      </section>
    );
  }

  const selected =
    product.variants.find((variant) => variant.id === selectedId) ??
    product.variants.find((variant) => variant.in_stock) ??
    product.variants[0];

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
      <BackLink to="/">Back to collection</BackLink>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex aspect-square items-center justify-center rounded-sm bg-[#e9ebdf] p-8 md:p-12">
          {product.image_url ? (
            <img
              src={resolveImageUrl(product.image_url)}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <p className="text-stone-500">Image coming soon</p>
          )}
        </div>

        <div className="py-2 lg:py-6">
          <p className="text-xs font-bold tracking-[0.2em] text-[#688746]">
            KINGSMIND COLLECTION
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            {product.name}
          </h1>

          {selected && (
            <p className="mt-5 text-2xl font-semibold" aria-live="polite">
              {formatMoney(selected.amount_minor, product.currency)}
            </p>
          )}

          <p className="mt-6 leading-7 text-stone-600">{product.description}</p>

          <VariantSelector
            variants={product.variants}
            selectedId={selected?.id ?? ""}
            onSelect={setSelectedId}
          />

          {selected && (
            <p className="mt-5 text-sm" aria-live="polite">
              {selected.in_stock
                ? `${selected.stock_quantity} available`
                : "Currently sold out"}
            </p>
          )}

          <button
            type="button"
            disabled={!ready || !selected?.in_stock}
            onClick={() => {
              if (!ready || !selected) return;

              addItem({
                productId: product.id,
                variantId: selected.id,
                name: product.name,
                option:
                  [selected.colour, selected.size]
                    .filter(Boolean)
                    .join(" / ") || selected.sku,
                imageUrl: product.image_url,
                currency: product.currency,
                unitPriceMinor: selected.amount_minor,
                availableStock: selected.stock_quantity,
                quantity: 1,
              });
            }}
            className="mt-7 w-full cursor-pointer bg-[#17352a] px-6 py-4 font-semibold text-white transition-colors hover:bg-[#244d3d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {!selected?.in_stock ? "Sold out" : ready ? "Add to cart" : "Preparing cart…"}
          </button>



          <div className="mt-8 border-t border-[#d9ded4] pt-6 text-sm leading-7 text-stone-600">
            <p>Payment on delivery.</p>
            <p>
              Delivery is quoted after checkout, before your order is confirmed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
