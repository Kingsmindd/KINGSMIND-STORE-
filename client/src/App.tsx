import { BrowserRouter } from "react-router";
import AppRoutes from "./routes/AppRoutes";
import CartProvider from "./contexts/cartProvider";
import AuthProvider from "./contexts/AuthProvider";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
