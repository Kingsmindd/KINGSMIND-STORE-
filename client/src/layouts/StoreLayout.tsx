import { Outlet, useLocation, useNavigationType } from "react-router";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";
import { SupportChatLauncher } from "../pages/customer/SupportChatPage";

export default function StoreLayout() {
  const { user, loading } = useAuth();
  const { pathname, hash, key, state } = useLocation();
  const liveProductSearch =
    typeof state === "object" && state !== null && state.liveProductSearch === true;
  const navigationType = useNavigationType();
  const customerSupportPage = /^\/support\/?$/i.test(pathname);
  const showSupportLauncher =
    !loading && (user?.role === "admin" || !customerSupportPage);

  useEffect(() => {
    if (liveProductSearch) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth";
    if (pathname === "/" && hash === "#collection") {
      document.getElementById("collection")?.scrollIntoView({
        block: "start",
        behavior,
      });
      return;
    }
    if (navigationType === "POP" || hash) return;
    window.scrollTo({ top: 0, left: 0, behavior });
  }, [pathname, hash, key, navigationType, liveProductSearch]);
  return (
    <div className={`flex min-h-screen flex-col ${user ? "lg:pl-56" : ""}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-4"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1">
        <div key={pathname} className="page-content">
          <Outlet />
        </div>
      </main>

      <Footer />
      {showSupportLauncher && (
        <SupportChatLauncher key={user?.id ?? "guest"} />
      )}
    </div>
  );
}
