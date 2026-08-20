import type { CareActionType, PlantCategory, PlantStatus, PlantSource } from '../types';

export const CATEGORY_META: Record<PlantCategory, { label: string; className: string }> = {
  indoor: {
    label: 'Indoor',
    className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  },
  outdoor: {
    label: 'Outdoor',
    className: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
  },
  hydroponics: {
    label: 'Hydroponics',
    className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
  },
  greenhouse: {
    label: 'Greenhouse',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  balcony: {
    label: 'Balcony',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  },
};

export const PLANT_CATEGORY_OPTIONS: { value: PlantCategory; label: string }[] = (
  Object.keys(CATEGORY_META) as PlantCategory[]
).map((value) => ({ value, label: CATEGORY_META[value].label }));

export const STATUS_META: Record<PlantStatus, { label: string; className: string }> = {
  seedling: {
    label: 'Seedling',
    className: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
  },
  growing: {
    label: 'Growing',
    className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  },
  mature: {
    label: 'Mature',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  dormant: {
    label: 'Dormant',
    className: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  },
};

export const PLANT_STATUS_OPTIONS: { value: PlantStatus; label: string }[] = (
  Object.keys(STATUS_META) as PlantStatus[]
).map((value) => ({ value, label: STATUS_META[value].label }));

export const CARE_ACTION_META: Record<CareActionType, { label: string; emoji: string }> = {
  watered: { label: 'Watered', emoji: '💧' },
  fed: { label: 'Fed', emoji: '🌿' },
  pruned: { label: 'Pruned', emoji: '✂️' },
  harvested: { label: 'Harvested', emoji: '🌾' },
  sown: { label: 'Sown', emoji: '🌱' },
};

export const PLANT_SOURCE_OPTIONS: { value: PlantSource; label: string }[] = [
  { value: 'seed', label: 'Seed' },
  { value: 'seedling', label: 'Seedling' },
  { value: 'shop_bought', label: 'Shop bought' },
  { value: 'propagated', label: 'Propagated' },
  { value: 'gifted', label: 'Gifted' },
];

export const COMMON_PLANT_NAME_SUGGESTIONS = [
  'Monstera Deliciosa',
  'Snake Plant',
  'Fiddle Leaf Fig',
  'Pothos',
  'ZZ Plant',
  'Peace Lily',
  'Spider Plant',
  'Rubber Plant',
  'Aloe Vera',
  'Succulent',
  'Basil',
  'Tomato',
  'Rosemary',
  'Mint',
  'Lavender',
  'Orchid',
];
