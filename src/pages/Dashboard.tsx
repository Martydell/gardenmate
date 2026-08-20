import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { usePlants } from '../hooks/usePlants';
import { useCareTasks } from '../hooks/useCareTasks';
import { useCareLog } from '../hooks/useCareLog';
import { useWeather } from '../hooks/useWeather';
import { useHarvestLog } from '../hooks/useHarvestLog';
import { useCommunityPosts } from '../hooks/useCommunityPosts';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import SuccessionBanner from '../components/dashboard/SuccessionBanner';
import PageHeaderBand from '../components/layout/PageHeaderBand';
import HarvestStatCard from '../components/dashboard/HarvestStatCard';
import SeasonalCalendarCard from '../components/dashboard/SeasonalCalendarCard';
import InspireSection from '../components/dashboard/InspireSection';
import PlantCard from '../components/plants/PlantCard';
import AddPlantModal from '../components/plants/AddPlantModal';
import { TASK_TYPE_META } from '../lib/careTaskMeta';
import { CARE_ACTION_META } from '../lib/plantMeta';
import { formatRelativeDate } from '../lib/careSchedule';
import { getSeasonalTip } from '../lib/seasonalTips';
import { getWateringAdvice } from '../lib/weather';
import { notifySuccess } from '../lib/errorHandling';
import type { CareTask, Plant } from '../types';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function displayFirstName(name: string | null | undefined): string {
  const rawFirstName = name?.trim().split(/\s+/)[0] ?? 'there';
  if (!rawFirstName) return 'there';
  return rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase();
}

function displayName(plant: Plant | undefined): string {
  if (!plant) return 'A plant';
  return plant.nickname || plant.common_name;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800 ${className}`} />;
}

function Dashboard() {
  useDocumentTitle('GardenMate');
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const { plants, isLoading: plantsLoading, addPlant } = usePlants();
  const { tasks, todaysTasks, overdueTasks, isLoading: tasksLoading, snoozeTask } = useCareTasks();
  const { logs, isLoading: logsLoading } = useCareLog();
  const { weather, status: weatherStatus, retry: retryWeather } = useWeather();
  const { entries: harvestEntries } = useHarvestLog();
  const { posts: communityPosts, isLoading: communityLoading, toggleLike } = useCommunityPosts();

  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);

  const plantById = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);

  // Rain in the next 24h means outdoor plants don't need watering tomorrow —
  // snooze their due-today/overdue watering tasks by a day so the task list
  // doesn't nag about something the weather is about to handle. Self-limiting:
  // once snoozed, a task's due_date moves out of today/overdue, so it drops
  // out of this effect's own filter and won't be re-snoozed on the next run.
  const autoSnoozedTaskIds = useRef(new Set<string>());
  useEffect(() => {
    if (!weather || getWateringAdvice(weather.forecast) !== 'skip_tomorrow') return;

    const targets = [...overdueTasks, ...todaysTasks].filter(
      (task) =>
        task.task_type === 'water' &&
        !autoSnoozedTaskIds.current.has(task.id) &&
        plantById.get(task.plant_id)?.category === 'outdoor',
    );
    if (targets.length === 0) return;

    targets.forEach((task) => autoSnoozedTaskIds.current.add(task.id));
    Promise.all(targets.map((task) => snoozeTask(task.id))).then(() => {
      notifySuccess('💧 Watering tasks snoozed — rain is coming!');
    });
  }, [weather, overdueTasks, todaysTasks, plantById, snoozeTask]);

  const attentionPlants = useMemo(() => {
    const seenIds = new Set<string>();
    const result: Plant[] = [];
    for (const task of overdueTasks) {
      if (seenIds.has(task.plant_id)) continue;
      const plant = plantById.get(task.plant_id);
      if (plant) {
        seenIds.add(task.plant_id);
        result.push(plant);
      }
    }
    return result;
  }, [overdueTasks, plantById]);

  const chipTasks: CareTask[] = useMemo(
    () => [...overdueTasks, ...todaysTasks],
    [overdueTasks, todaysTasks],
  );

  const recentLogs = logs.slice(0, 5);
  const firstName = displayFirstName(user?.name);
  const greeting = greetingForHour(new Date().getHours());
  const seasonalTip = getSeasonalTip();

  return (
    <div className="space-y-6 pb-24">
      <PageHeaderBand>
        <h1 className="text-2xl font-semibold">
          {greeting}, {firstName} 🌱
        </h1>
        {user?.garden_name && <p className="text-sm text-neutral-500">{user.garden_name}</p>}
      </PageHeaderBand>

      <div className="px-4">
        <WeatherWidget weather={weather} status={weatherStatus} onRetry={retryWeather} />
      </div>

      <div className="px-4">
        {tasksLoading ? (
          <Skeleton className="h-28" />
        ) : (
          <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <div className="flex gap-5">
                <div>
                  <p className="text-2xl font-semibold">{todaysTasks.length}</p>
                  <p className="text-xs text-neutral-500">Due today</p>
                </div>
                <div>
                  <p className={`text-2xl font-semibold ${overdueTasks.length > 0 ? 'text-red-600' : ''}`}>
                    {overdueTasks.length}
                  </p>
                  <p className="text-xs text-neutral-500">Overdue</p>
                </div>
              </div>
              <Link to="/care" className="text-sm font-medium text-green-700 dark:text-green-400">
                View All Tasks
              </Link>
            </div>

            {chipTasks.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {chipTasks.map((task) => {
                  const meta = TASK_TYPE_META[task.task_type];
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => navigate(`/care?plantId=${task.plant_id}`)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
                    >
                      <span aria-hidden="true">{meta.emoji}</span>
                      <span className="max-w-[8rem] truncate">
                        {displayName(plantById.get(task.plant_id))}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4">
        <SuccessionBanner tasks={tasks} plantById={plantById} />
      </div>

      <div className="px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Needs your attention</h2>
          <Link to="/catalogue" className="text-sm font-medium text-green-700 dark:text-green-400">
            See all
          </Link>
        </div>
        {plantsLoading || tasksLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 w-32 shrink-0" />
            ))}
          </div>
        ) : attentionPlants.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing needs attention right now — nice work! 🌻</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {attentionPlants.map((plant) => (
              <div key={plant.id} className="w-32 shrink-0">
                <PlantCard plant={plant} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4">
        <h2 className="mb-2 font-semibold">Recent activity</h2>
        {logsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="text-sm text-neutral-500">No care logged yet.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => {
              const meta = CARE_ACTION_META[log.action_type];
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white px-3 py-2 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <span className="text-lg" aria-hidden="true">
                    {meta.emoji}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-medium">{displayName(plantById.get(log.plant_id))}</span> was{' '}
                    {meta.label.toLowerCase()}
                  </p>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {formatRelativeDate(log.logged_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4">
        <HarvestStatCard entries={harvestEntries} />
      </div>

      <div className="px-4">
        <div className="flex items-start gap-3 rounded-2xl bg-green-50 p-4 dark:bg-green-950/40">
          <span className="text-xl" aria-hidden="true">
            🌿
          </span>
          <p className="text-sm text-green-900 dark:text-green-200">{seasonalTip}</p>
        </div>
      </div>

      <div className="px-4">
        <SeasonalCalendarCard plants={plants} />
      </div>

      <div className="px-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setIsAddPlantOpen(true)}
            className="flex flex-col items-center gap-1 rounded-2xl border border-neutral-100 bg-white py-4 text-sm font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="text-2xl" aria-hidden="true">
              ➕
            </span>
            Add Plant
          </button>
          <button
            type="button"
            onClick={() => navigate('/identify')}
            className="flex flex-col items-center gap-1 rounded-2xl border border-neutral-100 bg-white py-4 text-sm font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="text-2xl" aria-hidden="true">
              🔍
            </span>
            Identify Plant
          </button>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="flex flex-col items-center gap-1 rounded-2xl border border-neutral-100 bg-white py-4 text-sm font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="text-2xl" aria-hidden="true">
              🗺️
            </span>
            Open Map
          </button>
        </div>
      </div>

      <InspireSection posts={communityPosts} isLoading={communityLoading} onLike={toggleLike} />

      <AddPlantModal open={isAddPlantOpen} onClose={() => setIsAddPlantOpen(false)} onAdd={addPlant} />
    </div>
  );
}

export default Dashboard;
