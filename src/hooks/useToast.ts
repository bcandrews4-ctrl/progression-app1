import { useState, useCallback } from 'react';
import type { ToastData } from '../components/Toast';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: ToastData = {
      ...toast,
      id,
      autoDismiss: toast.autoDismiss !== false,
      dismissAfter: toast.dismissAfter ?? 3000,
    };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAll,
  };
}
