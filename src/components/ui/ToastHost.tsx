import { CheckCircle2, CircleAlert, Info, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";
type Toast = { id: number; type: ToastType; title: string; message?: string };
const iconMap = { success: CheckCircle2, error: XCircle, info: Info, warning: CircleAlert };

export function notify(type: ToastType, title: string, message?: string) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { type, title, message } }));
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const id = Date.now() + Math.floor(Math.random()*1000);
      setToasts((current) => [...current, { id, ...detail }]);
      window.setTimeout(() => setToasts((current) => current.filter((x)=>x.id!==id)), 4200);
    };
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(92vw,380px)] flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        const tone = toast.type==="success" ? "text-emerald-500" : toast.type==="error" ? "text-red-500" : toast.type==="warning" ? "text-amber-500" : "text-[var(--role-accent)]";
        return (
          <div key={toast.id} className="pointer-events-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,42,82,.18)]">
            <div className="flex items-start gap-3">
              <span className={tone}><Icon size={20}/></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#0B1D3A]">{toast.title}</p>
                {toast.message && <p className="mt-1 text-sm leading-5 text-slate-500">{toast.message}</p>}
              </div>
              <button type="button" onClick={()=>setToasts((c)=>c.filter((x)=>x.id!==toast.id))} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16}/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
