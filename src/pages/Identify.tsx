import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronRight, Upload } from 'lucide-react';
import { formatDate } from '../lib/careSchedule';
import { useIdentificationLog } from '../hooks/useIdentificationLog';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useUserStore } from '../stores/userStore';
import { uploadIdentifyPhoto } from '../lib/supabase';
import { identifyPlant } from '../lib/plantId';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import PageHeaderBand from '../components/layout/PageHeaderBand';

function Identify() {
  useDocumentTitle('Identify — GardenMate');
  const userId = useUserStore((state) => state.user?.id);
  const { logs, isLoading, addIdentification } = useIdentificationLog();
  const [isIdentifying, setIsIdentifying] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  async function handleCapture(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;

    setIsIdentifying(true);
    try {
      const photoUrl = await uploadIdentifyPhoto(userId, file);
      if (!photoUrl) return;

      const result = await identifyPlant(file);
      if (!result) {
        notifyError("Couldn't identify that plant — try a clearer, closer photo.");
        return;
      }

      const saved = await addIdentification(photoUrl, result.name, result.probability);
      if (saved) {
        notifySuccess(`Identified as ${result.name}! 🌿`);
      }
    } catch {
      notifyError();
    } finally {
      setIsIdentifying(false);
    }
  }

  return (
    <div className="pb-6">
      <PageHeaderBand>
        <h1 className="text-2xl font-semibold">Identify</h1>
        <p className="mt-2 text-neutral-500">Snap a photo to identify a plant.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isIdentifying}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-medium text-white disabled:opacity-60"
          >
            <Camera className="h-5 w-5" aria-hidden="true" />
            {isIdentifying ? 'Identifying…' : 'Take a Photo'}
          </button>
          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            disabled={isIdentifying}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-600 py-3 font-medium text-brand-700 disabled:opacity-60 dark:text-brand-400"
          >
            <Upload className="h-5 w-5" aria-hidden="true" />
            Upload a Photo
          </button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapture}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCapture}
        />
      </PageHeaderBand>

      <div className="px-4 pt-2">
        <h2 className="mb-2 font-semibold">ID Log</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-5xl">🔍</span>
            <p className="text-neutral-500">No identifications yet — point your camera at a plant! 🔍</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id}>
                <Link
                  to={`/identify/${log.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-3 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <img src={log.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{log.result_name}</p>
                    <p className="text-xs text-neutral-500">
                      {Math.round(log.confidence * 100)}% confident · {formatDate(log.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Identify;
