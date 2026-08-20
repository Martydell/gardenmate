import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { useUserStore } from '../stores/userStore';
import type { PlantProgressPhoto } from '../types';

export function usePlantProgressPhotos(plantId: string | undefined) {
  const userId = useUserStore((state) => state.user?.id);
  const [photos, setPhotos] = useState<PlantProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plantId || !userId) return;

    let cancelled = false;

    supabase
      .from('plant_progress_photos')
      .select('*')
      .eq('plant_id', plantId)
      .order('taken_on', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setPhotos(data ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plantId, userId]);

  const addProgressPhoto = useCallback(
    async (photoUrl: string, takenOn: string, note?: string | null) => {
      if (!plantId || !userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('plant_progress_photos')
          .insert({
            plant_id: plantId,
            user_id: userId,
            photo_url: photoUrl,
            taken_on: takenOn,
            note: note ?? null,
          })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          notifyError(insertError.message);
          return null;
        }
        setPhotos((prev) => [...prev, data]);
        notifySuccess('Photo saved!');
        return data as PlantProgressPhoto;
      } catch {
        notifyError();
        return null;
      }
    },
    [plantId, userId],
  );

  return { photos, isLoading, error, addProgressPhoto };
}
