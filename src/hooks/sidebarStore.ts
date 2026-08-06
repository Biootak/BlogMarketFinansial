import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  isMobile: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  // Desktop should render the familiar expanded sidebar on first paint.
  // SidebarInitializer still switches this off on mobile after hydration.
  isOpen: true,
  isMobile: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  setIsMobile: (isMobile) => set({ isMobile }),
}));
