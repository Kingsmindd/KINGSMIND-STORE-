import AppNotifications from "./components/ui/AppNotifications";
import { BrowserRouter } from "react-router";
import AppRoutes from "./routes/AppRoutes";
import CartProvider from "./contexts/cartProvider";
import AuthProvider from "./contexts/AuthProvider";

export default function App() {
  return (
    <BrowserRouter>
      <AppNotifications />
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
