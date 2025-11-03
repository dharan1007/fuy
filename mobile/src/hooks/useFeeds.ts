import { useState, useCallback } from 'react';
import { useFeedStore } from '../store/feedStore';
import { apiService } from '../services/apiService';

export function useFeeds() {
  const { posts, loading, error, hasMore, page, setPosts, setLoading, setError, nextPage } =
    useFeedStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getFeed(pageNum, 10);
      if (pageNum === 1) {
        setPosts(data.posts || []);
      } else {
        const currentPosts = useFeedStore.getState().posts;
        setPosts([...currentPosts, ...(data.posts || [])]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [setPosts, setLoading, setError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFeed(1);
    } finally {
      setRefreshing(false);
    }
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    nextPage();
    await loadFeed(page + 1);
  }, [hasMore, loading, page, loadFeed, nextPage]);

  const addReaction = useCallback(async (postId: string) => {
    try {
      await apiService.addReaction(postId);
      const state = useFeedStore.getState();
      state.addReaction(postId);
    } catch (err: any) {
      setError(err.message || 'Failed to add reaction');
    }
  }, [setError]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      await apiService.deletePost(postId);
      const state = useFeedStore.getState();
      state.deletePost(postId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete post');
    }
  }, [setError]);

  return {
    posts,
    loading,
    error,
    refreshing,
    hasMore,
    loadFeed,
    onRefresh,
    loadMore,
    addReaction,
    deletePost,
  };
}
