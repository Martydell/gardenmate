import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import { ACHIEVEMENTS, evaluateEarnedAchievements } from '../lib/achievements';
import type { AchievementMeta } from '../lib/achievements';
import type { CareLog, Plant, UserAchievement } from '../types';

export interface AchievementDisplay extends AchievementMeta {
  earnedAt: string | null;
}

// Data (plants/careLogs/gardenSpaceCount) is passed in rather than fetched
// here — usePlants/useCareLog/useSpaces are already called once at the
// Profile page level, and re-fetching them inside this hook too would
// double the Supabase requests (useCareLog especially: it's local-state
// only, not Zustand-backed, so a second call means a second real fetch).
export function useAchievements(
  plants: Plant[],
  careLogs: CareLog[],
  gardenSpaceCount: number,
  isDataReady: boolean,
) {
  const userId = useUserStore((state) => state.user?.id);
  const [earnedRows, setEarnedRows] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !isDataReady) return;

    let cancelled = false;

    async function loadAndEvaluate() {
      const [{ data: existing, error: fetchError }, { count: progressPhotoCount }] = await Promise.all([
        supabase.from('achievements').select('*').eq('user_id', userId),
        supabase
          .from('plant_progress_photos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      const existingRows = (existing ?? []) as UserAchievement[];
      const existingIds = new Set(existingRows.map((row) => row.achievement_id));

      const qualifyingIds = evaluateEarnedAchievements({
        plants,
        careLogs,
        progressPhotoCount: progressPhotoCount ?? 0,
        gardenSpaceCount,
      });
      const newlyEarnedIds = qualifyingIds.filter((id) => !existingIds.has(id));

      let newRows: UserAchievement[] = [];
      if (newlyEarnedIds.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('achievements')
          .insert(newlyEarnedIds.map((achievement_id) => ({ user_id: userId, achievement_id })))
          .select();
        if (!insertError && inserted) newRows = inserted as UserAchievement[];
      }

      if (cancelled) return;
      setEarnedRows([...existingRows, ...newRows]);
      setIsLoading(false);
    }

    loadAndEvaluate();

    return () => {
      cancelled = true;
    };
    // Deliberately only re-runs on userId/isDataReady, not on every
    // plants/careLogs/gardenSpaceCount change — achievements are evaluated
    // once per page load ("on page load" per spec), not continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isDataReady]);

  const achievements: AchievementDisplay[] = ACHIEVEMENTS.map((meta) => {
    const earned = earnedRows.find((row) => row.achievement_id === meta.id);
    return { ...meta, earnedAt: earned?.earned_at ?? null };
  });

  return { achievements, isLoading, error };
}
