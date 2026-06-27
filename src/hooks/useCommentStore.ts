import { create } from 'zustand';
import { addComment, deleteComment, editComment } from '@/actions/commentActions';
import type { ActionResult, CommentWithCustomRelations } from '@/types/types';

interface CommentState {
  comments: CommentWithCustomRelations[];
  addComment: (
    postId: string,
    content: string,
    parentId?: string,
  ) => Promise<ActionResult<CommentWithCustomRelations>>;
  deleteComment: (commentId: string) => Promise<ActionResult<void>>;
  editComment: (
    commentId: string,
    content: string,
  ) => Promise<ActionResult<CommentWithCustomRelations>>;
}

export const useCommentStore = create<CommentState>((set) => ({
  comments: [],
  addComment: async (postId, content, parentId) => {
    const result = await addComment(postId, content, parentId);
    if (result.success && result.data) {
      set((state) => ({
        comments: [result.data as CommentWithCustomRelations, ...state.comments],
      }));
    }
    return result;
  },
  deleteComment: async (commentId) => {
    const result = await deleteComment(commentId);
    if (result.success) {
      set((state) => ({
        comments: state.comments.filter((comment) => comment.id !== commentId),
      }));
    }
    return result;
  },
  editComment: async (commentId, content) => {
    const result = await editComment(commentId, content);
    if (result.success && result.data) {
      set((state) => ({
        comments: state.comments.map((comment) =>
          comment.id === commentId ? { ...comment, content: content } : comment,
        ),
      }));
    }
    return result;
  },
}));
