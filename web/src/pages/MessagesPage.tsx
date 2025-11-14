/**
 * Messages Page - Web Version
 * Displays conversations list with AI Assistant integration and real-time messaging
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AIChatInterface } from '../components/ai';
import { useMessaging } from '../hooks/useMessaging';
import styles from './MessagesPage.module.css';

interface Conversation {
  id: string;
  participantName: string;
  participantId: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  avatar?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  read: boolean;
}

interface Friend {
  id: string;
  name: string;
  email?: string;
  profile?: {
    displayName: string;
    avatarUrl: string;
  };
  status?: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const {
    conversations: apiConversations,
    messages: apiMessages,
    followers,
    following,
    onlineUsers,
    typingUsers,
    loading,
    fetchMessages,
    sendMessage,
    startTyping,
    stopTyping,
    createOrGetConversation,
    getAllChatUsers,
    startPolling,
    stopPolling,
  } = useMessaging();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false);
  const [showRetentionSettings, setShowRetentionSettings] = useState(false);
  const [chatRetention, setChatRetention] = useState<'1day' | '7days' | '30days' | 'forever'>('forever');
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync API conversations with local state
  useEffect(() => {
    if (apiConversations.length > 0) {
      setConversations(apiConversations);
    }
  }, [apiConversations]);

  // Sync API messages with local state
  useEffect(() => {
    setMessages(apiMessages);
  }, [apiMessages]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversationId, messages]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get all followers and following combined for search
  const allChatUsers = getAllChatUsers();

  // Filter local friends first
  const filteredLocalFriends = allChatUsers.filter(friend =>
    (friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.profile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
    && searchQuery.length > 0
  );

  // Combine local and search results, avoiding duplicates
  const filteredFriends = Array.from(
    new Map([...filteredLocalFriends, ...searchResults].map(f => [f.id, f])).values()
  );

  // Handle search input with debouncing - Two-tier search (followers/following first, then all users)
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setShowFriendsDropdown(query.length > 0);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length === 0) {
      setSearchResults([]);
      return;
    }

    // Debounce the search
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Step 1: Search in followers and following (first tier)
        const followersRes = await fetch(
          `/api/users/followers-following?type=followers&search=${encodeURIComponent(query)}`
        );
        const followingRes = await fetch(
          `/api/users/followers-following?type=following&search=${encodeURIComponent(query)}`
        );

        const followersData = followersRes.ok ? await followersRes.json() : { users: [] };
        const followingData = followingRes.ok ? await followingRes.json() : { users: [] };

        // Combine followers and following results
        const followersFollowingResults = [...followersData.users, ...followingData.users];
        const followersFollowingMap = new Map(
          followersFollowingResults.map(u => [u.id, u])
        );

        // Step 2: Search all platform users (second tier) - for discovery
        const allUsersRes = await fetch(
          `/api/search/users?search=${encodeURIComponent(query)}`
        );
        const allUsersData = allUsersRes.ok ? await allUsersRes.json() : { users: [] };

        // Combine all results: followers/following prioritized, then new users
        const combinedResults = Array.from(followersFollowingMap.values());

        // Add all platform users that aren't already in followers/following
        const newUsersNotInFollowersFollowing = allUsersData.users.filter(
          (user: Friend) => !followersFollowingMap.has(user.id)
        );

        const finalResults = [...combinedResults, ...newUsersNotInFollowersFollowing];

        setSearchResults(finalResults);
        setIsSearching(false);
      } catch (error) {
        console.error('Search failed:', error);
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversationId || !userId) return;

    const content = messageInput.trim();
    setMessageInput('');
    stopTyping(selectedConversationId);

    // Add optimistic message
    const optimisticMessage: Message = {
      id: Date.now().toString(),
      conversationId: selectedConversationId,
      senderId: userId,
      senderName: 'You',
      content,
      timestamp: Date.now(),
      read: true,
    };

    setMessages(prev => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] || []), optimisticMessage]
    }));

    // Update conversation's last message
    setConversations(prev =>
      prev.map(conv =>
        conv.id === selectedConversationId
          ? { ...conv, lastMessage: content, lastMessageTime: Date.now() }
          : conv
      )
    );

    // Send via API and Socket.io
    await sendMessage(selectedConversationId, content);
  }, [messageInput, selectedConversationId, userId, sendMessage, stopTyping]);

  // Start conversation with friend
  const handleStartConversation = useCallback(async (friend: Friend) => {
    try {
      const existingConv = conversations.find(c => c.participantId === friend.id);
      if (existingConv) {
        setSelectedConversationId(existingConv.id);
      } else {
        const conversationId = await createOrGetConversation(friend.id);
        if (conversationId) {
          setSelectedConversationId(conversationId);
          await fetchMessages(conversationId);
        }
      }
      setSearchQuery('');
      setShowFriendsDropdown(false);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  }, [conversations, createOrGetConversation, fetchMessages]);

  // Handle message input changes with typing indicator
  const handleMessageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    if (value.trim().length > 0 && selectedConversationId) {
      startTyping(selectedConversationId);

      // Clear previous timeout
      if (typingTimeout) clearTimeout(typingTimeout);

      // Set new timeout to stop typing
      const timeout = setTimeout(() => {
        stopTyping(selectedConversationId);
      }, 1000);

      setTypingTimeout(timeout);
    } else {
      if (typingTimeout) clearTimeout(typingTimeout);
      if (selectedConversationId) {
        stopTyping(selectedConversationId);
      }
    }
  }, [selectedConversationId, startTyping, stopTyping, typingTimeout]);

  // Save/delete messages based on retention setting
  useEffect(() => {
    if (!selectedConversationId) return;

    const interval = setInterval(() => {
      setMessages(prev => {
        const convMessages = prev[selectedConversationId] || [];
        const now = Date.now();
        const retentionMs = {
          '1day': 24 * 60 * 60 * 1000,
          '7days': 7 * 24 * 60 * 60 * 1000,
          '30days': 30 * 24 * 60 * 60 * 1000,
          'forever': Infinity,
        }[chatRetention];

        const filteredMessages = convMessages.filter(msg =>
          now - msg.timestamp < retentionMs
        );

        return {
          ...prev,
          [selectedConversationId]: filteredMessages,
        };
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [selectedConversationId, chatRetention]);

  // Load messages when conversation is selected and start polling
  useEffect(() => {
    if (selectedConversationId) {
      if (!messages[selectedConversationId]) {
        fetchMessages(selectedConversationId);
      }
      // Start polling for new messages in production
      startPolling(selectedConversationId);
    } else {
      stopPolling();
    }

    return () => {
      if (!selectedConversationId) {
        stopPolling();
      }
    };
  }, [selectedConversationId, messages, fetchMessages, startPolling, stopPolling]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
    // Close mobile sidebar when conversation is selected
    setShowMobileSidebar(false);
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  return (
    <div className={styles.container}>
      {/* Sidebar - Conversations List */}
      <div className={`${styles.sidebar} ${showMobileSidebar ? styles.mobileOpen : ''}`}>
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

        {/* Search Input */}
        <div className={styles.searchContainer} style={{ position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999999', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations or add friends..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowFriendsDropdown(searchQuery.length > 0)}
            onBlur={() => setTimeout(() => setShowFriendsDropdown(false), 200)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              className={styles.clearButton}
              onClick={() => {
                setSearchQuery('');
                setShowFriendsDropdown(false);
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}

          {/* Friends Dropdown */}
          {showFriendsDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderTop: 'none',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 10,
            }}>
              {isSearching && (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px',
                }}>
                  Searching...
                </div>
              )}

              {!isSearching && filteredFriends.length === 0 && (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '14px',
                }}>
                  No followers or following found matching "{searchQuery}"
                </div>
              )}

              {!isSearching && filteredFriends.length > 0 && (
                <>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f9fafb',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    borderBottom: '1px solid #e5e7eb',
                  }}>
                    {filteredFriends.length} result{filteredFriends.length !== 1 ? 's' : ''}
                  </div>
                  {filteredFriends.map((friend) => {
                    const isOnline = onlineUsers.has(friend.id);
                    const isAlreadyConversation = conversations.some(
                      (c) => c.participantId === friend.id
                    );

                    return (
                      <button
                        key={friend.id}
                        onClick={() => handleStartConversation(friend)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          textAlign: 'left',
                          border: 'none',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: isAlreadyConversation ? '#f0f4ff' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isAlreadyConversation ? '#e0e7ff' : '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isAlreadyConversation ? '#f0f4ff' : 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <div style={{ position: 'relative' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: '#3b82f6',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                              }}>
                                {friend.name?.charAt(0) || friend.profile?.displayName?.charAt(0)}
                              </div>
                              {isOnline && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  right: 0,
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: '#10b981',
                                  border: '2px solid white',
                                }} />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {friend.profile?.displayName || friend.name}
                              </div>
                              <div style={{ fontSize: '12px', color: isOnline ? '#10b981' : '#9ca3af' }}>
                                {isOnline ? '🟢 Online' : '⚫ Offline'}
                              </div>
                            </div>
                          </div>
                          {isAlreadyConversation && (
                            <div style={{
                              fontSize: '11px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                            }}>
                              Existing
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
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
          {filteredConversations.map((conv) => (
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
            userId={userId || ''}
            onActionDetected={(action, data) => {
              console.log('AI Action detected:', action, data);
              // Handle actions here
            }}
          />
        ) : selectedConversation ? (
          <div className={styles.chatArea}>
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              {/* Mobile Menu Toggle */}
              <button
                className={styles.mobileMenuToggle}
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                title="Toggle conversations"
              >
                ☰
              </button>

              <div className={styles.chatHeaderInfo}>
                <h2>{selectedConversation.participantName}</h2>
                <p style={{ color: onlineUsers.has(selectedConversation.participantId) ? '#10b981' : '#9ca3af' }}>
                  {onlineUsers.has(selectedConversation.participantId) ? '● Online' : '● Offline'}
                </p>
              </div>
              <div className={styles.chatHeaderActions}>
                {/* Chat Retention Settings Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    className={styles.iconButton}
                    title="Chat retention settings"
                    onClick={() => setShowRetentionSettings(!showRetentionSettings)}
                    style={{ position: 'relative' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="1" />
                      <path d="M12 1v6m0 6v6" />
                      <path d="M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24" />
                      <path d="M1 12h6m6 0h6" />
                      <path d="M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
                    </svg>
                  </button>

                  {/* Retention Settings Popup */}
                  {showRetentionSettings && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      minWidth: '200px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      zIndex: 20,
                    }}>
                      <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                        Auto-delete messages after:
                      </div>
                      {(['1day', '7days', '30days', 'forever'] as const).map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setChatRetention(option);
                            setShowRetentionSettings(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            textAlign: 'left',
                            border: 'none',
                            backgroundColor: chatRetention === option ? '#eff6ff' : 'transparent',
                            color: chatRetention === option ? '#1e40af' : '#374151',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'background-color 0.2s',
                            borderBottom: option !== 'forever' ? '1px solid #f3f4f6' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (chatRetention !== option) {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (chatRetention !== option) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: '2px solid',
                              borderColor: chatRetention === option ? '#3b82f6' : '#d1d5db',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {chatRetention === option && (
                                <div style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3b82f6',
                                }}></div>
                              )}
                            </div>
                            <span>{option === '1day' ? '1 Day' : option === '7days' ? '7 Days' : option === '30days' ? '30 Days' : 'Forever'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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

            {/* Messages Area */}
            <div className={styles.messagesArea}>
              {(selectedConversationId && messages[selectedConversationId] && messages[selectedConversationId].length > 0) ? (
                messages[selectedConversationId]!.map((msg, idx) => {
                  const isOwnMessage = msg.senderId === userId;
                  const prevMsg = idx > 0 ? messages[selectedConversationId]![idx - 1] : null;
                  const isSameSender = prevMsg?.senderId === msg.senderId;

                  return (
                    <div
                      key={msg.id}
                      className={`${styles.messageWrapper} ${isOwnMessage ? styles.own : styles.other}`}
                      style={{
                        display: 'flex',
                        marginBottom: isSameSender ? '2px' : '16px',
                        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                        paddingBottom: isSameSender ? 0 : '8px',
                      }}
                    >
                      {/* Avatar for received messages (grouped) */}
                      {!isOwnMessage && !isSameSender && (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginRight: '8px',
                            flexShrink: 0,
                          }}
                        >
                          {msg.senderName?.charAt(0) || 'U'}
                        </div>
                      )}
                      {!isOwnMessage && isSameSender && (
                        <div style={{ width: '32px', marginRight: '8px', flexShrink: 0 }} />
                      )}

                      {/* Message bubble */}
                      <div
                        className={styles.messageBubble}
                        style={{
                          maxWidth: '60%',
                          padding: '10px 14px',
                          borderRadius: isOwnMessage
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                          backgroundColor: isOwnMessage ? '#3b82f6' : '#e5e7eb',
                          color: isOwnMessage ? '#ffffff' : '#1f2937',
                          wordWrap: 'break-word',
                          wordBreak: 'break-word',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = isOwnMessage
                            ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                            : '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        }}
                      >
                        {!isOwnMessage && !isSameSender && (
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>
                            {msg.senderName}
                          </p>
                        )}
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
                          {msg.content}
                        </p>
                        <p style={{
                          margin: '6px 0 0 0',
                          fontSize: '11px',
                          opacity: 0.6,
                          textAlign: 'right'
                        }}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.placeholderMessage}>
                  <p>Start chatting with {selectedConversation.participantName}</p>
                </div>
              )}

              {/* Typing Indicator */}
              {selectedConversationId && typingUsers[selectedConversationId] && typingUsers[selectedConversationId].size > 0 && (
                <div style={{ padding: '12px', fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
                  {Array.from(typingUsers[selectedConversationId]!).join(', ')} is typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={handleMessageInputChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className={styles.messageInput}
              />
              <button
                className={styles.sendButton}
                onClick={handleSendMessage}
              >
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
