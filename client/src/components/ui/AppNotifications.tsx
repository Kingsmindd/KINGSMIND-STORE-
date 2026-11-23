import { useEffect, useId } from "react";
import toast, { Toaster, ToastBar, useToasterStore } from "react-hot-toast";

/** Bridge existing action feedback to one consistent, timed notification. */
export function ActionNotice({ message, type = "success" }: {
  message: string | null | undefined;
  type?: "success" | "error";
}) {
  const id = useId();
  useEffect(() => {
    if (message) toast[type](message, { id: `action-${id}` });
  }, [message, type, id]);
  return null;
}

export default function AppNotifications() {
  const { toasts } = useToasterStore();
  useEffect(() => {
    toasts.filter(item => item.visible).slice(3).forEach(item => toast.dismiss(item.id));
  }, [toasts]);

  return (
    <Toaster position="top-right" gutter={10} containerStyle={{ top: "calc(env(safe-area-inset-top, 0px) + 20px)", right: 16, left: 16, zIndex: 9999 }} toastOptions={{
      duration: 4500,
      removeDelay: 250,
      style: { width: "min(400px, calc(100vw - 32px))", maxWidth: "none", padding: "14px 16px", borderRadius: 16, background: "#ffffff", color: "#17352a", border: "1px solid #dce4da", borderLeft: "4px solid #688746", boxShadow: "0 16px 48px #17352a20, 0 3px 10px #17352a0d", fontFamily: "inherit", fontSize: 14, lineHeight: "1.5" },
      success: { duration: 4500 },
      error: { duration: 6500, style: { borderColor: "#f1d5d0", borderLeftColor: "#b54132" } },
    }}>
      {item => (
        <ToastBar toast={item}>
          {({ message }) => (
            <div className="flex w-full items-start gap-3 text-left">
              <span aria-hidden="true" className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${item.type === "error" ? "bg-red-50 text-red-700" : "bg-[#edf3e8] text-[#426533]"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                  {item.type === "error" ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></> : <path d="m5 12 4 4L19 6" />}
                </svg>
              </span>
              <div className="min-w-0 flex-1"><p className={`text-xs font-bold ${item.type === "error" ? "text-red-800" : "text-[#17352a]"}`}>{item.type === "error" ? "Please check" : "All set"}</p><div className="[&>div]:m-0 [&>div]:justify-start [&>div]:break-words">{message}</div></div>
              <button type="button" onClick={() => toast.dismiss(item.id)} aria-label="Dismiss notification" className="-mr-1 -mt-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a]">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
