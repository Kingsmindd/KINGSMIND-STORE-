import { Outlet } from "react-router";
import AdminSidebar from "../components/layout/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-2 px-5 pt-6 md:px-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
      <AdminSidebar />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
