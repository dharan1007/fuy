/**
 * Messages Page - Web Version
 * Displays conversations list with AI Assistant integration
 */

import React, { useState, useEffect } from 'react';
import { AIChatInterface } from '../components/ai';
import styles from './MessagesPage.module.css';

interface Conversation {
  id: string;
  participantName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  avatar?: string;
}

const DUMMY_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    participantName: 'Sarah Johnson',
    lastMessage: 'Hey! Did you see the new feature?',
    lastMessageTime: Date.now() - 300000,
    unreadCount: 2,
  },
  {
    id: 'conv_2',
    participantName: 'Mike Chen',
    lastMessage: 'Thanks for your help earlier!',
    lastMessageTime: Date.now() - 3600000,
    unreadCount: 0,
  },
  {
    id: 'conv_3',
    participantName: 'Emma Davis',
    lastMessage: 'Let\'s catch up soon',
    lastMessageTime: Date.now() - 86400000,
    unreadCount: 1,
  },
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(DUMMY_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [userId] = useState('user_123');

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleSelectConversation = (id: string) => {
    if (id === 'ai-assistant') {
      setShowAIChat(true);
    } else {
      setSelectedConversationId(id);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  return (
    <div className={styles.container}>
      {/* Sidebar - Conversations List */}
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h1>Messages</h1>
          <button className={styles.composeButton} title="New message">
            ✉️
          </button>
        </div>

        <div className={styles.conversationsList}>
          {/* AI Assistant - Always at top */}
          <div
            className={`${styles.conversationItem} ${
              showAIChat ? styles.active : ''
            }`}
            onClick={() => handleSelectConversation('ai-assistant')}
          >
            <div className={styles.avatarAI}>🤖</div>
            <div className={styles.conversationInfo}>
              <div className={styles.nameRow}>
                <span className={styles.name}>
                  AI Assistant <span className={styles.sparkle}>✨</span>
                </span>
              </div>
              <span className={styles.preview}>
                Hi! I'm here to help with routines, todos, and more...
              </span>
            </div>
          </div>

          {/* Regular Conversations */}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`${styles.conversationItem} ${
                selectedConversationId === conv.id ? styles.active : ''
              }`}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <div className={styles.avatar}>
                {conv.participantName.charAt(0)}
              </div>
              <div className={styles.conversationInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{conv.participantName}</span>
                  <span className={styles.time}>{formatTime(conv.lastMessageTime)}</span>
                </div>
                <span className={styles.preview}>{conv.lastMessage}</span>
              </div>
              {conv.unreadCount > 0 && (
                <div className={styles.unreadBadge}>{conv.unreadCount}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {showAIChat ? (
          <AIChatInterface
            userId={userId}
            onActionDetected={(action, data) => {
              console.log('AI Action detected:', action, data);
              // Handle actions here
            }}
          />
        ) : selectedConversation ? (
          <div className={styles.chatArea}>
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <h2>{selectedConversation.participantName}</h2>
                <p>Online</p>
              </div>
              <div className={styles.chatHeaderActions}>
                <button className={styles.iconButton} title="Call">
                  ☎️
                </button>
                <button className={styles.iconButton} title="Video call">
                  📹
                </button>
                <button className={styles.iconButton} title="Info">
                  ℹ️
                </button>
              </div>
            </div>

            {/* Messages Area - Placeholder */}
            <div className={styles.messagesArea}>
              <div className={styles.placeholderMessage}>
                <p>Start chatting with {selectedConversation.participantName}</p>
              </div>
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
              <input
                type="text"
                placeholder="Type a message..."
                className={styles.messageInput}
              />
              <button className={styles.sendButton}>✈️</button>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <h2>Select a conversation</h2>
            <p>Choose someone to message or start a conversation with AI</p>
          </div>
        )}
      </div>
    </div>
  );
}
