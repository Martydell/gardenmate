import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { uploadPlantPhoto } from '../../lib/supabase';
import { formatDate } from '../../lib/careSchedule';
import { todayDateString } from '../../lib/careTaskMeta';
import { mergeProgressPhotos } from '../../lib/progressPhotos';
import type { ProgressPhotoEntry } from '../../lib/progressPhotos';
import { useCommunityPosts } from '../../hooks/useCommunityPosts';
import PhotoCompare from './PhotoCompare';
import type { Plant, PlantMilestone, PlantProgressPhoto, PlantStageRecord } from '../../types';

interface PhotoJournalProps {
  plant: Plant;
  stages: PlantStageRecord[];
  milestones: PlantMilestone[];
  progressPhotos: PlantProgressPhoto[];
  onAddPhoto: (
    photoUrl: string,
    takenOn: string,
    note?: string | null,
  ) => Promise<PlantProgressPhoto | null>;
}

function PhotoJournal({ plant, stages, milestones, progressPhotos, onAddPhoto }: PhotoJournalProps) {
  const userId = useUserStore((state) => state.user?.id);
  const userName = useUserStore((state) => state.user?.name);
  const { createPost } = useCommunityPosts();
  const entries = useMemo(
    () => mergeProgressPhotos(progressPhotos, stages, milestones),
    [progressPhotos, stages, milestones],
  );

  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<ProgressPhotoEntry[]>([]);
  const [compareEntries, setCompareEntries] = useState<
    [ProgressPhotoEntry, ProgressPhotoEntry] | null
  >(null);
  const [fullscreenEntry, setFullscreenEntry] = useState<ProgressPhotoEntry | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [newPhotoDate, setNewPhotoDate] = useState(todayDateString());
  const [newPhotoNote, setNewPhotoNote] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isSharingToCommunity, setIsSharingToCommunity] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [isPostingShare, setIsPostingShare] = useState(false);

  function closeCompare() {
    setCompareEntries(null);
    setIsSharingToCommunity(false);
    setShareCaption('');
  }

  async function handleShareToCommunity() {
    if (!compareEntries) return;
    setIsPostingShare(true);
    const [older, newer] = [...compareEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const result = await createPost({
      plantId: plant.id,
      plantName: plant.nickname || plant.common_name,
      posterName: userName?.trim().split(' ')[0] || 'A GardenMate grower',
      beforePhotoUrl: older.url,
      afterPhotoUrl: newer.url,
      caption: shareCaption.trim() || null,
    });
    setIsPostingShare(false);
    if (result) {
      setIsSharingToCommunity(false);
      setShareCaption('');
    }
  }

  function toggleCompareMode() {
    setCompareMode((prev) => !prev);
    setSelected([]);
  }

  function handleTapPhoto(entry: ProgressPhotoEntry) {
    if (!compareMode) {
      setFullscreenEntry(entry);
      return;
    }
    setSelected((prev) => {
      const exists = prev.find((p) => p.id === entry.id);
      if (exists) return prev.filter((p) => p.id !== entry.id);
      if (prev.length >= 2) return [prev[1], entry];
      return [...prev, entry];
    });
  }

  function handleViewComparison() {
    if (selected.length === 2) {
      setCompareEntries([selected[0], selected[1]]);
    }
  }

  function resetAndCloseAdd() {
    setNewPhotoUrl(null);
    setNewPhotoDate(todayDateString());
    setNewPhotoNote('');
    setSubmitError(null);
    setIsAddOpen(false);
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;
    setIsUploadingPhoto(true);
    const url = await uploadPlantPhoto(userId, file);
    setIsUploadingPhoto(false);
    if (url) setNewPhotoUrl(url);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newPhotoUrl) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await onAddPhoto(newPhotoUrl, newPhotoDate, newPhotoNote.trim() || null);

    setIsSubmitting(false);
    if (!result) {
      setSubmitError('Something went wrong saving this photo. Please try again.');
      return;
    }
    resetAndCloseAdd();
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Photo Journal</h3>
        <button
          type="button"
          onClick={toggleCompareMode}
          className={`text-sm font-medium ${
            compareMode ? 'text-green-700 dark:text-green-400' : 'text-neutral-500'
          }`}
        >
          {compareMode ? 'Cancel' : 'Compare'}
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-neutral-500">No progress photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {entries.map((entry) => {
            const isSelected = Boolean(selected.find((p) => p.id === entry.id));
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleTapPhoto(entry)}
                aria-label={compareMode ? `Select photo from ${formatDate(entry.date)}` : `View photo from ${formatDate(entry.date)}`}
                className="relative aspect-square overflow-hidden rounded-lg"
              >
                <img src={entry.url} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {formatDate(entry.date)}
                </span>
                {compareMode && (
                  <span
                    className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-white bg-black/30'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {compareMode && (
        <button
          type="button"
          onClick={handleViewComparison}
          disabled={selected.length !== 2}
          className="mt-3 w-full rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {selected.length === 2
            ? 'View Comparison'
            : `Select ${2 - selected.length} more photo${2 - selected.length === 1 ? '' : 's'}`}
        </button>
      )}

      <button
        type="button"
        onClick={() => setIsAddOpen(true)}
        className="mt-3 w-full rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 dark:border-neutral-700"
      >
        + Add Progress Photo
      </button>

      {/* Add progress photo modal */}
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity ${
          isAddOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={resetAndCloseAdd}
      >
        <div
          className={`w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl transition-transform duration-300 dark:bg-neutral-900 ${
            isAddOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-4 text-lg font-semibold">Add progress photo</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="mb-1 block text-sm font-medium">Photo</span>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                {isUploadingPhoto
                  ? 'Uploading…'
                  : newPhotoUrl
                    ? 'Photo added — tap to replace'
                    : 'Choose a photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                  disabled={isUploadingPhoto}
                />
              </label>
              {newPhotoUrl && (
                <img src={newPhotoUrl} alt="" className="mt-2 h-24 w-24 rounded-xl object-cover" />
              )}
            </div>
            <div>
              <label htmlFor="progress-photo-date" className="mb-1 block text-sm font-medium">
                Date
              </label>
              <input
                id="progress-photo-date"
                type="date"
                value={newPhotoDate}
                onChange={(e) => setNewPhotoDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            <div>
              <label htmlFor="progress-photo-note" className="mb-1 block text-sm font-medium">
                Note
              </label>
              <textarea
                id="progress-photo-note"
                value={newPhotoNote}
                onChange={(e) => setNewPhotoNote(e.target.value)}
                rows={3}
                placeholder="Optional"
                className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <button
              type="submit"
              disabled={!newPhotoUrl || isSubmitting || isUploadingPhoto}
              className="w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save photo'}
            </button>
          </form>
        </div>
      </div>

      {/* Compare overlay */}
      {compareEntries && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between p-4">
            <span className="font-medium text-white">Compare</span>
            <button type="button" onClick={closeCompare} aria-label="Close" className="text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 px-4">
            <PhotoCompare
              photoA={{ url: compareEntries[0].url, date: compareEntries[0].date }}
              photoB={{ url: compareEntries[1].url, date: compareEntries[1].date }}
            />
          </div>
          <div className="p-4">
            {isSharingToCommunity ? (
              <div className="space-y-2">
                <label htmlFor="share-caption" className="sr-only">
                  Caption
                </label>
                <textarea
                  id="share-caption"
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value)}
                  placeholder="Add a caption (optional)"
                  rows={2}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSharingToCommunity(false)}
                    disabled={isPostingShare}
                    className="flex-1 rounded-xl border border-white/30 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleShareToCommunity}
                    disabled={isPostingShare}
                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isPostingShare ? 'Sharing…' : 'Post'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSharingToCommunity(true)}
                className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white"
              >
                Share to Community
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen single photo view */}
      {fullscreenEntry && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          onClick={() => setFullscreenEntry(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenEntry(null)}
            aria-label="Close"
            className="absolute right-4 top-4 text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fullscreenEntry.url}
            alt=""
            className="max-h-[80svh] max-w-full object-contain"
          />
          <div className="mt-3 text-center text-sm text-white">
            <p className="font-medium">{fullscreenEntry.sourceLabel}</p>
            <p className="text-white/70">{formatDate(fullscreenEntry.date)}</p>
            {fullscreenEntry.note && <p className="mt-1 text-white/70">{fullscreenEntry.note}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoJournal;
