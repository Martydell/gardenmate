import type { Plant } from '../types';

// No per-plant watering/feeding interval exists yet, so overdue/sort logic
// assumes flat cycles from last_watered/last_fed until real care-schedule
// fields ship.
const DEFAULT_WATERING_INTERVAL_DAYS = 7;
const DEFAULT_FEEDING_INTERVAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getNextWateringDate(plant: Pick<Plant, 'last_watered'>): Date | null {
  if (!plant.last_watered) return null;
  return new Date(new Date(plant.last_watered).getTime() + DEFAULT_WATERING_INTERVAL_DAYS * DAY_MS);
}

export function getNextFeedingDate(plant: Pick<Plant, 'last_fed'>): Date | null {
  if (!plant.last_fed) return null;
  return new Date(new Date(plant.last_fed).getTime() + DEFAULT_FEEDING_INTERVAL_DAYS * DAY_MS);
}

export function isCareOverdue(plant: Pick<Plant, 'last_watered'>): boolean {
  const next = getNextWateringDate(plant);
  return next !== null && next.getTime() < Date.now();
}

export function careUrgencyRank(plant: Pick<Plant, 'last_watered'>): number {
  return getNextWateringDate(plant)?.getTime() ?? Infinity;
}

export function formatRelativeDate(dateString: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / DAY_MS);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
