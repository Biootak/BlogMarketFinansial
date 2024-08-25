import create from 'zustand';
import { addComment } from '@/actions/addComment';
import type { ActionResult, CommentWithCustomRelations } from '@/types/types';

interface CommentState {
  comments: CommentWithCustomRelations[];
  addComment: (
    postId: string,
    content: string,
    parentId?: string,
  ) => Promise<ActionResult<CommentWithCustomRelations>>;
}

export const useCommentStore = create<CommentState>((set) => ({
  comments: [],
  addComment: async (postId, content) => {
    const result = await addComment(postId, content);
    if (result.success && result.data) {
      set((state) => ({
        comments: [result.data as CommentWithCustomRelations, ...state.comments],
      }));
    }
    return result;
  },
}));
