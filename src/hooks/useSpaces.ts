import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { useSpaceStore } from '../stores/spaceStore';
import { useUserStore } from '../stores/userStore';
import type { GardenSpace } from '../types';

export type NewSpaceInput = Omit<GardenSpace, 'id' | 'user_id' | 'created_at'>;

export function useSpaces() {
  const userId = useUserStore((state) => state.user?.id);
  const spaces = useSpaceStore((state) => state.spaces);
  const setSpaces = useSpaceStore((state) => state.setSpaces);
  const storeAddSpace = useSpaceStore((state) => state.addSpace);
  const storeUpdateSpace = useSpaceStore((state) => state.updateSpace);
  const storeRemoveSpace = useSpaceStore((state) => state.removeSpace);

  const [isLoading, setIsLoading] = useState(() => Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabase
      .from('garden_spaces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setSpaces(data ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, setSpaces]);

  const addSpace = useCallback(
    async (input: NewSpaceInput) => {
      if (!userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('garden_spaces')
          .insert({ ...input, user_id: userId })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          notifyError(insertError.message);
          return null;
        }
        storeAddSpace(data);
        notifySuccess('Garden space added!');
        return data as GardenSpace;
      } catch {
        notifyError();
        return null;
      }
    },
    [userId, storeAddSpace],
  );

  const updateSpace = useCallback(
    async (id: string, updates: Partial<GardenSpace>) => {
      try {
        const { data, error: updateError } = await supabase
          .from('garden_spaces')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          setError(updateError.message);
          notifyError(updateError.message);
          return null;
        }
        storeUpdateSpace(id, data);
        return data as GardenSpace;
      } catch {
        notifyError();
        return null;
      }
    },
    [storeUpdateSpace],
  );

  const deleteSpace = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabase.from('garden_spaces').delete().eq('id', id);
        if (deleteError) {
          setError(deleteError.message);
          notifyError(deleteError.message);
          return false;
        }
        storeRemoveSpace(id);
        notifySuccess('Garden space deleted');
        return true;
      } catch {
        notifyError();
        return false;
      }
    },
    [storeRemoveSpace],
  );

  return { spaces, isLoading, error, addSpace, updateSpace, deleteSpace };
}
