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

export type PhotoSource = { type: 'file'; file: File } | { type: 'url'; url: string };

interface Candidate {
  id: string;
  previewUrl: string;
  croppedFile: File;
  name: string;
  probability: number;
  included: boolean;
  foundInCount: number;
  // Vision found a plant-shaped region here, but Plant.id couldn't
  // confidently name it — shown with a blank, editable name rather than
  // dropped, since a region Vision detected is still worth surfacing even
  // when species identification fails.
  identified: boolean;
}

type Phase = 'detecting' | 'review' | 'no-results' | 'saving';

interface MultiPlantIdentifyModalProps {
  open: boolean;
  onClose: () => void;
  sources: PhotoSource[];
  onAdd: (input: NewPlantInput) => Promise<Plant | null>;
  defaultCategory?: PlantCategory;
}

async function sourceToFile(source: PhotoSource): Promise<File | null> {
  if (source.type === 'file') return source.file;
  try {
    const response = await fetch(source.url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new File([blob], `photo-${crypto.randomUUID()}.jpg`, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

// Plant.id gives us a species name per detected region, not a stable
// identity for "this exact plant" across separate photos — so duplicates
// across multiple photos of the same space are detected by matching names,
// not by recognizing the same physical plant. Two different individuals of
// the same species will merge into one candidate; that's a known trade-off
// of scanning several photos at once rather than a bug.
function dedupeByName(raw: Candidate[]): Candidate[] {
  const byName = new Map<string, Candidate>();
  const unidentified: Candidate[] = [];
  for (const candidate of raw) {
    // Unidentified regions have no name to key on — each stays its own
    // entry rather than collapsing into one "" bucket.
    if (!candidate.identified) {
      unidentified.push({ ...candidate, foundInCount: 1 });
      continue;
    }
    const key = candidate.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...candidate, foundInCount: 1 });
    } else if (candidate.probability > existing.probability) {
      byName.set(key, { ...candidate, foundInCount: existing.foundInCount + 1 });
    } else {
      byName.set(key, { ...existing, foundInCount: existing.foundInCount + 1 });
    }
  }
  return [...Array.from(byName.values()), ...unidentified];
}

function MultiPlantIdentifyModal({
  open,
  onClose,
  sources,
  onAdd,
  defaultCategory = 'outdoor',
}: MultiPlantIdentifyModalProps) {
  const userId = useUserStore((state) => state.user?.id);
  const hasVisionKey = Boolean(import.meta.env.VITE_GOOGLE_VISION_API_KEY);
  const [phase, setPhase] = useState<Phase>('detecting');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [savingCount, setSavingCount] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!open || sources.length === 0 || !hasVisionKey) return;

    let cancelled = false;
    setPhase('detecting');
    setCandidates([]);
    setProgress({ done: 0, total: sources.length });

    async function run() {
      const found: Candidate[] = [];

      for (const source of sources) {
        const file = await sourceToFile(source);
        if (cancelled) return;
        if (file) {
          const regions = await detectPlantRegions(file);
          if (cancelled) return;

          for (const region of regions) {
            const cropped = await cropImageRegion(file, region.box);
            const result = await identifyPlant(cropped);
            if (cancelled) return;
            found.push({
              id: crypto.randomUUID(),
              previewUrl: URL.createObjectURL(cropped),
              croppedFile: cropped,
              name: result?.name ?? '',
              probability: result?.probability ?? 0,
              included: true,
              foundInCount: 1,
              identified: Boolean(result),
            });
          }
        }
        setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
      }

      if (cancelled) return;
      const deduped = dedupeByName(found);
      setCandidates(deduped);
      setPhase(deduped.length > 0 ? 'review' : 'no-results');
    }

    run();
    return () => {
      cancelled = true;
    };
    // sources is a fresh array each render from callers; comparing by length
    // + open avoids re-running the scan every render while still re-running
    // when the caller actually passes new photos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sources.length, hasVisionKey]);

  function updateCandidate(id: string, patch: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function resetAndClose() {
    setCandidates([]);
    setSavingCount(null);
    setProgress(null);
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

  const includedCount = candidates.filter((c) => c.included && c.name.trim()).length;

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
          <h2 className="text-xl font-semibold">
            Identify plants in {sources.length > 1 ? `${sources.length} photos` : 'photo'}
          </h2>
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
            <p className="text-sm text-neutral-500">
              Scanning{progress && sources.length > 1 ? ` photo ${progress.done + 1} of ${progress.total}` : ''}{' '}
              for plants…
            </p>
          </div>
        )}

        {hasVisionKey && phase === 'no-results' && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="text-4xl">🌱</span>
            <p className="text-sm text-neutral-500">
              Couldn't confidently identify any individual plants in{' '}
              {sources.length > 1 ? 'these photos' : 'this photo'}. Try a clearer or closer-up photo, or
              add plants manually.
            </p>
          </div>
        )}

        {hasVisionKey && (phase === 'review' || phase === 'saving') && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              Found {candidates.length} plant{candidates.length === 1 ? '' : 's'}.
              {candidates.some((c) => !c.identified)
                ? " Some couldn't be confidently named — type a name for those to include them."
                : ' Review and edit the names, then confirm which ones to add.'}
            </p>

            <ul className="space-y-3">
              {candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    !candidate.included
                      ? 'border-neutral-100 opacity-50 dark:border-neutral-900'
                      : candidate.identified
                        ? 'border-neutral-200 dark:border-neutral-800'
                        : 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
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
                      placeholder={candidate.identified ? undefined : 'Type plant name…'}
                      className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm font-medium focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
                    />
                    <p className="text-xs text-neutral-500">
                      {candidate.identified
                        ? `${Math.round(candidate.probability * 100)}% confident`
                        : "Couldn't confidently identify this one"}
                      {candidate.foundInCount > 1 ? ` · matched ${candidate.foundInCount} times` : ''}
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
