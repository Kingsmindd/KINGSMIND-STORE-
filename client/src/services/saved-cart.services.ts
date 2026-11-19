import { apiRequest } from "./api.client";
import type { CheckoutInput, ShippingAddress } from "../types/order.types";

type SavedCartPayload = {
  currency: "NGN" | "USD";
  items: CheckoutInput["items"];
  shippingAddress: ShippingAddress | null;
};

type SavedCart = {
  payload: SavedCartPayload;
  updated_at: string;
};

export function getSavedCart(signal?: AbortSignal) {
  return apiRequest<{ draft: SavedCart | null }>("/orders/draft", { signal });
}

export function saveCart(items: CheckoutInput["items"]) {
  return apiRequest<{ draft: SavedCart }>("/orders/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency: "NGN", items }),
  });
}

export function deleteSavedCart() {
  return apiRequest<void>("/orders/draft", { method: "DELETE" });
}
