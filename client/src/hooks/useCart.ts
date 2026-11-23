import { useContext } from "react";
import { CartContext } from "../contexts/CartContext";
import type { CartItem } from "../contexts/CartContext";

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }

  const { state, dispatch, ready } = context;

  return {
    ready,
    items: state.items,
    notice: state.notice,
    itemCount: state.items.reduce((total, item) => total + item.quantity, 0),
    addItem: (item: CartItem) => dispatch({ type: "add", item }),
    updateQuantity: (variantId: string, quantity: number) =>
      dispatch({ type: "quantity", variantId, quantity }),
    removeItem: (variantId: string) => dispatch({ type: "remove", variantId }),
    clearCart: (silent = false) => dispatch({ type: "clear", silent }),
    restoreCart: (items: CartItem[]) => dispatch({ type: "restore", items }),
  };
}
