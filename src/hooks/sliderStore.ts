import create from 'zustand';
import { getPostBySlug } from '@/actions/postActions';
import type { PostWithRelations } from '@/types/types';

interface SliderState {
  posts: PostWithRelations[];
  isLoading: boolean;
  error: string | null;
  fetchSliderPosts: () => Promise<void>;
}

export const useSliderStore = create<SliderState>((set) => ({
  posts: [],
  isLoading: false,
  error: null,
  fetchSliderPosts: async () => {
    set({ isLoading: true });
    try {
     
      const slugs = ['featured-post-1', 'featured-post-2', 'featured-post-3'];
      const postsPromises = slugs.map(slug => getPostBySlug(slug));
      const results = await Promise.all(postsPromises);
      
      const validPosts = results
        .filter(result => result.success && result.data)
        .map(result => result.data as PostWithRelations);

      set({ posts: validPosts, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch slider posts', isLoading: false });
    }
  },
}));