import { Link, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

export default function RequireAdmin() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="text-3xl font-bold">Admin access required</h1>
        <Link to="/" className="mt-5 inline-block underline">
          Back to the store
        </Link>
      </section>
    );
  }

  return <Outlet />;
}
