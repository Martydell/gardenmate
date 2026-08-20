import { create } from 'zustand';
import type { CareTask } from '../types';

interface CareTaskState {
  tasks: CareTask[];
  setTasks: (tasks: CareTask[]) => void;
  addTask: (task: CareTask) => void;
  updateTask: (id: string, updates: CareTask) => void;
  removeTask: (id: string) => void;
}

export const useCareTaskStore = create<CareTaskState>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? updates : task)),
    })),
  removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
}));
