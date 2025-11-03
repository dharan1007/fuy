import { apiClient } from './api';
import { Post, Comment } from '../types/index';

export const socialService = {
  // Get feed posts (friends' posts)
  async getFeed(): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<Post[]>(
        `/api/posts`,
        { params: { scope: 'friends' } }
      );
      const posts = Array.isArray(response.data) ? response.data : response.data.data || [];
      return {
        posts: posts || [],
        total: posts.length,
        hasMore: false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get user posts
  async getUserPosts(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/api/users/${userId}/posts`,
        { params: { page, pageSize } }
      );
      const data = response.data.data;
      return {
        posts: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Create post
  async createPost(
    postData: {
      content: string;
      feature: string;
      visibility: string;
      media?: string[];
    }
  ): Promise<Post> {
    try {
      const response = await apiClient.post<Post>(
        `/api/posts`,
        postData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get single post
  async getPost(postId: string): Promise<Post> {
    try {
      const response = await apiClient.get<Post>(
        `/api/posts/${postId}`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Update post
  async updatePost(
    postId: string,
    postData: Partial<Post>
  ): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(
        `/api/posts/${postId}`,
        postData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete post
  async deletePost(postId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/posts/${postId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Like post
  async likePost(postId: string): Promise<Post> {
    try {
      const response = await apiClient.post<Post>(
        `/api/posts/${postId}/like`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Unlike post
  async unlikePost(postId: string): Promise<Post> {
    try {
      const response = await apiClient.delete<Post>(
        `/api/posts/${postId}/like`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get comments
  async getComments(
    postId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ comments: Comment[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/api/posts/${postId}/comments`,
        { params: { page, pageSize } }
      );
      const data = response.data.data;
      return {
        comments: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add comment
  async addComment(
    postId: string,
    content: string
  ): Promise<Comment> {
    try {
      const response = await apiClient.post<Comment>(
        `/api/posts/${postId}/comments`,
        { content }
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete comment
  async deleteComment(postId: string, commentId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/posts/${postId}/comments/${commentId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Share post
  async sharePost(postId: string, message?: string): Promise<void> {
    try {
      await apiClient.post(`/api/posts/${postId}/share`, { message });
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get trending posts
  async getTrendingPosts(page: number = 1, pageSize: number = 10): Promise<Post[]> {
    try {
      const response = await apiClient.get<any>(
        `/api/posts/trending`,
        { params: { page, pageSize } }
      );
      return response.data.data?.items || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },  handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error('Social operation failed');
  },
};
