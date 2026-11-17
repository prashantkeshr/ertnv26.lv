import { Check, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string) => void>(() => {});

/** Short confirmations ("Recent searches cleared"). Announced politely; dismissed after 4 s or by the user. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const notify = useCallback(
    (message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );
  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto flex items-center gap-3 rounded-md bg-navy py-2.5 ps-4 pe-2 text-sm text-white shadow-menu">
            <Check aria-hidden="true" className="size-4 text-sky" />
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Dismiss notification">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}
