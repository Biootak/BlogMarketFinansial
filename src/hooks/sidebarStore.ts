import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  isMobile: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  isMobile: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  setIsMobile: (isMobile) => set({ isMobile }),
}));
