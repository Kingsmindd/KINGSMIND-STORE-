import { createContext } from "react";
import type { Dispatch } from "react";

export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  option: string;
  imageUrl: string | null;
  currency: "NGN" | "USD";
  unitPriceMinor: string;
  availableStock: number;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  notice: string;
};

export type CartAction =
  | { type: "add"; item: CartItem }
  | { type: "quantity"; variantId: string; quantity: number }
  | { type: "remove"; variantId: string }
  | { type: "clear" }
  | { type: "clear-notice" }
  | { type: "restore"; items: CartItem[] };

export const CartContext = createContext<{
  state: CartState;
  dispatch: Dispatch<CartAction>;
} | null>(null);
