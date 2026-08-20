import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { usePlantStore } from '../stores/plantStore';
import { useUserStore } from '../stores/userStore';
import type { Plant, PlantCategory, PlantStatus } from '../types';

export type NewPlantInput = Omit<Plant, 'id' | 'user_id' | 'created_at'>;

// Keyed per-user so a shared/public device never shows one account's cached
// plants to another after they sign in.
function plantsCacheKey(userId: string): string {
  return `gardenmate:plants:${userId}`;
}

function readCachedPlants(userId: string): Plant[] | null {
  try {
    const raw = localStorage.getItem(plantsCacheKey(userId));
    return raw ? (JSON.parse(raw) as Plant[]) : null;
  } catch {
    return null;
  }
}

function writeCachedPlants(userId: string, plants: Plant[]): void {
  try {
    localStorage.setItem(plantsCacheKey(userId), JSON.stringify(plants));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — caching is a
    // nice-to-have for offline viewing, not worth surfacing as an error.
  }
}

interface UsePlantsOptions {
  category?: PlantCategory;
  status?: PlantStatus;
}

export function usePlants(options: UsePlantsOptions = {}) {
  const { category, status } = options;
  const userId = useUserStore((state) => state.user?.id);
  const allPlants = usePlantStore((state) => state.plants);
  const setPlants = usePlantStore((state) => state.setPlants);
  const storeAddPlant = usePlantStore((state) => state.addPlant);
  const storeUpdatePlant = usePlantStore((state) => state.updatePlant);
  const storeRemovePlant = usePlantStore((state) => state.removePlant);

  const [isLoading, setIsLoading] = useState(() => Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabase
      .from('plants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          const cached = readCachedPlants(userId);
          if (cached) {
            setPlants(cached);
          } else {
            setError(fetchError.message);
          }
        } else {
          setPlants(data ?? []);
          writeCachedPlants(userId, data ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, setPlants]);

  const addPlant = useCallback(
    async (input: NewPlantInput) => {
      if (!userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('plants')
          .insert({ ...input, user_id: userId })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          notifyError(insertError.message);
          return null;
        }
        storeAddPlant(data);
        notifySuccess('Plant added!');
        return data as Plant;
      } catch {
        notifyError();
        return null;
      }
    },
    [userId, storeAddPlant],
  );

  const updatePlant = useCallback(
    async (id: string, updates: Partial<Plant>) => {
      try {
        const { data, error: updateError } = await supabase
          .from('plants')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          setError(updateError.message);
          notifyError(updateError.message);
          return null;
        }
        storeUpdatePlant(id, data);
        return data as Plant;
      } catch {
        notifyError();
        return null;
      }
    },
    [storeUpdatePlant],
  );

  const deletePlant = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabase.from('plants').delete().eq('id', id);
        if (deleteError) {
          setError(deleteError.message);
          notifyError(deleteError.message);
          return false;
        }
        storeRemovePlant(id);
        notifySuccess('Plant deleted');
        return true;
      } catch {
        notifyError();
        return false;
      }
    },
    [storeRemovePlant],
  );

  const toggleWishlist = useCallback(
    async (id: string) => {
      const plant = allPlants.find((p) => p.id === id);
      if (!plant) return;
      await updatePlant(id, { is_wishlist: !plant.is_wishlist });
    },
    [allPlants, updatePlant],
  );

  const filtered = useMemo(() => {
    if (!userId) return [];
    return allPlants.filter((plant) => {
      if (category && plant.category !== category) return false;
      if (status && plant.status !== status) return false;
      return true;
    });
  }, [allPlants, userId, category, status]);

  const plants = useMemo(() => filtered.filter((plant) => !plant.is_wishlist), [filtered]);
  const wishlist = useMemo(() => filtered.filter((plant) => plant.is_wishlist), [filtered]);

  return { plants, wishlist, isLoading, error, addPlant, updatePlant, deletePlant, toggleWishlist };
}
