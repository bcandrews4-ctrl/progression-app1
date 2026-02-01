import React, { useEffect } from 'react';
import { colors, shadows } from '../styles/tokens';

export interface ToastData {
  id: string;
  title: string;
  body: string;
  variant: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  autoDismiss?: boolean;
  dismissAfter?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (toast.autoDismiss !== false && toast.dismissAfter !== 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.dismissAfter || 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.autoDismiss, toast.dismissAfter, onDismiss]);

  return (
    <div
      className="animate-slide-up"
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--card-radius)',
        padding: '16px',
        boxShadow: 'var(--glow), var(--shadow)',
        minWidth: '280px',
        maxWidth: '90vw',
        zIndex: 60,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div 
            className="text-sm font-semibold mb-1"
            style={{ color: colors.text }}
          >
            {toast.title}
          </div>
          <div 
            className="text-xs whitespace-pre-line"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            {toast.body}
          </div>
          {(toast.action || toast.secondaryAction) && (
            <div className="flex gap-2 mt-3">
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss(toast.id);
                  }}
                  className="px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{
                    background: colors.accent,
                    color: colors.text,
                    borderRadius: 'var(--chip-radius)',
                    boxShadow: shadows.glow,
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              {toast.secondaryAction && (
                <button
                  onClick={() => {
                    toast.secondaryAction?.onClick();
                    onDismiss(toast.id);
                  }}
                  className="px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: colors.text,
                    borderRadius: 'var(--chip-radius)',
                  }}
                >
                  {toast.secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center',
        width: '100%',
        maxWidth: 'min(520px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
