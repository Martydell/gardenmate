import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import type { SpacePhotoAngle, SpacePhotoAnglePin } from '../types';

export interface NewPhotoAngleInput {
  label: SpacePhotoAngle['label'];
  custom_label: string | null;
  photo_url: string;
}

export function useSpacePhotoAngles(spaceId: string) {
  const [angles, setAngles] = useState<SpacePhotoAngle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('space_photo_angles')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setAngles(data ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  const addPhotoAngle = useCallback(
    async (input: NewPhotoAngleInput) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error: insertError } = await supabase
          .from('space_photo_angles')
          .insert({ ...input, space_id: spaceId, user_id: user.id, pins: [] })
          .select()
          .single();

        if (insertError) {
          notifyError(insertError.message);
          return null;
        }
        setAngles((prev) => [...prev, data as SpacePhotoAngle]);
        notifySuccess('Photo angle added!');
        return data as SpacePhotoAngle;
      } catch {
        notifyError();
        return null;
      }
    },
    [spaceId],
  );

  const updatePins = useCallback(async (angleId: string, pins: SpacePhotoAnglePin[]) => {
    setAngles((prev) => prev.map((angle) => (angle.id === angleId ? { ...angle, pins } : angle)));
    const { error: updateError } = await supabase
      .from('space_photo_angles')
      .update({ pins })
      .eq('id', angleId);
    if (updateError) notifyError(updateError.message);
  }, []);

  const deletePhotoAngle = useCallback(async (angleId: string) => {
    const { error: deleteError } = await supabase.from('space_photo_angles').delete().eq('id', angleId);
    if (deleteError) {
      notifyError(deleteError.message);
      return false;
    }
    setAngles((prev) => prev.filter((angle) => angle.id !== angleId));
    return true;
  }, []);

  return { angles, isLoading, error, addPhotoAngle, updatePins, deletePhotoAngle };
}
