import type { GardenType } from '../types';

export interface GardenTypeOption {
  value: GardenType;
  label: string;
  emoji: string;
}

export const GARDEN_TYPE_OPTIONS: GardenTypeOption[] = [
  { value: 'indoor', label: 'Indoor', emoji: '🏠' },
  { value: 'outdoor', label: 'Outdoor', emoji: '🌿' },
  { value: 'hydroponics', label: 'Hydroponics', emoji: '💧' },
  { value: 'greenhouse', label: 'Greenhouse', emoji: '🏗️' },
  { value: 'balcony', label: 'Balcony', emoji: '🪴' },
];
