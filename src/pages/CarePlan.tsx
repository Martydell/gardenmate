import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { usePlants } from '../hooks/usePlants';
import { useCareTasks } from '../hooks/useCareTasks';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { TASK_TYPE_META, formatTaskDate, todayDateString } from '../lib/careTaskMeta';
import CreateCareTaskModal from '../components/care/CreateCareTaskModal';
import type { CareTask, CareTaskType, Plant } from '../types';

type TabKey = 'today' | 'calendar';

function displayName(plant: Plant | undefined): string {
  if (!plant) return 'Unknown plant';
  return plant.nickname || plant.common_name;
}

function TaskItem({
  task,
  plant,
  onDone,
  onSnooze,
  isBusy,
}: {
  task: CareTask;
  plant: Plant | undefined;
  onDone: () => void;
  onSnooze: () => void;
  isBusy: boolean;
}) {
  const meta = TASK_TYPE_META[task.task_type];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-green-100 dark:bg-green-950">
        {plant?.cover_photo_url ? (
          <img src={plant.cover_photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl">🌿</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{displayName(plant)}</p>
        <p className="text-xs text-neutral-500">
          {meta.emoji} {meta.label} · {formatTaskDate(task.due_date)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {task.completed ? (
          <span className="text-xs font-medium text-neutral-400">✓ Done</span>
        ) : (
          <>
            <button
              type="button"
              onClick={onSnooze}
              disabled={isBusy}
              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-neutral-700"
            >
              Snooze
            </button>
            <button
              type="button"
              onClick={onDone}
              disabled={isBusy}
              className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CalendarTab({
  tasks,
  plantById,
  onDone,
  onSnooze,
  busyTaskId,
}: {
  tasks: CareTask[];
  plantById: Map<string, Plant>;
  onDone: (id: string) => void;
  onSnooze: (id: string) => void;
  busyTaskId: string | null;
}) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Set<CareTaskType>>();
    for (const task of tasks) {
      if (!map.has(task.due_date)) map.set(task.due_date, new Set());
      map.get(task.due_date)?.add(task.task_type);
    }
    return map;
  }, [tasks]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  }, [year, month]);

  const today = todayDateString();
  const selectedTasks = selectedDate ? tasks.filter((task) => task.due_date === selectedDate) : [];

  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthDate(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className="rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-medium">
          {monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => setMonthDate(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
          <div key={`${label}-${i}`} className="text-xs font-medium text-neutral-400">
            {label}
          </div>
        ))}
        {calendarCells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} />;
          const types = tasksByDate.get(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === today;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 ${
                isSelected
                  ? 'bg-green-600 text-white'
                  : isToday
                    ? 'bg-green-100 dark:bg-green-950'
                    : ''
              }`}
            >
              <span className="text-sm">{Number(dateStr.slice(-2))}</span>
              <div className="flex h-1.5 gap-0.5">
                {types &&
                  Array.from(types)
                    .slice(0, 3)
                    .map((type) => (
                      <span
                        key={type}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: TASK_TYPE_META[type].dotColor }}
                      />
                    ))}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4">
          <h2 className="mb-2 font-semibold">{formatTaskDate(selectedDate)}</h2>
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-neutral-500">No tasks on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  plant={plantById.get(task.plant_id)}
                  onDone={() => onDone(task.id)}
                  onSnooze={() => onSnooze(task.id)}
                  isBusy={busyTaskId === task.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CarePlan() {
  useDocumentTitle('Care Plan — GardenMate');
  const [searchParams, setSearchParams] = useSearchParams();
  const filterPlantId = searchParams.get('plantId');

  const { plants } = usePlants();
  const { tasks, isLoading, error, createTask, completeTask, snoozeTask, todaysTasks, overdueTasks } =
    useCareTasks();

  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const plantById = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);
  const filterPlant = filterPlantId ? plantById.get(filterPlantId) : undefined;

  const visibleToday = filterPlantId
    ? todaysTasks.filter((task) => task.plant_id === filterPlantId)
    : todaysTasks;
  const visibleOverdue = filterPlantId
    ? overdueTasks.filter((task) => task.plant_id === filterPlantId)
    : overdueTasks;
  const calendarTasks = filterPlantId
    ? tasks.filter((task) => task.plant_id === filterPlantId)
    : tasks;

  async function handleDone(id: string) {
    setBusyTaskId(id);
    setActionError(null);
    const success = await completeTask(id);
    setBusyTaskId(null);
    if (!success) setActionError('Something went wrong completing that task.');
  }

  async function handleSnooze(id: string) {
    setBusyTaskId(id);
    setActionError(null);
    const success = await snoozeTask(id);
    setBusyTaskId(null);
    if (!success) setActionError('Something went wrong snoozing that task.');
  }

  const isEmpty = !isLoading && visibleToday.length === 0 && visibleOverdue.length === 0;

  return (
    <div className="pb-24">
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Care Plan</h1>
      </div>

      {filterPlant && (
        <div className="mx-4 mb-3 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2 text-sm dark:bg-green-950/40">
          <span>
            Showing tasks for <strong>{displayName(filterPlant)}</strong>
          </span>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="font-medium text-green-700 underline dark:text-green-400"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex border-b border-neutral-200 px-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`flex-1 border-b-2 py-2.5 text-sm font-medium ${
            activeTab === 'today'
              ? 'border-green-600 text-green-700 dark:text-green-400'
              : 'border-transparent text-neutral-500 dark:text-neutral-400'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 border-b-2 py-2.5 text-sm font-medium ${
            activeTab === 'calendar'
              ? 'border-green-600 text-green-700 dark:text-green-400'
              : 'border-transparent text-neutral-500 dark:text-neutral-400'
          }`}
        >
          Calendar
        </button>
      </div>

      {error && <p className="px-4 pt-3 text-sm text-red-600">{error}</p>}
      {actionError && <p className="px-4 pt-3 text-sm text-red-600">{actionError}</p>}

      {activeTab === 'today' ? (
        <div className="px-4 py-4">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-5xl">🌻</span>
              <p className="text-neutral-500">No tasks scheduled 🌻 — your garden is happy!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {visibleOverdue.length > 0 && (
                <div>
                  <h2 className="mb-2 font-semibold text-red-600">Overdue</h2>
                  <div className="space-y-2">
                    {visibleOverdue.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        plant={plantById.get(task.plant_id)}
                        onDone={() => handleDone(task.id)}
                        onSnooze={() => handleSnooze(task.id)}
                        isBusy={busyTaskId === task.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="mb-2 font-semibold">Today's Tasks</h2>
                {visibleToday.length === 0 ? (
                  <p className="text-sm text-neutral-500">No tasks due today.</p>
                ) : (
                  <div className="space-y-2">
                    {visibleToday.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        plant={plantById.get(task.plant_id)}
                        onDone={() => handleDone(task.id)}
                        onSnooze={() => handleSnooze(task.id)}
                        isBusy={busyTaskId === task.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <CalendarTab
          tasks={calendarTasks}
          plantById={plantById}
          onDone={handleDone}
          onSnooze={handleSnooze}
          busyTaskId={busyTaskId}
        />
      )}

      <button
        type="button"
        onClick={() => setIsAddOpen(true)}
        aria-label="Add care task"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </button>

      <CreateCareTaskModal open={isAddOpen} onClose={() => setIsAddOpen(false)} onCreate={createTask} />
    </div>
  );
}

export default CarePlan;
