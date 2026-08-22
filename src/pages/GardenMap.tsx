import { useState } from 'react';
import { Pencil, Plus, ScanSearch, Trash2 } from 'lucide-react';
import { useSpaces } from '../hooks/useSpaces';
import type { NewSpaceInput } from '../hooks/useSpaces';
import { useSpacePhotoAngles } from '../hooks/useSpacePhotoAngles';
import { usePlants } from '../hooks/usePlants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { SPACE_TYPE_META, plantCategoryForSpaceType } from '../lib/spaceMeta';
import PageHeaderBand from '../components/layout/PageHeaderBand';
import AddSpaceModal from '../components/mapping/AddSpaceModal';
import GardenCanvas from '../components/mapping/GardenCanvas';
import PhotoAnglesTab from '../components/mapping/PhotoAnglesTab';
import MultiPlantIdentifyModal from '../components/mapping/MultiPlantIdentifyModal';
import type { PhotoSource } from '../components/mapping/MultiPlantIdentifyModal';
import type { GardenSpace } from '../types';

type ViewMode = 'canvas' | 'photo_angles';

function backgroundPhotoUrlFor(space: GardenSpace): string | null {
  const background = (space.canvas_json as { background?: { type?: string; url?: string } } | null)
    ?.background;
  return background?.type === 'photo' && typeof background.url === 'string' ? background.url : null;
}

function GardenMap() {
  useDocumentTitle('Garden Map — GardenMate');
  const { spaces, isLoading, error, addSpace, updateSpace, deleteSpace } = useSpaces();
  const { addPlant } = usePlants();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isIdentifyOpen, setIsIdentifyOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');

  const selectedSpace = spaces.find((space) => space.id === selectedId) ?? spaces[0];
  const { angles } = useSpacePhotoAngles(selectedSpace?.id ?? '');

  async function handleAdd(input: NewSpaceInput) {
    const created = await addSpace(input);
    if (created) setSelectedId(created.id);
    return created;
  }

  async function handleDelete() {
    if (!selectedSpace) return;
    setIsDeleting(true);
    const success = await deleteSpace(selectedSpace.id);
    setIsDeleting(false);
    if (success) {
      setIsDeleteConfirmOpen(false);
      setSelectedId(null);
    }
  }

  const backgroundPhotoUrl = selectedSpace ? backgroundPhotoUrlFor(selectedSpace) : null;

  const identifySources: PhotoSource[] = [
    ...(backgroundPhotoUrl ? [{ type: 'url' as const, url: backgroundPhotoUrl }] : []),
    ...angles.map((angle) => ({ type: 'url' as const, url: angle.photo_url })),
  ];

  return (
    <div className="pb-6">
      <PageHeaderBand>
        <h1 className="text-2xl font-semibold">Garden Map</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Lay out your spaces and pin your plants where they live.
        </p>
      </PageHeaderBand>

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
            <div className="mb-2 flex items-center justify-between gap-2 px-4">
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

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  aria-label="Edit space"
                  className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  aria-label="Delete space"
                  className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {identifySources.length > 0 && (
              <div className="px-4 pb-3">
                <button
                  type="button"
                  onClick={() => setIsIdentifyOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-600 py-2.5 text-sm font-medium text-brand-700 dark:text-brand-400"
                >
                  <ScanSearch className="h-4 w-4" aria-hidden="true" />
                  Identify plants in all photos ({identifySources.length})
                </button>
              </div>
            )}

            {viewMode === 'canvas' ? (
              <GardenCanvas key={selectedSpace.id} space={selectedSpace} />
            ) : (
              <PhotoAnglesTab key={selectedSpace.id} space={selectedSpace} />
            )}
          </>
        )
      )}

      <AddSpaceModal open={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAdd} />

      {selectedSpace && (
        <AddSpaceModal
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onAdd={handleAdd}
          space={selectedSpace}
          onUpdate={updateSpace}
        />
      )}

      {selectedSpace && (
        <MultiPlantIdentifyModal
          open={isIdentifyOpen}
          onClose={() => setIsIdentifyOpen(false)}
          sources={identifySources}
          onAdd={addPlant}
          defaultCategory={plantCategoryForSpaceType(selectedSpace.type)}
        />
      )}

      {isDeleteConfirmOpen && selectedSpace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Delete "{selectedSpace.name}"?</h2>
            <p className="mt-2 text-sm text-neutral-500">
              This permanently deletes this space, its background photo, and all photo angles. Plants
              you've placed here won't be deleted, but will lose their pin placement. This can't be
              undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-neutral-300 py-2.5 font-medium disabled:opacity-60 dark:border-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 font-medium text-white disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GardenMap;
