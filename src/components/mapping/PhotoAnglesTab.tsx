import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, X } from 'lucide-react';
import { useSpacePhotoAngles } from '../../hooks/useSpacePhotoAngles';
import AddPhotoAngleModal from './AddPhotoAngleModal';
import PlantPinPopup from './PlantPinPopup';
import type { GardenSpace, Plant, SpacePhotoAngle, SpacePhotoAnglePin } from '../../types';

function angleDisplayLabel(angle: SpacePhotoAngle): string {
  return angle.label === 'Custom' ? angle.custom_label || 'Custom' : angle.label;
}

interface PhotoAnglesTabProps {
  space: GardenSpace;
}

function PhotoAnglesTab({ space }: PhotoAnglesTabProps) {
  const { angles, isLoading, addPhotoAngle, updatePins, deletePhotoAngle } = useSpacePhotoAngles(space.id);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<SpacePhotoAnglePin | null>(null);

  const activeAngle = angles.find((a) => a.id === activeAngleId) ?? null;

  function handleImageClick(e: ReactMouseEvent<HTMLImageElement>) {
    setSelectedPin(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPoint({ x, y });
  }

  function handleSelectPlant(plant: Plant) {
    if (!activeAngle || !pendingPoint) return;
    const pin: SpacePhotoAnglePin = {
      id: crypto.randomUUID(),
      x: pendingPoint.x,
      y: pendingPoint.y,
      plant_id: plant.id,
      plant_name: plant.nickname || plant.common_name,
    };
    updatePins(activeAngle.id, [...activeAngle.pins, pin]);
    setPendingPoint(null);
  }

  function handleRemovePin(pinId: string) {
    if (!activeAngle) return;
    updatePins(
      activeAngle.id,
      activeAngle.pins.filter((pin) => pin.id !== pinId),
    );
    setSelectedPin(null);
  }

  async function handleDeleteAngle() {
    if (!activeAngle) return;
    const deleted = await deletePhotoAngle(activeAngle.id);
    if (deleted) setActiveAngleId(null);
  }

  if (activeAngle) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-black">
        <div className="flex items-center justify-between p-3 text-white">
          <div>
            <p className="font-medium">{angleDisplayLabel(activeAngle)}</p>
            <p className="text-xs text-white/60">Tap the photo to pin a plant</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDeleteAngle}
              aria-label="Delete photo angle"
              className="rounded-full p-2 text-white/80 hover:bg-white/10"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveAngleId(null)}
              aria-label="Close"
              className="rounded-full p-2 text-white/80 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <img
            src={activeAngle.photo_url}
            alt={angleDisplayLabel(activeAngle)}
            onClick={handleImageClick}
            className="h-full w-full cursor-crosshair object-contain"
          />
          {activeAngle.pins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPendingPoint(null);
                setSelectedPin(pin);
              }}
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-green-600 text-sm shadow-lg"
            >
              🌿
            </button>
          ))}
        </div>

        {selectedPin && (
          <div className="flex items-center justify-between gap-3 bg-white p-4 dark:bg-neutral-900">
            <div className="min-w-0">
              <p className="truncate font-medium">{selectedPin.plant_name}</p>
              <Link to={`/plant/${selectedPin.plant_id}`} className="text-sm text-green-700 dark:text-green-400">
                View plant
              </Link>
            </div>
            <button
              type="button"
              onClick={() => handleRemovePin(selectedPin.id)}
              className="shrink-0 text-sm font-medium text-red-600"
            >
              Remove pin
            </button>
          </div>
        )}

        <PlantPinPopup
          open={Boolean(pendingPoint)}
          onClose={() => setPendingPoint(null)}
          onSelectPlant={handleSelectPlant}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 w-28 shrink-0 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {angles.map((angle) => (
            <button
              key={angle.id}
              type="button"
              onClick={() => setActiveAngleId(angle.id)}
              className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800"
            >
              <img src={angle.photo_url} alt={angleDisplayLabel(angle)} className="h-full w-full object-cover" />
              {angle.pins.length > 0 && (
                <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {angle.pins.length} 🌿
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[11px] font-medium text-white">
                {angleDisplayLabel(angle)}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-neutral-300 text-xs font-medium text-neutral-500 dark:border-neutral-700"
          >
            <Plus className="h-5 w-5" />
            Add Angle
          </button>
        </div>
      )}

      {!isLoading && angles.length === 0 && (
        <p className="py-4 text-center text-sm text-neutral-500">
          Photograph this space from a few directions, then pin your plants onto each view.
        </p>
      )}

      <AddPhotoAngleModal open={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={addPhotoAngle} />
    </div>
  );
}

export default PhotoAnglesTab;
