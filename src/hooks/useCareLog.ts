import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError } from '../lib/errorHandling';
import { useUserStore } from '../stores/userStore';
import type { CareActionType, CareLog } from '../types';

export async function insertCareLog(
  userId: string,
  input: { plant_id: string; action_type: CareActionType; notes?: string | null; photo_url?: string | null },
): Promise<CareLog | null> {
  try {
    const { data, error } = await supabase
      .from('care_log')
      .insert({
        user_id: userId,
        plant_id: input.plant_id,
        action_type: input.action_type,
        notes: input.notes ?? null,
        photo_url: input.photo_url ?? null,
      })
      .select()
      .single();

    if (error) return null;
    return data as CareLog;
  } catch {
    return null;
  }
}

export function useCareLog(plantId?: string) {
  const userId = useUserStore((state) => state.user?.id);
  const [logs, setLogs] = useState<CareLog[]>([]);
  // plantId (when provided) isn't known at mount for callers resolving it
  // asynchronously, so default to loading rather than lazily reading a value
  // that hasn't arrived yet.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let query = supabase.from('care_log').select('*').eq('user_id', userId);
    if (plantId) {
      query = query.eq('plant_id', plantId);
    }

    query.order('logged_at', { ascending: false }).then(({ data, error: fetchError }) => {
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLogs(data ?? []);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [plantId, userId]);

  const logAction = useCallback(
    async (
      plant_id: string,
      actionType: CareActionType,
      notes?: string | null,
      photo_url?: string | null,
    ) => {
      if (!userId) return null;
      const logged = await insertCareLog(userId, { plant_id, action_type: actionType, notes, photo_url });
      if (!logged) {
        setError('Could not save this care log entry.');
        notifyError('Could not save this care log entry.');
        return null;
      }
      setLogs((prev) => [logged, ...prev]);
      return logged;
    },
    [userId],
  );

  return { logs, isLoading, error, logAction };
}
