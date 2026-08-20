import { useToastStore } from '../../stores/toastStore';

function ToastContainer() {
  const message = useToastStore((state) => state.message);
  const variant = useToastStore((state) => state.variant);

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 transition-all duration-300 ${
        message ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {message && (
        <div
          className={`rounded-full px-4 py-2.5 text-sm font-medium shadow-lg ${
            variant === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default ToastContainer;
