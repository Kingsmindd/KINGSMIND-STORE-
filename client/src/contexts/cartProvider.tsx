import toast from "react-hot-toast";
import { useEffect, useReducer } from "react";
import type { ReactNode } from "react";
import { CartContext } from "./CartContext";
import type { CartAction, CartState, CartItem } from "./CartContext";
import { useAuth } from "../hooks/useAuth";

function isStoredCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return (
    typeof item.productId === "string" &&
    uuid.test(item.productId) &&
    typeof item.variantId === "string" &&
    uuid.test(item.variantId) &&
    typeof item.name === "string" &&
    typeof item.option === "string" &&
    (item.imageUrl === null ||
      (typeof item.imageUrl === "string" &&
        /^\/uploads\/products\/[0-9a-f-]+[.]webp$/.test(item.imageUrl))) &&
    (item.currency === "NGN" || item.currency === "USD") &&
    typeof item.unitPriceMinor === "string" &&
    /^[1-9][0-9]{0,18}$/.test(item.unitPriceMinor) &&
    typeof item.availableStock === "number" &&
    Number.isInteger(item.availableStock) &&
    item.availableStock >= 0 &&
    item.availableStock <= 2147483647 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= Math.min(item.availableStock, 100)
  );
}

function readSavedCart(storageKey: string | null): CartState {
  const emptyCart: CartState = { items: [], notice: "" };
  if (!storageKey) return emptyCart;

  try {
    const saved = localStorage.getItem(storageKey);

    if (!saved) return emptyCart;

    const items: unknown = JSON.parse(saved);

    if (
      !Array.isArray(items) ||
      items.length > 50 ||
      !items.every(isStoredCartItem)
    ) {
      return emptyCart;
    }

    const variantIds = new Set(
      items.map((item) => item.variantId.toLowerCase()),
    );

    if (variantIds.size !== items.length) return emptyCart;

    return { items, notice: "" };
  } catch {
    return emptyCart;
  }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const item = action.item;
      const existing = state.items.find(
        (entry) => entry.variantId === item.variantId,
      );

      if (!existing && state.items.length >= 50) {
        return {
          ...state,
          notice: "Your cart can contain up to 50 different variants.",
          noticeType: "error",
        };
      }

      const quantity = (existing?.quantity ?? 0) + item.quantity;
      const maximum = Math.min(item.availableStock, 100);

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > maximum) {
        return {
          ...state,
          notice: "The requested quantity exceeds the available amount.",
          noticeType: "error",
        };
      }

      const updated = { ...item, quantity };

      return {
        items: existing
          ? state.items.map((entry) =>
              entry.variantId === item.variantId ? updated : entry,
            )
          : [...state.items, updated],
        notice: `${item.name} added to your cart.`,
        noticeType: "success",
      };
    }

    case "quantity": {
      const item = state.items.find(
        (entry) => entry.variantId === action.variantId,
      );

      if (!item) return state;

      if (
        !Number.isInteger(action.quantity) ||
        action.quantity < 1 ||
        action.quantity > Math.min(item.availableStock, 100)
      ) {
        return {
          ...state,
          notice: "Choose a quantity within the available amount.",
          noticeType: "error",
        };
      }

      return {
        items: state.items.map((entry) =>
          entry.variantId === action.variantId
            ? { ...entry, quantity: action.quantity }
            : entry,
        ),
        notice: "Cart quantity updated.",
        noticeType: "success",
      };
    }

    case "remove":
      return {
        items: state.items.filter(
          (entry) => entry.variantId !== action.variantId,
        ),
        notice: "Item removed from your cart.",
        noticeType: "success",
      };

    case "clear-notice":
      return { ...state, notice: "" };

    case "restore":
      return { items: action.items, notice: "" };

    case "clear":
      return { items: [], notice: action.silent ? "" : "Cart cleared.", noticeType: "success" };
  }
}

type AccountCartState = {
  storageKey: string | null;
  cart: CartState;
};

type AccountCartAction =
  | { type: "switch"; storageKey: string | null; cart: CartState }
  | { type: "cart"; storageKey: string | null; action: CartAction };

function accountCartReducer(
  state: AccountCartState,
  action: AccountCartAction,
): AccountCartState {
  if (action.type === "switch") {
    return { storageKey: action.storageKey, cart: action.cart };
  }
  if (!action.storageKey || action.storageKey !== state.storageKey) return state;
  return { ...state, cart: cartReducer(state.cart, action.action) };
}

function AccountCart({
  children,
  storageKey,
}: {
  children: ReactNode;
  storageKey: string | null;
}) {
  const [account, dispatch] = useReducer(
    accountCartReducer,
    storageKey,
    (key): AccountCartState => ({ storageKey: key, cart: readSavedCart(key) }),
  );
  const state = account.cart;

  if (account.storageKey !== storageKey) {
    dispatch({ type: "switch", storageKey, cart: readSavedCart(storageKey) });
  }

  useEffect(() => {
    if (!storageKey) return;
    try {
      if (state.items.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(state.items));
      }
    } catch {
      console.warn("Cart changes could not be saved in this browser.");
    }
  }, [state.items, storageKey]);

  useEffect(() => {
    if (!state.notice) return;
    toast[state.noticeType ?? "success"](state.notice, { id: "cart-feedback" });

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "cart", storageKey, action: { type: "clear-notice" } });
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [state, storageKey]);

  return (
    <CartContext.Provider value={{
      state,
      ready: storageKey !== null,
      dispatch: (action) => dispatch({ type: "cart", storageKey, action }),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  const storageKey = loading
    ? null
    : user
      ? `kingsmind-cart-v2:user:${user.id}`
      : "kingsmind-cart-v2:guest";

  return (
    <AccountCart storageKey={storageKey}>
      {children}
    </AccountCart>
  );
}
