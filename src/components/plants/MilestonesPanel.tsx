import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useUserStore } from '../../stores/userStore';
import { uploadPlantPhoto } from '../../lib/supabase';
import { formatDate } from '../../lib/careSchedule';
import { todayDateString } from '../../lib/careTaskMeta';
import { DATE_ACQUIRED_EMOJI, MILESTONE_TYPE_META, MILESTONE_TYPE_OPTIONS } from '../../lib/milestoneMeta';
import type { MilestoneType, Plant, PlantMilestone } from '../../types';

function MilestoneRow({
  emoji,
  label,
  date,
  note,
  photoUrl,
}: {
  emoji: string;
  label: string;
  date: string;
  note?: string | null;
  photoUrl?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xl">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{label}</p>
          <p className="shrink-0 text-xs text-neutral-500">{formatDate(date)}</p>
        </div>
        {note && <p className="text-sm text-neutral-500">{note}</p>}
        {photoUrl && <img src={photoUrl} alt="" className="mt-1 h-14 w-14 rounded-lg object-cover" />}
      </div>
    </div>
  );
}

interface MilestonesPanelProps {
  plant: Plant;
  milestones: PlantMilestone[];
  onAdd: (
    milestoneType: MilestoneType,
    occurredOn: string,
    note?: string | null,
    photoUrl?: string | null,
  ) => Promise<PlantMilestone | null>;
}

function MilestonesPanel({ plant, milestones, onAdd }: MilestonesPanelProps) {
  const userId = useUserStore((state) => state.user?.id);
  const sortedMilestones = useMemo(
    () => [...milestones].sort((a, b) => (a.occurred_on < b.occurred_on ? -1 : 1)),
    [milestones],
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('first_sprout');
  const [occurredOn, setOccurredOn] = useState(todayDateString());
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function resetAndClose() {
    setMilestoneType('first_sprout');
    setOccurredOn(todayDateString());
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
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await onAdd(milestoneType, occurredOn, note.trim() || null, photoUrl);

    setIsSubmitting(false);
    if (!result) {
      setSubmitError('Something went wrong adding this milestone. Please try again.');
      return;
    }
    resetAndClose();
  }

  const hasAnyMilestones = Boolean(plant.date_acquired) || sortedMilestones.length > 0;

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Milestone Dates</h3>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-sm font-medium text-green-700 dark:text-green-400"
        >
          + Add Milestone
        </button>
      </div>

      {hasAnyMilestones ? (
        <div className="space-y-3">
          {plant.date_acquired && (
            <MilestoneRow emoji={DATE_ACQUIRED_EMOJI} label="Date Acquired" date={plant.date_acquired} />
          )}
          {sortedMilestones.map((milestone) => (
            <MilestoneRow
              key={milestone.id}
              emoji={MILESTONE_TYPE_META[milestone.milestone_type].emoji}
              label={MILESTONE_TYPE_META[milestone.milestone_type].label}
              date={milestone.occurred_on}
              note={milestone.note}
              photoUrl={milestone.photo_url}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No milestones recorded yet.</p>
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
          <h2 className="mb-4 text-lg font-semibold">Add a milestone</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="milestone-type" className="mb-1 block text-sm font-medium">
                Milestone
              </label>
              <select
                id="milestone-type"
                value={milestoneType}
                onChange={(e) => setMilestoneType(e.target.value as MilestoneType)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              >
                {MILESTONE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.emoji} {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="milestone-date" className="mb-1 block text-sm font-medium">
                Date
              </label>
              <input
                id="milestone-date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            <div>
              <label htmlFor="milestone-note" className="mb-1 block text-sm font-medium">
                Note
              </label>
              <textarea
                id="milestone-note"
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
              {isSubmitting ? 'Saving…' : 'Save milestone'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default MilestonesPanel;
