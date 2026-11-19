import { NavLink } from "react-router";

const links = [
  { to: "/admin/orders", label: "Manage orders" },
  { to: "/admin/products", label: "Manage products" },
];

export default function AdminSidebar() {
  return (
    <aside className="border-b border-stone-200 pb-4 lg:sticky lg:top-6 lg:self-start lg:border-r lg:border-b-0 lg:pr-5">
      <p className="mb-3 text-xs font-bold tracking-widest text-[#688746]">
        KINGSMIND ADMIN
      </p>

      <nav
        aria-label="Admin navigation"
        className="flex flex-wrap gap-2 lg:flex-col"
      >
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `rounded px-4 py-3 text-sm font-semibold ${
                isActive
                  ? "bg-[#17352a] text-white"
                  : "text-[#17352a] hover:bg-[#e9ebdf]"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
