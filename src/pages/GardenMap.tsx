import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSpaces } from '../hooks/useSpaces';
import type { NewSpaceInput } from '../hooks/useSpaces';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { SPACE_TYPE_META } from '../lib/spaceMeta';
import AddSpaceModal from '../components/mapping/AddSpaceModal';
import GardenCanvas from '../components/mapping/GardenCanvas';
import PhotoAnglesTab from '../components/mapping/PhotoAnglesTab';

type ViewMode = 'canvas' | 'photo_angles';

function GardenMap() {
  useDocumentTitle('Garden Map — GardenMate');
  const { spaces, isLoading, error, addSpace } = useSpaces();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');

  const selectedSpace = spaces.find((space) => space.id === selectedId) ?? spaces[0];

  async function handleAdd(input: NewSpaceInput) {
    const created = await addSpace(input);
    if (created) setSelectedId(created.id);
    return created;
  }

  return (
    <div className="pb-6">
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Garden Map</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Lay out your spaces and pin your plants where they live.
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-3">
        {spaces.map((space) => {
          const isSelected = selectedSpace?.id === space.id;
          return (
            <button
              key={space.id}
              type="button"
              onClick={() => setSelectedId(space.id)}
              className={`w-36 shrink-0 rounded-2xl border p-3 text-left ${
                isSelected
                  ? 'border-green-600 bg-green-50 dark:bg-green-950/30'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <p className="truncate font-medium">{space.name}</p>
              <p className="text-xs text-neutral-500">{SPACE_TYPE_META[space.type].label}</p>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-neutral-300 py-4 text-sm font-medium text-neutral-500 dark:border-neutral-700"
        >
          <Plus className="h-5 w-5" />
          Add Space
        </button>
      </div>

      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}

      {!isLoading && spaces.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-6xl">🗺️</span>
          <p className="text-neutral-500">No spaces yet 🗺️ — tap + to create your first garden space</p>
        </div>
      ) : (
        selectedSpace && (
          <>
            <div className="mb-2 flex px-4">
              <div className="flex rounded-xl border border-neutral-300 p-0.5 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setViewMode('canvas')}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                    viewMode === 'canvas'
                      ? 'bg-green-600 text-white'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  Canvas
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('photo_angles')}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                    viewMode === 'photo_angles'
                      ? 'bg-green-600 text-white'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  Photo Angles
                </button>
              </div>
            </div>
            {viewMode === 'canvas' ? (
              <GardenCanvas key={selectedSpace.id} space={selectedSpace} />
            ) : (
              <PhotoAnglesTab key={selectedSpace.id} space={selectedSpace} />
            )}
          </>
        )
      )}

      <AddSpaceModal open={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAdd} />
    </div>
  );
}

export default GardenMap;
