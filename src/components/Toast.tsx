'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, X, Coins } from 'lucide-react';
import { clsx } from 'clsx';

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'payment';
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="panel panel-noise animate-rise flex items-start gap-3 p-3.5 pr-2"
          >
            <div
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                t.variant === 'success' && 'bg-emerald-400/15 text-emerald-400',
                t.variant === 'error' && 'bg-garnet-500/15 text-garnet-400',
                t.variant === 'payment' && 'bg-brass-500/15 text-brass-400'
              )}
            >
              {t.variant === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {t.variant === 'error' && <AlertTriangle className="w-4 h-4" />}
              {t.variant === 'payment' && <Coins className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-vault-100">{t.title}</div>
              {t.description && <div className="text-xs text-vault-400 mt-0.5">{t.description}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="p-1.5 text-vault-500 hover:text-vault-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
