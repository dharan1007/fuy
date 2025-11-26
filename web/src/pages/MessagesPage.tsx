/**
 * Messages Page - Web Version
 * Displays conversations list with AI Assistant integration and real-time messaging
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AIChatbot from '@/components/AIChatbot';
import { useMessaging } from '../hooks/useMessaging';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
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

// Inner component that uses theme
function MessagesPageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const { theme, setTheme, themes } = useTheme();

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
    getAllChatUsers,
  } = useMessaging();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false);
  const [showRetentionSettings, setShowRetentionSettings] = useState(false);
  const [chatRetention, setChatRetention] = useState<'1day' | '7days' | '30days' | 'forever'>('1day');
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState<string | null>(null);
  const [computedOnlineUsers, setComputedOnlineUsers] = useState<Set<string>>(new Set());
  const [respondedInvites, setRespondedInvites] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync API conversations with local state (merge to avoid losing selected conversation)
  useEffect(() => {
    if (apiConversations.length > 0) {
      setConversations((prevConversations) => {
        // Merge new conversations with existing ones
        const merged = [...apiConversations];

        // Keep the selected conversation if it's not in the new list
        if (selectedConversationId) {
          const selectedConv = prevConversations.find((c) => c.id === selectedConversationId);
          if (selectedConv && !merged.find((c) => c.id === selectedConversationId)) {
            merged.push(selectedConv);
          }
        }

        // Remove duplicates, keeping the updated version
        const deduped = Array.from(
          new Map(merged.map((c) => [c.id, c])).values()
        );

        return deduped;
      });
    }
  }, [apiConversations, selectedConversationId]);

  // Sync API messages with local state (merge to avoid losing messages)
  useEffect(() => {
    if (Object.keys(apiMessages).length > 0) {
      setMessages((prevMessages) => {
        const merged = { ...prevMessages };

        // Merge API messages with existing ones
        for (const [convId, newMsgs] of Object.entries(apiMessages)) {
          const existing = merged[convId] || [];
          const newMessages = (newMsgs as any[]).filter(
            (msg) => !existing.find((m) => m.id === msg.id)
          );

          if (newMessages.length > 0) {
            merged[convId] = [...existing, ...newMessages];
            // Sort by timestamp
            merged[convId].sort((a, b) => a.timestamp - b.timestamp);
          } else if (!merged[convId]) {
            merged[convId] = newMsgs as Message[];
          }
        }

        return merged;
      });
    }
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

  // Derive selected conversation from conversations list
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

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
    if (selectedConversationId && selectedConversation) {
      if (!messages[selectedConversationId]) {
        fetchMessages(selectedConversationId);
      }
      // Start polling for new messages in production
      // startPolling(selectedConversationId);

      // Update online status based on message activity
      // User is considered "online" if they've sent a message within the last 5 minutes
      if (messages[selectedConversationId] && messages[selectedConversationId].length > 0) {
        const conversationMessages = messages[selectedConversationId];
        const otherUserMessages = conversationMessages.filter(msg => msg.senderId === selectedConversation.participantId);

        if (otherUserMessages.length > 0) {
          const lastTheirMessage = otherUserMessages[otherUserMessages.length - 1];
          const now = Date.now();
          const lastMessageTime = lastTheirMessage.timestamp;
          const minutesAgo = (now - lastMessageTime) / (1000 * 60);
          const isRecent = minutesAgo < 5; // 5 minutes

          setComputedOnlineUsers(prev => {
            const updated = new Set(prev);
            if (isRecent) {
              updated.add(selectedConversation.participantId);
            } else {
              updated.delete(selectedConversation.participantId);
            }
            return updated;
          });
        }
      }
    } else {
      // stopPolling();
    }

    return () => {
      if (!selectedConversationId) {
        // stopPolling();
      }
    };
  }, [selectedConversationId, messages, fetchMessages, selectedConversation]);

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

  return (
    <div className={styles.container} data-theme={theme}>
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
          {/* dbot - Always at top */}
          <div
            className={`${styles.conversationItem} ${showAIChat ? styles.active : ''
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
                <span className={styles.name}>dbot</span>
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
              className={`${styles.conversationItem} ${selectedConversationId === conv.id ? styles.active : ''
                }`}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <div className={styles.avatar} style={conv.avatar ? {
                backgroundImage: `url(${conv.avatar})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                fontSize: 0
              } : {}}>
                {!conv.avatar && conv.participantName.charAt(0)}
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
          <AIChatbot className="h-full w-full border-none shadow-none rounded-none bg-transparent" />
        ) : !userId || loading ? (
          <div className={styles.emptyState}>
            {!userId ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                  {/* Full-screen loading spinner animation */}
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px',
                  }} />
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <h2 style={{ margin: '16px 0 8px 0', color: '#1f2937' }}>Loading your messages...</h2>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Getting your profile ready</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                  {/* Small loading spinner while messages load */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 12px',
                  }} />
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Loading conversations...</p>
                </div>
              </div>
            )}
          </div>
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

              <div className={styles.chatHeaderInfo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <div>
                  <h2>{selectedConversation.participantName}</h2>
                  <p style={{ color: (onlineUsers.has(selectedConversation.participantId) || computedOnlineUsers.has(selectedConversation.participantId)) ? '#10b981' : '#9ca3af' }}>
                    {(onlineUsers.has(selectedConversation.participantId) || computedOnlineUsers.has(selectedConversation.participantId)) ? '● Online' : '● Offline'}
                  </p>
                </div>

                {/* Theme Toggle */}
                <button
                  className={styles.iconButton}
                  title="Toggle theme"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextThemeIndex = (themes.indexOf(theme) + 1) % themes.length;
                    setTheme(themes[nextThemeIndex]);
                  }}
                  style={{ position: 'relative', fontSize: '16px' }}
                >
                  {theme === 'light' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : theme === 'dark' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="6" x2="12" y2="12" />
                      <line x1="12" y1="12" x2="16" y2="14" />
                    </svg>
                  )}
                </button>
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

                {/* Feature Collaboration Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    className={styles.iconButton}
                    title="Collaborative features"
                    onClick={() => setShowFeatureModal(showFeatureModal ? null : 'features')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>

                  {showFeatureModal === 'features' && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      minWidth: '240px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      zIndex: 50,
                      maxHeight: '500px',
                      overflowY: 'auto',
                    }}>
                      <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                          Collaborative Features
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#000000' }}>{conversations.length}</div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Messages</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#000000' }}>{followers.length + following.length}</div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Connections</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#000000' }}>5</div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Streak</div>
                          </div>
                        </div>
                      </div>
                      {[
                        { id: 'canvas', label: 'Canvas', path: '/journal', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l-3 6h6l-2 4h4l4-8"/></svg>' },
                        { id: 'hopin', label: 'Hopin', path: '/hopin', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 15 12 12 17 9 12 12 7"/></svg>' },
                        { id: 'bonding', label: 'Bonding', path: '/bonds', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
                        { id: 'grounding', label: 'WREX', path: '/grounding', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11a3 3 0 1 1 6 0a3 3 0 0 1-6 0"/><path d="M9 11a3 3 0 0 0-1 2v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4a3 3 0 0 0-1-2"/></svg>' },
                        { id: 'breathing', label: 'Breathing', path: '/breathing', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>' },
                        { id: 'plans', label: 'Plans', path: '/plans', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
                        { id: 'ranking', label: 'Ranking', path: '/rankings', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
                      ].map((feature) => (
                        <button
                          key={feature.id}
                          onClick={() => {
                            router.push(feature.path);
                            setShowFeatureModal(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px',
                            textAlign: 'left',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#374151',
                            fontSize: '14px',
                            transition: 'background-color 0.2s',
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: feature.svg }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                          <span>{feature.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className={styles.messagesArea}>
              {(selectedConversationId && messages[selectedConversationId] && messages[selectedConversationId].length > 0) ? (
                messages[selectedConversationId]!.map((msg, idx) => {
                  const isOwnMessage = msg.senderId === userId;
                  const prevMsg = idx > 0 ? messages[selectedConversationId]![idx - 1] : null;
                  const isSameSender = prevMsg?.senderId === msg.senderId;
                  const isCollaborationMessage = msg.content.includes('Started') && msg.content.includes('collaboration');

                  return (
                    <div
                      key={msg.id}
                      className={`${styles.messageWrapper} ${isOwnMessage ? styles.own : styles.other}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginBottom: isSameSender ? '6px' : '14px',
                        paddingBottom: isSameSender ? '2px' : '6px',
                        borderTop: !isSameSender && idx > 0 ? '1px solid #f3f4f6' : 'none',
                        paddingTop: !isSameSender && idx > 0 ? '6px' : '0px',
                      }}
                    >
                      {/* Message Row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' }}>
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
                              flexShrink: 0,
                            }}
                          >
                            {msg.senderName?.charAt(0) || 'U'}
                          </div>
                        )}
                        {!isOwnMessage && isSameSender && (
                          <div style={{ width: '32px', flexShrink: 0 }} />
                        )}

                        {/* Message bubble */}
                        <div
                          className={styles.messageBubble}
                          style={{
                            maxWidth: '65%',
                            padding: '10px 14px',
                            borderRadius: isOwnMessage
                              ? '18px 18px 4px 18px'
                              : '18px 18px 18px 4px',
                            backgroundColor: isOwnMessage ? '#3b82f6' : '#f3f4f6',
                            color: isOwnMessage ? '#ffffff' : '#1f2937',
                            wordWrap: 'break-word',
                            wordBreak: 'break-word',
                            boxShadow: isOwnMessage
                              ? '0 2px 8px rgba(59, 130, 246, 0.15)'
                              : '0 1px 3px rgba(0,0,0,0.08)',
                            transition: 'all 0.2s ease',
                            border: isOwnMessage ? 'none' : '1px solid #e5e7eb',
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
                            <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#374151', letterSpacing: '0.3px' }}>
                              {msg.senderName}
                            </p>
                          )}
                          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
                            {msg.content.replace(/\s*\[INVITE_ID:[^\]]+\]/, '')}
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

                      {/* Collaboration Action Buttons */}
                      {isCollaborationMessage && !isOwnMessage && (() => {
                        // Extract inviteId from message content
                        const inviteIdMatch = msg.content.match(/\[INVITE_ID:([^\]]+)\]/);
                        const inviteId = inviteIdMatch ? inviteIdMatch[1] : null;

                        // Check if this invite has already been responded to
                        if (!inviteId || respondedInvites.has(inviteId)) {
                          return null;
                        }

                        const handleAction = async (action: 'ACCEPT' | 'REJECT') => {
                          if (!inviteId) {
                            console.error('No invite ID found');
                            return;
                          }

                          try {
                            const response = await fetch('/api/collaboration/canvas-invite', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                inviteId,
                                action,
                              }),
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              alert(`Failed to ${action.toLowerCase()} invitation: ${error.error}`);
                              return;
                            }

                            const result = await response.json();
                            console.log(`Collaboration invite ${action.toLowerCase()}ed:`, result);

                            // Mark this invite as responded to hide buttons
                            setRespondedInvites((prev) => new Set([...prev, inviteId]));

                            // Navigate to feature page if accepting
                            if (action === 'ACCEPT' && result.sessionId && result.featureType) {
                              const featureRoutes: { [key: string]: string } = {
                                CANVAS: '/journal',
                                HOPIN: '/hopin',
                                BREATHING: '/breathing',
                              };

                              const route = featureRoutes[result.featureType] || '/journal';
                              router.push(`${route}?sessionId=${result.sessionId}`);
                            }
                          } catch (error) {
                            console.error(`Error ${action.toLowerCase()}ing invitation:`, error);
                            alert(`Error ${action.toLowerCase()}ing invitation`);
                          }
                        };

                        return (
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '8px',
                            marginLeft: '40px'
                          }}>
                            <button
                              onClick={() => handleAction('ACCEPT')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#059669';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981';
                              }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => handleAction('REJECT')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc2626';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ef4444';
                              }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        );
                      })()}
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

            {/* Feature Collaboration Modal */}
            {showFeatureModal && showFeatureModal !== 'features' && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100,
                  borderRadius: 'inherit',
                }}
                onClick={() => setShowFeatureModal(null)}
              >
                <div
                  style={{
                    backgroundColor: theme === 'light' ? '#ffffff' : theme === 'dark' ? '#1a1a1a' : '#f5f3f0',
                    color: theme === 'light' ? '#000000' : theme === 'dark' ? '#ffffff' : '#3d3a37',
                    borderRadius: '12px',
                    padding: '24px',
                    width: '90%',
                    maxWidth: '500px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: theme === 'light' ? '#000000' : theme === 'dark' ? '#ffffff' : '#3d3a37' }}>
                      {showFeatureModal === 'canvas' && '🎨 Canvas'}
                      {showFeatureModal === 'hopin' && '🎉 Hopin'}
                      {showFeatureModal === 'bonding' && '👥 Bonding'}
                      {showFeatureModal === 'grounding' && '🧘 WREX'}
                      {showFeatureModal === 'journal' && '📔 Journaling'}
                      {showFeatureModal === 'breathing' && '💨 Breathing'}
                      {showFeatureModal === 'plans' && '📋 Plans'}
                      {showFeatureModal === 'ranking' && '🏆 Ranking'}
                    </h3>
                    <button
                      onClick={() => setShowFeatureModal(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        color: theme === 'light' ? '#999999' : theme === 'dark' ? '#666666' : '#999999',
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <p style={{ color: theme === 'light' ? '#666666' : theme === 'dark' ? '#cccccc' : '#666666', fontSize: '14px', marginBottom: '16px' }}>
                    Collaborate with {selectedConversation.participantName} on this activity
                  </p>

                  {/* Feature Content */}
                  <div style={{ marginBottom: '20px' }}>
                    {showFeatureModal === 'bonding' && (
                      <div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#000000' }}>Shared Bonding Activity</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                            Start a bonding conversation. Share what you're grateful for today or discuss meaningful moments together.
                          </p>
                        </div>
                        <textarea
                          placeholder="Share your thoughts with {selectedConversation.participantName}..."
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            minHeight: '100px',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                    {showFeatureModal === 'grounding' && (
                      <div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#000000' }}>5-4-3-2-1 WREX Exercise</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                            Do this WREX exercise together. Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.
                          </p>
                        </div>
                        <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#666666' }}>
                          <p>📍 <strong>Current step:</strong> Look around and identify 5 things you can see</p>
                          <p>Ready to start together?</p>
                        </div>
                      </div>
                    )}
                    {showFeatureModal === 'journal' && (
                      <div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#000000' }}>Shared Journal Entry</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                            Write about your day, feelings, or experiences. You can see each other's entries and support one another.
                          </p>
                        </div>
                        <textarea
                          placeholder="Write your journal entry here..."
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            minHeight: '120px',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                    {showFeatureModal === 'breathing' && (
                      <div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#000000' }}>Guided Breathing Exercise</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                            Breathe together. Follow the guided pace: Breathe in for 4, hold for 4, exhale for 4.
                          </p>
                        </div>
                        <div style={{ backgroundColor: '#e0e7ff', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🫁</div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#000000' }}>Ready to breathe together?</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666666' }}>You and {selectedConversation.participantName} can start a synchronized breathing session.</p>
                        </div>
                      </div>
                    )}
                    {showFeatureModal === 'canvas' && (
                      <div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#000000' }}>Collaborative Canvas</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                            Create and draw together in real-time. Share your ideas visually with {selectedConversation.participantName}.
                          </p>
                        </div>
                        <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎨</div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#000000' }}>Start Drawing</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666666' }}>Launch a shared canvas for collaborative sketching.</p>
                        </div>
                      </div>
                    )}
                    {showFeatureModal === 'hopin' && (
                      <div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#000000' }}>Hopin Events</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                            Join or create events together. Discover and attend virtual or in-person events.
                          </p>
                        </div>
                        <div style={{ backgroundColor: '#fecaca', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#000000' }}>Find Events</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666666' }}>Explore events and invite {selectedConversation.participantName}.</p>
                        </div>
                      </div>
                    )}
                    {showFeatureModal === 'plans' && (
                      <div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#000000' }}>Shared Plans</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                            Create and manage plans together. Organize meetups, projects, or goals.
                          </p>
                        </div>
                        <textarea
                          placeholder="What would you like to plan with {selectedConversation.participantName}..."
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            minHeight: '100px',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                    {showFeatureModal === 'ranking' && (
                      <div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#000000' }}>Leaderboard & Ranking</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                            View rankings and compete in friendly challenges with your community.
                          </p>
                        </div>
                        <div style={{ backgroundColor: '#dbeafe', padding: '20px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '24px', fontWeight: '600', color: '#000000' }}>1st</div>
                              <div style={{ fontSize: '12px', color: '#666666' }}>You</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '24px', fontWeight: '600', color: '#000000' }}>2nd</div>
                              <div style={{ fontSize: '12px', color: '#666666' }}>{selectedConversation.participantName}</div>
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666666', textAlign: 'center' }}>Keep building streaks to climb the leaderboard!</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowFeatureModal(null)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: theme === 'light' ? '1px solid #e5e7eb' : theme === 'dark' ? '1px solid #333333' : '1px solid #e0dada',
                        backgroundColor: theme === 'light' ? '#ffffff' : theme === 'dark' ? '#2a2a2a' : '#f5f3f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: theme === 'light' ? '#374151' : theme === 'dark' ? '#cccccc' : '#3d3a37',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'light' ? '#f9fafb' : theme === 'dark' ? '#3a3a3a' : '#ebe7e2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'light' ? '#ffffff' : theme === 'dark' ? '#2a2a2a' : '#f5f3f0';
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        // Send feature collaboration message
                        const featureNames: { [key: string]: string } = {
                          canvas: 'Canvas',
                          hopin: 'Hopin',
                          bonding: 'Bonding',
                          grounding: 'Grounding',
                          journal: 'Journaling',
                          breathing: 'Breathing',
                          plans: 'Plans',
                          ranking: 'Ranking',
                        };
                        const featureEmojis: { [key: string]: string } = {
                          canvas: '🎨',
                          hopin: '🎉',
                          bonding: '👥',
                          grounding: '🧘',
                          journal: '📔',
                          breathing: '💨',
                          plans: '📋',
                          ranking: '🏆',
                        };

                        if (!selectedConversationId || !userId) return;

                        const featureName = featureNames[showFeatureModal as string];
                        const featureEmoji = featureEmojis[showFeatureModal as string];
                        const collaborationMessage = `${featureEmoji} Started ${featureName} collaboration. Let's do this together!`;

                        // Create optimistic message
                        const optimisticMessage: Message = {
                          id: Date.now().toString(),
                          conversationId: selectedConversationId,
                          senderId: userId,
                          senderName: 'You',
                          content: collaborationMessage,
                          timestamp: Date.now(),
                          read: true,
                        };

                        // Add optimistic message to UI
                        setMessages(prev => ({
                          ...prev,
                          [selectedConversationId]: [...(prev[selectedConversationId] || []), optimisticMessage]
                        }));

                        // Update conversation
                        setConversations(prev =>
                          prev.map(conv =>
                            conv.id === selectedConversationId
                              ? { ...conv, lastMessage: collaborationMessage, lastMessageTime: Date.now() }
                              : conv
                          )
                        );

                        // Send actual message
                        await sendMessage(selectedConversationId, collaborationMessage);
                        setShowFeatureModal(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: 'none',
                        backgroundColor: theme === 'light' ? '#FFB3BA' : theme === 'dark' ? '#FF7A5C' : '#D4A5A0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#ffffff',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'light' ? '#FF99AA' : theme === 'dark' ? '#FF5C3C' : '#C99490';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'light' ? '#FFB3BA' : theme === 'dark' ? '#FF7A5C' : '#D4A5A0';
                      }}
                    >
                      Start Activity
                    </button>
                  </div>
                </div>
              </div>
            )}

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

    </div>
  );
}

// Wrapper component that provides theme
export default function MessagesPage() {
  return (
    <ThemeProvider>
      <MessagesPageContent />
    </ThemeProvider>
  );
}
