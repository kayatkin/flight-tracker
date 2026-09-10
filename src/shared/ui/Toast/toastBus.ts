import type { ToastVariant } from './ToastContext';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  variant?: ToastVariant;
  action?: ToastAction;
  durationMs?: number;
}

type ToastHandler = (message: string, options?: ToastOptions) => void;

let handler: ToastHandler | null = null;

export const normalizeToastOptions = (
  variantOrOptions?: ToastVariant | ToastOptions
): ToastOptions => {
  if (!variantOrOptions) return {};
  if (typeof variantOrOptions === 'string') return { variant: variantOrOptions };
  return variantOrOptions;
};

export const registerToastHandler = (fn: ToastHandler): (() => void) => {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
};

/** Show toast from hooks/services (registered by ToastProvider). */
export const toast = (
  message: string,
  variantOrOptions: ToastVariant | ToastOptions = 'info'
): void => {
  handler?.(message, normalizeToastOptions(variantOrOptions));
};
