import type { MilestoneType } from '../types';

export const MILESTONE_TYPE_META: Record<MilestoneType, { label: string; emoji: string }> = {
  first_sprout: { label: 'First Sprout', emoji: '🌱' },
  first_true_leaves: { label: 'First True Leaves', emoji: '🍃' },
  first_flower: { label: 'First Flower', emoji: '🌸' },
  first_harvest: { label: 'First Harvest', emoji: '🌾' },
  date_repotted: { label: 'Repotted', emoji: '🪴' },
};

export const MILESTONE_TYPE_OPTIONS: { value: MilestoneType; label: string; emoji: string }[] = (
  Object.keys(MILESTONE_TYPE_META) as MilestoneType[]
).map((value) => ({ value, ...MILESTONE_TYPE_META[value] }));

export const DATE_ACQUIRED_EMOJI = '📅';
