import type { GardenSpaceType, GroundCoverType, WaterNeedLevel } from '../types';

export const SPACE_TYPE_META: Record<
  GardenSpaceType,
  { label: string; outdoor: boolean; templateCategory: 'indoor' | 'outdoor' }
> = {
  indoor_room: { label: 'Indoor Room', outdoor: false, templateCategory: 'indoor' },
  outdoor_garden: { label: 'Outdoor Garden', outdoor: true, templateCategory: 'outdoor' },
  raised_bed: { label: 'Raised Bed', outdoor: true, templateCategory: 'outdoor' },
  allotment: { label: 'Allotment', outdoor: true, templateCategory: 'outdoor' },
  balcony: { label: 'Balcony', outdoor: true, templateCategory: 'outdoor' },
};

export const SPACE_TYPE_OPTIONS: { value: GardenSpaceType; label: string }[] = (
  Object.keys(SPACE_TYPE_META) as GardenSpaceType[]
).map((value) => ({ value, label: SPACE_TYPE_META[value].label }));

export function isOutdoorSpaceType(type: GardenSpaceType): boolean {
  return SPACE_TYPE_META[type].outdoor;
}

export const GROUND_COVER_META: Record<GroundCoverType, { label: string; color: string }> = {
  grass: { label: 'Grass', color: '#7cb342' },
  decking: { label: 'Decking', color: '#a1887f' },
  concrete: { label: 'Concrete', color: '#b0bec5' },
  bark: { label: 'Bark', color: '#8d6e63' },
  gravel: { label: 'Gravel', color: '#bdbdbd' },
  paving: { label: 'Paving', color: '#9e9e9e' },
};

export const GROUND_COVER_OPTIONS: { value: GroundCoverType; label: string; color: string }[] = (
  Object.keys(GROUND_COVER_META) as GroundCoverType[]
).map((value) => ({ value, ...GROUND_COVER_META[value] }));

export const WATER_NEED_META: Record<WaterNeedLevel, { label: string; color: string }> = {
  high: { label: 'High', color: '#0d47a1' },
  medium: { label: 'Medium', color: '#00897b' },
  low: { label: 'Low', color: '#fbc02d' },
};

export const WATER_NEED_OPTIONS: { value: WaterNeedLevel; label: string; color: string }[] = (
  Object.keys(WATER_NEED_META) as WaterNeedLevel[]
).map((value) => ({ value, ...WATER_NEED_META[value] }));
