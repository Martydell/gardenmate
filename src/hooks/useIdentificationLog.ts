import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import type { IdentificationLog } from '../types';

export function useIdentificationLog() {
  const userId = useUserStore((state) => state.user?.id);
  const [logs, setLogs] = useState<IdentificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from('identification_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
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
  }, [userId]);

  const addIdentification = useCallback(
    async (photoUrl: string, resultName: string, confidence: number) => {
      if (!userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('identification_log')
          .insert({ user_id: userId, photo_url: photoUrl, result_name: resultName, confidence })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          return null;
        }
        setLogs((prev) => [data, ...prev]);
        return data as IdentificationLog;
      } catch {
        setError('Something went wrong saving this identification.');
        return null;
      }
    },
    [userId],
  );

  return { logs, isLoading, error, addIdentification };
}
