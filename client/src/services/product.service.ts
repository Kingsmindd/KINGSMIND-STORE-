import { resolveApiUrl } from "../config/api";
import type {
  ProductListResponse,
  ProductDetails,
  AdminProductListResponse,
  AdminProduct,
} from "../types/product.types";
import { apiRequest } from "./api.client";

export async function getProducts(
  page: number,
  signal?: AbortSignal,
  search = "",
): Promise<ProductListResponse> {
  const url = resolveApiUrl("/products");
  url.searchParams.set("page", String(page));

  if (search.trim()) {
    url.searchParams.set("search", search.trim());
  }

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error("Products could not be loaded.");
  }

  const data: ProductListResponse = await response.json();

  return data;
}

export async function getProductDetails(
  productId: string,
  signal?: AbortSignal,
): Promise<ProductDetails> {
  const response = await fetch(
    resolveApiUrl(`/products/${encodeURIComponent(productId)}`),
    { signal },
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "This product is no longer available."
        : "The product could not be loaded. Please try again later.",
    );
  }

  const data: { product: ProductDetails } = await response.json();

  return data.product;
}

export function getAdminProducts(
  page: number,
  signal?: AbortSignal,
): Promise<AdminProductListResponse> {
  return apiRequest(`/products/admin?page=${page}`, { signal });
}

export function getAdminProduct(productId: string, signal?: AbortSignal) {
  return apiRequest<{
    product: AdminProduct & {
      variants: {
        id: string;
        sku: string;
        size: string | null;
        colour: string | null;
        stock_quantity: number;
        amount_minor: string | null;
        is_active: boolean;
      }[];
    };
  }>(`/products/admin/${encodeURIComponent(productId)}`, { signal });
}

export function updateAdminProduct(
  productId: string,
  input: { name: string; description: string | null },
) {
  return apiRequest<{ product: AdminProduct }>(
    `/products/admin/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function updateAdminProductImage(productId: string, image: File) {
  const body = new FormData();
  body.append("image", image);

  return apiRequest<{ product: AdminProduct }>(
    `/products/admin/${encodeURIComponent(productId)}/image`,
    { method: "PATCH", body },
  );
}

export function setAdminProductVisibility(productId: string, visible: boolean) {
  const action = visible ? "publish" : "unpublish";

  return apiRequest<{ message: string; product: AdminProduct }>(
    `/products/${encodeURIComponent(productId)}/${action}`,
    { method: "POST" },
  );
}

export function createAdminProduct(fields: FormData) {
  return apiRequest<{ product: AdminProduct }>("/products", {
    method: "POST",
    body: fields,
  });
}

export function createAdminProductVariant(
  productId: string,
  input: {
    sku: string;
    size?: string;
    colour?: string;
    stockQuantity: number;
    amountMinor: string;
  },
) {
  type Variant = Awaited<
    ReturnType<typeof getAdminProduct>
  >["product"]["variants"][number];

  return apiRequest<{ variant: Variant }>(
    `/products/${encodeURIComponent(productId)}/variants`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function updateAdminVariantPrice(
  productId: string,
  variantId: string,
  amountMinor: string,
) {
  return apiRequest<{ price: { amount_minor: string } }>(
    `/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}/price`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMinor }),
    },
  );
}

export function deleteAdminProduct(productId: string) {
  return apiRequest<void>(`/products/admin/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}
