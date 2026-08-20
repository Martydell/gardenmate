import { create } from 'zustand';
import type { GardenSpace } from '../types';

interface SpaceState {
  spaces: GardenSpace[];
  setSpaces: (spaces: GardenSpace[]) => void;
  addSpace: (space: GardenSpace) => void;
  updateSpace: (id: string, updates: GardenSpace) => void;
  removeSpace: (id: string) => void;
}

export const useSpaceStore = create<SpaceState>((set) => ({
  spaces: [],
  setSpaces: (spaces) => set({ spaces }),
  addSpace: (space) => set((state) => ({ spaces: [space, ...state.spaces] })),
  updateSpace: (id, updates) =>
    set((state) => ({
      spaces: state.spaces.map((space) => (space.id === id ? updates : space)),
    })),
  removeSpace: (id) => set((state) => ({ spaces: state.spaces.filter((space) => space.id !== id) })),
}));
