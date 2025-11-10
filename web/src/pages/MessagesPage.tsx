/**
 * Messages Page - Web Version
 * Displays conversations list with AI Assistant integration
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(DUMMY_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [userId] = useState('user_123');

  // Feature navigation mapping
  const featureRoutes = {
    canvas: '/journal',
    hopin: '/hopin',
    bonding: '/bonds',
    grounding: '/grounding',
    breathing: '/breathing',
    plans: '/pomodoro', // Using pomodoro as plans placeholder
    essenz: '/essenz',
    ranking: '/rankings',
  };

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className={styles.backButton}
              onClick={() => router.back()}
              title="Go back"
            >
              ←
            </button>
            <h1 style={{ margin: 0 }}>Messages</h1>
          </div>
          <button className={styles.composeButton} title="New message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
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
            <div className={styles.avatarAI}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M9 9h6" />
                <path d="M9 13h6" />
                <path d="M9 17h6" />
              </svg>
            </div>
            <div className={styles.conversationInfo}>
              <div className={styles.nameRow}>
                <span className={styles.name}>AI Assistant</span>
              </div>
              <span className={styles.preview}>
                Hi! I'm here to help...
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>
                <button className={styles.iconButton} title="Video call">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </button>
                <button className={styles.iconButton} title="Info">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
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
              <button className={styles.sendButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16296077 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.97788973 L3.03521743,10.4188827 C3.03521743,10.5759801 3.03521743,10.7330775 3.50612381,10.7330775 L16.6915026,11.5185644 C16.6915026,11.5185644 17.1624089,11.5185644 17.1624089,12.0374122 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2>Select a conversation</h2>
            <p>Choose someone to message or start with AI</p>
          </div>
        )}
      </div>

      {/* Right Panel - Community Features */}
      <div className={styles.rightPanel}>
        <div className={styles.panelHeader}>
          <h3>Features</h3>
        </div>

        {/* Community Features Grid */}
        <div className={styles.featuresGrid}>
          {/* Canvas */}
          <button className={styles.featureCard} onClick={() => router.push(featureRoutes.canvas)} title="Canvas">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            <div className={styles.featureName}>Canvas</div>
          </button>

          {/* Hopin */}
          <button className={styles.featureCard} onClick={() => router.push(featureRoutes.hopin)} title="Hopin">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
              <path d="M12 5v14M5 12h14" />
            </svg>
            <div className={styles.featureName}>Hopin</div>
          </button>

          {/* Bonding */}
          <button className={styles.featureCard} onClick={() => router.push(featureRoutes.bonding)} title="Bonding">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div className={styles.featureName}>Bonding</div>
          </button>

          {/* Grounding */}
          <button className={styles.featureCard} onClick={() => router.push(featureRoutes.grounding)} title="Grounding">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div className={styles.featureName}>Grounding</div>
          </button>

          {/* Breathing */}
          <button className={styles.featureCard} onClick={() => router.push(featureRoutes.breathing)} title="Breathing">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" />
            </svg>
            <div className={styles.featureName}>Breathing</div>
          </button>

          {/* Plans */}
          <button className={styles.featureCard} onClick={() => router.push(featureRoutes.plans)} title="Plans">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H7v6h2V11zm4-6h-2v12h2V5zm4-1h-2v13h2V4z" />
              <path d="M3 20h18" />
            </svg>
            <div className={styles.featureName}>Plans</div>
          </button>

          {/* Essenz */}
          <button className={styles.featureCard} onClick={() => router.push(featureRoutes.essenz)} title="Essenz">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 2.2" />
            </svg>
            <div className={styles.featureName}>Essenz</div>
          </button>

          {/* Ranking */}
          <button className={styles.featureCard} onClick={() => router.push(featureRoutes.ranking)} title="Ranking">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9h12M6 5h12M6 13h12M6 17h12" />
              <path d="M2 5v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5" />
            </svg>
            <div className={styles.featureName}>Ranking</div>
          </button>
        </div>

        {/* Quick Stats */}
        <div className={styles.statsSection}>
          <h5>Your Activity</h5>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Messages</span>
            <span className={styles.statValue}>24</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Connections</span>
            <span className={styles.statValue}>8</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Streak</span>
            <span className={styles.statValue}>12d</span>
          </div>
        </div>
      </div>
    </div>
  );
}
