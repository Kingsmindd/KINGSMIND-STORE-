import { useProducts } from "../../hooks/useProducts";
import ProductGrid from "../../components/products/ProductGrid";
import { Link, useSearchParams } from "react-router";
import { resolveImageUrl } from "../../config/api";
import { formatMoney } from "../../utils/formatMoney";
import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const { products, page, hasMore, loading, error, goToPage, retry } =
    useProducts(search);

  const [showcaseProducts, setShowcaseProducts] = useState(products);
  if (!search && !loading && !error && showcaseProducts !== products) {
    setShowcaseProducts(products);
  }

  const featuredProducts = useMemo(
    () => showcaseProducts.filter((product) => product.image_url),
    [showcaseProducts],
  );
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [largeScreen, setLargeScreen] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  const slideCount = featuredProducts.length;
  const activeSlide = slideCount ? slide % slideCount : 0;
  const featuredProduct = featuredProducts[activeSlide];

  useEffect(() => {
    const screen = window.matchMedia("(min-width: 1024px)");
    const update = () => setLargeScreen(screen.matches);
    screen.addEventListener("change", update);
    return () => screen.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (slideCount < 2 || paused || !largeScreen) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setSlide((current) => (current + 1) % slideCount);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slideCount, paused, largeScreen]);
  return (
    <>

      <section
        aria-labelledby="hero-title"
        className="mx-4 overflow-hidden rounded-3xl bg-[#17352a] text-[#f6f5ef] md:mx-6"
      >
        <div
          className={`mx-auto grid max-w-7xl items-center gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:gap-12 lg:px-12 lg:py-16 ${featuredProduct ? "lg:grid-cols-[1.1fr_1fr]" : ""}`}
        >
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#d8f36a]">
              FOR THE LOVE OF THE GAME
            </p>

            <h1
              id="hero-title"
              className="mt-5 text-5xl leading-[1.02] font-black tracking-[-0.055em] sm:text-6xl xl:text-7xl"
            >
              Bring more
              <br />
              to your game<span className="text-[#d8f36a]">.</span>
            </h1>

            <div className="mt-6 space-y-7">
              <p className="max-w-md text-sm leading-7 text-[#d0dace] sm:text-base">
                From training days to match day. Discover football kits
                essentials for your next game.
              </p>

              <a
                href="#collection"
                className="inline-flex min-h-12 w-fit items-center gap-6 rounded-xl bg-[#d8f36a] px-5 py-3 text-sm font-bold text-[#17352a] transition-colors hover:bg-[#e4ff82] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8f36a]"
              >
                Explore the collection
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          {featuredProduct && (
            <div
              role="region"
              aria-label="Featured products"
              aria-roledescription="carousel"
              className="hidden min-w-0 overflow-hidden rounded-2xl bg-[#f1f2eb] text-[#17352a] lg:block"
            >
              <Link
                to={`/products/${featuredProduct.id}`}
                className="group block focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#17352a]"
              >
                <div className="relative aspect-4/3">
                  {featuredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      aria-hidden={index !== activeSlide}
                      className={`absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-700 motion-reduce:transition-none sm:p-8 ${index === activeSlide ? "opacity-100" : "opacity-0"}`}
                    >
                      <img
                        src={resolveImageUrl(product.image_url!)}
                        alt={index === activeSlide ? product.name : ""}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#d9ded4] bg-white px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold group-hover:underline">
                      {featuredProduct.name}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {formatMoney(
                        featuredProduct.from_price_minor,
                        featuredProduct.currency,
                      )}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-[#17352a]/20 text-lg"
                  >
                    ↗
                  </span>
                </div>
              </Link>
              {slideCount > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-stone-200 bg-white px-4 py-2">
                  <button
                    type="button"
                    aria-label="Previous featured product"
                    onClick={() =>
                      setSlide((activeSlide + slideCount - 1) % slideCount)
                    }
                    className="grid size-11 cursor-pointer place-items-center rounded-full border border-stone-200 text-lg hover:bg-[#edf0e7]"
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  <span className="text-xs font-medium text-stone-500 tabular-nums">
                    {activeSlide + 1} / {slideCount}
                  </span>
                  <button
                    type="button"
                    aria-pressed={paused}
                    onClick={() => setPaused((current) => !current)}
                    className="min-h-11 cursor-pointer rounded-lg px-3 text-xs font-semibold hover:bg-[#edf0e7]"
                  >
                    {paused ? "Play" : "Pause"}
                  </button>
                  <button
                    type="button"
                    aria-label="Next featured product"
                    onClick={() => setSlide((activeSlide + 1) % slideCount)}
                    className="grid size-11 cursor-pointer place-items-center rounded-full border border-stone-200 text-lg hover:bg-[#edf0e7]"
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section
        id="collection"
        aria-labelledby="collection-title"
        className="mx-auto max-w-7xl scroll-mt-32 px-5 py-12 md:px-8 md:py-16 lg:scroll-mt-20"
      >
        <div className="border-b border-[#d9ded4] pb-6 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <h2
              id="collection-title"
              className="text-3xl font-bold tracking-tight md:text-4xl"
            >
              The collection
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              Football essentials, selected for your game.
            </p>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#17352a] sm:mt-0">
            Payment on delivery
          </p>
        </div>

        {search && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="min-w-0 wrap-break-word text-sm text-stone-600">
              Search results for{" "}
              <strong className="text-[#17352a]">{search}</strong>
            </p>
            <Link
              to="/#collection"
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#17352a] hover:bg-stone-100"
            >
              Clear search
            </Link>
          </div>
        )}
        <div className="mt-7 min-h-64" aria-busy={loading}>
          <p
            role="status"
            aria-live="polite"
            className="mb-4 min-h-6 text-sm text-stone-500"
          >
            {loading
              ? search.trim()
                ? "Searching the collection…"
                : "Loading the collection…"
              : ""}
          </p>

          {!loading && error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={retry}
                className="mt-4 cursor-pointer font-semibold underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {!error && (
            <>
              {products.length > 0 ? (
                <ProductGrid products={products} />
              ) : (
                !loading && (
                  <p className="rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center text-sm text-stone-600">
                    {search.trim()
                      ? `No products found for “${search.trim()}”. Try another name.`
                      : "No products on this page."}
                  </p>
                )
              )}

              <nav
                aria-label="Product pages"
                className="mt-10 flex items-center justify-between gap-4 border-t border-[#d9ded4] pt-6"
              >
                <button
                  type="button"
                  disabled={loading || page === 1}
                  onClick={() => goToPage(page - 1)}
                  className="min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                >
                  ← Previous
                </button>

                <span className="text-sm text-stone-600">Page {page}</span>

                <button
                  type="button"
                  disabled={loading || !hasMore}
                  onClick={() => goToPage(page + 1)}
                  className="min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                >
                  Next →
                </button>
              </nav>
            </>
          )}
        </div>
      </section>
    </>
  );
}
