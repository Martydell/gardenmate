import { useState } from 'react';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

function DeleteAccountDialog({ open, onClose, onConfirm }: DeleteAccountDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsDeleting(true);
    setError(null);
    const success = await onConfirm();
    setIsDeleting(false);
    if (!success) {
      setError('Something went wrong deleting your data. Please try again.');
    }
    // On success the caller signs the user out and navigates away, so there's
    // nothing left here to close.
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Delete your account?</h2>
        <p className="mt-2 text-sm text-neutral-500">
          This permanently deletes all your plants, garden spaces, care history, and photos. This
          can't be undone.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-neutral-300 py-2.5 font-medium disabled:opacity-60 dark:border-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-red-600 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccountDialog;
