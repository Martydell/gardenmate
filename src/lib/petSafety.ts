import type { PetSafety } from '../types';

export const PET_SAFETY_BADGE_META: Record<PetSafety, { emoji: string; label: string; colorClassName: string }> = {
  safe: { emoji: '🐾', label: 'Safe for pets', colorClassName: 'bg-green-600' },
  toxic: { emoji: '⚠️', label: 'Toxic to pets', colorClassName: 'bg-red-600' },
  unknown: { emoji: '🐾', label: 'Pet safety unknown', colorClassName: 'bg-neutral-400' },
};

export const PET_SAFETY_BANNER_META: Record<PetSafety, { text: string; className: string }> = {
  safe: {
    text: '✅ Pet Safe — not toxic to cats or dogs',
    className: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
  },
  toxic: {
    text: '⚠️ Toxic to Pets — keep away from cats and dogs',
    className: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  },
  unknown: {
    text: 'Unknown — check with your vet',
    className: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  },
};
