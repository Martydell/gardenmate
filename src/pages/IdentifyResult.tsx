import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bookmark, Sprout } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlants } from '../hooks/usePlants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate } from '../lib/careSchedule';
import { searchPlantsResilient } from '../lib/perenual';
import CareInfoCard from '../components/plants/CareInfoCard';
import AddPlantModal from '../components/plants/AddPlantModal';
import type { IdentificationLog } from '../types';

type LoadStatus = 'loading' | 'success' | 'not-found';

function IdentifyResult() {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const { addPlant } = usePlants();

  const [log, setLog] = useState<IdentificationLog | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [saveMode, setSaveMode] = useState<'plants' | 'wishlist' | null>(null);
  // Plant.id's result name is often a common name, not the botanical one —
  // resolved separately via Perenual so the saved plant's scientific_name
  // is populated and its Care Info tab isn't stuck showing "not found".
  const [scientificName, setScientificName] = useState<string | null>(null);

  useDocumentTitle(log ? `${log.result_name} — GardenMate` : 'Identify — GardenMate');

  useEffect(() => {
    if (!logId) return;
    let cancelled = false;

    supabase
      .from('identification_log')
      .select('*')
      .eq('id', logId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setStatus('not-found');
          return;
        }
        setLog(data as IdentificationLog);
        setStatus('success');
      });

    return () => {
      cancelled = true;
    };
  }, [logId]);

  useEffect(() => {
    if (!log) return;
    let cancelled = false;

    searchPlantsResilient(log.result_name).then((results) => {
      if (cancelled) return;
      const match = results[0]?.scientific_name?.[0];
      if (match) setScientificName(match);
    });

    return () => {
      cancelled = true;
    };
  }, [log]);

  if (status === 'loading') {
    return (
      <div className="p-4">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  if (status === 'not-found' || !log) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium">Identification not found</p>
        <Link to="/identify" className="text-green-700 underline dark:text-green-400">
          Back to Identify
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="relative">
        <img src={log.photo_url} alt={log.result_name} className="aspect-square w-full object-cover" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="absolute left-4 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-4">
        <h1 className="text-2xl font-semibold">{log.result_name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {Math.round(log.confidence * 100)}% confident · Identified {formatDate(log.created_at)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSaveMode('plants')}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-medium text-white"
          >
            <Sprout className="h-4 w-4" aria-hidden="true" />
            Add to My Plants
          </button>
          <button
            type="button"
            onClick={() => setSaveMode('wishlist')}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-600 py-3 font-medium text-brand-700 dark:text-brand-400"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Save to Wishlist
          </button>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 font-semibold">Plant Info</h2>
          <CareInfoCard scientificName={scientificName ?? log.result_name} />
        </div>
      </div>

      <AddPlantModal
        open={saveMode !== null}
        onClose={() => setSaveMode(null)}
        onAdd={addPlant}
        initialValues={{
          commonName: log.result_name,
          scientificName: scientificName ?? undefined,
          coverPhotoUrl: log.photo_url,
        }}
        defaultIsWishlist={saveMode === 'wishlist'}
      />
    </div>
  );
}

export default IdentifyResult;
