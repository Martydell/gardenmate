import { useState } from 'react';
import { X } from 'lucide-react';
import ThemePicker from '../shared/ThemePicker';
import type { Theme } from '../../types';

interface ThemePickerModalProps {
  open: boolean;
  currentTheme: Theme | null;
  onClose: () => void;
  onSave: (theme: Theme) => Promise<boolean>;
}

function ThemePickerModal({ open, currentTheme, onClose, onSave }: ThemePickerModalProps) {
  const [selected, setSelected] = useState<Theme | null>(currentTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync selection from props whenever the modal opens, without an effect
  // — same pattern as AddPlantModal's open/plant re-sync.
  const [syncedFor, setSyncedFor] = useState({ open, currentTheme });
  if (open !== syncedFor.open || currentTheme !== syncedFor.currentTheme) {
    setSyncedFor({ open, currentTheme });
    if (open) {
      setSelected(currentTheme);
      setError(null);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!selected) return;
    setIsSaving(true);
    setError(null);
    const success = await onSave(selected);
    setIsSaving(false);
    if (!success) {
      setError('Something went wrong saving your theme. Please try again.');
      return;
    }
    onClose();
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`max-h-[90svh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl transition-transform duration-300 dark:bg-neutral-900 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Choose a theme</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ThemePicker value={selected} onChange={setSelected} />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={!selected || isSaving}
          className="mt-5 w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default ThemePickerModal;
