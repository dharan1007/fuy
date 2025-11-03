import { apiClient } from './api';
import { Conversation, Message } from '../types/index';

export const chatService = {
  // Get conversations
  async getConversations(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ conversations: Conversation[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/users/${userId}/conversations`,
        { params: { page, pageSize } }
      );
      const data = response.data.data;
      return {
        conversations: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get single conversation
  async getConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await apiClient.get<Conversation>(
        `/conversations/${conversationId}`
      );
      const data = response.data.data;
      if (!data) throw new Error('No data received');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Create conversation with user
  async createConversation(
    userId: string,
    participantId: string
  ): Promise<Conversation> {
    try {
      const response = await apiClient.post<Conversation>(
        `/users/${userId}/conversations`,
        { participantId }
      );
      const data = response.data.data;
      if (!data) throw new Error('No data received');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get messages in conversation
  async getMessages(
    conversationId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/conversations/${conversationId}/messages`,
        { params: { page, pageSize } }
      );
      const data = response.data.data;
      return {
        messages: (data.items || []).reverse(), // Reverse to show oldest first
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Send message
  async sendMessage(
    conversationId: string,
    content: string,
    media?: string[]
  ): Promise<Message> {
    try {
      const response = await apiClient.post<Message>(
        `/conversations/${conversationId}/messages`,
        { content, media }
      );
      const data = response.data.data;
      if (!data) throw new Error('No data received');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Edit message
  async editMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<Message> {
    try {
      const response = await apiClient.put<Message>(
        `/conversations/${conversationId}/messages/${messageId}`,
        { content }
      );
      const data = response.data.data;
      if (!data) throw new Error('No data received');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete message
  async deleteMessage(
    conversationId: string,
    messageId: string
  ): Promise<void> {
    try {
      await apiClient.delete(
        `/conversations/${conversationId}/messages/${messageId}`
      );
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Mark conversation as read
  async markAsRead(conversationId: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/${conversationId}/mark-read`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await apiClient.get<{ unreadCount: number }>(
        `/users/${userId}/unread-count`
      );
      return response.data.data?.unreadCount || 0;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Typing indicator
  async sendTypingIndicator(conversationId: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/${conversationId}/typing`);
    } catch (error) {
      // Don't throw for typing indicator
      console.error('Failed to send typing indicator:', error);
    }
  },

  // Delete conversation
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await apiClient.delete(`/conversations/${conversationId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Search messages
  async searchMessages(
    conversationId: string,
    query: string
  ): Promise<Message[]> {
    try {
      const response = await apiClient.get<Message[]>(
        `/conversations/${conversationId}/messages/search`,
        { params: { q: query } }
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },  handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error('Chat operation failed');
  },
};
