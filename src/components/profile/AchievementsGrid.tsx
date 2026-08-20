import { formatDate } from '../../lib/careSchedule';
import type { AchievementDisplay } from '../../hooks/useAchievements';

interface AchievementsGridProps {
  achievements: AchievementDisplay[];
}

function AchievementsGrid({ achievements }: AchievementsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {achievements.map((achievement) => {
        const isEarned = Boolean(achievement.earnedAt);
        return (
          <div
            key={achievement.id}
            className={`rounded-2xl border p-4 text-center ${
              isEarned
                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <span className={`text-3xl ${isEarned ? '' : 'opacity-40 grayscale'}`} aria-hidden="true">
              {achievement.emoji}
            </span>
            <p className="mt-2 text-sm font-semibold">{achievement.name}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{achievement.description}</p>
            <p
              className={`mt-2 text-xs font-medium ${
                isEarned ? 'text-green-700 dark:text-green-400' : 'text-neutral-400'
              }`}
            >
              {isEarned && achievement.earnedAt ? formatDate(achievement.earnedAt) : 'Locked'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default AchievementsGrid;
