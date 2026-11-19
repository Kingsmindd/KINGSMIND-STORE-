import { apiRequest } from "./api.client";
import type { CartItem } from "../contexts/CartContext";
import type { CheckoutInput } from "../types/order.types";

export function getSavedCart() {
  return apiRequest<{
    draft: { updated_at: string } | null;
    cartItems: CartItem[];
    unavailableCount: number;
    adjustedCount: number;
  }>("/orders/draft");
}

export function saveCart(items: CheckoutInput["items"]) {
  return apiRequest<{ draft: { updated_at: string } }>("/orders/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency: "NGN", items }),
  });
}
