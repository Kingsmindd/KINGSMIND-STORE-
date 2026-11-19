import BackLink from "../components/ui/BackLink";

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
      <p className="text-sm font-semibold text-[#688746]">404</p>

      <h1 className="mt-4 text-4xl font-bold tracking-tight">
        This page is off the pitch.
      </h1>

      <p className="mt-5 max-w-md leading-7 text-stone-600">
        The page you’re looking for doesn’t exist or has moved.
      </p>

      <BackLink to="/">Back to the store</BackLink>
    </section>
  );
}
