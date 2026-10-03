import { CheckCircle2, CircleAlert, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";
type Toast = { id: number; type: ToastType; title: string; message?: string };
type ToastContextType = { pushToast: (toast: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastContextType | null>(null);
const iconMap = { success: CheckCircle2, error: XCircle, info: Info, warning: CircleAlert };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(92vw,380px)] flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          const tone =
            toast.type === "success" ? "text-emerald-500" :
            toast.type === "error" ? "text-red-500" :
            toast.type === "warning" ? "text-amber-500" : "text-[var(--role-accent)]";

          return (
            <div key={toast.id} className="pointer-events-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,42,82,.18)]">
              <div className="flex items-start gap-3">
                <span className={tone}><Icon size={20}/></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0B1D3A]">{toast.title}</p>
                  {toast.message && <p className="mt-1 text-sm leading-5 text-slate-500">{toast.message}</p>}
                </div>
                <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X size={16}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
