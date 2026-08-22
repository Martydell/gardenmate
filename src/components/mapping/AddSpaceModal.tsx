import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Check, ScanSearch, X } from 'lucide-react';
import { supabase, SPACE_PHOTOS_BUCKET } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import { usePlants } from '../../hooks/usePlants';
import { SPACE_TYPE_META, SPACE_TYPE_OPTIONS, plantCategoryForSpaceType } from '../../lib/spaceMeta';
import { SPACE_TEMPLATES } from '../../lib/spaceTemplates';
import type { TemplateId } from '../../lib/spaceTemplates';
import type { NewSpaceInput } from '../../hooks/useSpaces';
import type { GardenSpace, GardenSpaceType } from '../../types';
import MultiPlantIdentifyModal from './MultiPlantIdentifyModal';

interface FormState {
  name: string;
  type: GardenSpaceType;
  backgroundMode: 'template' | 'photo';
  templateId: TemplateId;
  photoUrl: string | null;
  photoFile: File | null;
}

function initialFormFor(type: GardenSpaceType): FormState {
  const category = SPACE_TYPE_META[type].templateCategory;
  const firstTemplate = SPACE_TEMPLATES.find((t) => t.category === category)!;
  return {
    name: '',
    type,
    backgroundMode: 'template',
    templateId: firstTemplate.id,
    photoUrl: null,
    photoFile: null,
  };
}

interface AddSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: NewSpaceInput) => Promise<GardenSpace | null>;
}

function AddSpaceModal({ open, onClose, onAdd }: AddSpaceModalProps) {
  const userId = useUserStore((state) => state.user?.id);
  const { addPlant } = usePlants();
  const [form, setForm] = useState<FormState>(() => initialFormFor('indoor_room'));
  const [nameError, setNameError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isIdentifyOpen, setIsIdentifyOpen] = useState(false);

  const [syncedOpen, setSyncedOpen] = useState(open);
  if (open !== syncedOpen) {
    setSyncedOpen(open);
    if (open) {
      setForm(initialFormFor('indoor_room'));
      setNameError(null);
      setSubmitError(null);
      setPhotoError(null);
    }
  }

  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleTypeChange(type: GardenSpaceType) {
    const category = SPACE_TYPE_META[type].templateCategory;
    const currentTemplateStillValid = SPACE_TEMPLATES.find(
      (t) => t.id === form.templateId && t.category === category,
    );
    updateForm({
      type,
      templateId: currentTemplateStillValid
        ? form.templateId
        : SPACE_TEMPLATES.find((t) => t.category === category)!.id,
    });
  }

  function resetAndClose() {
    setForm(initialFormFor('indoor_room'));
    setNameError(null);
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

    const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(SPACE_PHOTOS_BUCKET)
      .upload(path, file);

    if (uploadError) {
      setPhotoError(uploadError.message);
      setIsUploadingPhoto(false);
      return;
    }

    const { data } = supabase.storage.from(SPACE_PHOTOS_BUCKET).getPublicUrl(path);
    updateForm({ photoUrl: data.publicUrl, photoFile: file });
    setIsUploadingPhoto(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError('Space name is required');
      return;
    }
    setNameError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    const background =
      form.backgroundMode === 'photo' && form.photoUrl
        ? { type: 'photo' as const, url: form.photoUrl }
        : { type: 'template' as const, templateId: form.templateId };

    const result = await onAdd({
      name: form.name.trim(),
      type: form.type,
      canvas_json: { version: 1, background, irrigationVisible: false, fabric: null },
      photos: form.photoUrl ? [form.photoUrl] : [],
    });

    setIsSubmitting(false);

    if (!result) {
      setSubmitError('Something went wrong creating this space. Please try again.');
      return;
    }

    resetAndClose();
  }

  const availableTemplates = SPACE_TEMPLATES.filter(
    (t) => t.category === SPACE_TYPE_META[form.type].templateCategory,
  );

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
          <h2 className="text-xl font-semibold">Add a space</h2>
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
            <label htmlFor="space-name" className="mb-1 block text-sm font-medium">
              Space name
            </label>
            <input
              id="space-name"
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="e.g. Back Garden"
              className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 dark:bg-neutral-950 ${
                nameError
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-neutral-300 focus:border-green-600 focus:ring-green-100 dark:border-neutral-700'
              }`}
            />
            {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
          </div>

          <div>
            <label htmlFor="space-type" className="mb-1 block text-sm font-medium">
              Space type
            </label>
            <select
              id="space-type"
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value as GardenSpaceType)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
            >
              {SPACE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-xl border border-neutral-300 p-0.5 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => updateForm({ backgroundMode: 'template' })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                form.backgroundMode === 'template'
                  ? 'bg-green-600 text-white'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              Use a template
            </button>
            <button
              type="button"
              onClick={() => updateForm({ backgroundMode: 'photo' })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                form.backgroundMode === 'photo'
                  ? 'bg-green-600 text-white'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              Upload a photo
            </button>
          </div>

          {form.backgroundMode === 'template' ? (
            <div className="grid grid-cols-3 gap-3">
              {availableTemplates.map((template) => {
                const isSelected = form.templateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => updateForm({ templateId: template.id })}
                    className={`relative overflow-hidden rounded-xl border-2 ${
                      isSelected ? 'border-green-600' : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-white">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <div
                      className="aspect-[4/3] w-full"
                      dangerouslySetInnerHTML={{ __html: template.svg }}
                    />
                    <p className="bg-neutral-50 py-1 text-center text-xs font-medium dark:bg-neutral-800">
                      {template.label}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                {isUploadingPhoto
                  ? 'Uploading…'
                  : form.photoUrl
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
              {form.photoUrl && (
                <>
                  <img
                    src={form.photoUrl}
                    alt="Space preview"
                    className="mt-2 h-32 w-full rounded-xl object-cover"
                  />
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
              {photoError && <p className="mt-1 text-sm text-red-600">{photoError}</p>}
            </div>
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting || isUploadingPhoto}
            className="w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>
    </div>

    <MultiPlantIdentifyModal
      open={isIdentifyOpen}
      onClose={() => setIsIdentifyOpen(false)}
      sourceFile={form.photoFile}
      onAdd={addPlant}
      defaultCategory={plantCategoryForSpaceType(form.type)}
    />
    </>
  );
}

export default AddSpaceModal;
