import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Check } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { uploadPlantPhoto } from '../../lib/supabase';
import { GROWTH_STAGES, GROWTH_STAGE_LABELS, getCurrentStageIndex } from '../../lib/growthStages';
import type { GrowthStage, PlantStageRecord } from '../../types';

interface GrowthStageTrackerProps {
  stages: PlantStageRecord[];
  onAdvance: (
    nextStage: GrowthStage,
    note?: string | null,
    photoUrl?: string | null,
  ) => Promise<PlantStageRecord | null>;
}

function GrowthStageTracker({ stages, onAdvance }: GrowthStageTrackerProps) {
  const userId = useUserStore((state) => state.user?.id);
  const currentIndex = getCurrentStageIndex(stages);
  const nextStage = currentIndex < GROWTH_STAGES.length - 1 ? GROWTH_STAGES[currentIndex + 1] : null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function resetAndClose() {
    setNote('');
    setPhotoUrl(null);
    setSubmitError(null);
    setIsModalOpen(false);
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;
    setIsUploadingPhoto(true);
    const url = await uploadPlantPhoto(userId, file);
    setIsUploadingPhoto(false);
    if (url) setPhotoUrl(url);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nextStage) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await onAdvance(nextStage, note.trim() || null, photoUrl);

    setIsSubmitting(false);
    if (!result) {
      setSubmitError('Something went wrong advancing this stage. Please try again.');
      return;
    }
    resetAndClose();
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-4 font-semibold">Growth Stage</h3>

      <div className="flex items-center overflow-x-auto pb-2">
        {GROWTH_STAGES.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          return (
            <div key={stage} className="flex items-center">
              <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    isCurrent
                      ? 'bg-green-600 text-white ring-4 ring-green-100 dark:ring-green-950'
                      : isPast
                        ? 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600'
                  }`}
                >
                  {isPast ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`text-center text-[10px] leading-tight ${
                    isCurrent ? 'font-semibold' : 'text-neutral-500'
                  }`}
                >
                  {GROWTH_STAGE_LABELS[stage]}
                </span>
              </div>
              {index < GROWTH_STAGES.length - 1 && (
                <div
                  className={`h-0.5 w-4 shrink-0 ${
                    isPast ? 'bg-green-500' : 'bg-neutral-200 dark:bg-neutral-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {nextStage ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mt-3 w-full rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white"
        >
          Advance to {GROWTH_STAGE_LABELS[nextStage]}
        </button>
      ) : (
        <p className="mt-3 text-center text-sm text-neutral-500">Final stage reached 🎉</p>
      )}

      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity ${
          isModalOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={resetAndClose}
      >
        <div
          className={`w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl transition-transform duration-300 dark:bg-neutral-900 ${
            isModalOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-4 text-lg font-semibold">
            Advance to {nextStage ? GROWTH_STAGE_LABELS[nextStage] : ''}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="stage-note" className="mb-1 block text-sm font-medium">
                Note
              </label>
              <textarea
                id="stage-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Optional"
                className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium">Photo</span>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                {isUploadingPhoto
                  ? 'Uploading…'
                  : photoUrl
                    ? 'Photo added — tap to replace'
                    : 'Add a photo (optional)'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                  disabled={isUploadingPhoto}
                />
              </label>
              {photoUrl && (
                <img src={photoUrl} alt="" className="mt-2 h-20 w-20 rounded-xl object-cover" />
              )}
            </div>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Confirm'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default GrowthStageTracker;
