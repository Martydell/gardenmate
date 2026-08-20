import type { Plant } from '../types';

export interface MonthGuide {
  month: number;
  headline: string;
  tasks: string[];
  sow: string[];
  harvest: string[];
}

// UK / temperate-climate guidance, same scoping note as lib/seasonalTips.ts —
// there's no per-user hemisphere/location setting to branch this on.
export const SEASONAL_CALENDAR: Record<number, MonthGuide> = {
  1: {
    month: 1,
    headline: 'January: plan ahead and chit your early potatoes',
    tasks: [
      'Order seeds and plan your crop rotation',
      'Chit early seed potatoes on a bright windowsill',
      'Prune apple and pear trees while dormant',
      'Insulate outdoor taps and vulnerable pots',
      'Clean and sharpen your tools',
    ],
    sow: ['Broad beans (under cover)', 'Sweet peas', 'Onions (from seed)'],
    harvest: ['Leeks', 'Parsnips', 'Winter cabbage', 'Kale', 'Brussels sprouts'],
  },
  2: {
    month: 2,
    headline: 'February: start sowing under cover as the light returns',
    tasks: [
      'Continue chitting seed potatoes',
      'Prune winter-flowering shrubs once flowering finishes',
      'Prepare seed beds as weather allows',
      'Force rhubarb for an early crop',
      'Plan companion planting for spring',
    ],
    sow: ['Broad beans', 'Early peas', 'Lettuce (under cover)', 'Spinach', 'Onions and shallots'],
    harvest: ['Leeks', 'Purple sprouting broccoli', 'Kale', 'Forced rhubarb'],
  },
  3: {
    month: 3,
    headline: 'March: the growing season begins in earnest',
    tasks: [
      'Prepare vegetable beds with compost',
      'Start hardening off early sowings',
      'Give the lawn its first mow',
      'Protect blossom from late frosts',
      'Watch for slugs as they wake up',
    ],
    sow: ['Carrots', 'Beetroot', 'Radish', 'Peas'],
    harvest: ['Purple sprouting broccoli', 'Spring greens', 'Rhubarb', 'Leeks'],
  },
  4: {
    month: 4,
    headline: 'April: sow in earnest as frost risk eases',
    tasks: [
      'Sow hardy annuals directly outdoors',
      'Plant out early potatoes',
      'Stake tall perennials before they flop',
      'Feed spring bulbs once flowering finishes',
      'Keep an eye out for slug damage on seedlings',
    ],
    sow: ['Beetroot', 'Carrots', 'Salad leaves', 'Courgettes (under cover)', 'Sweetcorn (under cover)'],
    harvest: ['Spring greens', 'Rhubarb', 'Radishes', 'Asparagus'],
  },
  5: {
    month: 5,
    headline: 'May: last frosts pass — plant out tender crops',
    tasks: [
      'Harden off and plant out tender veg after the last frost',
      'Stake peas and beans as they climb',
      'Mulch beds to lock in moisture',
      'Watch for aphids on new growth',
      'Thin out crowded seedlings',
    ],
    sow: ['French beans', 'Runner beans', 'Courgettes', 'Sweetcorn', 'Squash'],
    harvest: ['Asparagus', 'Early salads', 'Radishes', 'Spinach'],
  },
  6: {
    month: 6,
    headline: 'June: keep on top of watering as things heat up',
    tasks: [
      'Water regularly during dry spells',
      'Tie in climbing beans and tomatoes',
      'Deadhead roses to encourage more blooms',
      'Mulch beds to reduce water loss',
      'Check for blackfly and whitefly',
    ],
    sow: ['Successional salads', 'Beetroot', 'Dwarf beans', 'Late peas'],
    harvest: ['Broad beans', 'Early potatoes', 'Strawberries', 'Courgettes', 'Peas'],
  },
  7: {
    month: 7,
    headline: 'July: harvest regularly and keep sowing for autumn',
    tasks: [
      'Water containers daily during hot weather',
      'Feed tomatoes weekly once fruiting',
      'Harvest often to keep crops producing',
      'Keep on top of weeding',
      'Support heavy fruit trusses',
    ],
    sow: ['Autumn and winter salads', 'Spring cabbage', 'Turnips', 'Beetroot'],
    harvest: ['Courgettes', 'French beans', 'Tomatoes (under cover)', 'Soft fruit', 'New potatoes'],
  },
  8: {
    month: 8,
    headline: 'August: time to harvest courgettes and sow autumn salads',
    tasks: [
      'Harvest courgettes and beans often to avoid a glut',
      'Water deeply during dry spells',
      'Collect seed from your favourite plants',
      'Trim hedges before birds start nesting again',
      'Watch for blight on tomatoes and potatoes',
    ],
    sow: ['Spring cabbage', 'Winter lettuce', 'Pak choi', 'Spring onions'],
    harvest: ['Courgettes', 'Tomatoes', 'Sweetcorn', 'Runner beans', 'Plums'],
  },
  9: {
    month: 9,
    headline: 'September: bring in the main crop and sow green manures',
    tasks: [
      'Lift and store maincrop potatoes',
      'Net brassicas against hungry pigeons',
      'Plant spring-flowering bulbs',
      'Clear spent summer crops',
      'Sow green manure on empty beds',
    ],
    sow: ['Winter salads', 'Spring cabbage', 'Garlic (late in the month)', 'Overwintering onions'],
    harvest: ['Apples', 'Pears', 'Maincrop potatoes', 'Squash', 'Sweetcorn'],
  },
  10: {
    month: 10,
    headline: 'October: plant garlic and put the garden to bed',
    tasks: [
      'Plant garlic and overwintering onion sets',
      'Lift and store root vegetables',
      'Rake fallen leaves to make leaf mould',
      'Protect tender plants before the first frost',
      'Clean and store canes and supports',
    ],
    sow: ['Broad beans (overwintering)', 'Green manure'],
    harvest: ['Pumpkins', 'Apples', 'Pears', 'Maincrop carrots', 'Leeks'],
  },
  11: {
    month: 11,
    headline: 'November: protect what remains and plan for spring',
    tasks: [
      'Insulate outdoor containers against frost',
      'Protect tender plants with horticultural fleece',
      'Tidy borders and cut back spent perennials',
      'Order seed catalogues for next year',
      'Clean and service tools before winter storage',
    ],
    sow: ['Broad beans (mild areas only)', 'Garlic if not planted in October'],
    harvest: ['Leeks', 'Parsnips', 'Swede', 'Winter cabbage', 'Brussels sprouts'],
  },
  12: {
    month: 12,
    headline: 'December: rest the garden and plan next year',
    tasks: [
      'Check stored produce and remove any rot',
      'Protect pots from frost and waterlogging',
      'Prune dormant fruit trees',
      'Plan next year’s crop rotation',
      'Order seeds ready for the new season',
    ],
    sow: ['Broad beans under cloches (mild spells only)'],
    harvest: ['Leeks', 'Parsnips', 'Brussels sprouts', 'Winter cabbage', 'Kale'],
  },
};

export function getMonthGuide(month: number = new Date().getMonth() + 1): MonthGuide {
  return SEASONAL_CALENDAR[month];
}

// Crude but effective substring match ("courgettes" <-> "Courgette"), good
// enough for linking calendar items to a user's own plant names without
// needing a full plant-species taxonomy.
export function findMatchingPlant(itemLabel: string, plants: Plant[]): Plant | undefined {
  const normalized = itemLabel
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .replace(/s$/, '');
  if (!normalized) return undefined;

  return plants.find((plant) => {
    const name = plant.common_name.toLowerCase();
    return name.includes(normalized) || normalized.includes(name);
  });
}
