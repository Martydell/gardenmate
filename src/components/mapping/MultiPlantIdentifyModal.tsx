import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { detectPlantRegions } from '../../lib/googleVision';
import { cropImageRegion } from '../../lib/imageCrop';
import { identifyPlant } from '../../lib/plantId';
import { uploadIdentifyPhoto } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import { notifyError, notifySuccess } from '../../lib/errorHandling';
import type { NewPlantInput } from '../../hooks/usePlants';
import type { Plant, PlantCategory } from '../../types';

interface Candidate {
  id: string;
  previewUrl: string;
  croppedFile: File;
  name: string;
  probability: number;
  included: boolean;
}

type Phase = 'detecting' | 'review' | 'no-results' | 'saving';

interface MultiPlantIdentifyModalProps {
  open: boolean;
  onClose: () => void;
  sourceFile: File | null;
  onAdd: (input: NewPlantInput) => Promise<Plant | null>;
  defaultCategory?: PlantCategory;
}

function MultiPlantIdentifyModal({
  open,
  onClose,
  sourceFile,
  onAdd,
  defaultCategory = 'outdoor',
}: MultiPlantIdentifyModalProps) {
  const userId = useUserStore((state) => state.user?.id);
  const hasVisionKey = Boolean(import.meta.env.VITE_GOOGLE_VISION_API_KEY);
  const [phase, setPhase] = useState<Phase>('detecting');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [savingCount, setSavingCount] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!open || !sourceFile || !hasVisionKey) return;

    let cancelled = false;
    setPhase('detecting');
    setCandidates([]);

    async function run() {
      const regions = await detectPlantRegions(sourceFile!);
      if (cancelled) return;

      const found: Candidate[] = [];
      for (const region of regions) {
        const cropped = await cropImageRegion(sourceFile!, region.box);
        const result = await identifyPlant(cropped);
        if (cancelled) return;
        if (result) {
          found.push({
            id: crypto.randomUUID(),
            previewUrl: URL.createObjectURL(cropped),
            croppedFile: cropped,
            name: result.name,
            probability: result.probability,
            included: true,
          });
        }
      }

      if (cancelled) return;
      setCandidates(found);
      setPhase(found.length > 0 ? 'review' : 'no-results');
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, sourceFile, hasVisionKey]);

  function updateCandidate(id: string, patch: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function resetAndClose() {
    setCandidates([]);
    setSavingCount(null);
    onClose();
  }

  async function handleConfirm() {
    const toSave = candidates.filter((c) => c.included && c.name.trim());
    if (toSave.length === 0 || !userId) return;

    setPhase('saving');
    setSavingCount({ done: 0, total: toSave.length });

    let successCount = 0;
    for (const candidate of toSave) {
      const photoUrl = await uploadIdentifyPhoto(userId, candidate.croppedFile);
      const result = await onAdd({
        nickname: candidate.name.trim(),
        common_name: candidate.name.trim(),
        scientific_name: null,
        category: defaultCategory,
        location_id: null,
        status: 'growing',
        source: 'shop_bought',
        date_acquired: null,
        date_planted: null,
        pot_size: null,
        soil_type: null,
        last_watered: null,
        last_fed: null,
        notes: null,
        is_wishlist: false,
        cover_photo_url: photoUrl,
        photos: photoUrl ? [photoUrl] : [],
        pet_safety: 'unknown',
        is_edible: false,
      });
      if (result) successCount += 1;
      setSavingCount((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }

    if (successCount > 0) {
      notifySuccess(`Added ${successCount} plant${successCount === 1 ? '' : 's'}!`);
    }
    if (successCount < toSave.length) {
      notifyError(`Couldn't save ${toSave.length - successCount} of the plants. Please try again.`);
    }
    resetAndClose();
  }

  const includedCount = candidates.filter((c) => c.included).length;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={phase === 'saving' ? undefined : resetAndClose}
    >
      <div
        className={`max-h-[90svh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl transition-transform duration-300 dark:bg-neutral-900 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Identify plants in photo</h2>
          {phase !== 'saving' && (
            <button
              type="button"
              onClick={resetAndClose}
              aria-label="Close"
              className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {!hasVisionKey && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-sm text-neutral-500">
              Auto-identify needs a Google Cloud Vision API key configured for this app before it can scan
              a photo for plants.
            </p>
          </div>
        )}

        {hasVisionKey && phase === 'detecting' && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <p className="text-sm text-neutral-500">Scanning photo for plants…</p>
          </div>
        )}

        {hasVisionKey && phase === 'no-results' && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="text-4xl">🌱</span>
            <p className="text-sm text-neutral-500">
              Couldn't confidently identify any individual plants in this photo. Try a clearer or
              closer-up photo, or add plants manually.
            </p>
          </div>
        )}

        {hasVisionKey && (phase === 'review' || phase === 'saving') && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              Found {candidates.length} plant{candidates.length === 1 ? '' : 's'}. Review and edit the
              names, then confirm which ones to add.
            </p>

            <ul className="space-y-3">
              {candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    candidate.included
                      ? 'border-neutral-200 dark:border-neutral-800'
                      : 'border-neutral-100 opacity-50 dark:border-neutral-900'
                  }`}
                >
                  <img
                    src={candidate.previewUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={candidate.name}
                      onChange={(e) => updateCandidate(candidate.id, { name: e.target.value })}
                      disabled={phase === 'saving'}
                      className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm font-medium focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
                    />
                    <p className="text-xs text-neutral-500">
                      {Math.round(candidate.probability * 100)}% confident
                    </p>
                  </div>
                  <label className="flex shrink-0 items-center gap-1.5 pt-1 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={candidate.included}
                      onChange={(e) => updateCandidate(candidate.id, { included: e.target.checked })}
                      disabled={phase === 'saving'}
                      className="h-4 w-4 rounded border-neutral-300 text-green-600 focus:ring-green-500 dark:border-neutral-700"
                    />
                    Add
                  </label>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={includedCount === 0 || phase === 'saving'}
              className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white disabled:opacity-60"
            >
              {phase === 'saving'
                ? `Adding ${savingCount?.done ?? 0} of ${savingCount?.total ?? 0}…`
                : `Add ${includedCount} plant${includedCount === 1 ? '' : 's'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiPlantIdentifyModal;
