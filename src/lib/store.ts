import { create } from 'zustand';

interface FilterStore {
  isFiltering: boolean;
  setIsFiltering: (isFiltering: boolean) => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  isFiltering: false,
  setIsFiltering: (isFiltering) => set({ isFiltering }),
}));
