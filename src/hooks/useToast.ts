import { useToastStore } from '../stores/toastStore';

export function useToast() {
  const showToast = useToastStore((state) => state.show);
  return { showToast };
}
