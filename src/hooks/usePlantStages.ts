import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { useUserStore } from '../stores/userStore';
import type { GrowthStage, PlantStageRecord } from '../types';

export function usePlantStages(plantId: string | undefined) {
  const userId = useUserStore((state) => state.user?.id);
  const [stages, setStages] = useState<PlantStageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plantId || !userId) return;

    let cancelled = false;

    supabase
      .from('plant_stages')
      .select('*')
      .eq('plant_id', plantId)
      .order('recorded_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setStages(data ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plantId, userId]);

  const advanceStage = useCallback(
    async (nextStage: GrowthStage, note?: string | null, photoUrl?: string | null) => {
      if (!plantId || !userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('plant_stages')
          .insert({
            plant_id: plantId,
            user_id: userId,
            stage: nextStage,
            note: note ?? null,
            photo_url: photoUrl ?? null,
          })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          notifyError(insertError.message);
          return null;
        }
        setStages((prev) => [...prev, data]);
        notifySuccess('Growth stage updated!');
        return data as PlantStageRecord;
      } catch {
        notifyError();
        return null;
      }
    },
    [plantId, userId],
  );

  return { stages, isLoading, error, advanceStage };
}
