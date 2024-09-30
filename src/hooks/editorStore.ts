import { create } from 'zustand';

interface EditorState {
  openNode: boolean;
  setOpenNode: (open: boolean) => void;
  openColor: boolean;
  setOpenColor: (open: boolean) => void;
  openLink: boolean;
  setOpenLink: (open: boolean) => void;
  openAI: boolean;
  setOpenAI: (open: boolean) => void;
  openAlignment: boolean;
  setOpenAlignment: (open: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  openNode: false,
  setOpenNode: (open) => set({ openNode: open }),
  openColor: false,
  setOpenColor: (open) => set({ openColor: open }),
  openLink: false,
  setOpenLink: (open) => set({ openLink: open }),
  openAI: false,
  setOpenAI: (open) => set({ openAI: open }),
  openAlignment: false,
  setOpenAlignment: (open) => set({ openAlignment: open }),
}));
