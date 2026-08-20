import { create } from 'zustand';
import type { Plant } from '../types';

interface PlantState {
  plants: Plant[];
  setPlants: (plants: Plant[]) => void;
  addPlant: (plant: Plant) => void;
  updatePlant: (id: string, updates: Plant) => void;
  removePlant: (id: string) => void;
}

export const usePlantStore = create<PlantState>((set) => ({
  plants: [],
  setPlants: (plants) => set({ plants }),
  addPlant: (plant) => set((state) => ({ plants: [plant, ...state.plants] })),
  updatePlant: (id, updates) =>
    set((state) => ({
      plants: state.plants.map((plant) => (plant.id === id ? updates : plant)),
    })),
  removePlant: (id) => set((state) => ({ plants: state.plants.filter((plant) => plant.id !== id) })),
}));
