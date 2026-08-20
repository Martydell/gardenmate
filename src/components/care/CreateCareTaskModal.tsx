import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { usePlants } from '../../hooks/usePlants';
import type { NewCareTaskInput } from '../../hooks/useCareTasks';
import {
  DEFAULT_SUCCESSION_INTERVAL_WEEKS,
  REPEAT_PRESET_OPTIONS,
  TASK_TYPE_OPTIONS,
  repeatIntervalDaysFor,
  todayDateString,
} from '../../lib/careTaskMeta';
import type { RepeatPreset } from '../../lib/careTaskMeta';
import type { CareTask, CareTaskType } from '../../types';

interface FormState {
  plantId: string;
  plantSearch: string;
  taskType: CareTaskType;
  dueDate: string;
  repeatPreset: RepeatPreset;
  customDays: string;
  successionWeeks: string;
  notes: string;
}

function initialFormState(): FormState {
  return {
    plantId: '',
    plantSearch: '',
    taskType: 'water',
    dueDate: todayDateString(),
    repeatPreset: 'none',
    customDays: '',
    successionWeeks: String(DEFAULT_SUCCESSION_INTERVAL_WEEKS),
    notes: '',
  };
}

type FormErrors = Partial<Record<'plant' | 'customDays' | 'successionWeeks', string>>;

interface CreateCareTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewCareTaskInput) => Promise<CareTask | null>;
}

function CreateCareTaskModal({ open, onClose, onCreate }: CreateCareTaskModalProps) {
  const { plants } = usePlants();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPlantListOpen, setIsPlantListOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [syncedOpen, setSyncedOpen] = useState(open);
  if (open !== syncedOpen) {
    setSyncedOpen(open);
    if (open) {
      setForm(initialFormState());
      setErrors({});
      setSubmitError(null);
      setIsPlantListOpen(false);
    }
  }

  const filteredPlants = useMemo(() => {
    const query = form.plantSearch.trim().toLowerCase();
    if (!query) return plants;
    return plants.filter((plant) =>
      [plant.nickname, plant.common_name].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [plants, form.plantSearch]);

  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function resetAndClose() {
    setForm(initialFormState());
    setErrors({});
    setSubmitError(null);
    setIsPlantListOpen(false);
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors: FormErrors = {};
    if (!form.plantId) validationErrors.plant = 'Select a plant';
    if (form.taskType === 'succession') {
      if (!form.successionWeeks || Number(form.successionWeeks) <= 0) {
        validationErrors.successionWeeks = 'Enter a number of weeks';
      }
    } else if (form.repeatPreset === 'custom' && (!form.customDays || Number(form.customDays) <= 0)) {
      validationErrors.customDays = 'Enter a number of days';
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitError(null);
    setIsSubmitting(true);

    // Succession tasks always repeat — that's the point of the feature — so
    // they bypass the generic day-based repeat preset in favour of a
    // gardener-friendly weeks input, converted to days for storage.
    const repeatIntervalDays =
      form.taskType === 'succession'
        ? Number(form.successionWeeks) * 7
        : repeatIntervalDaysFor(form.repeatPreset, form.customDays ? Number(form.customDays) : null);

    const result = await onCreate({
      plant_id: form.plantId,
      task_type: form.taskType,
      due_date: form.dueDate,
      repeat_interval_days: repeatIntervalDays,
      notes: form.notes.trim() || null,
      snoozed_until: null,
    });

    setIsSubmitting(false);

    if (!result) {
      setSubmitError('Something went wrong creating this task. Please try again.');
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
          <h2 className="text-xl font-semibold">Add a care task</h2>
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
          <div className="relative">
            <label htmlFor="task-plant" className="mb-1 block text-sm font-medium">
              Plant
            </label>
            <input
              id="task-plant"
              type="text"
              value={form.plantSearch}
              onFocus={() => setIsPlantListOpen(true)}
              onChange={(e) => {
                updateForm({ plantSearch: e.target.value, plantId: '' });
                setIsPlantListOpen(true);
              }}
              placeholder="Search your plants…"
              className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 dark:bg-neutral-950 ${
                errors.plant
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-neutral-300 focus:border-green-600 focus:ring-green-100 dark:border-neutral-700'
              }`}
            />
            {errors.plant && <p className="mt-1 text-sm text-red-600">{errors.plant}</p>}
            {isPlantListOpen && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {filteredPlants.length === 0 ? (
                  <p className="p-3 text-sm text-neutral-500">No plants match.</p>
                ) : (
                  filteredPlants.map((plant) => (
                    <button
                      key={plant.id}
                      type="button"
                      onClick={() => {
                        updateForm({
                          plantId: plant.id,
                          plantSearch: plant.nickname || plant.common_name,
                        });
                        setIsPlantListOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {plant.nickname || plant.common_name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="task-type" className="mb-1 block text-sm font-medium">
              Task type
            </label>
            <select
              id="task-type"
              value={form.taskType}
              onChange={(e) => updateForm({ taskType: e.target.value as CareTaskType })}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
            >
              {TASK_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.emoji} {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-due-date" className="mb-1 block text-sm font-medium">
              Start date
            </label>
            <input
              id="task-due-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => updateForm({ dueDate: e.target.value })}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          {form.taskType === 'succession' ? (
            <div>
              <label htmlFor="task-succession-weeks" className="mb-1 block text-sm font-medium">
                Repeat every X weeks
              </label>
              <input
                id="task-succession-weeks"
                type="number"
                min={1}
                value={form.successionWeeks}
                onChange={(e) => updateForm({ successionWeeks: e.target.value })}
                placeholder="e.g. 2"
                className={`w-full rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 dark:bg-neutral-950 ${
                  errors.successionWeeks
                    ? 'border-red-500 focus:ring-red-100'
                    : 'border-neutral-300 focus:border-green-600 focus:ring-green-100 dark:border-neutral-700'
                }`}
              />
              {errors.successionWeeks && (
                <p className="mt-1 text-sm text-red-600">{errors.successionWeeks}</p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                Completing this task automatically schedules the next sowing.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-repeat" className="mb-1 block text-sm font-medium">
                Repeat
              </label>
              <select
                id="task-repeat"
                value={form.repeatPreset}
                onChange={(e) => updateForm({ repeatPreset: e.target.value as RepeatPreset })}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
              >
                {REPEAT_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {form.repeatPreset === 'custom' && (
              <div>
                <label htmlFor="task-custom-days" className="mb-1 block text-sm font-medium">
                  Every X days
                </label>
                <input
                  id="task-custom-days"
                  type="number"
                  min={1}
                  value={form.customDays}
                  onChange={(e) => updateForm({ customDays: e.target.value })}
                  placeholder="e.g. 10"
                  className={`w-full rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 dark:bg-neutral-950 ${
                    errors.customDays
                      ? 'border-red-500 focus:ring-red-100'
                      : 'border-neutral-300 focus:border-green-600 focus:ring-green-100 dark:border-neutral-700'
                  }`}
                />
                {errors.customDays && (
                  <p className="mt-1 text-sm text-red-600">{errors.customDays}</p>
                )}
              </div>
            )}
          </div>
          )}

          <div>
            <label htmlFor="task-notes" className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <textarea
              id="task-notes"
              value={form.notes}
              onChange={(e) => updateForm({ notes: e.target.value })}
              rows={3}
              placeholder="Optional"
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Create task'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateCareTaskModal;
