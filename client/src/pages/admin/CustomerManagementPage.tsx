import { ActionNotice } from "../../components/ui/AppNotifications";
import { useEffect, useRef, useState } from "react";
import {
  changeAdminCustomerStatus,
  deleteAdminCustomer,
  getAdminCustomers,
  type AdminCustomer,
} from "../../services/customer.service";

type CustomerList = Awaited<ReturnType<typeof getAdminCustomers>>;

export default function CustomerManagementPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CustomerList | null>(null);
  const [error, setError] = useState("");

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [customerToDelete, setCustomerToDelete] =
    useState<AdminCustomer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [listRevision, setListRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void getAdminCustomers(page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not load customers.",
          );
        }
      });

    return () => controller.abort();
  }, [page, listRevision]);

  function changePage(nextPage: number) {
    setResult(null);
    setError("");
    setPage(nextPage);
  }

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  async function handleStatusChange(customer: AdminCustomer) {
    if (updatingId !== null) return;

    setUpdatingId(customer.id);
    setActionFeedback(null);

    try {
      const { customer: updated, message } = await changeAdminCustomerStatus(
        customer.id,
        customer.suspended_at ? "reactivate" : "suspend",
      );

      setResult((current) => {
        if (!current) return current;

        return {
          ...current,
          customers: current.customers.map((entry) =>
            entry.id === updated.id
              ? { ...entry, suspended_at: updated.suspended_at }
              : entry,
          ),
        };
      });

      setActionFeedback({ message, isError: false });
    } catch (error: unknown) {
      setActionFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Could not update the account.",
        isError: true,
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteCustomer() {
    if (!customerToDelete || deleting || updatingId !== null) return;

    setDeleting(true);
    setDeleteError("");
    setActionFeedback(null);

    try {
      const { message } = await deleteAdminCustomer(customerToDelete.id);

      deleteDialogRef.current?.close();
      setActionFeedback({ message, isError: false });
      setResult(null);
      setError("");

      if (page > 1 && result?.customers.length === 1) {
        setPage(page - 1);
      }

      setListRevision((revision) => revision + 1);
    } catch (error: unknown) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Could not delete the account.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 md:px-8">
      <h1 className="text-4xl font-bold tracking-tight">Manage customers</h1>
      {actionFeedback && (
        <ActionNotice message={actionFeedback.message} type={actionFeedback.isError ? "error" : "success"} />
      )}

      {error && (
        <p role="alert" className="mt-6 text-red-800">
          {error}
        </p>
      )}
      {!result && !error && (
        <p role="status" className="mt-6">
          Loading customers…
        </p>
      )}

      {result && (
        <>
          {result.customers.length === 0 ? (
            <p className="mt-6 text-stone-600">No customers on this page.</p>
          ) : (
            <ul className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
              {result.customers.map((customer) => (
                <li
                  key={customer.id}
                  className="grid grid-cols-3 items-center gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_9rem] sm:gap-3"
                >
                  <div className="col-span-3 min-w-0 sm:col-span-1">
                    <p className="wrap-break-word font-semibold">
                      {customer.name}
                    </p>
                    <p className="wrap-break-word text-sm text-stone-600">
                      {customer.email}
                    </p>
                  </div>

                  <span
                    className={`justify-self-center rounded-full px-3 py-1 text-xs font-semibold ${
                      customer.suspended_at
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {customer.suspended_at ? "Suspended" : "Active"}
                  </span>
                  <button
                    type="button"
                    disabled={updatingId !== null}
                    onClick={() => void handleStatusChange(customer)}
                    className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-[#17352a] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingId === customer.id
                      ? "Updating…"
                      : customer.suspended_at
                        ? "Reactivate"
                        : "Suspend"}
                  </button>

                  <button
                    type="button"
                    disabled={updatingId !== null || deleting}
                    onClick={() => {
                      setCustomerToDelete(customer);
                      setDeleteError("");
                      deleteDialogRef.current?.showModal();
                    }}
                    className="cursor-pointer rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete account
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => changePage(page - 1)}
              className="cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={!result.hasMore || page >= 100000}
              onClick={() => changePage(page + 1)}
              className="cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      <dialog
        ref={deleteDialogRef}
        aria-labelledby="delete-customer-title"
        onCancel={(event) => {
          if (deleting) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50"
      >
        <h2 id="delete-customer-title" className="text-xl font-bold">
          Delete customer account?
        </h2>

        <p className="mt-3 text-sm text-stone-600">
          This will permanently delete{" "}
          <strong>{customerToDelete?.email}</strong>.
        </p>

        {deleteError && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            {deleteError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            disabled={deleting}
            onClick={() => deleteDialogRef.current?.close()}
            className="cursor-pointer rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep account
          </button>

          <button
            type="button"
            disabled={deleting || !customerToDelete}
            onClick={() => void handleDeleteCustomer()}
            className="cursor-pointer rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
