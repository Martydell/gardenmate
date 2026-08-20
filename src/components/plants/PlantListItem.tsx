import { Link } from 'react-router-dom';
import type { Plant } from '../../types';
import { CATEGORY_META } from '../../lib/plantMeta';
import { formatRelativeDate, isCareOverdue } from '../../lib/careSchedule';

function PlantListItem({ plant }: { plant: Plant }) {
  const displayName = plant.nickname || plant.common_name;
  const category = CATEGORY_META[plant.category];
  const overdue = isCareOverdue(plant);

  return (
    <Link
      to={`/plant/${plant.id}`}
      className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-3 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-green-100 dark:bg-green-950">
        {plant.cover_photo_url ? (
          <img
            src={plant.cover_photo_url}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🌿</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${category.className}`}
        >
          {category.label}
        </span>
        <p className="truncate font-medium">{displayName}</p>
        {plant.scientific_name && (
          <p className="truncate text-xs italic text-neutral-500">{plant.scientific_name}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          {plant.last_watered && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Watered {formatRelativeDate(plant.last_watered)}
            </span>
          )}
          {overdue && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              Needs water
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default PlantListItem;
