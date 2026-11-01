import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
};

type ToastInput = Omit<Toast, "id" | "duration"> & { duration?: number };

type ToastState = {
  toasts: Toast[];
  push: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
};

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = ++counter;
    set((state) => ({
      toasts: [...state.toasts, { duration: 4000, ...toast, id }].slice(-4),
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

const show = (type: ToastType) => (title: string, description?: string) =>
  useToastStore.getState().push({ type, title, description });

/** Usage: toast.success("Product added to cart") */
export const toast = {
  success: show("success"),
  error: show("error"),
  info: show("info"),
  warning: show("warning"),
};