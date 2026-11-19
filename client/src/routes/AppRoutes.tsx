import { Route, Routes } from "react-router";
import StoreLayout from "../layouts/StoreLayout";
import HomePage from "../pages/storefront/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import ProductDetailsPage from "../pages/storefront/ProductDetailsPage";
import CartPage from "../pages/customer/CartPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import VerifyEmailPage from "../pages/auth/VerifyEmailPage";
import RequireAuth from "./RequireAuth";
import CheckoutPage from "../pages/customer/CheckoutPage";
import MyOrdersPage from "../pages/customer/MyOrdersPage";
import OrderDetailsPage from "../pages/customer/OrderDetailsPage";
import RequireAdmin from "./RequireAdmin";
import SupportChatPage, { SupportInboxPage } from "../pages/customer/SupportChatPage";
import OrdersPage from "../pages/admin/OrdersPage";
import ProductsPage from "../pages/admin/ProductsPage";
import ProductEditorPage from "../pages/admin/ProductEditorPage";
import CreateProductPage from "../pages/admin/CreateProductPage";
import CustomerManagementPage from "../pages/admin/CustomerManagementPage";
import ChangePasswordPage from "../pages/auth/ChangePasswordInput";
import ForgotPasswordPage from "../pages/auth/ForgetPassword";
import ResetPasswordPage from "../pages/auth/ResetPassword";
import SettingsPage from "../pages/auth/SettingsPage";
import ExchangeRatePage from "../pages/admin/ExchangeRatePage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products/:productId" element={<ProductDetailsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="support" element={<SupportChatPage />} />
        <Route element={<RequireAuth />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<MyOrdersPage />} />
          <Route path="orders/:orderId" element={<OrderDetailsPage />} />
          <Route path="account/password" element={<ChangePasswordPage />} />
          <Route path="account/settings" element={<SettingsPage />} />

          <Route element={<RequireAdmin />}>
            <Route path="admin/support" element={<SupportInboxPage />} />
            <Route path="admin/support/:conversationId" element={<SupportInboxPage />} />
            <Route path="admin/orders" element={<OrdersPage />} />
            <Route path="admin/products" element={<ProductsPage />} />
            <Route
              path="admin/orders/:orderId"
              element={<OrderDetailsPage mode="admin" />}
            />
            <Route
              path="admin/products/:productId"
              element={<ProductEditorPage />}
            />
            <Route path="admin/products/new" element={<CreateProductPage />} />
            <Route
              path="admin/customers"
              element={<CustomerManagementPage />}
            />
            <Route path="admin/exchange-rate" element={<ExchangeRatePage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
