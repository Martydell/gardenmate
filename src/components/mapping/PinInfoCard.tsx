import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

interface PinInfoCardProps {
  plantId: string;
  plantName: string;
  onClose: () => void;
}

function PinInfoCard({ plantId, plantName, onClose }: PinInfoCardProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <p className="font-medium">{plantName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Link
          to={`/plant/${plantId}`}
          className="mt-3 block rounded-xl bg-green-600 py-2 text-center text-sm font-medium text-white"
        >
          View Plant
        </Link>
      </div>
    </div>
  );
}

export default PinInfoCard;
