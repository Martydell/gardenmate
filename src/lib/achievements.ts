import type { AchievementId, CareLog, Plant } from '../types';

export interface AchievementMeta {
  id: AchievementId;
  emoji: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementMeta[] = [
  { id: 'first_steps', emoji: '🌱', name: 'First Steps', description: 'Add your first plant' },
  { id: 'week_streak', emoji: '📅', name: 'Week Streak', description: 'Complete care tasks 7 days in a row' },
  { id: 'plant_detective', emoji: '🔍', name: 'Plant Detective', description: 'Identify your first plant' },
  { id: 'growing_collection', emoji: '🌿', name: 'Growing Collection', description: 'Add 10 plants to your catalogue' },
  { id: 'photographer', emoji: '📷', name: 'Photographer', description: 'Add your first progress photo' },
  { id: 'garden_mapper', emoji: '🗺️', name: 'Garden Mapper', description: 'Create your first garden space map' },
  { id: 'dedicated_gardener', emoji: '🌻', name: 'Dedicated Gardener', description: 'Complete care tasks 30 days in a row' },
  { id: 'hydration_hero', emoji: '💧', name: 'Hydration Hero', description: 'Water 50 plants total' },
  { id: 'harvest_time', emoji: '🌾', name: 'Harvest Time', description: 'Log your first harvest' },
  { id: 'propagator', emoji: '🧪', name: 'Propagator', description: 'Log a propagation action' },
];

function localDateString(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Parses as local midnight (not `new Date(dateString)`, which parses
// YYYY-MM-DD as UTC and can shift a day depending on the viewer's timezone).
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const msPerDay = 86400000;
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / msPerDay);
}

// Longest-ever run of consecutive calendar days with at least one care_log
// entry — an achievement, once earned, should stay earned even if today's
// streak has since broken, so this scans all history rather than just the
// current run.
function longestConsecutiveDayStreak(logs: CareLog[]): number {
  const uniqueDays = Array.from(new Set(logs.map((log) => localDateString(log.logged_at)))).sort();
  let longest = 0;
  let current = 0;
  for (let i = 0; i < uniqueDays.length; i++) {
    current = i > 0 && daysBetween(uniqueDays[i - 1], uniqueDays[i]) === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export interface AchievementCheckInput {
  plants: Plant[];
  careLogs: CareLog[];
  progressPhotoCount: number;
  gardenSpaceCount: number;
}

// 'plant_detective' is deliberately never returned — Identify.tsx is still a
// placeholder with no real identification-logging feature or table wired up
// (IdentificationLog exists as a type only), so this badge has no real data
// to check against yet and stays locked until that feature ships.
export function evaluateEarnedAchievements(input: AchievementCheckInput): AchievementId[] {
  const { plants, careLogs, progressPhotoCount, gardenSpaceCount } = input;
  const longestStreak = longestConsecutiveDayStreak(careLogs);
  const earned: AchievementId[] = [];

  if (plants.length >= 1) earned.push('first_steps');
  if (longestStreak >= 7) earned.push('week_streak');
  if (plants.length >= 10) earned.push('growing_collection');
  if (progressPhotoCount >= 1) earned.push('photographer');
  if (gardenSpaceCount >= 1) earned.push('garden_mapper');
  if (longestStreak >= 30) earned.push('dedicated_gardener');
  if (careLogs.filter((log) => log.action_type === 'watered').length >= 50) earned.push('hydration_hero');
  if (careLogs.some((log) => log.action_type === 'harvested')) earned.push('harvest_time');
  if (plants.some((plant) => plant.source === 'propagated')) earned.push('propagator');

  return earned;
}
