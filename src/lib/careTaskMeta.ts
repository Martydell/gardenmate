import type { CareActionType, CareTask, CareTaskType } from '../types';

export const TASK_TYPE_META: Record<CareTaskType, { label: string; emoji: string; dotColor: string }> = {
  water: { label: 'Water', emoji: '💧', dotColor: '#3b82f6' },
  feed: { label: 'Feed', emoji: '🌿', dotColor: '#22c55e' },
  prune: { label: 'Prune', emoji: '✂️', dotColor: '#f97316' },
  harvest: { label: 'Harvest', emoji: '🌾', dotColor: '#eab308' },
  succession: { label: 'Succession Planting', emoji: '🌱', dotColor: '#a855f7' },
};

// Default succession interval when a user hasn't picked one — 2 weeks suits
// most salads/herbs (per the feature spec), longer-cycle edibles can raise it.
export const DEFAULT_SUCCESSION_INTERVAL_WEEKS = 2;

export const TASK_TYPE_OPTIONS: { value: CareTaskType; label: string; emoji: string }[] = (
  Object.keys(TASK_TYPE_META) as CareTaskType[]
).map((value) => ({ value, label: TASK_TYPE_META[value].label, emoji: TASK_TYPE_META[value].emoji }));

export const TASK_TYPE_TO_ACTION_TYPE: Record<CareTaskType, CareActionType> = {
  water: 'watered',
  feed: 'fed',
  prune: 'pruned',
  harvest: 'harvested',
  succession: 'sown',
};

export const ACTION_TYPE_TO_TASK_TYPE: Record<CareActionType, CareTaskType> = {
  watered: 'water',
  fed: 'feed',
  pruned: 'prune',
  harvested: 'harvest',
  sown: 'succession',
};

export type RepeatPreset = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export const REPEAT_PRESET_OPTIONS: { value: RepeatPreset; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Every X days' },
];

export function repeatIntervalDaysFor(preset: RepeatPreset, customDays: number | null): number | null {
  switch (preset) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'custom':
      return customDays && customDays > 0 ? customDays : null;
    case 'none':
    default:
      return null;
  }
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateString(): string {
  return toDateString(new Date());
}

export function addDaysToDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function formatTaskDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface TaskBuckets {
  todaysTasks: CareTask[];
  overdueTasks: CareTask[];
  upcomingTasks: CareTask[];
}

export function computeTaskBuckets(tasks: CareTask[]): TaskBuckets {
  const active = tasks.filter((task) => !task.completed);
  const today = todayDateString();
  const in7Days = addDaysToDateString(today, 7);

  return {
    todaysTasks: active.filter((task) => task.due_date === today),
    overdueTasks: active.filter((task) => task.due_date < today),
    upcomingTasks: active.filter((task) => task.due_date > today && task.due_date <= in7Days),
  };
}
