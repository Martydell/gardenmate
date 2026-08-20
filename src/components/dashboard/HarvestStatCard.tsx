import { getSeasonHarvestStat } from '../../lib/harvest';
import type { HarvestLogEntry } from '../../types';

interface HarvestStatCardProps {
  entries: HarvestLogEntry[];
}

function HarvestStatCard({ entries }: HarvestStatCardProps) {
  if (entries.length === 0) return null;

  const year = new Date().getFullYear();
  const { totalWeightKg, totalItems, totalBunches } = getSeasonHarvestStat(entries, year);

  if (totalWeightKg === 0 && totalItems === 0 && totalBunches === 0) return null;

  const extras = [
    totalItems > 0 ? `${totalItems} items` : null,
    totalBunches > 0 ? `${totalBunches} bunches` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-300">🧺 This season's harvest</p>
      {totalWeightKg > 0 ? (
        <p className="mt-1 text-2xl font-semibold text-amber-900 dark:text-amber-300">
          {totalWeightKg.toFixed(1)} kg
        </p>
      ) : (
        <p className="mt-1 text-2xl font-semibold text-amber-900 dark:text-amber-300">
          {extras.join(' + ')}
        </p>
      )}
      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
        {totalWeightKg > 0 && extras.length > 0 ? `Plus ${extras.join(' and ')} · ` : ''}
        {year} so far
      </p>
    </div>
  );
}

export default HarvestStatCard;
