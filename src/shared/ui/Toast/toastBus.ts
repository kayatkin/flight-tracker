import type { ToastVariant } from './ToastContext';

type ToastHandler = (message: string, variant: ToastVariant) => void;

let handler: ToastHandler | null = null;

export const registerToastHandler = (fn: ToastHandler): (() => void) => {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
};

/** Show toast from hooks/services (registered by ToastProvider). */
export const toast = (message: string, variant: ToastVariant = 'info'): void => {
  handler?.(message, variant);
};
