import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { ScanSearch, X } from 'lucide-react';
import { uploadSpacePhoto } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import { usePlants } from '../../hooks/usePlants';
import type { NewPhotoAngleInput } from '../../hooks/useSpacePhotoAngles';
import type { SpacePhotoAngleLabel, PlantCategory } from '../../types';
import MultiPlantIdentifyModal from './MultiPlantIdentifyModal';

const ANGLE_LABEL_OPTIONS: SpacePhotoAngleLabel[] = [
  'North wall',
  'South wall',
  'East wall',
  'West wall',
  'Overhead',
  'Entrance view',
  'Custom',
];

interface AddPhotoAngleModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: NewPhotoAngleInput) => Promise<unknown>;
  defaultPlantCategory?: PlantCategory;
}

function AddPhotoAngleModal({ open, onClose, onAdd, defaultPlantCategory }: AddPhotoAngleModalProps) {
  const userId = useUserStore((state) => state.user?.id);
  const { addPlant } = usePlants();
  const [label, setLabel] = useState<SpacePhotoAngleLabel>('North wall');
  const [customLabel, setCustomLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isIdentifyOpen, setIsIdentifyOpen] = useState(false);

  const [syncedOpen, setSyncedOpen] = useState(open);
  if (open !== syncedOpen) {
    setSyncedOpen(open);
    if (open) {
      setLabel('North wall');
      setCustomLabel('');
      setFile(null);
      setPreviewUrl(null);
      setSubmitError(null);
    }
  }

  function resetAndClose() {
    setLabel('North wall');
    setCustomLabel('');
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
    if (!file || !userId) {
      setSubmitError('Choose a photo to upload.');
      return;
    }
    if (label === 'Custom' && !customLabel.trim()) {
      setSubmitError('Enter a label for this angle.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const photoUrl = await uploadSpacePhoto(userId, file);
    if (!photoUrl) {
      setSubmitError('Could not upload photo. Please try again.');
      setIsSubmitting(false);
      return;
    }

    const result = await onAdd({
      label,
      custom_label: label === 'Custom' ? customLabel.trim() : null,
      photo_url: photoUrl,
    });

    setIsSubmitting(false);
    if (!result) {
      setSubmitError('Something went wrong adding this photo angle.');
      return;
    }
    resetAndClose();
  }

  return (
    <>
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
          <h2 className="text-xl font-semibold">Add photo angle</h2>
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
          <div>
            <label htmlFor="angle-label" className="mb-1 block text-sm font-medium">
              Angle
            </label>
            <select
              id="angle-label"
              value={label}
              onChange={(e) => setLabel(e.target.value as SpacePhotoAngleLabel)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
            >
              {ANGLE_LABEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {label === 'Custom' && (
            <div>
              <label htmlFor="angle-custom-label" className="mb-1 block text-sm font-medium">
                Custom label
              </label>
              <input
                id="angle-custom-label"
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Kitchen windowsill"
                className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
          )}

          <div>
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              {file ? 'Photo selected — tap to replace' : 'Upload a photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            {previewUrl && (
              <>
                <img src={previewUrl} alt="Preview" className="mt-2 h-32 w-full rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => setIsIdentifyOpen(true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-600 py-2.5 text-sm font-medium text-brand-700 dark:text-brand-400"
                >
                  <ScanSearch className="h-4 w-4" aria-hidden="true" />
                  Identify plants in this photo
                </button>
              </>
            )}
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Uploading…' : 'Add photo angle'}
          </button>
        </div>
      </div>
    </div>

    <MultiPlantIdentifyModal
      open={isIdentifyOpen}
      onClose={() => setIsIdentifyOpen(false)}
      sources={file ? [{ type: 'file', file }] : []}
      onAdd={addPlant}
      defaultCategory={defaultPlantCategory}
    />
    </>
  );
}

export default AddPhotoAngleModal;
