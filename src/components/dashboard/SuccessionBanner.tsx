import { Link } from 'react-router-dom';
import { addDaysToDateString, formatTaskDate, todayDateString } from '../../lib/careTaskMeta';
import type { CareTask, Plant } from '../../types';

function displayName(plant: Plant | undefined): string {
  if (!plant) return 'A plant';
  return plant.nickname || plant.common_name;
}

interface SuccessionBannerProps {
  tasks: CareTask[];
  plantById: Map<string, Plant>;
}

function SuccessionBanner({ tasks, plantById }: SuccessionBannerProps) {
  const in7Days = addDaysToDateString(todayDateString(), 7);

  const dueSoon = tasks.filter(
    (task) => task.task_type === 'succession' && !task.completed && task.due_date <= in7Days,
  );

  if (dueSoon.length === 0) return null;

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:border-purple-900 dark:bg-purple-950/30">
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden="true">
          🌱
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-purple-900 dark:text-purple-200">Sow again soon</p>
          <ul className="mt-1 space-y-0.5">
            {dueSoon.map((task) => (
              <li key={task.id} className="text-sm text-purple-800 dark:text-purple-300">
                <Link
                  to={`/plant/${task.plant_id}`}
                  className="underline decoration-purple-400 underline-offset-2"
                >
                  {displayName(plantById.get(task.plant_id))}
                </Link>{' '}
                — due {formatTaskDate(task.due_date)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SuccessionBanner;
