import { apiRequest } from "./api.client";

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  suspended_at: string | null;
};

type AdminCustomerListResponse = {
  customers: AdminCustomer[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function getAdminCustomers(page: number, signal?: AbortSignal) {
  return apiRequest<AdminCustomerListResponse>(
    `/admin/customers?page=${page}`,
    { signal },
  );
}

export function changeAdminCustomerStatus(
  customerId: string,
  action: "suspend" | "reactivate",
) {
  return apiRequest<{
    message: string;
    customer: Pick<AdminCustomer, "id" | "suspended_at">;
  }>(`/admin/customers/${encodeURIComponent(customerId)}/${action}`, {
    method: "POST",
  });
}

export function deleteAdminCustomer(customerId: string) {
  return apiRequest<{ message: string; customer: { id: string } }>(
    `/admin/customers/${encodeURIComponent(customerId)}`,
    { method: "DELETE" },
  );
}
