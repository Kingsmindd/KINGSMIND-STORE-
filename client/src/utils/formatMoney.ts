export function formatMoney(
  amountMinor: string,
  currency: "NGN" | "USD",
): string {
  const amount = BigInt(amountMinor);

  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter
    .formatToParts(amount / 100n)
    .map((part) =>
      part.type === "fraction"
        ? (amount % 100n).toString().padStart(2, "0")
        : part.value,
    )
    .join("");
}
