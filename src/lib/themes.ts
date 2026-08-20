import type { Theme } from '../types';

export interface ThemeOption {
  name: Theme;
  colors: [string, string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  { name: 'Cottage Garden', colors: ['#9CAF88', '#F4C2C2', '#FFF8E7'] },
  { name: 'Urban Jungle', colors: ['#0B3D2E', '#D4AF37', '#2B2B2B'] },
  { name: 'Mediterranean', colors: ['#E2725B', '#6C8EBF', '#EDE0C8'] },
  { name: 'Minimalist Modern', colors: ['#708090', '#FFFFFF', '#A8E6CF'] },
  { name: 'Kitchen Garden', colors: ['#4B7F52', '#B7410E', '#5C4033'] },
  { name: 'Tropical', colors: ['#A6D608', '#FF7F50', '#158A8A'] },
];
