import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { useUserStore } from '../stores/userStore';
import type { HarvestLogEntry, HarvestUnit } from '../types';

export interface NewHarvestInput {
  plant_id: string;
  quantity: number;
  unit: HarvestUnit;
  photo_url: string | null;
  notes: string | null;
  harvested_at: string;
}

// Same "plantId optional" shape as useCareLog: pass a plantId to scope to one
// plant's Harvest History (PlantDetail), or omit it for the Dashboard's
// season-wide harvest stat — one hook, one query pattern, two call sites.
export function useHarvestLog(plantId?: string) {
  const userId = useUserStore((state) => state.user?.id);
  const [entries, setEntries] = useState<HarvestLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let query = supabase.from('harvest_log').select('*').eq('user_id', userId);
    if (plantId) {
      query = query.eq('plant_id', plantId);
    }

    query.order('harvested_at', { ascending: false }).then(({ data, error: fetchError }) => {
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEntries(data ?? []);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [plantId, userId]);

  const addHarvest = useCallback(
    async (input: NewHarvestInput) => {
      if (!userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('harvest_log')
          .insert({ ...input, user_id: userId })
          .select()
          .single();

        if (insertError) {
          notifyError(insertError.message);
          return null;
        }
        setEntries((prev) => [data as HarvestLogEntry, ...prev]);
        notifySuccess('Harvest logged!');
        return data as HarvestLogEntry;
      } catch {
        notifyError();
        return null;
      }
    },
    [userId],
  );

  return { entries, isLoading, error, addHarvest };
}
