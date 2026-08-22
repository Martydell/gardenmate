import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { usePlants } from '../hooks/usePlants';
import { useCareLog } from '../hooks/useCareLog';
import { useCareTasks } from '../hooks/useCareTasks';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePlantStages } from '../hooks/usePlantStages';
import { usePlantMilestones } from '../hooks/usePlantMilestones';
import { usePlantProgressPhotos } from '../hooks/usePlantProgressPhotos';
import { useHarvestLog } from '../hooks/useHarvestLog';
import { useUserStore } from '../stores/userStore';
import { supabase, PLANT_PHOTOS_BUCKET } from '../lib/supabase';
import { compressImage } from '../lib/imageCrop';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { CATEGORY_META, STATUS_META, CARE_ACTION_META, PLANT_SOURCE_OPTIONS } from '../lib/plantMeta';
import { getNextWateringDate, getNextFeedingDate, formatDate, formatDateTime } from '../lib/careSchedule';
import { ACTION_TYPE_TO_TASK_TYPE } from '../lib/careTaskMeta';
import { formatTotalsByUnit, HARVEST_UNIT_META } from '../lib/harvest';
import AddPlantModal from '../components/plants/AddPlantModal';
import CareInfoCard from '../components/plants/CareInfoCard';
import PetSafetyBanner from '../components/plants/PetSafetyBanner';
import GrowthStageTracker from '../components/plants/GrowthStageTracker';
import MilestonesPanel from '../components/plants/MilestonesPanel';
import PhotoJournal from '../components/plants/PhotoJournal';
import PlantDetailSkeleton from '../components/plants/PlantDetailSkeleton';
import HarvestLogModal from '../components/plants/HarvestLogModal';
import type { CareActionType, Plant } from '../types';

type TabKey = 'info' | 'care' | 'care-info' | 'history' | 'gallery' | 'progress';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'care', label: 'Care' },
  { key: 'care-info', label: 'Care Info' },
  { key: 'history', label: 'History' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'progress', label: 'Progress' },
];

function QuickActionButton({
  emoji,
  label,
  onClick,
  disabled,
  loading,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 rounded-2xl border border-neutral-100 bg-white py-3 text-xs font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <span className="text-2xl">{loading ? '⏳' : emoji}</span>
      {label}
    </button>
  );
}

function PhotoCarousel({
  photos,
  onPhotoTap,
}: {
  photos: string[];
  onPhotoTap: (url: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-green-100 text-7xl dark:bg-green-950">
        🌿
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onPhotoTap(url)}
            className="h-full w-full flex-shrink-0 snap-center"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {photos.map((url, i) => (
            <span
              key={url}
              className={`h-1.5 w-1.5 rounded-full ${
                i === index ? 'bg-green-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-900">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function CareScheduleCard({
  emoji,
  title,
  lastLabel,
  lastValue,
  nextValue,
}: {
  emoji: string;
  title: string;
  lastLabel: string;
  lastValue: string;
  nextValue: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-neutral-500">{lastLabel}</span>
        <span className="font-medium">{lastValue}</span>
      </div>
      <div className="mt-1 flex justify-between text-sm">
        <span className="text-neutral-500">Next due</span>
        <span className="font-medium">{nextValue}</span>
      </div>
    </div>
  );
}

function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = useUserStore((state) => state.user?.id);
  const { plants, wishlist, isLoading, updatePlant, deletePlant, addPlant } = usePlants();

  const plant = useMemo(
    () => [...plants, ...wishlist].find((p) => p.id === id),
    [plants, wishlist, id],
  );

  const { logs, isLoading: logsLoading, error: logsError, logAction } = useCareLog(plant?.id);
  const { rescheduleTaskForPlant } = useCareTasks();
  const { stages, advanceStage } = usePlantStages(plant?.id);
  const { milestones, addMilestone } = usePlantMilestones(plant?.id);
  const { photos: progressPhotos, addProgressPhoto } = usePlantProgressPhotos(plant?.id);
  const { entries: harvestEntries, isLoading: harvestLoading, addHarvest } = useHarvestLog(plant?.id);

  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<CareActionType | 'photo' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const displayName = plant ? plant.nickname || plant.common_name : '';
  useDocumentTitle(displayName ? `${displayName} — GardenMate` : 'GardenMate');
  const nextWatering = plant ? getNextWateringDate(plant) : null;
  const nextFeeding = plant ? getNextFeedingDate(plant) : null;

  async function handleQuickAction(actionType: CareActionType) {
    if (!plant) return;
    setPendingAction(actionType);
    setActionError(null);

    const nowIso = new Date().toISOString();
    const plantUpdate: Partial<Plant> | null =
      actionType === 'watered'
        ? { last_watered: nowIso }
        : actionType === 'fed'
          ? { last_fed: nowIso }
          : null;

    const results = await Promise.all([
      logAction(plant.id, actionType),
      plantUpdate ? updatePlant(plant.id, plantUpdate) : Promise.resolve(plant),
    ]);
    // Fire-and-forget: syncs any matching scheduled task without blocking
    // the primary log+update feedback above on a task that may not exist.
    void rescheduleTaskForPlant(plant.id, ACTION_TYPE_TO_TASK_TYPE[actionType]);

    setPendingAction(null);
    if (!results[0] || !results[1]) {
      setActionError('Something went wrong logging that. Please try again.');
    }
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !plant || !userId) return;

    setPendingAction('photo');
    setActionError(null);

    try {
      const compressed = await compressImage(file);
      const path = `${userId}/${crypto.randomUUID()}-${compressed.name}`;
      const { error: uploadError } = await supabase.storage
        .from(PLANT_PHOTOS_BUCKET)
        .upload(path, compressed);

      if (uploadError) {
        setActionError(uploadError.message);
        notifyError(uploadError.message);
        setPendingAction(null);
        return;
      }

      const { data } = supabase.storage.from(PLANT_PHOTOS_BUCKET).getPublicUrl(path);
      const result = await updatePlant(plant.id, {
        photos: [...plant.photos, data.publicUrl],
        cover_photo_url: plant.cover_photo_url ?? data.publicUrl,
      });

      setPendingAction(null);
      if (!result) {
        setActionError('Something went wrong uploading that photo. Please try again.');
      } else {
        notifySuccess('Photo saved!');
      }
    } catch {
      setPendingAction(null);
      notifyError();
    }
  }

  async function handleDelete() {
    if (!plant) return;
    setIsDeleting(true);
    setDeleteError(null);

    const success = await deletePlant(plant.id);
    if (success) {
      navigate('/catalogue');
      return;
    }
    setIsDeleting(false);
    setDeleteError('Something went wrong deleting this plant. Please try again.');
  }

  if (isLoading && !plant) {
    return <PlantDetailSkeleton />;
  }

  if (!plant) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium">Plant not found</p>
        <Link to="/catalogue" className="text-green-700 underline dark:text-green-400">
          Back to My Garden
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="relative">
        <PhotoCarousel photos={plant.photos} onPhotoTap={setFullscreenPhoto} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="rounded-full bg-black/40 p-2 text-white backdrop-blur"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              aria-label="Edit plant"
              className="rounded-full bg-black/40 p-2 text-white backdrop-blur"
            >
              <Pencil className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-label="More options"
                className="rounded-full bg-black/40 p-2 text-white backdrop-blur"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600"
                    >
                      <Trash2 className="h-4 w-4" /> Delete plant
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <h1 className="text-2xl font-semibold">{displayName}</h1>
        {plant.scientific_name && (
          <p className="italic text-neutral-500">{plant.scientific_name}</p>
        )}

        <div className="mt-2 flex gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_META[plant.category].className}`}
          >
            {CATEGORY_META[plant.category].label}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_META[plant.status].className}`}
          >
            {STATUS_META[plant.status].label}
          </span>
        </div>

        {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}

        <div className={`mt-4 grid gap-2 ${plant.is_edible ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <QuickActionButton
            emoji="💧"
            label="Watered"
            onClick={() => handleQuickAction('watered')}
            disabled={pendingAction !== null}
            loading={pendingAction === 'watered'}
          />
          <QuickActionButton
            emoji="🌿"
            label="Fed"
            onClick={() => handleQuickAction('fed')}
            disabled={pendingAction !== null}
            loading={pendingAction === 'fed'}
          />
          <QuickActionButton
            emoji="✂️"
            label="Pruned"
            onClick={() => handleQuickAction('pruned')}
            disabled={pendingAction !== null}
            loading={pendingAction === 'pruned'}
          />
          {plant.is_edible && (
            <QuickActionButton
              emoji="🧺"
              label="Harvest"
              onClick={() => setIsHarvestModalOpen(true)}
              disabled={pendingAction !== null}
            />
          )}
          <QuickActionButton
            emoji="📷"
            label="Add Photo"
            onClick={() => photoInputRef.current?.click()}
            disabled={pendingAction !== null}
            loading={pendingAction === 'photo'}
          />
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      <div className="mt-4 flex border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 border-b-2 py-2.5 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-green-600 text-green-700 dark:text-green-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="px-4 py-2">
          <div className="pb-2 pt-2">
            <PetSafetyBanner safety={plant.pet_safety} />
          </div>
          <InfoRow
            label="Date acquired"
            value={plant.date_acquired ? formatDate(plant.date_acquired) : '—'}
          />
          <InfoRow
            label="Source"
            value={PLANT_SOURCE_OPTIONS.find((o) => o.value === plant.source)?.label ?? plant.source}
          />
          <InfoRow label="Location" value={plant.location_id ? 'Assigned' : 'Not set'} />
          <InfoRow label="Pot size" value={plant.pot_size ?? '—'} />
          <InfoRow label="Soil type" value={plant.soil_type ?? '—'} />
          {plant.notes && (
            <div className="py-3">
              <p className="text-sm text-neutral-500">Notes</p>
              <p className="mt-1 text-sm">{plant.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'care' && (
        <div className="space-y-3 px-4 py-4">
          <CareScheduleCard
            emoji="💧"
            title="Watering"
            lastLabel="Last watered"
            lastValue={plant.last_watered ? formatDate(plant.last_watered) : 'Never'}
            nextValue={nextWatering ? formatDate(nextWatering.toISOString()) : '—'}
          />
          <CareScheduleCard
            emoji="🌿"
            title="Feeding"
            lastLabel="Last fed"
            lastValue={plant.last_fed ? formatDate(plant.last_fed) : 'Never'}
            nextValue={nextFeeding ? formatDate(nextFeeding.toISOString()) : '—'}
          />
          <Link
            to={`/care?plantId=${plant.id}`}
            className="block text-center text-sm font-medium text-green-700 underline dark:text-green-400"
          >
            View full care plan
          </Link>
        </div>
      )}

      {activeTab === 'care-info' && (
        <div className="px-4 py-4">
          <CareInfoCard
            scientificName={plant.scientific_name || plant.common_name}
            currentPetSafety={plant.pet_safety}
            onPetSafetyResolved={(safety) => updatePlant(plant.id, { pet_safety: safety })}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="px-4 py-4">
          {plant.is_edible && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <h3 className="font-medium text-amber-900 dark:text-amber-300">🧺 Harvest History</h3>
              {harvestLoading ? (
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-400">Loading…</p>
              ) : (
                <>
                  <p className="mt-1 text-sm font-medium text-amber-800 dark:text-amber-400">
                    Total: {formatTotalsByUnit(harvestEntries)}
                  </p>
                  {harvestEntries.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {harvestEntries.map((entry) => (
                        <li key={entry.id} className="flex items-start gap-3 rounded-xl bg-white p-2.5 dark:bg-neutral-900">
                          {entry.photo_url && (
                            <img src={entry.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                {entry.quantity} {HARVEST_UNIT_META[entry.unit].pluralLabel}
                              </span>
                              <span className="shrink-0 text-xs text-neutral-500">
                                {formatDate(entry.harvested_at)}
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
          {logsError ? (
            <p className="py-8 text-center text-sm text-red-600">
              Couldn't load care history: {logsError}
            </p>
          ) : logsLoading ? (
            <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">No care history yet.</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-3 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <span className="text-xl">{CARE_ACTION_META[log.action_type].emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{CARE_ACTION_META[log.action_type].label}</span>
                      <span className="shrink-0 text-xs text-neutral-500">
                        {formatDateTime(log.logged_at)}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {log.notes}
                      </p>
                    )}
                    {log.photo_url && (
                      <img
                        src={log.photo_url}
                        alt=""
                        className="mt-2 h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="px-4 py-4">
          {plant.photos.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {plant.photos.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setFullscreenPhoto(url)}
                  className="aspect-square overflow-hidden rounded-lg"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="mt-4 w-full rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 dark:border-neutral-700"
          >
            Add Photo
          </button>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-4 px-4 py-4">
          <GrowthStageTracker stages={stages} onAdvance={advanceStage} />
          <MilestonesPanel plant={plant} milestones={milestones} onAdd={addMilestone} />
          <PhotoJournal
            plant={plant}
            stages={stages}
            milestones={milestones}
            progressPhotos={progressPhotos}
            onAddPhoto={addProgressPhoto}
          />
        </div>
      )}

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-opacity ${
          fullscreenPhoto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setFullscreenPhoto(null)}
      >
        <button
          type="button"
          onClick={() => setFullscreenPhoto(null)}
          aria-label="Close"
          className="absolute right-4 top-4 text-white"
        >
          <X className="h-6 w-6" />
        </button>
        {fullscreenPhoto && (
          <img src={fullscreenPhoto} alt="" className="max-h-full max-w-full object-contain" />
        )}
      </div>

      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Delete {displayName}?</h2>
            <p className="mt-2 text-sm text-neutral-500">
              This will permanently delete this plant and all of its care history. This can't be
              undone.
            </p>
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-neutral-300 py-2.5 font-medium disabled:opacity-60 dark:border-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 font-medium text-white disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddPlantModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        plant={plant}
        onAdd={addPlant}
        onUpdate={updatePlant}
      />

      <HarvestLogModal
        open={isHarvestModalOpen}
        plantId={plant.id}
        onClose={() => setIsHarvestModalOpen(false)}
        onAdd={addHarvest}
      />
    </div>
  );
}

export default PlantDetail;
