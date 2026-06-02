import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export const useToast = () => useContext(ToastContext);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const style: Record<ToastType, string> = {
    success: "bg-emerald-600",
    error: "bg-rose-600",
    info: "bg-brand",
  };
  const icon: Record<ToastType, string> = { success: "✅", error: "⚠️", info: "ℹ️" };

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-pop pointer-events-auto text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-card flex items-center gap-2 ${style[t.type]}`}
          >
            <span>{icon[t.type]}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
