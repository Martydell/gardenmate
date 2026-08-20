import { useToastStore } from '../stores/toastStore';

// Plain functions (not hooks) so any hook or handler can report a toast
// without needing to call useToast() as a component-scoped hook — same
// getState() convention as every other store in this app.
export function notifySuccess(message: string) {
  useToastStore.getState().show(message, 'success');
}

export function notifyError(message = 'Something went wrong. Please try again.') {
  useToastStore.getState().show(message, 'error');
}
