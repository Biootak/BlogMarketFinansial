import { create } from 'zustand';
import { listAllPosts, deletePost, updatePostStatus } from '@/actions/postActions';
import type { ActionResult, PostWithRelations, UpdatePostInput } from '@/types/types';

import { createPost, updatePost, getPostById } from '@/actions/postActions';
import type { CreatePostInput } from '@/types/types';

type Toast = {
  title: string;
  description: string;
  variant?: 'success' | 'destructive' | 'warning' | 'info';
};

interface PostsState {
  posts: PostWithRelations[];
  currentPage: number;
  hasNextPage: boolean;
  searchTerm: string;
  filter: 'همه' | PostWithRelations['status'];
  setFilter: (filter: 'همه' | PostWithRelations['status']) => void;
  isLoading: boolean;
  error: string | null;
  createPost: (data: CreatePostInput, toast: (props: Toast) => void) => Promise<void>;
  updatePost: (id: string, data: UpdatePostInput, toast: (props: Toast) => void) => Promise<void>;
  getPostById: (id: string) => Promise<PostWithRelations | null>;
  fetchPosts: (toast: (props: Toast) => void) => Promise<void>;
  handleDelete: (id: string, toast: (props: Toast) => void) => Promise<void>;
  handleStatusChange: (
    id: string,
    newStatus: PostWithRelations['status'],
    toast: (props: Toast) => void,
  ) => Promise<boolean>;
  setSearchTerm: (term: string) => void;

  resetPosts: () => void;
}

function isSuccessfulResult<T>(result: ActionResult<T>): result is ActionResult<T> & { data: T } {
  return result.success === true && result.data !== undefined;
}

export const usePostStore = create<PostsState>((set, get) => ({
  posts: [],
  currentPage: 1,
  hasNextPage: true,
  searchTerm: '',
  filter: 'همه',
  isLoading: false,
  error: null,

  fetchPosts: async (toast) => {
    const { currentPage, searchTerm, filter, isLoading, hasNextPage } = get();
    if (isLoading || !hasNextPage) return;

    set({ isLoading: true, error: null });
    try {
      const statusFilter = filter === 'همه' ? undefined : filter;
      const result = await listAllPosts(currentPage, 12, searchTerm, statusFilter);

      if (isSuccessfulResult(result)) {
        set((state) => ({
          posts: currentPage === 1 ? result.data.posts : [...state.posts, ...result.data.posts],
          currentPage: state.currentPage + 1,
          hasNextPage: result.data.posts.length === 12,
          isLoading: false,
        }));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطا در بارگیری پست‌ها';
      set({ isLoading: false, error: errorMessage });
      toast({
        title: 'خطا',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  },

  handleDelete: async (id, toast) => {
    const result = await deletePost(id);
    if (result.success) {
      set((state) => ({
        posts: state.posts.filter((post) => post.id !== id),
      }));
      toast({
        title: 'موفقیت',
        description: 'پست با موفقیت حذف شد',
        variant: 'success',
      });
    } else {
      toast({
        title: 'خطا',
        description: 'خطا در حذف پست',
        variant: 'destructive',
      });
    }
  },

  handleStatusChange: async (id, newStatus: PostWithRelations['status'], toast) => {
    const result = await updatePostStatus(id, newStatus);
    if (result.success && result.data) {
      set((state) => ({
        posts: state.posts.map((post) => (post.id === id ? { ...post, status: newStatus } : post)),
      }));
      toast({
        title: 'موفقیت',
        description: 'پست با موفقیت ذخیره شد',
        variant: 'success',
      });
      return true;
    } else {
      toast({
        title: 'خطا',
        description: 'خطا در ذخیره پست',
        variant: 'destructive',
      });
      return false;
    }
  },

  createPost: async (data, toast) => {
    set({ isLoading: true });
    try {
      const result = await createPost(data);
      if (isSuccessfulResult(result)) {
        set((state) => ({
          posts: [result.data, ...state.posts],
          isLoading: false,
        }));
        toast({
          title: 'موفقیت',
          description: 'پست با موفقیت ایجاد شد',
          variant: 'success',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطا در ایجاد پست';
      set({ isLoading: false, error: errorMessage });
      toast({
        title: 'خطا',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  },
  updatePost: async (id, data, toast) => {
    set({ isLoading: true });
    try {
      const result = await updatePost(id, data);
      if (isSuccessfulResult(result)) {
        set((state) => ({
          posts: state.posts.map((post) => (post.id === id ? { ...post, ...result.data } : post)),
          isLoading: false,
        }));
        toast({
          title: 'موفقیت',
          description: 'پست با موفقیت به‌روزرسانی شد',
          variant: 'success',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطا در به‌روزرسانی پست';
      set({ isLoading: false, error: errorMessage });
      toast({
        title: 'خطا',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  },

  getPostById: async (id) => {
    try {
      const result = await getPostById(id);
      if (isSuccessfulResult(result)) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching post:', error);
      return null;
    }
  },

  setSearchTerm: (term) => set({ searchTerm: term, currentPage: 1, posts: [], hasNextPage: true }),
  setFilter: (filter: 'همه' | PostWithRelations['status']) =>
    set({ filter, currentPage: 1, posts: [], hasNextPage: true }),
  resetPosts: () => set({ posts: [], currentPage: 1, hasNextPage: true }),
}));
