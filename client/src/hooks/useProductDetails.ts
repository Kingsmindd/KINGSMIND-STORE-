import { useEffect, useState } from "react";
import { getProductDetails } from "../services/product.service";
import type { ProductDetails } from "../types/product.types";

type ProductResult = {
  id: string;
  product: ProductDetails | null;
  error: string | null;
};

export function useProductDetails(productId: string) {
  const [result, setResult] = useState<ProductResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      try {
        const product = await getProductDetails(productId, controller.signal);

        if (!controller.signal.aborted) {
          setResult({ id: productId, product, error: null });
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setResult({
            id: productId,
            product: null,
            error:
              error instanceof Error
                ? error.message
                : "The product could not be loaded.",
          });
        }
      }
    }

    void loadProduct();

    return () => controller.abort();
  }, [productId]);

  const current = result?.id === productId ? result : null;

  return {
    product: current?.product ?? null,
    error: current?.error ?? null,
    loading: current === null,
  };
}
