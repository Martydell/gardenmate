// Index 0 = January … 11 = December. Generic Northern Hemisphere guidance —
// there's no per-user hemisphere/location setting to branch on yet.
export const SEASONAL_TIPS: string[] = [
  'Check stored bulbs and tubers for rot, and start planning this year’s garden layout.',
  'Prune dormant fruit trees and roses before new growth begins.',
  'Start sowing hardy seeds indoors and prepare beds as the soil warms.',
  'Watch your last frost date before moving tender seedlings outside.',
  'Harden off indoor-started seedlings gradually before transplanting them out.',
  'Water deeply in the early morning to reduce evaporation as temperatures rise.',
  'Mulch beds to retain moisture and keep weeds down during peak heat.',
  'Deadhead flowering plants regularly to encourage a second flush of blooms.',
  'Start harvesting summer crops and sow quick-growing greens for autumn.',
  'Clear spent summer plants and work compost into beds before winter.',
  'Protect tender potted plants from the first frosts by moving them under cover.',
  'Reduce watering for dormant plants and check on any stored produce.',
];

export function getSeasonalTip(date: Date = new Date()): string {
  return SEASONAL_TIPS[date.getMonth()];
}
