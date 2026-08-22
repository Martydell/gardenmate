import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { X } from 'lucide-react';
import { supabase, PLANT_PHOTOS_BUCKET } from '../../lib/supabase';
import { compressImage } from '../../lib/imageCrop';
import { useUserStore } from '../../stores/userStore';
import {
  COMMON_PLANT_NAME_SUGGESTIONS,
  PLANT_CATEGORY_OPTIONS,
  PLANT_SOURCE_OPTIONS,
  PLANT_STATUS_OPTIONS,
} from '../../lib/plantMeta';
import type { NewPlantInput } from '../../hooks/usePlants';
import type { Plant, PlantCategory, PlantSource, PlantStatus } from '../../types';

interface FormState {
  nickname: string;
  commonName: string;
  scientificName: string;
  category: PlantCategory;
  status: PlantStatus;
  source: PlantSource;
  dateAcquired: string;
  notes: string;
  coverPhotoUrl: string | null;
  isEdible: boolean;
}

const initialFormState: FormState = {
  nickname: '',
  commonName: '',
  scientificName: '',
  category: 'indoor',
  status: 'growing',
  source: 'shop_bought',
  dateAcquired: '',
  notes: '',
  coverPhotoUrl: null,
  isEdible: false,
};

type FormErrors = Partial<Record<'nickname' | 'commonName', string>>;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.nickname.trim()) errors.nickname = 'Nickname is required';
  if (!form.commonName.trim()) errors.commonName = 'Common name is required';
  return errors;
}

function plantToFormState(plant: Plant): FormState {
  return {
    nickname: plant.nickname ?? '',
    commonName: plant.common_name,
    scientificName: plant.scientific_name ?? '',
    category: plant.category,
    status: plant.status,
    source: plant.source,
    dateAcquired: plant.date_acquired ?? '',
    notes: plant.notes ?? '',
    coverPhotoUrl: plant.cover_photo_url,
    isEdible: plant.is_edible,
  };
}

interface AddPlantModalProps {
  open: boolean;
  onClose: () => void;
  plant?: Plant | null;
  onAdd: (input: NewPlantInput) => Promise<Plant | null>;
  onUpdate?: (id: string, updates: Partial<Plant>) => Promise<Plant | null>;
  // Pre-fills a fresh (non-edit) form — e.g. from an Identify result — with
  // a name/photo already known rather than starting blank. scientificName
  // matters beyond just filling the field: CareInfoCard on Plant Detail
  // looks up Perenual data by plant.scientific_name, so leaving it unset
  // here means the saved plant's Care Info tab comes back empty.
  initialValues?: { commonName?: string; scientificName?: string; coverPhotoUrl?: string | null };
  // Saves the new plant straight to the wishlist instead of My Plants.
  defaultIsWishlist?: boolean;
}

function AddPlantModal({
  open,
  onClose,
  plant,
  onAdd,
  onUpdate,
  initialValues,
  defaultIsWishlist,
}: AddPlantModalProps) {
  const userId = useUserStore((state) => state.user?.id);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = Boolean(plant);

  // Re-sync form state from props when the modal opens (or the plant being
  // edited changes) without an extra effect-triggered render — adjusting
  // state during render, per React's docs, since typing shouldn't re-sync.
  const [syncedFor, setSyncedFor] = useState({ open, plant });
  if (open !== syncedFor.open || plant !== syncedFor.plant) {
    setSyncedFor({ open, plant });
    if (open) {
      setForm(
        plant
          ? plantToFormState(plant)
          : {
              ...initialFormState,
              commonName: initialValues?.commonName ?? initialFormState.commonName,
              scientificName: initialValues?.scientificName ?? initialFormState.scientificName,
              coverPhotoUrl: initialValues?.coverPhotoUrl ?? initialFormState.coverPhotoUrl,
            },
      );
      setErrors({});
      setSubmitError(null);
      setPhotoError(null);
    }
  }

  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function resetAndClose() {
    setForm(initialFormState);
    setErrors({});
    setSubmitError(null);
    setPhotoError(null);
    onClose();
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;

    setIsUploadingPhoto(true);
    setPhotoError(null);

    const compressed = await compressImage(file);
    const path = `${userId}/${crypto.randomUUID()}-${compressed.name}`;
    const { error: uploadError } = await supabase.storage
      .from(PLANT_PHOTOS_BUCKET)
      .upload(path, compressed);

    if (uploadError) {
      setPhotoError(uploadError.message);
      setIsUploadingPhoto(false);
      return;
    }

    const { data } = supabase.storage.from(PLANT_PHOTOS_BUCKET).getPublicUrl(path);
    updateForm({ coverPhotoUrl: data.publicUrl });
    setIsUploadingPhoto(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const sharedFields = {
      nickname: form.nickname.trim(),
      common_name: form.commonName.trim(),
      scientific_name: form.scientificName.trim() || null,
      category: form.category,
      status: form.status,
      source: form.source,
      date_acquired: form.dateAcquired || null,
      notes: form.notes.trim() || null,
      cover_photo_url: form.coverPhotoUrl,
      is_edible: form.isEdible,
    };

    const result =
      isEditMode && plant
        ? await onUpdate?.(plant.id, sharedFields)
        : await onAdd({
            ...sharedFields,
            location_id: null,
            date_planted: null,
            pot_size: null,
            soil_type: null,
            last_watered: null,
            last_fed: null,
            is_wishlist: defaultIsWishlist ?? false,
            photos: form.coverPhotoUrl ? [form.coverPhotoUrl] : [],
            pet_safety: 'unknown',
            is_edible: form.isEdible,
          });

    setIsSubmitting(false);

    if (!result) {
      setSubmitError(
        `Something went wrong ${isEditMode ? 'updating' : 'saving'} this plant. Please try again.`,
      );
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
          <h2 className="text-xl font-semibold">
            {isEditMode ? 'Edit plant' : defaultIsWishlist ? 'Save to wishlist' : 'Add a plant'}
          </h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close"
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="mb-1 block text-sm font-medium">
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={form.nickname}
              onChange={(e) => updateForm({ nickname: e.target.value })}
              placeholder="e.g. Fernanda"
              className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 dark:bg-neutral-950 ${
                errors.nickname
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-neutral-300 focus:border-green-600 focus:ring-green-100 dark:border-neutral-700'
              }`}
            />
            {errors.nickname && <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>}
          </div>

          <div>
            <label htmlFor="common-name" className="mb-1 block text-sm font-medium">
              Common name
            </label>
            <input
              id="common-name"
              type="text"
              list="common-name-suggestions"
              value={form.commonName}
              onChange={(e) => updateForm({ commonName: e.target.value })}
              placeholder="e.g. Monstera Deliciosa"
              className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 dark:bg-neutral-950 ${
                errors.commonName
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-neutral-300 focus:border-green-600 focus:ring-green-100 dark:border-neutral-700'
              }`}
            />
            <datalist id="common-name-suggestions">
              {COMMON_PLANT_NAME_SUGGESTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {errors.commonName && (
              <p className="mt-1 text-sm text-red-600">{errors.commonName}</p>
            )}
          </div>

          <div>
            <label htmlFor="scientific-name" className="mb-1 block text-sm font-medium">
              Scientific name
            </label>
            <input
              id="scientific-name"
              type="text"
              value={form.scientificName}
              onChange={(e) => updateForm({ scientificName: e.target.value })}
              placeholder="Optional"
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => updateForm({ category: e.target.value as PlantCategory })}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              >
                {PLANT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => updateForm({ status: e.target.value as PlantStatus })}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              >
                {PLANT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="source" className="mb-1 block text-sm font-medium">
                Source
              </label>
              <select
                id="source"
                value={form.source}
                onChange={(e) => updateForm({ source: e.target.value as PlantSource })}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              >
                {PLANT_SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date-acquired" className="mb-1 block text-sm font-medium">
                Date acquired
              </label>
              <input
                id="date-acquired"
                type="date"
                value={form.dateAcquired}
                onChange={(e) => updateForm({ dateAcquired: e.target.value })}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isEdible}
              onChange={(e) => updateForm({ isEdible: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-green-600 focus:ring-green-500 dark:border-neutral-700"
            />
            Edible plant (enables harvest logging)
          </label>

          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateForm({ notes: e.target.value })}
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
                : form.coverPhotoUrl
                  ? 'Photo added — tap to replace'
                  : 'Upload a photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={isUploadingPhoto}
              />
            </label>
            {form.coverPhotoUrl && (
              <img
                src={form.coverPhotoUrl}
                alt="Plant preview"
                className="mt-2 h-24 w-24 rounded-xl object-cover"
              />
            )}
            {photoError && <p className="mt-1 text-sm text-red-600">{photoError}</p>}
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting || isUploadingPhoto}
            className="w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
          >
            {isSubmitting
              ? 'Saving…'
              : isEditMode
                ? 'Save changes'
                : defaultIsWishlist
                  ? 'Save to wishlist'
                  : 'Add plant'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddPlantModal;
