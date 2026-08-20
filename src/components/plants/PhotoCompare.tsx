import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { GripVertical } from 'lucide-react';
import { formatDate } from '../../lib/careSchedule';

interface ComparablePhoto {
  url: string;
  date: string;
}

interface PhotoCompareProps {
  photoA: ComparablePhoto;
  photoB: ComparablePhoto;
}

function PhotoCompare({ photoA, photoB }: PhotoCompareProps) {
  const [older, newer] = useMemo(() => {
    return new Date(photoA.date).getTime() <= new Date(photoB.date).getTime()
      ? [photoA, photoB]
      : [photoB, photoA];
  }, [photoA, photoB]);

  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dividerPercent, setDividerPercent] = useState(50);

  function updateFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;
    setDividerPercent(Math.min(100, Math.max(0, percent)));
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img
        src={older.url}
        alt="Older"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 overflow-hidden" style={{ width: `${dividerPercent}%` }}>
        <img
          src={newer.url}
          alt="Newer"
          draggable={false}
          className="absolute inset-0 h-full object-cover"
          style={{ width: dividerPercent > 0 ? `${(100 / dividerPercent) * 100}%` : '100%' }}
        />
      </div>

      <div
        className="absolute inset-y-0 z-10 flex w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center"
        style={{ left: `${dividerPercent}%` }}
        onPointerDown={handlePointerDown}
      >
        <div className="h-full w-0.5 bg-white" />
        <div className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
          <GripVertical className="h-4 w-4 text-neutral-600" />
        </div>
      </div>

      <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
        {formatDate(older.date)}
      </span>
      <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
        {formatDate(newer.date)}
      </span>
    </div>
  );
}

export default PhotoCompare;
