import type { CustomerOrder } from "../../types/order.types";

const labels: Record<CustomerOrder["status"], string> = {
  awaiting_delivery_quote: "Awaiting delivery quote",
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrderStatusBadge({
  status,
}: {
  status: CustomerOrder["status"];
}) {
  const colour =
    status === "cancelled"
      ? "bg-red-50 text-red-800"
      : status === "delivered"
        ? "bg-emerald-50 text-emerald-800"
        : "bg-[#e9ebdf] text-[#17352a]";

  return (
    <span
      className={`inline-block rounded-full px-3 py-1.5 text-xs font-semibold ${colour}`}
    >
      {labels[status] || status}
    </span>
  );
}
