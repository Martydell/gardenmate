import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

interface ToastState {
  message: string | null;
  variant: ToastVariant;
  show: (message: string, variant?: ToastVariant) => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

// A plain Zustand store (not just a hook) so non-component code — hook
// callbacks living outside React, e.g. usePlants' addPlant — can trigger a
// toast via useToastStore.getState().show(...) without needing to call a
// hook, the same convention used by every other store's getState() call
// sites in this app (e.g. useUserStore.getState().signOut()).
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: 'success',
  show: (message, variant = 'success') => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message, variant });
    hideTimer = setTimeout(() => set({ message: null }), 3000);
  },
}));
