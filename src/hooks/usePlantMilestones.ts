import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { useUserStore } from '../stores/userStore';
import type { MilestoneType, PlantMilestone } from '../types';

export function usePlantMilestones(plantId: string | undefined) {
  const userId = useUserStore((state) => state.user?.id);
  const [milestones, setMilestones] = useState<PlantMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plantId || !userId) return;

    let cancelled = false;

    supabase
      .from('plant_milestones')
      .select('*')
      .eq('plant_id', plantId)
      .order('occurred_on', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setMilestones(data ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plantId, userId]);

  const addMilestone = useCallback(
    async (
      milestoneType: MilestoneType,
      occurredOn: string,
      note?: string | null,
      photoUrl?: string | null,
    ) => {
      if (!plantId || !userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('plant_milestones')
          .insert({
            plant_id: plantId,
            user_id: userId,
            milestone_type: milestoneType,
            occurred_on: occurredOn,
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
        setMilestones((prev) => [...prev, data]);
        notifySuccess('Milestone saved!');
        return data as PlantMilestone;
      } catch {
        notifyError();
        return null;
      }
    },
    [plantId, userId],
  );

  return { milestones, isLoading, error, addMilestone };
}
