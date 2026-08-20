import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Plant } from '../types';

// Deliberately independent of usePlants()/plantStore — those are scoped to
// the signed-in user via useUserStore, but this reads an arbitrary OTHER
// user's public wishlist for an unauthenticated visitor, relying on the
// public-read RLS policy added in supabase/wishlist_sharing_schema.sql.
export function usePublicWishlist(userId: string | undefined) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabase
      .from('plants')
      .select('*')
      .eq('user_id', userId)
      .eq('is_wishlist', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setPlants(data ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { plants, isLoading, error };
}
