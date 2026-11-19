import { Link, type LinkProps } from "react-router";

type BackLinkProps = Pick<LinkProps, "to" | "children">;

export default function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 text-sm font-semibold text-[#17352a] transition-colors hover:border-[#17352a] hover:bg-[#f1f5ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a]"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
