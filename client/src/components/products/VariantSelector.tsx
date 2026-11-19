import type { ProductVariant } from "../../types/product.types";

type VariantSelectorProps = {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (variantId: string) => void;
};

export default function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: VariantSelectorProps) {
  return (
    <fieldset className="mt-8">
      <legend className="text-sm font-semibold">Choose your option</legend>

      <div className="mt-3 flex flex-wrap gap-3">
        {variants.map((variant) => {
          const label =
            [variant.colour, variant.size].filter(Boolean).join(" / ") ||
            variant.sku;

          const selected = variant.id === selectedId;

          return (
            <button
              key={variant.id}
              type="button"
              aria-pressed={selected}
              disabled={!variant.in_stock}
              onClick={() => onSelect(variant.id)}
              className={`rounded-sm border px-4 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? "border-[#17352a] bg-[#17352a] text-white"
                  : "cursor-pointer border-stone-300 bg-transparent hover:border-[#17352a]"
              }`}
            >
              {label}
              {!variant.in_stock && " — Sold out"}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
