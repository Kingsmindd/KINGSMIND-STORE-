export type ShippingAddress = {
  recipientName: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
};

export type CheckoutPreview = {
  pricing_fingerprint: string;
  currency: "NGN";
  usd_to_ngn_rate: string | null;
  subtotal_minor: string;
  items: {
    variantId: string;
    quantity: number;
    listed_currency: "NGN" | "USD";
    listed_unit_price_minor: string;
    unit_price_minor: string;
    line_total_minor: string;
  }[];
};

export type CheckoutInput = {
  pricingFingerprint?: string;
  currency: "NGN" | "USD";
  items: {
    variantId: string;
    quantity: number;
  }[];
  shippingAddress: ShippingAddress;
};

export type CreatedOrder = {
  id: string;
  status: "awaiting_delivery_quote";
  currency: "NGN" | "USD";
  subtotal_minor: string;
  shipping_minor: null;
  total_minor: null;
};

export type CustomerOrder = {
  id: string;
  status:
    | "awaiting_delivery_quote"
    | "pending"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled";
  currency: "NGN" | "USD";
  subtotal_minor: string;
  shipping_minor: string | null;
  total_minor: string | null;
  created_at: string;
  payment_method: "payment_on_delivery";
  payment_status: "uncollected" | "collected";
  payment_collected_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
};

export type CustomerOrderListResponse = {
  orders: CustomerOrder[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type CustomerOrderDetails = CustomerOrder & {
  items: {
    variant_id: string;
    product_name: string;
    sku: string;
    size: string | null;
    colour: string | null;
    quantity: number;
    unit_price_minor: string;
    line_total_minor: string;
  }[];
  shippingAddress: {
    recipient_name: string;
    phone: string;
    address_line1: string;
    city: string;
    state: string;
    country_code: "NG";
  };
};
