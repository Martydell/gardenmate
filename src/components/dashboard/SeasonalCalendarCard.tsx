import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { getMonthGuide, findMatchingPlant } from '../../lib/seasonalCalendar';
import type { Plant } from '../../types';

interface ItemListProps {
  title: string;
  items: string[];
  plants: Plant[];
}

function ItemList({ title, items, plants }: ItemListProps) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => {
          const match = findMatchingPlant(item, plants);
          return (
            <li key={item} className="text-sm text-white/85">
              {match ? (
                <Link
                  to={`/plant/${match.id}`}
                  className="underline decoration-white/50 underline-offset-2 hover:decoration-white"
                >
                  {item}
                </Link>
              ) : (
                item
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface SeasonalCalendarCardProps {
  plants: Plant[];
}

function SeasonalCalendarCard({ plants }: SeasonalCalendarCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const guide = getMonthGuide();
  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' });

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 to-emerald-800 text-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <h2 className="font-semibold">This Month in Your Garden</h2>
          <p className="mt-1 text-sm text-white/90">{guide.headline}</p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="space-y-4 border-t border-white/20 px-4 pb-4 pt-3">
          <ItemList title={`${monthName} tasks`} items={guide.tasks} plants={plants} />
          <ItemList title="What to sow" items={guide.sow} plants={plants} />
          <ItemList title="What to harvest" items={guide.harvest} plants={plants} />
        </div>
      )}
    </div>
  );
}

export default SeasonalCalendarCard;
