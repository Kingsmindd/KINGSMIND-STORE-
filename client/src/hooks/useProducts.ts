import { useEffect, useState } from "react";
import { getProducts } from "../services/product.service";
import type { ProductSummary } from "../types/product.types";

export function useProducts(search: string = "") {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [page, setPage] = useState(1);
  const [previousSearch, setPreviousSearch] = useState(search);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  if (previousSearch !== search) {
    setPreviousSearch(search);
    setPage(1);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const result = await getProducts(page, controller.signal, search);

        if (!controller.signal.aborted) {
          setProducts(result.products);
          setHasMore(result.hasMore);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("We couldn’t load the collection. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, attempt]);

  function goToPage(nextPage: number) {
    if (
      loading ||
      !Number.isInteger(nextPage) ||
      nextPage < 1 ||
      nextPage > 100000 ||
      nextPage === page
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setPage(nextPage);
  }

  function retry() {
    if (loading) return;

    setLoading(true);
    setError(null);
    setAttempt((value) => value + 1);
  }

  return {
    products,
    page,
    search,
    hasMore,
    loading,
    error,
    goToPage,
    retry,
  };
}
