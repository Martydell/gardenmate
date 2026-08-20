import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { usePlants } from '../../hooks/usePlants';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import AddPlantModal from '../plants/AddPlantModal';
import type { Plant } from '../../types';

interface PlantPinPopupProps {
  open: boolean;
  onClose: () => void;
  onSelectPlant: (plant: Plant) => void;
}

function PlantPinPopup({ open, onClose, onSelectPlant }: PlantPinPopupProps) {
  const { plants, addPlant } = usePlants();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);

  if (!open) return null;

  const query = debouncedSearch.trim().toLowerCase();
  const matches = query
    ? plants.filter((plant) =>
        [plant.nickname, plant.common_name].some((value) => value?.toLowerCase().includes(query)),
      )
    : plants;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
        onClick={onClose}
      >
        <div
          className="max-h-[70svh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl dark:bg-neutral-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pin a plant</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mb-3">
            <label htmlFor="pin-plant-search" className="sr-only">
              Search your plants
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              id="pin-plant-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your plants…"
              className="w-full rounded-xl border border-neutral-300 py-2.5 pl-9 pr-3 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddPlantOpen(true)}
            className="mb-3 w-full rounded-xl border border-dashed border-green-600 py-2.5 text-sm font-medium text-green-700 dark:text-green-400"
          >
            + Add New Plant
          </button>

          <div className="space-y-2">
            {matches.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">No plants match.</p>
            ) : (
              matches.map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => onSelectPlant(plant)}
                  className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-2.5 text-left hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-green-100 dark:bg-green-950">
                    {plant.cover_photo_url ? (
                      <img
                        src={plant.cover_photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg">
                        🌿
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {plant.nickname || plant.common_name}
                    </p>
                    {plant.scientific_name && (
                      <p className="truncate text-xs italic text-neutral-500">
                        {plant.scientific_name}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <AddPlantModal
        open={isAddPlantOpen}
        onClose={() => setIsAddPlantOpen(false)}
        onAdd={async (input) => {
          const created = await addPlant(input);
          if (created) {
            setIsAddPlantOpen(false);
            onSelectPlant(created);
          }
          return created;
        }}
      />
    </>
  );
}

export default PlantPinPopup;
