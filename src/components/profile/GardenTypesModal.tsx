import { useState } from 'react';
import { X } from 'lucide-react';
import { GARDEN_TYPE_OPTIONS } from '../../lib/gardenTypeMeta';
import type { GardenType } from '../../types';

interface GardenTypesModalProps {
  open: boolean;
  currentTypes: GardenType[];
  onClose: () => void;
  onSave: (types: GardenType[]) => Promise<boolean>;
}

function GardenTypesModal({ open, currentTypes, onClose, onSave }: GardenTypesModalProps) {
  const [selected, setSelected] = useState<GardenType[]>(currentTypes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [syncedFor, setSyncedFor] = useState({ open, currentTypes });
  if (open !== syncedFor.open || currentTypes !== syncedFor.currentTypes) {
    setSyncedFor({ open, currentTypes });
    if (open) {
      setSelected(currentTypes);
      setError(null);
    }
  }

  function toggle(value: GardenType) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((type) => type !== value) : [...prev, value],
    );
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (selected.length === 0) {
      setError('Select at least one garden type.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const success = await onSave(selected);
    setIsSaving(false);
    if (!success) {
      setError('Something went wrong saving your garden types. Please try again.');
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
          <h2 className="text-xl font-semibold">Garden types</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {GARDEN_TYPE_OPTIONS.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 transition ${
                  isSelected
                    ? 'border-green-600 bg-green-50 dark:bg-green-950/40'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="mt-5 w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default GardenTypesModal;
