import type { PerenualSpeciesDetails } from '../types';

// Perenual's free-tier `species/details` endpoint returns structured flags
// and short arrays (watering enum, sunlight array, propagation methods,
// pest list, etc.) — it does NOT return prose tips or step-by-step guides.
// Everything in this file turns those structured facts into the narrative
// copy CareInfoCard displays; the tips/instructions/steps are GardenMate's
// own general horticultural guidance layered on top of Perenual's data,
// not text sourced verbatim from the API.

export const PROPAGATION_METHOD_ORDER = ['Seed', 'Cutting', 'Division', 'Layering'] as const;
export type PropagationMethod = (typeof PROPAGATION_METHOD_ORDER)[number];

export interface CareInfo {
  watering: {
    frequency: string;
    soilMoisture: string;
    method: string;
    overwateringSigns: string;
    underwateringSigns: string;
  };
  feeding: {
    fertiliserType: string;
    frequency: string;
    winterNote: string;
  };
  pruning: {
    bestTime: string;
    method: string;
    instructions: string;
  };
  propagation: {
    methods: PropagationMethod[];
    bestSeason: string;
    primaryMethod: PropagationMethod | null;
    steps: string[];
  };
  harvesting: {
    daysToHarvest: string;
    visualCues: string;
    howTo: string;
    storageTips: string;
    successionNote: string;
  } | null;
  bestPractices: {
    sunLevel: number;
    sunlightLabel: string;
    temperatureRange: string;
    humidity: string;
    petSafe: boolean | null;
    humanSafe: boolean | null;
    pests: string[];
    diseases: string[];
  };
}

const OVERWATERING_SIGNS =
  'Yellowing leaves, soft or mushy stems, and a musty smell from the soil.';
const UNDERWATERING_SIGNS =
  'Dry, crispy leaf edges, drooping foliage, and soil pulling away from the pot.';
const WINTER_NOTE = 'Reduce or pause feeding in winter while growth slows.';
const PRUNING_INSTRUCTIONS =
  'Use clean, sharp tools and cut just above a leaf node or bud to encourage bushy new growth.';

const HARDINESS_ZONE_MIN_TEMP_F: Record<string, number> = {
  '1': -60,
  '2': -50,
  '3': -40,
  '4': -30,
  '5': -20,
  '6': -10,
  '7': 0,
  '8': 10,
  '9': 20,
  '10': 30,
  '11': 40,
  '12': 50,
  '13': 60,
};

const PROPAGATION_STEPS: Record<PropagationMethod, string[]> = {
  Cutting: [
    'Select a healthy stem with a few leaves.',
    'Cut just below a leaf node using a clean, sharp blade.',
    'Remove the lower leaves and let the cut callous for a few hours.',
    'Place in water or moist potting mix until roots form.',
    'Pot on once roots are a couple of inches long.',
  ],
  Seed: [
    'Sow seeds in a tray of moist, well-draining seed compost.',
    'Cover lightly and keep consistently moist.',
    'Keep somewhere warm and bright but out of direct sun.',
    'Thin or pot on seedlings once they have their first true leaves.',
  ],
  Division: [
    'Water the plant well the day before dividing.',
    'Lift the plant and gently tease the roots apart into sections.',
    'Make sure each section has healthy roots and growth points.',
    'Replant divisions promptly and water in well.',
  ],
  Layering: [
    'Choose a low, flexible stem still attached to the parent plant.',
    'Lightly wound the underside where it will touch the soil.',
    'Pin the stem down and cover the wounded section with soil.',
    'Once roots form, sever from the parent plant and pot on.',
  ],
};

function wateringFrequencyText(details: PerenualSpeciesDetails): string {
  const benchmark = details.watering_general_benchmark;
  if (benchmark?.value) {
    return `Every ${benchmark.value} ${benchmark.unit || 'days'}`;
  }
  switch (details.watering) {
    case 'Frequent':
      return 'Every 2–3 days';
    case 'Average':
      return 'Every 5–7 days';
    case 'Minimum':
      return 'Every 2–3 weeks';
    case 'None':
      return 'Rarely needs watering';
    default:
      return 'Varies — check soil moisture';
  }
}

function soilMoistureText(watering: string | null): string {
  switch (watering) {
    case 'Frequent':
      return 'Keep soil consistently moist';
    case 'Average':
      return 'Let the top inch of soil dry out between waterings';
    case 'Minimum':
      return 'Allow soil to dry out significantly between waterings';
    case 'None':
      return 'Prefers very dry soil';
    default:
      return 'Water when the topsoil feels dry';
  }
}

function wateringMethodText(details: PerenualSpeciesDetails): string {
  if (details.tropical) return 'Top water, with occasional misting for humidity';
  if (details.indoor) return 'Top water, avoiding wetting the foliage';
  return 'Top water at the base';
}

function fertiliserTypeText(details: PerenualSpeciesDetails): string {
  return details.indoor
    ? 'Balanced liquid houseplant fertiliser'
    : 'Balanced general-purpose fertiliser';
}

function feedFrequencyText(details: PerenualSpeciesDetails): string {
  return details.growth_rate === 'High'
    ? 'Every 2–4 weeks during the growing season'
    : 'Monthly during the growing season';
}

function pruningBestTimeText(details: PerenualSpeciesDetails): string {
  if (details.pruning_month?.length) return details.pruning_month.join(', ');
  return 'Late winter to early spring, before new growth begins';
}

function pruningMethodText(details: PerenualSpeciesDetails): string {
  if (details.flowers) return 'Deadheading spent blooms, with occasional pinching';
  if (details.growth_rate === 'High') return 'Hard prune to control size';
  return 'Pinching back new growth';
}

function propagationMethods(details: PerenualSpeciesDetails): PropagationMethod[] {
  const raw = details.propagation ?? [];
  return PROPAGATION_METHOD_ORDER.filter((method) =>
    raw.some((entry) => entry.toLowerCase() === method.toLowerCase()),
  );
}

function sunLevel(sunlight: string[]): number {
  const text = sunlight.join(' ').toLowerCase();
  if (text.includes('full shade')) return 1;
  if (text.includes('filtered') || text.includes('dappled')) return 2;
  if (text.includes('part sun') || text.includes('part shade')) return 3;
  if (text.includes('full sun')) return 5;
  if (text.includes('sun')) return 4;
  return 3;
}

function temperatureRangeText(hardiness: PerenualSpeciesDetails['hardiness']): string {
  if (!hardiness) return 'Average room temperature (65–75°F)';
  const min = HARDINESS_ZONE_MIN_TEMP_F[hardiness.min];
  if (min === undefined) return 'Average room temperature (65–75°F)';
  const zoneRange =
    hardiness.max && hardiness.max !== hardiness.min
      ? `${hardiness.min}–${hardiness.max}`
      : hardiness.min;
  return `Above ${min}°F (hardiness zone ${zoneRange})`;
}

function humidityText(details: PerenualSpeciesDetails): string {
  if (details.tropical) return 'High humidity (50%+)';
  if (details.indoor) return 'Average household humidity';
  return 'Typical outdoor humidity for your climate';
}

function poisonFlagToSafe(flag: number | null): boolean | null {
  if (flag === null || flag === undefined) return null;
  return flag === 0;
}

export function isEdible(details: PerenualSpeciesDetails): boolean {
  return Boolean(details.edible_fruit || details.edible_leaf || details.cuisine);
}

export function deriveCareInfo(details: PerenualSpeciesDetails): CareInfo {
  const methods = propagationMethods(details);
  const primaryMethod = methods[0] ?? null;

  return {
    watering: {
      frequency: wateringFrequencyText(details),
      soilMoisture: soilMoistureText(details.watering),
      method: wateringMethodText(details),
      overwateringSigns: OVERWATERING_SIGNS,
      underwateringSigns: UNDERWATERING_SIGNS,
    },
    feeding: {
      fertiliserType: fertiliserTypeText(details),
      frequency: feedFrequencyText(details),
      winterNote: WINTER_NOTE,
    },
    pruning: {
      bestTime: pruningBestTimeText(details),
      method: pruningMethodText(details),
      instructions: PRUNING_INSTRUCTIONS,
    },
    propagation: {
      methods,
      bestSeason: 'Spring to early summer',
      primaryMethod,
      steps: primaryMethod ? PROPAGATION_STEPS[primaryMethod] : [],
    },
    harvesting: isEdible(details)
      ? {
          daysToHarvest: details.harvest_season
            ? `Harvest in ${details.harvest_season}`
            : 'Varies by growing conditions',
          visualCues: details.edible_fruit
            ? 'Fruit reaches full colour and yields slightly to gentle pressure.'
            : 'Leaves are full-sized and vibrant green before flowering.',
          howTo: details.edible_fruit
            ? 'Gently twist or snip ripe fruit from the plant, taking care not to damage the stem.'
            : 'Snip outer leaves with clean scissors, leaving the growing point intact.',
          storageTips: 'Store in a cool, dry place and use fresh for the best flavour.',
          successionNote: 'Sow small batches every few weeks for a continuous harvest.',
        }
      : null,
    bestPractices: {
      sunLevel: sunLevel(details.sunlight ?? []),
      sunlightLabel: details.sunlight?.length ? details.sunlight.join(', ') : 'Not specified',
      temperatureRange: temperatureRangeText(details.hardiness),
      humidity: humidityText(details),
      petSafe: poisonFlagToSafe(details.poisonous_to_pets),
      humanSafe: poisonFlagToSafe(details.poisonous_to_humans),
      pests: details.pest_susceptibility ?? [],
      diseases: [],
    },
  };
}
