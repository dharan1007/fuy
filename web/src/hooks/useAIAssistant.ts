/**
 * Hook: useAIAssistant
 * Manages AI assistant conversation state and interactions
 * Shared between mobile and web
 */

import { useState, useCallback, useEffect } from 'react';
import { aiAssistantService, AIMessage } from '../services/aiAssistantService';

interface UseAIAssistantOptions {
  userId: string;
  autoLoadHistory?: boolean;
}

export const useAIAssistant = ({ userId, autoLoadHistory = true }: UseAIAssistantOptions) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (autoLoadHistory) {
      const history = aiAssistantService.getConversationHistory(userId);
      setMessages(history);
    }
  }, [userId, autoLoadHistory]);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) {
        setError('Please enter a message');
        return;
      }

      setError(null);
      setLoading(true);
      setIsTyping(true);

      try {
        const userMsg: AIMessage = {
          id: `msg_${Date.now()}_user`,
          content: userMessage,
          timestamp: Date.now(),
          type: 'user',
        };

        setMessages((prev) => [...prev, userMsg]);

        const aiResponse = await aiAssistantService.processMessage(userId, userMessage);

        await new Promise((resolve) => setTimeout(resolve, 800));

        setMessages((prev) => [...prev, aiResponse]);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to get response from AI';
        setError(errorMessage);
      } finally {
        setLoading(false);
        setIsTyping(false);
      }
    },
    [userId]
  );

  const clearConversation = useCallback(() => {
    aiAssistantService.clearConversation(userId);
    setMessages([]);
  }, [userId]);

  const getLastAssistantMessage = useCallback((): AIMessage | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'assistant') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const getMessagesByAction = useCallback(
    (action: string): AIMessage[] => {
      return messages.filter((msg) => msg.metadata?.action === action);
    },
    [messages]
  );

  const updatePreferences = useCallback(
    (preferences: any) => {
      aiAssistantService.updatePreferences(userId, preferences);
    },
    [userId]
  );

  return {
    messages,
    loading,
    error,
    isTyping,
    sendMessage,
    clearConversation,
    getLastAssistantMessage,
    getMessagesByAction,
    updatePreferences,
  };
};

export default useAIAssistant;
