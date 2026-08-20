import type { HarvestLogEntry, HarvestUnit } from '../types';

export const HARVEST_UNIT_META: Record<HarvestUnit, { label: string; pluralLabel: string }> = {
  g: { label: 'g', pluralLabel: 'g' },
  kg: { label: 'kg', pluralLabel: 'kg' },
  items: { label: 'item', pluralLabel: 'items' },
  bunches: { label: 'bunch', pluralLabel: 'bunches' },
};

export const HARVEST_UNIT_OPTIONS: HarvestUnit[] = ['g', 'kg', 'items', 'bunches'];

export function totalsByUnit(entries: HarvestLogEntry[]): Partial<Record<HarvestUnit, number>> {
  const totals: Partial<Record<HarvestUnit, number>> = {};
  for (const entry of entries) {
    totals[entry.unit] = (totals[entry.unit] ?? 0) + entry.quantity;
  }
  return totals;
}

function formatQuantity(quantity: number): string {
  return quantity % 1 === 0 ? String(quantity) : quantity.toFixed(1);
}

export function formatTotalsByUnit(entries: HarvestLogEntry[]): string {
  const totals = totalsByUnit(entries);
  const parts = HARVEST_UNIT_OPTIONS.filter((unit) => totals[unit]).map((unit) => {
    const quantity = totals[unit]!;
    const meta = HARVEST_UNIT_META[unit];
    return `${formatQuantity(quantity)} ${quantity === 1 ? meta.label : meta.pluralLabel}`;
  });
  return parts.length > 0 ? parts.join(' · ') : 'No harvests yet';
}

// Only g/kg entries represent a weight — items/bunches (courgettes, herb
// bunches, etc.) have no meaningful conversion to weight, so the Dashboard's
// "This season's harvest" stat reports them as a separate count alongside
// the combined kg figure rather than trying to fold everything into one number.
export function getSeasonHarvestStat(
  entries: HarvestLogEntry[],
  year: number = new Date().getFullYear(),
): { totalWeightKg: number; totalItems: number; totalBunches: number } {
  const thisYear = entries.filter((entry) => new Date(entry.harvested_at).getFullYear() === year);
  let totalWeightKg = 0;
  let totalItems = 0;
  let totalBunches = 0;

  for (const entry of thisYear) {
    if (entry.unit === 'kg') totalWeightKg += entry.quantity;
    else if (entry.unit === 'g') totalWeightKg += entry.quantity / 1000;
    else if (entry.unit === 'items') totalItems += entry.quantity;
    else if (entry.unit === 'bunches') totalBunches += entry.quantity;
  }

  return { totalWeightKg, totalItems, totalBunches };
}
