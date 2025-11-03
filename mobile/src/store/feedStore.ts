import { create } from 'zustand';

export interface Post {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  mood?: 'joy' | 'calm' | 'reflect';
  timestamp: number;
  reactions: number;
  comments: number;
  shared?: boolean;
}

interface FeedStore {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  deletePost: (id: string) => void;
  updatePost: (id: string, post: Partial<Post>) => void;
  addReaction: (postId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  nextPage: () => void;
  reset: () => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  posts: [],
  loading: false,
  error: null,
  hasMore: true,
  page: 1,

  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  deletePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id),
    })),
  updatePost: (id, updates) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  addReaction: (postId) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, reactions: p.reactions + 1 } : p
      ),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setHasMore: (hasMore) => set({ hasMore }),
  nextPage: () => set((state) => ({ page: state.page + 1 })),
  reset: () => set({ posts: [], loading: false, error: null, hasMore: true, page: 1 }),
}));
