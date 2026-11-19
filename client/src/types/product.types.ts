export type ProductSummary = {
  id: string;
  name: string;
  description: string | null;
  currency: "NGN" | "USD";
  from_price_minor: string;
  image_url: string | null;
  in_stock: boolean;
  created_at: string;
};

export type ProductListResponse = {
  products: ProductSummary[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ProductVariant = {
  id: string;
  sku: string;
  size: string | null;
  colour: string | null;
  stock_quantity: number;
  amount_minor: string;
  in_stock: boolean;
};

export type ProductDetails = {
  id: string;
  name: string;
  description: string | null;
  currency: "NGN" | "USD";
  image_url: string | null;
  created_at: string;
  variants: ProductVariant[];
};

export type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  currency: "NGN" | "USD";
  image_url: string | null;
  is_active: boolean;
};

export type AdminProductListResponse = {
  products: AdminProduct[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};
