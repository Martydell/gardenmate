import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { useCareTaskStore } from '../stores/careTaskStore';
import { useUserStore } from '../stores/userStore';
import { insertCareLog } from './useCareLog';
import { TASK_TYPE_TO_ACTION_TYPE, addDaysToDateString, computeTaskBuckets } from '../lib/careTaskMeta';
import type { CareTask, CareTaskType } from '../types';

export type NewCareTaskInput = Omit<CareTask, 'id' | 'user_id' | 'completed' | 'created_at'>;

export function useCareTasks() {
  const userId = useUserStore((state) => state.user?.id);
  const tasks = useCareTaskStore((state) => state.tasks);
  const setTasks = useCareTaskStore((state) => state.setTasks);
  const storeAddTask = useCareTaskStore((state) => state.addTask);
  const storeUpdateTask = useCareTaskStore((state) => state.updateTask);

  const [isLoading, setIsLoading] = useState(() => Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabase
      .from('care_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setTasks(data ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, setTasks]);

  const createTask = useCallback(
    async (input: NewCareTaskInput) => {
      if (!userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('care_tasks')
          .insert({ ...input, user_id: userId, completed: false })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          notifyError(insertError.message);
          return null;
        }
        storeAddTask(data);
        notifySuccess('Task scheduled!');
        return data as CareTask;
      } catch {
        notifyError();
        return null;
      }
    },
    [userId, storeAddTask],
  );

  const applyReschedule = useCallback(
    async (task: CareTask) => {
      const updates = task.repeat_interval_days
        ? { due_date: addDaysToDateString(task.due_date, task.repeat_interval_days), completed: false }
        : { completed: true };

      try {
        const { data, error: updateError } = await supabase
          .from('care_tasks')
          .update(updates)
          .eq('id', task.id)
          .select()
          .single();

        if (updateError) {
          setError(updateError.message);
          notifyError(updateError.message);
          return null;
        }
        storeUpdateTask(task.id, data);
        return data as CareTask;
      } catch {
        notifyError();
        return null;
      }
    },
    [storeUpdateTask],
  );

  const completeTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task || !userId) return false;

      try {
        const logged = await insertCareLog(userId, {
          plant_id: task.plant_id,
          action_type: TASK_TYPE_TO_ACTION_TYPE[task.task_type],
        });
        if (!logged) {
          setError('Could not log this action.');
          notifyError('Could not log this action.');
          return false;
        }

        const updated = await applyReschedule(task);
        if (updated !== null) notifySuccess('Task completed!');
        return updated !== null;
      } catch {
        notifyError();
        return false;
      }
    },
    [tasks, userId, applyReschedule],
  );

  const snoozeTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return false;

      try {
        const { data, error: updateError } = await supabase
          .from('care_tasks')
          .update({ due_date: addDaysToDateString(task.due_date, 1) })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          setError(updateError.message);
          notifyError(updateError.message);
          return false;
        }
        storeUpdateTask(id, data);
        return true;
      } catch {
        notifyError();
        return false;
      }
    },
    [tasks, storeUpdateTask],
  );

  // Fire-and-forget: syncs a plant's matching task when its quick-action
  // buttons are used directly (PlantDetail), bypassing the CarePlan "Done"
  // button. Care-log insertion is the caller's own responsibility there, so
  // this only handles the reschedule/complete side of things.
  const rescheduleTaskForPlant = useCallback(
    async (plantId: string, taskType: CareTaskType) => {
      const task = tasks.find(
        (t) => t.plant_id === plantId && t.task_type === taskType && !t.completed,
      );
      if (!task) return;
      await applyReschedule(task);
    },
    [tasks, applyReschedule],
  );

  const { todaysTasks, overdueTasks, upcomingTasks } = useMemo(() => computeTaskBuckets(tasks), [tasks]);

  return {
    tasks,
    isLoading,
    error,
    createTask,
    completeTask,
    snoozeTask,
    rescheduleTaskForPlant,
    todaysTasks,
    overdueTasks,
    upcomingTasks,
  };
}
