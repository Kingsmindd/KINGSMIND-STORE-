import { apiRequest } from "./api.client";
import type {
  CheckoutInput,
  CheckoutPreview,
  CreatedOrder,
  CustomerOrder,
  CustomerOrderDetails,
  CustomerOrderListResponse,
} from "../types/order.types";
import type { AdminProduct } from "../types/product.types";

export async function getCheckoutPreview(
  items: CheckoutInput["items"],
  signal?: AbortSignal,
): Promise<CheckoutPreview> {
  const { preview } = await apiRequest<{ preview: CheckoutPreview }>(
    "/checkout/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal,
    },
  );

  return preview;
}

export async function createOrder(input: CheckoutInput): Promise<CreatedOrder> {
  const result = await apiRequest<{
    message: string;
    order: CreatedOrder;
  }>("/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return result.order;
}

export async function getMyOrders(
  page: number,
  signal?: AbortSignal,
): Promise<CustomerOrderListResponse> {
  return apiRequest(`/orders?page=${page}`, { signal });
}

export async function getMyOrder(
  orderId: string,
  signal?: AbortSignal,
): Promise<CustomerOrderDetails> {
  const result = await apiRequest<{ order: CustomerOrderDetails }>(
    `/orders/${encodeURIComponent(orderId)}`,
    { signal },
  );

  return result.order;
}

export type AdminOrder = CustomerOrder & {
  user_id: string | null;
};

export async function getAdminOrders(page: number, signal?: AbortSignal) {
  return apiRequest<{
    orders: AdminOrder[];
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>(`/orders/admin?page=${page}`, { signal });
}

export async function getAdminOrder(
  orderId: string,
  signal?: AbortSignal,
): Promise<CustomerOrderDetails & AdminOrder> {
  const result = await apiRequest<{
    order: CustomerOrderDetails & AdminOrder;
  }>(`/orders/admin/${encodeURIComponent(orderId)}`, { signal });

  return result.order;
}

export async function saveDeliveryQuote(
  orderId: string,
  shippingMinor: string,
  editing: boolean,
): Promise<void> {
  await apiRequest(`/orders/${encodeURIComponent(orderId)}/delivery-quote`, {
    method: editing ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shippingMinor }),
  });
}

export async function confirmOrder(orderId: string): Promise<void> {
  await apiRequest(`/orders/${encodeURIComponent(orderId)}/confirm`, {
    method: "POST",
  });
}

export async function shipOrder(orderId: string): Promise<void> {
  await apiRequest(`/orders/${encodeURIComponent(orderId)}/ship`, {
    method: "POST",
  });
}

export async function completeOrderDelivery(orderId: string): Promise<void> {
  await apiRequest(`/orders/${encodeURIComponent(orderId)}/complete-delivery`, {
    method: "POST",
  });
}

export function createAdminProductDraft(input: {
  name: string;
  description: string;
  currency: AdminProduct["currency"];
  image: File;
}) {
  const body = new FormData();
  body.append("name", input.name.trim());
  body.append("currency", input.currency);
  body.append("image", input.image);

  const description = input.description.trim();
  if (description) {
    body.append("description", description);
  }

  return apiRequest<{ product: AdminProduct }>("/products", {
    method: "POST",
    body,
  });
}

export async function cancelOrder(
  orderId: string,
  reason: string,
): Promise<void> {
  await apiRequest(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

export async function removeDeliveryQuote(orderId: string): Promise<void> {
  await apiRequest(`/orders/${encodeURIComponent(orderId)}/delivery-quote`, {
    method: "DELETE",
  });
}
