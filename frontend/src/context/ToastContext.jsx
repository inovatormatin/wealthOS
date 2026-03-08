import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-green-600" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
};

const STYLES = {
  success: "border-green-100 bg-green-50 text-green-900",
  error: "border-red-100 bg-red-50 text-red-900",
  info: "border-blue-100 bg-blue-50 text-blue-900",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => add("success", msg),
    error: (msg) => add("error", msg),
    info: (msg) => add("info", msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map(({ id, type, message }) => (
          <div
            key={id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-md animate-slide-in ${STYLES[type]}`}
          >
            <span className="mt-0.5 shrink-0">{ICONS[type]}</span>
            <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
            <button
              onClick={() => remove(id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
