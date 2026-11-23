import { ActionNotice } from "../ui/AppNotifications";
import toast from "react-hot-toast";
import { Link, useNavigate, useLocation } from "react-router";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useRef, useState } from "react";

export default function Header() {
  const { itemCount } = useCart();
  const { user, loading, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSearchButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    if (window.matchMedia("(min-width: 1024px)").matches) {
      searchInputRef.current?.focus({ preventScroll: true });
    }
    function closeOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !searchPanelRef.current?.contains(target) &&
        !searchButtonRef.current?.contains(target) &&
        !mobileSearchButtonRef.current?.contains(target)
      ) setSearchOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSearchOpen(false);
      const button = window.matchMedia("(min-width: 1024px)").matches
        ? searchButtonRef.current : mobileSearchButtonRef.current;
      button?.focus();
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [searchOpen]);

  function toggleProductSearch() {
    setMenuOpen(false);
    if (!searchOpen) {
      const params = new URLSearchParams();
      const search = new URLSearchParams(location.search).get("search");
      if (location.pathname === "/" && search) params.set("search", search);
      navigate({ pathname: "/", search: params.toString(), hash: "#collection" });
    }
    setSearchOpen((current) => !current);
  }

  const searchIcon = (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-6 sm:size-7">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleOutsidePress(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (
        !menuRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener("pointerdown", handleOutsidePress);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePress);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function handleLogout() {
    if (signingOut) return;

    setSigningOut(true);
    setLogoutError(null);

    try {
      await logout();
      toast.success("Signed out successfully.", { id: "account-session" });
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Sign-out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const customerMobileButtonClass =
    "max-lg:flex max-lg:min-h-14 max-lg:w-full max-lg:items-center max-lg:rounded-xl max-lg:border max-lg:border-[#cddbc7] max-lg:bg-[#f1f5ed] max-lg:px-4 max-lg:py-3.5 max-lg:text-left max-lg:text-base max-lg:font-semibold max-lg:tracking-tight max-lg:text-[#17352a] max-lg:shadow-sm max-lg:transition-colors max-lg:hover:border-[#688746] max-lg:hover:bg-[#e3ecd9] max-lg:focus-visible:outline-2 max-lg:focus-visible:outline-offset-2 max-lg:focus-visible:outline-[#17352a]";

  const sidebarButtonClass = user?.role === "customer"
    ? `${customerMobileButtonClass} lg:block lg:w-full lg:rounded-lg lg:border lg:border-white/15 lg:bg-white/10 lg:px-3.5 lg:py-2.5 lg:text-left lg:text-white lg:transition-colors lg:hover:border-white/30 lg:hover:bg-white/20 lg:focus-visible:outline-2 lg:focus-visible:outline-offset-2 lg:focus-visible:outline-white`
    : user
    ? "max-lg:flex max-lg:min-h-12 max-lg:w-full max-lg:items-center max-lg:rounded-xl max-lg:border max-lg:border-stone-200 max-lg:bg-white max-lg:px-4 max-lg:py-3 max-lg:text-left max-lg:text-base max-lg:font-semibold max-lg:text-[#17352a] max-lg:transition-colors max-lg:hover:border-[#688746] max-lg:hover:bg-[#f1f5ed] lg:block lg:w-full lg:rounded-lg lg:border lg:border-white/15 lg:bg-white/10 lg:px-3.5 lg:py-2.5 lg:text-left lg:text-white lg:transition-colors lg:hover:border-white/30 lg:hover:bg-white/20 lg:focus-visible:outline-2 lg:focus-visible:outline-offset-2 lg:focus-visible:outline-white"
    : "max-lg:min-h-12 max-lg:justify-start max-lg:rounded-xl max-lg:py-3 max-lg:text-base inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[#17352a]/25 bg-white px-4 font-semibold text-[#17352a] transition-colors hover:border-[#17352a] hover:bg-[#f1f5ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a]";

  const guestSignInClass =
    "max-lg:min-h-12 max-lg:rounded-xl max-lg:py-3 max-lg:text-base inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-[#17352a] bg-[#17352a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] lg:min-w-28 lg:border-white/35 lg:bg-white/10 lg:px-6 lg:hover:border-white/60 lg:hover:bg-white/20 lg:focus-visible:outline-white";
  return (
    <>
      <div className={`max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-50 max-lg:border-b max-lg:border-white/15 max-lg:bg-[#17352a] max-lg:shadow-md ${user ? "lg:contents" : "lg:sticky lg:top-0 lg:z-50 lg:mb-6 lg:border-b lg:border-white/15 lg:bg-[#17352a] lg:shadow-sm"}`}>
      <div
        className={`flex h-10 items-center justify-center bg-[#17352a] px-4 text-center text-xs tracking-wide text-white max-lg:border-b max-lg:border-white/10 lg:grid lg:h-auto lg:min-h-16 lg:items-center lg:gap-6 lg:border-b lg:border-white/15 lg:px-8 lg:py-3 ${
          user ? "lg:sticky lg:top-0 lg:z-50 lg:-ml-56 lg:grid-cols-[1fr_auto_1fr] lg:shadow-sm" : "lg:grid-cols-[1fr_auto_1fr]"
        }`}
      >
        <Link
          to="/"
          aria-label="Kingsmind home"
          onClick={() => setMenuOpen(false)}
          className="hidden w-fit rounded-sm text-2xl font-black tracking-[-0.06em] text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8f36a] lg:block"
        >
          KINGSMIND<span className="text-[#d8f36a]">.</span>
        </Link>
        <p className="text-center lg:col-start-2 lg:row-start-1 lg:text-sm lg:font-medium lg:tracking-normal lg:text-[#e3e9de]">
          Football essentials. Payment on delivery.
        </p>
        {user && <button
          ref={searchButtonRef}
          type="button"
          aria-label="Search products"
          aria-expanded={searchOpen}
          aria-controls="navbar-product-search"
          onClick={toggleProductSearch}
          className="hidden h-11 w-20 cursor-pointer items-center justify-center justify-self-end rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8f36a] aria-expanded:bg-white/20 lg:inline-flex"
        >
          {searchIcon}
        </button>}
      </div>

      <header className={`relative mx-auto grid h-20 w-full items-center gap-x-1.5 gap-y-3 px-4 py-3 md:px-8 lg:h-auto lg:grid-cols-[1fr_auto] lg:gap-x-5 ${user ? "max-w-5xl lg:py-7" : "lg:py-3"} ${!loading && !user ? "grid-cols-[minmax(0,1fr)_auto_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]"}`}>
        <Link
          to="/"
          aria-label="Kingsmind home"
          onClick={() => setMenuOpen(false)}
          className="text-lg font-black tracking-[-0.06em] text-white sm:text-2xl md:text-3xl lg:hidden"
        >
          KINGSMIND<span className="text-[#d8f36a]">.</span>
        </Link>
        {!loading && user && location.pathname === "/" && (
          <p className="hidden min-w-0 wrap-break-word text-right font-bold tracking-tight text-[#17352a] lg:col-span-3 lg:row-start-1 lg:block lg:text-2xl">
            Hi, {user.name.trim().split(/\s+/)[0]}
          </p>
        )}

        {!loading && !user && (
          <Link
            to="/register"
            onClick={() => setMenuOpen(false)}
            className="col-start-3 row-start-1 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d8f36a] bg-[#d8f36a] px-2.5 text-sm font-bold text-[#17352a] shadow-sm transition-colors hover:bg-[#e4ff82] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 lg:hidden"
          >
            Register
          </Link>
        )}

        <button
          ref={mobileSearchButtonRef}
          type="button"
          aria-label="Search products"
          aria-expanded={searchOpen}
          aria-controls="navbar-product-search"
          onClick={toggleProductSearch}
          className="col-start-2 row-start-1 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8f36a] aria-expanded:bg-white/20 sm:w-14 lg:hidden"
        >
          {searchIcon}
        </button>
        <button
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          ref={menuButtonRef}
          aria-controls="main-navigation"
          onClick={() => {
            setSearchOpen(false);
            setMenuOpen((open) => !open);
          }}
          className="col-start-[-2] row-start-1 flex h-11 w-11 cursor-pointer items-center justify-center justify-self-end rounded-lg border border-white/25 bg-white/5 text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-expanded:bg-white/15 lg:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-5 w-5"
          >
            <path
              d={menuOpen ? "M6 6l12 12M18 6L6 18" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
        <nav
          ref={menuRef}
          id="main-navigation"
          aria-label="Main navigation"
          className={`${
            menuOpen
              ? "max-lg:visible max-lg:translate-y-0 max-lg:opacity-100 max-lg:duration-200 max-lg:ease-out"
              : "max-lg:invisible max-lg:pointer-events-none max-lg:-translate-y-2 max-lg:opacity-0 max-lg:duration-150 max-lg:ease-in"
          } flex flex-col items-start gap-4 text-sm max-lg:absolute max-lg:right-5 max-lg:top-[calc(100%-0.5rem)] max-lg:z-50 max-lg:max-h-[calc(100dvh-9rem)] max-lg:overscroll-contain max-lg:w-[calc(100%-2.5rem)] max-lg:max-w-72 max-lg:items-stretch max-lg:gap-2.5 max-lg:overflow-y-auto max-lg:rounded-2xl max-lg:border max-lg:border-stone-200 max-lg:bg-white/95 max-lg:p-3.5 max-lg:shadow-xl max-lg:backdrop-blur-sm max-lg:transition-[opacity,translate,visibility] max-lg:motion-reduce:transition-none md:max-lg:right-8 ${
            user
              ? "lg:fixed lg:top-20 lg:bottom-8 lg:left-3 lg:z-40 lg:flex lg:w-52 lg:gap-2 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-[#244b3c] lg:bg-[#17352a] lg:px-3 lg:py-5 lg:text-white lg:shadow-lg"
              : "lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-row lg:items-center lg:justify-end lg:border-0 lg:pt-0"
          }`}
        >
          {!user && (
            <button
              ref={searchButtonRef}
              type="button"
              aria-label="Search products"
              aria-expanded={searchOpen}
              aria-controls="navbar-product-search"
              onClick={toggleProductSearch}
              className="hidden h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8f36a] aria-expanded:bg-white/20 lg:inline-flex"
            >
              {searchIcon}
              <span>Search</span>
            </button>
          )}
          {user?.role === "admin" && (
            <>
              <Link
                to="/admin/orders"
                onClick={() => setMenuOpen(false)}
                className={sidebarButtonClass}
              >
                Manage orders
              </Link>

              <Link
                to="/admin/products"
                onClick={() => setMenuOpen(false)}
                className={sidebarButtonClass}
              >
                Manage products
              </Link>

              <Link
                to="/admin/customers"
                onClick={() => setMenuOpen(false)}
                className={sidebarButtonClass}
              >
                Manage customers
              </Link>

              <Link
                to="/admin/exchange-rate"
                onClick={() => setMenuOpen(false)}
                className={sidebarButtonClass}
              >
                Exchange rate
              </Link>
            </>
          )}

          <Link
            to="/#collection"
            className={sidebarButtonClass}
            onClick={() => setMenuOpen(false)}
          >
            Shop
          </Link>

          <Link
            to="/cart"
            aria-label={`Shopping cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            className={sidebarButtonClass}
            onClick={() => setMenuOpen(false)}
          >
            <span className="flex items-center gap-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 shrink-0"
              >
                <path d="M3 3h2l2.5 12h11l2-8H6" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span>Cart</span>
              {itemCount > 0 && (
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d8f36a] px-1.5 text-xs font-bold text-[#17352a] tabular-nums"
                >
                  {itemCount}
                </span>
              )}
            </span>
          </Link>

          {!loading && !user && (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className={guestSignInClass}
            >
              Sign in
            </Link>
          )}

          {!loading && !user && (
            <Link
              to="/register"
              className="hidden min-h-11 items-center justify-center rounded-lg bg-[#d8f36a] px-5 font-bold text-[#17352a] transition-colors hover:bg-[#e4ff82] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex"
              onClick={() => setMenuOpen(false)}
            >
              Register
            </Link>
          )}

          {user && (
            <Link
              to="/orders"
              className={sidebarButtonClass}
              onClick={() => setMenuOpen(false)}
            >
              My orders
            </Link>
          )}

          {user && (
            <Link
              to="/account/settings"
              className={sidebarButtonClass}
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>
          )}

          {!loading && user && (
            <div className="w-full shrink-0 lg:mt-auto lg:border-t lg:border-white/25 lg:pt-4">
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className={`${sidebarButtonClass} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{signingOut ? "Signing out…" : "Sign out"}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 shrink-0"
                  >
                    <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
                    <path d="M9 12h11m-4-4 4 4-4 4" />
                  </svg>
                </span>
              </button>
            </div>
          )}
        </nav>
      </header>
      {searchOpen && (
        <div
          ref={searchPanelRef}
          id="navbar-product-search"
          className={`fixed inset-x-3 top-32 z-50 rounded-3xl bg-white p-3 shadow-lg sm:left-auto sm:right-6 sm:w-[30rem] sm:p-4 ${user ? "lg:top-20" : "lg:top-36"}`}
        >
          <form
            role="search"
            aria-label="Search products"
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const search = String(fields.get("search") ?? "").trim();
              const params = new URLSearchParams();
              if (search) params.set("search", search);
              navigate({ pathname: "/", search: params.toString(), hash: "#collection" });
              setSearchOpen(false);
              setMenuOpen(false);
            }}
          >
            <label htmlFor="navbar-search-input" className="mb-3 block px-2 text-sm font-semibold text-[#17352a]">
              Search the collection
            </label>
            <div className="flex items-center gap-2 rounded-full bg-[#f1f2eb] py-1 pr-1.5 pl-5 transition-colors focus-within:bg-[#e3e9d9]">
              <input
                id="navbar-search-input"
                ref={searchInputRef}
                name="search"
                type="search"
                autoComplete="off"
                defaultValue={new URLSearchParams(location.search).get("search") ?? ""}
                onChange={(event) => {
                  const params = new URLSearchParams();
                  if (event.currentTarget.value) {
                    params.set("search", event.currentTarget.value);
                  }
                  navigate(
                    { pathname: "/", search: params.toString(), hash: "#collection" },
                    {
                      replace: true,
                      preventScrollReset: true,
                      state: { liveProductSearch: true },
                    },
                  );
                }}
                maxLength={100}
                placeholder="Football essentials"
                className="min-h-12 min-w-0 flex-1 appearance-none rounded-full border-0 bg-transparent py-3 text-base text-[#17352a] shadow-none outline-none placeholder:text-stone-500 focus-visible:outline-none"
              />
              <button type="submit" className="min-h-11 shrink-0 cursor-pointer rounded-full bg-[#17352a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] sm:px-5">
                Search
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
      <div aria-hidden="true" className="h-30 shrink-0 lg:hidden" />
      {!loading && user && location.pathname === "/" && (
        <p className="px-5 py-5 text-right text-lg font-bold tracking-tight wrap-break-word text-[#17352a] md:px-8 lg:hidden">
          Hi, {user.name.trim().split(/\s+/)[0]}
        </p>
      )}
      {logoutError && (
        <ActionNotice message={logoutError} type="error" />
      )}
    </>
  );
}
