import { useCallback } from 'react';
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

      const timestamp = Date.now();

      try {
        // Send message to server first
        const data = await apiService.sendMessage(currentConversation.id, content);

        // Add message with server response data (or use optimistic ID if needed)
        addMessage({
          id: data.id || `msg_${Date.now()}`,
          conversationId: currentConversation.id,
          senderId: data.senderId || 'me',
          content,
          timestamp,
          read: true,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to send message');

        // Optionally add optimistic message even on error, with error state
        // This allows user to retry later
        addMessage({
          id: `failed_${Date.now()}`,
          conversationId: currentConversation.id,
          senderId: 'me',
          content: `[Failed to send] ${content}`,
          timestamp,
          read: true,
        });
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
