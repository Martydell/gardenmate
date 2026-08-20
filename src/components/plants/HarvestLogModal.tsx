import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { uploadPlantPhoto } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import { HARVEST_UNIT_META, HARVEST_UNIT_OPTIONS } from '../../lib/harvest';
import type { NewHarvestInput } from '../../hooks/useHarvestLog';
import type { HarvestLogEntry, HarvestUnit } from '../../types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface HarvestLogModalProps {
  open: boolean;
  plantId: string;
  onClose: () => void;
  onAdd: (input: NewHarvestInput) => Promise<HarvestLogEntry | null>;
}

function HarvestLogModal({ open, plantId, onClose, onAdd }: HarvestLogModalProps) {
  const userId = useUserStore((state) => state.user?.id);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<HarvestUnit>('g');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayIso());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [syncedOpen, setSyncedOpen] = useState(open);
  if (open !== syncedOpen) {
    setSyncedOpen(open);
    if (open) {
      setQuantity('');
      setUnit('g');
      setNotes('');
      setDate(todayIso());
      setFile(null);
      setPreviewUrl(null);
      setSubmitError(null);
    }
  }

  function resetAndClose() {
    setQuantity('');
    setUnit('g');
    setNotes('');
    setDate(todayIso());
    setFile(null);
    setPreviewUrl(null);
    setSubmitError(null);
    onClose();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSubmit() {
    const parsedQuantity = Number(quantity);
    if (!quantity.trim() || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setSubmitError('Enter how much you harvested.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    let photoUrl: string | null = null;
    if (file && userId) {
      photoUrl = await uploadPlantPhoto(userId, file);
    }

    const result = await onAdd({
      plant_id: plantId,
      quantity: parsedQuantity,
      unit,
      photo_url: photoUrl,
      notes: notes.trim() || null,
      harvested_at: new Date(date).toISOString(),
    });

    setIsSubmitting(false);
    if (!result) {
      setSubmitError('Something went wrong logging this harvest.');
      return;
    }
    resetAndClose();
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={resetAndClose}
    >
      <div
        className={`max-h-[90svh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl transition-transform duration-300 dark:bg-neutral-900 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">🧺 Log a harvest</h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close"
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="harvest-quantity" className="mb-1 block text-sm font-medium">
                Quantity
              </label>
              <input
                id="harvest-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            <div className="w-32">
              <label htmlFor="harvest-unit" className="mb-1 block text-sm font-medium">
                Unit
              </label>
              <select
                id="harvest-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as HarvestUnit)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              >
                {HARVEST_UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {HARVEST_UNIT_META[option].pluralLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="harvest-date" className="mb-1 block text-sm font-medium">
              Date
            </label>
            <input
              id="harvest-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          <div>
            <label htmlFor="harvest-notes" className="mb-1 block text-sm font-medium">
              Note (optional)
            </label>
            <textarea
              id="harvest-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. First picking of the season"
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          <div>
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              {file ? 'Photo selected — tap to replace' : 'Add a photo (optional)'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="mt-2 h-32 w-full rounded-xl object-cover" />
            )}
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Log Harvest'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HarvestLogModal;
