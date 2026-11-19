import type { ProductSummary } from "../../types/product.types";
import ProductCard from "./ProductCard";

type ProductGridProps = {
  products: ProductSummary[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
