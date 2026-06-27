import { create } from 'zustand';

interface ShareState {
  isSharing: boolean;
  setIsSharing: (isSharing: boolean) => void;
}

export const useShareStore = create<ShareState>((set) => ({
  isSharing: false,
  setIsSharing: (isSharing) => set({ isSharing }),
}));
