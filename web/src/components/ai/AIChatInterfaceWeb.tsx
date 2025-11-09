/**
 * AI Chat Interface - Web Version
 * Full chat interface for AI assistant in messages (Web/Desktop)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { AIMessageBubbleWeb } from './AIMessageBubbleWeb';
import styles from './AIChatInterface.module.css';

interface AIChatInterfaceWebProps {
  userId: string;
  onActionDetected?: (action: string, data: any) => void;
  compact?: boolean;
}

export const AIChatInterfaceWeb: React.FC<AIChatInterfaceWebProps> = ({
  userId,
  onActionDetected,
  compact = false,
}) => {
  const { messages, loading, error, isTyping, sendMessage, clearConversation } = useAIAssistant({
    userId,
    autoLoadHistory: true,
  });

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect action in AI response
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'assistant' && lastMessage.metadata?.action) {
        onActionDetected?.(lastMessage.metadata.action, lastMessage.metadata.actionData);
      }
    }
  }, [messages, onActionDetected]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      routine: 'Create a personalized morning routine for me',
      todo: 'Help me create a todo list for today',
      search_product: 'Find me some great products in the shop',
      search_user: 'Search for people with similar interests',
      feature_guide: 'Show me how to use all the features',
      clear: 'Clear conversation',
    };

    if (action === 'clear') {
      clearConversation();
    } else {
      sendMessage(prompts[action] || action);
    }
  };

  if (compact) {
    return (
      <div className={styles.compactContainer}>
        <div className={styles.messageListCompact}>
          {messages.map((msg) => (
            <AIMessageBubbleWeb key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className={styles.inputContainerCompact}>
          <input
            type="text"
            placeholder="Ask AI anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            className={styles.inputCompact}
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className={styles.sendButtonCompact}
          >
            {loading ? '⏳' : '➤'}
          </button>
        </form>
      </div>
    );
  }

  // Full interface
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>🤖 AI Assistant</h2>
        <p>Always here to help</p>
      </div>

      {/* Messages */}
      <div className={styles.messageList}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👋</div>
            <h3>Hi! I'm your AI assistant</h3>
            <p>
              I can help you create routines, todos, search products, find people, and guide you through features
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <AIMessageBubbleWeb key={msg.id} message={msg} />
          ))
        )}

        {isTyping && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingDot}></div>
            <div className={styles.typingDot}></div>
            <div className={styles.typingDot}></div>
            <span>AI is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorContainer}>
          <span>❌</span> {error}
        </div>
      )}

      {/* Input Area */}
      <div className={styles.inputWrapper}>
        <form onSubmit={handleSendMessage} className={styles.inputContainer}>
          <input
            type="text"
            placeholder="Ask me anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            className={styles.input}
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className={styles.sendButton}
            title="Send message"
          >
            {loading ? '⏳' : '✈️'}
          </button>
        </form>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button
            onClick={() => handleQuickAction('routine')}
            className={styles.quickActionButton}
          >
            📅 Routine
          </button>
          <button
            onClick={() => handleQuickAction('todo')}
            className={styles.quickActionButton}
          >
            ✅ Todo
          </button>
          <button
            onClick={() => handleQuickAction('search_product')}
            className={styles.quickActionButton}
          >
            🛍️ Shop
          </button>
          <button
            onClick={() => handleQuickAction('feature_guide')}
            className={styles.quickActionButton}
          >
            🎓 Guide
          </button>
          <button
            onClick={() => handleQuickAction('clear')}
            className={styles.quickActionButton}
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterfaceWeb;
