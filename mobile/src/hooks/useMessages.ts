import { useState, useCallback } from 'react';
import { useMessagesStore } from '../store/messagesStore';
import { apiService } from '../services/apiService';

export function useMessages() {
  const {
    conversations,
    currentConversation,
    loading,
    error,
    setConversations,
    setCurrentConversation,
    addMessage,
    markAsRead,
    setLoading,
    setError,
  } = useMessagesStore();

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getConversations(1);
      setConversations(data.conversations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [setConversations, setLoading, setError]);

  const openConversation = useCallback(
    async (conversationId: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getMessages(conversationId, 1);
        setCurrentConversation({
          id: conversationId,
          participantId: data.participantId || '',
          participantName: data.participantName || 'Unknown',
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime || Date.now(),
          unreadCount: 0,
          messages: data.messages || [],
        });
        await apiService.markConversationAsRead(conversationId);
        markAsRead(conversationId);
      } catch (err: any) {
        setError(err.message || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    },
    [setCurrentConversation, setLoading, setError, markAsRead]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentConversation) return;

      try {
        const data = await apiService.sendMessage(currentConversation.id, content);
        addMessage({
          id: data.id || Date.now().toString(),
          conversationId: currentConversation.id,
          senderId: data.senderId || 'me',
          content,
          timestamp: Date.now(),
          read: true,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to send message');
      }
    },
    [currentConversation, addMessage, setError]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        const state = useMessagesStore.getState();
        state.deleteConversation(conversationId);
      } catch (err: any) {
        setError(err.message || 'Failed to delete conversation');
      }
    },
    [setError]
  );

  return {
    conversations,
    currentConversation,
    loading,
    error,
    loadConversations,
    openConversation,
    sendMessage,
    deleteConversation,
  };
}
