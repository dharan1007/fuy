/**
 * Messages Page - Web Version
 * Displays conversations list with AI Assistant integration and real-time messaging
 */

import { ArrowLeft, Flag, MoreVertical, Edit2, Check, X, Search, Paperclip, Smile } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AIChatbot from '@/components/AIChatbot';
import { useMessaging } from '../hooks/useMessaging';
import styles from './MessagesPage.module.css';
import { SpaceBackground } from '@/components/SpaceBackground';

interface Conversation {
  id: string;
  participantName: string;
  participantId: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  avatar?: string;
  isMuted?: boolean;
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

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Inner component that uses theme
function MessagesPageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  // const { theme, setTheme, themes } = useTheme(); // Removed for now to disable toggle
  const theme = 'light'; // Default to light or whatever the global default is

  const {
    conversations,
    messages,
    followers,
    following,
    onlineUsers,
    typingUsers,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startTyping,
    stopTyping,
    createOrGetConversation,
    getAllChatUsers,
    addOptimisticMessage,
    deleteConversation,
    cursors,
    activeCollaboration,
  } = useMessaging();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialUserId = searchParams?.get('userId');

  // Deep Link Handling for userId
  useEffect(() => {
    if (initialUserId && userId && conversations.length > 0) {
      // 1. Check if conversation exists
      const existing = conversations.find(c => c.participantId === initialUserId);
      if (existing) {
        setSelectedConversationId(existing.id);
        // Clear param to avoid re-triggering? Maybe not necessary but cleaner URL
        // window.history.replaceState({}, '', '/chat'); 
      } else {
        // 2. If not, create it
        createOrGetConversation(initialUserId).then(id => {
          if (id) {
            setSelectedConversationId(id);
            fetchMessages(id);
          }
        });
      }
    }
  }, [initialUserId, userId, conversations, createOrGetConversation, fetchMessages]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false);
  const [showRetentionSettings, setShowRetentionSettings] = useState(false);
  const [chatRetention, setChatRetention] = useState<'1day' | '7days' | '30days' | 'forever'>('forever');
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState<string | null>(null);

  const [activeContextMenuId, setActiveContextMenuId] = useState<string | null>(null);

  // Bonding / Locker State
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [chatFacts, setChatFacts] = useState<{ id: string; keyword: string; warningText: string }[]>([]);
  const [activeFactWarning, setActiveFactWarning] = useState<string | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [taggingMessageId, setTaggingMessageId] = useState<string | null>(null);

  const [respondedInvites, setRespondedInvites] = useState<Map<string, { status: 'ACCEPTED' | 'REJECTED'; sessionId?: string; featureType?: string }>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        // Run all search queries in parallel
        const [followersRes, followingRes, allUsersRes] = await Promise.all([
          fetch(`/api/users/followers-following?type=followers&search=${encodeURIComponent(query)}`),
          fetch(`/api/users/followers-following?type=following&search=${encodeURIComponent(query)}`),
          fetch(`/api/search/users?search=${encodeURIComponent(query)}`)
        ]);

        const followersData = followersRes.ok ? await followersRes.json() : { users: [] };
        const followingData = followingRes.ok ? await followingRes.json() : { users: [] };
        const allUsersData = allUsersRes.ok ? await allUsersRes.json() : { users: [] };

        // Combine followers and following results
        const followersFollowingResults = [...followersData.users, ...followingData.users];
        const followersFollowingMap = new Map(
          followersFollowingResults.map((u: Friend) => [u.id, u])
        );

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
  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversationId || !userId) return;

    const content = messageInput.trim();
    setMessageInput('');
    stopTyping(selectedConversationId);

    // Send via API (hook handles optimistic update)
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

  // Handle message input changes with typing indicator & Fact Checking
  const handleMessageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    // Check for facts
    const matchedFact = chatFacts.find(f => value.toLowerCase().includes(f.keyword.toLowerCase()));
    if (matchedFact) {
      setActiveFactWarning(matchedFact.warningText);
    } else {
      setActiveFactWarning(null);
    }

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
  }, [selectedConversationId, startTyping, stopTyping, typingTimeout, chatFacts]);

  // Derive selected conversation from conversations list
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Message retention logic removed for refactor - relies on server-side retention or future hook implementation

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId && selectedConversation) {
      if (!messages[selectedConversationId]) {
        fetchMessages(selectedConversationId);
      }

      // Fetch bonding facts for this user
      fetch(`/api/bonding?profileId=${selectedConversation.participantId}`)
        .then(res => res.json())
        .then(data => {
          if (data.facts) setChatFacts(data.facts);
        })
        .catch(err => console.error('Error fetching bonding facts:', err));
    }
  }, [selectedConversationId, messages, fetchMessages, selectedConversation]);

  // Handle Real-time Collaboration Redirect
  useEffect(() => {
    if (activeCollaboration) {
      const { sessionId, featureType, conversationId } = activeCollaboration;
      // Only redirect if we are in the relevant conversation or if we want to force redirect even if elsewhere?
      // "Both users should be redirected". Assuming regardless of where they are in the app, or at least if in chat.
      // Usually better to check if it's the right conversation, but for "instant" collab, maybe just go.
      // Let's go.
      const featureRoutes: { [key: string]: string } = {
        CANVAS: '/journal',
        HOPIN: '/hopin',
        BREATHING: '/breathing',
        BONDING: '/bonds',
        JOURNAL: '/journal',
        PLANS: '/pomodoro',
        RANKING: '/rankings',
        GROUNDING: '/grounding'
      };
      const route = featureRoutes[featureType] || '/journal';
      router.push(`${route}?sessionId=${sessionId}`);
    }
  }, [activeCollaboration, router]);

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

  const handleConversationAction = async (conversationId: string, action: 'mute' | 'delete') => {
    try {
      // Optimistic update
      // Optimistic update
      if (action === 'delete') {
        await deleteConversation(conversationId);
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null);
        }
      } else if (action === 'mute') {
        // Toggle mute state locally if we had it in the type
      }

      setActiveContextMenuId(null);

      const conv = conversations.find(c => c.id === conversationId);
      // @ts-ignore
      const isMuted = conv?.isMuted;
      const finalAction = action === 'mute' && isMuted ? 'unmute' : action;

      await fetch(`/api/chat/conversations/${conversationId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: finalAction })
      });

      // Refresh conversations to get updated state
      fetchConversations();
    } catch (err) {
      console.error('Failed to update conversation state:', err);
    }
  };

  const handleTagMessage = async (type: string) => {
    if (!taggingMessageId || !selectedConversation) return;

    try {
      const res = await fetch('/api/bonding/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: taggingMessageId,
          profileId: selectedConversation.participantId,
          tagType: type,
        }),
      });

      if (res.ok) {
        setShowTagModal(false);
        setTaggingMessageId(null);
      }
    } catch (error) {
      console.error('Error tagging message:', error);
    }
  };

  return (
    <div className={styles.container} data-theme={theme} style={{ position: 'relative' }}>
      <SpaceBackground />
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

        </div>

        {/* Search Input */}
        <div className={styles.searchContainer} style={{ position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.searchIcon}>
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
              backgroundColor: 'rgba(0,0,0,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderTop: 'none',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
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
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#9ca3af',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
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
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: isAlreadyConversation ? 'rgba(255,255,255,0.1)' : 'transparent',
                          fontSize: '14px',
                          color: '#ffffff',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isAlreadyConversation ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isAlreadyConversation ? 'rgba(255,255,255,0.1)' : 'transparent')}
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
                              <div style={{ fontWeight: '500', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              style={{ position: 'relative' }}
            >
              <div className={styles.avatar} style={conv.avatar ? {
                backgroundImage: `url(${conv.avatar})`,
                backgroundPosition: 'center',
                fontSize: 0
              } : {}}>
                {!conv.avatar && conv.participantName.charAt(0)}
              </div>
              <div className={styles.conversationInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>
                    {conv.participantName}
                    {/* @ts-ignore */}
                    {conv.isMuted && <span style={{ fontSize: '10px', marginLeft: '6px', opacity: 0.6 }}>🔇</span>}
                  </span>
                  <span className={styles.time}>{formatTime(conv.lastMessageTime)}</span>
                </div>
                <span className={styles.preview}>{conv.lastMessage}</span>
              </div>
              {conv.unreadCount > 0 && (
                <div className={styles.unreadBadge}>{conv.unreadCount}</div>
              )}

              {/* Context Menu Trigger (Only visible on hover or if active) */}
              <button
                className="context-menu-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveContextMenuId(activeContextMenuId === conv.id ? null : conv.id);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'none', // Shown via CSS hover
                }}
              >
                ⋮
              </button>

              {/* Context Menu */}
              {activeContextMenuId === conv.id && (
                <div
                  style={{
                    position: 'absolute',
                    right: '30px',
                    top: '20px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    overflow: 'hidden',
                    minWidth: '120px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleConversationAction(conv.id, 'mute')}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: '#e5e7eb'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* @ts-ignore */}
                    {conv.isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <button
                    onClick={() => handleConversationAction(conv.id, 'delete')}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: '#ef4444',
                      borderTop: '1px solid rgba(255,255,255,0.1)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Delete Chat
                  </button>
                </div>
              )}

              <style jsx>{`
                .${styles.conversationItem}:hover .context-menu-trigger {
                  display: block !important;
                }
              `}</style>
            </div>
          ))}
        </div>
      </div >

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {
          showAIChat ? (
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
                    <p style={{ color: onlineUsers.has(selectedConversation.participantId) ? '#10b981' : '#9ca3af' }}>
                      {onlineUsers.has(selectedConversation.participantId) ? '● Online' : '● Offline'}
                    </p>
                  </div>

                  {/* Bonding Dashboard Link */}
                  <button
                    className={styles.iconButton}
                    title="View Bonding Dashboard"
                    onClick={() => router.push(`/bonds?profileId=${selectedConversation.participantId}`)}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: 'block', minWidth: '24px', minHeight: '24px', color: '#ffffff' }}
                      className="text-white"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
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
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ display: 'block', minWidth: '24px', minHeight: '24px', color: '#ffffff' }}
                        className="text-white"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </button>

                    {/* Retention Settings Popup */}
                    {showRetentionSettings && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        minWidth: '200px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        zIndex: 20,
                      }}>
                        <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>
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
                              backgroundColor: chatRetention === option ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                              color: chatRetention === option ? '#60a5fa' : '#e5e7eb',
                              fontSize: '14px',
                              transition: 'background-color 0.2s',
                              borderBottom: option !== 'forever' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (chatRetention !== option) {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
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

                  {/* Feature Collaboration Trigger */}
                  <div style={{ position: 'relative' }}>
                    <button
                      className={styles.iconButton}
                      title="Collaborative features"
                      onClick={() => setShowFeatureModal('features')}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ display: 'block', minWidth: '24px', minHeight: '24px', color: '#ffffff' }}
                        className="text-white"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className={styles.messagesArea}>
                {selectedConversationId && cursors[selectedConversationId] && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                    <button
                      onClick={() => fetchMessages(selectedConversationId, cursors[selectedConversationId] || undefined)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb';
                        e.currentTarget.style.color = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.color = '#6b7280';
                      }}
                    >
                      Load previous messages
                    </button>
                  </div>
                )}
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
                          borderTop: !isSameSender && idx > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
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
                              backgroundColor: isOwnMessage ? '#000000' : 'rgba(255,255,255,0.1)', // Changed to black for own messages
                              color: '#ffffff',
                              wordWrap: 'break-word',
                              wordBreak: 'break-word',
                              boxShadow: isOwnMessage
                                ? '0 2px 8px rgba(0, 0, 0, 0.5)'
                                : '0 1px 3px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s ease',
                              border: isOwnMessage ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)', // Added border for black bubble visibility
                              // @ts-ignore
                              opacity: msg.status === 'sending' ? 0.7 : 1,
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
                              <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#e5e7eb', letterSpacing: '0.3px' }}>
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
                              {/* @ts-ignore */}
                              {msg.status === 'sending' && <span style={{ marginLeft: '4px' }}>🕒</span>}
                              {/* @ts-ignore */}
                              {msg.status === 'failed' && <span style={{ marginLeft: '4px', color: '#ef4444' }} title="Failed to send">⚠️</span>}
                            </p>
                          </div>

                          {/* Message Context Menu Trigger - ALWAYS VISIBLE */}
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button
                              className="msg-menu-trigger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id);
                              }}
                              style={{
                                opacity: 1,
                                background: 'transparent',
                                border: 'none',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                fontSize: '18px',
                                lineHeight: '1',
                                marginLeft: '4px',
                                marginRight: '4px',
                              }}
                              title="Tag Message"
                            >
                              ⋮
                            </button>
                            {activeMessageMenuId === msg.id && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                backgroundColor: '#1a1a1a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                zIndex: 50,
                                minWidth: '150px',
                                overflow: 'hidden'
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTaggingMessageId(msg.id);
                                    setShowTagModal(true);
                                    setActiveMessageMenuId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#e5e7eb'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <span>🏷️</span> Tag Message
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Collaboration Action Buttons and Status */}
                        {(() => {
                          const isCollaborationMessage = msg.content.includes('[INVITE_ID:');
                          if (!isCollaborationMessage) return null;

                          // Extract inviteId
                          const inviteIdMatch = msg.content.match(/\[INVITE_ID:([^\]]+)\]/);
                          const inviteId = inviteIdMatch ? inviteIdMatch[1] : null;

                          if (!inviteId) return null;

                          // If SENDER: Show Pending Status
                          if (isOwnMessage) {
                            return (
                              <div style={{
                                marginTop: '8px',
                                fontSize: '12px',
                                color: '#6b7280',
                                fontStyle: 'italic',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                justifyContent: 'flex-end'
                              }}>
                                <span>⏳ Waiting for response...</span>
                              </div>
                            );
                          }

                          // If RECIPIENT: Show Action Buttons
                          // Check if already responded
                          const responseState = respondedInvites.get(inviteId);

                          if (responseState) {
                            if (responseState.status === 'ACCEPTED') {
                              return (
                                <button
                                  onClick={() => {
                                    const featureRoutes: { [key: string]: string } = {
                                      CANVAS: '/journal',
                                      HOPIN: '/hopin',
                                      BREATHING: '/breathing',
                                      BONDING: '/bonds',
                                      JOURNAL: '/journal',
                                      PLANS: '/pomodoro',
                                      RANKING: '/rankings',
                                      GROUNDING: '/grounding'
                                    };
                                    const route = featureRoutes[responseState.featureType || ''] || '/journal';
                                    if (responseState.sessionId) {
                                      router.push(`${route}?sessionId=${responseState.sessionId}`);
                                    }
                                  }}
                                  style={{
                                    marginTop: '8px',
                                    fontSize: '12px',
                                    color: '#ffffff',
                                    backgroundColor: '#10b981',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    marginLeft: '40px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                  }}
                                >
                                  ✓ Responded (Click to Rejoin)
                                </button>
                              );
                            } else {
                              return (
                                <div style={{
                                  marginTop: '8px',
                                  fontSize: '12px',
                                  color: '#ef4444',
                                  fontStyle: 'italic',
                                  marginLeft: '40px'
                                }}>
                                  <span>✕ Rejected</span>
                                </div>
                              );
                            }
                          }

                          const handleAction = async (action: 'ACCEPT' | 'REJECT') => {
                            try {
                              const response = await fetch('/api/collaboration/invite', {
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

                              setRespondedInvites((prev) => new Map(prev).set(inviteId, {
                                status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
                                sessionId: result.sessionId,
                                featureType: result.featureType
                              }));

                              // Check for immediate redirection (Rejoin or First Accept)
                              if (result.sessionId) {
                                const featureRoutes: { [key: string]: string } = {
                                  CANVAS: '/journal',
                                  HOPIN: '/hopin',
                                  BREATHING: '/breathing',
                                  BONDING: '/bonds',
                                  JOURNAL: '/journal',
                                  PLANS: '/pomodoro',
                                  RANKING: '/rankings',
                                  GROUNDING: '/grounding'
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
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
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
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; }}
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
                    <p style={{ fontSize: '12px', marginTop: '8px', color: '#9ca3af' }}>
                      Messages are secure and private
                    </p>
                  </div>
                )}

                {/* Tagging Modal */}
                {showTagModal && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                    onClick={() => setShowTagModal(false)}
                  >
                    <div style={{
                      backgroundColor: '#1a1a1a',
                      padding: '24px',
                      borderRadius: '16px',
                      width: '300px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                      onClick={e => e.stopPropagation()}
                    >
                      <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#ffffff' }}>Tag Message</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginTop: '4px' }}>Blacklist Locker</div>
                        {['BLACKLIST', 'ANGRY', 'SAD'].map(type => (
                          <button
                            key={type}
                            onClick={() => handleTagMessage(type)}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fef2f2',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontWeight: '500',
                              textAlign: 'left'
                            }}
                          >
                            {type}
                          </button>
                        ))}
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginTop: '8px' }}>Happy Locker</div>
                        {['HAPPY', 'JOY', 'FUNNY'].map(type => (
                          <button
                            key={type}
                            onClick={() => handleTagMessage(type)}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid #dcfce7',
                              backgroundColor: '#f0fdf4',
                              color: '#22c55e',
                              cursor: 'pointer',
                              fontWeight: '500',
                              textAlign: 'left'
                            }}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowTagModal(false)}
                        style={{
                          marginTop: '16px',
                          width: '100%',
                          padding: '10px',
                          border: 'none',
                          background: 'transparent',
                          color: '#6b7280',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
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

              {/* Feature Collaboration Sidebar & Overlay */}
              <>
                <div
                  className={`${styles.featureSidebarOverlay} ${showFeatureModal ? styles.open : ''}`}
                  onClick={() => setShowFeatureModal(null)}
                />

                <div className={`${styles.featureSidebar} ${showFeatureModal ? styles.open : ''}`}>
                  <div className={styles.featureSidebarHeader}>
                    {showFeatureModal !== 'features' && showFeatureModal !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          className={styles.backToFeaturesBtn}
                          onClick={() => setShowFeatureModal('features')}
                        >
                          ← Back
                        </button>
                      </div>
                    ) : (
                      <h3>Collaborate</h3>
                    )}
                    <button
                      className={styles.closeSidebarButton}
                      onClick={() => setShowFeatureModal(null)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.featureSidebarContent}>
                    {showFeatureModal === 'features' ? (
                      <div>
                        <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{followers.length + following.length}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Connections</div>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{conversations.length}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Chats</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>5</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Streak</div>
                            </div>
                          </div>
                        </div>

                        <div className={styles.featureTitle} style={{ marginBottom: '12px' }}>Select Activity</div>

                        <div className={styles.featureGrid}>
                          {[
                            { id: 'canvas', label: 'Canvas', icon: '🎨' },
                            { id: 'hopin', label: 'Hopin', icon: '🎉' },
                            { id: 'bonding', label: 'Bonding', icon: '👥' },
                            { id: 'grounding', label: 'WREX', icon: '🧘' },
                            { id: 'breathing', label: 'Breathing', icon: '💨' },
                            { id: 'journal', label: 'Journal', icon: '📔' },
                            { id: 'plans', label: 'Plans', icon: '📋' },
                            { id: 'ranking', label: 'Ranking', icon: '🏆' },
                          ].map(f => (
                            <div
                              key={f.id}
                              className={styles.featureGridItem}
                              onClick={() => setShowFeatureModal(f.id)}
                            >
                              <div className={styles.featureIcon}>{f.icon}</div>
                              <span className={styles.featureLabel}>{f.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : showFeatureModal && (
                      <div className={styles.featureDetail}>
                        <div className={styles.featureDescriptionBox}>
                          <h4 className={styles.featureTitle}>
                            {showFeatureModal === 'canvas' && '🎨 Collaborative Canvas'}
                            {showFeatureModal === 'hopin' && '🎉 Hopin Events'}
                            {showFeatureModal === 'bonding' && '👥 Shared Bonding'}
                            {showFeatureModal === 'grounding' && '🧘 WREX Exercise'}
                            {showFeatureModal === 'journal' && '📔 Shared Journal'}
                            {showFeatureModal === 'breathing' && '💨 Breathing Session'}
                            {showFeatureModal === 'plans' && '📋 Shared Plans'}
                            {showFeatureModal === 'ranking' && '🏆 Leaderboard'}
                          </h4>
                          <p className={styles.featureDesc}>
                            {showFeatureModal === 'canvas' && "Create and draw together in real-time. Share your ideas visually."}
                            {showFeatureModal === 'hopin' && "Join or create events together. Discover and attend virtual or in-person events."}
                            {showFeatureModal === 'bonding' && "Start a bonding conversation. Share what you're grateful for today."}
                            {showFeatureModal === 'grounding' && "Do a 5-4-3-2-1 WREX exercise together to stay grounded."}
                            {showFeatureModal === 'journal' && "Write about your day or feelings. Support one another."}
                            {showFeatureModal === 'breathing' && "Breathe together. Follow the guided pace."}
                            {showFeatureModal === 'plans' && "Create and manage plans together. Organize meetups."}
                            {showFeatureModal === 'ranking' && "View rankings and compete in friendly challenges."}
                          </p>
                        </div>

                        {/* Feature Specific Inputs */}
                        {(showFeatureModal === 'bonding' || showFeatureModal === 'journal' || showFeatureModal === 'plans') && (
                          <textarea
                            className={styles.featureInput}
                            placeholder={`Add a note for ${selectedConversation?.participantName}...`}
                          />
                        )}

                        {(showFeatureModal === 'ranking') && (
                          <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px' }}>
                              <div><div style={{ fontSize: '24px' }}>🥇</div><div>You</div></div>
                              <div><div style={{ fontSize: '24px' }}>🥈</div><div>{selectedConversation?.participantName}</div></div>
                            </div>
                          </div>
                        )}

                        <button
                          className={styles.primaryActionBtn}
                          onClick={async () => {
                            // Reusing the logic from the old modal
                            const featureNames: { [key: string]: string } = {
                              canvas: 'Canvas', hopin: 'Hopin', bonding: 'Bonding',
                              grounding: 'Grounding', journal: 'Journaling', breathing: 'Breathing',
                              plans: 'Plans', ranking: 'Ranking',
                            };
                            const featureEmojis: { [key: string]: string } = {
                              canvas: '🎨', hopin: '🎉', bonding: '👥',
                              grounding: '🧘', journal: '📔', breathing: '💨',
                              plans: '📋', ranking: '🏆',
                            };

                            if (!selectedConversationId || !userId) return;

                            const featureName = featureNames[showFeatureModal as string];

                            if (featureName) {
                              try {
                                const featureType = showFeatureModal?.toUpperCase();
                                const response = await fetch('/api/collaboration/invite', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    conversationId: selectedConversationId,
                                    recipientId: selectedConversation?.participantId,
                                    featureType,
                                    title: `${featureName} Session`
                                  })
                                });

                                if (!response.ok) throw new Error('Failed to send invite');

                                if (featureRoutes[showFeatureModal as keyof typeof featureRoutes]) {
                                  // Optional: navigate immediately? Or wait for accept.
                                  // Logic suggests we stay in chat until accepted, or maybe we just sent invite.
                                  // The original code had navigation here, but improved flow is wait for accept.
                                  // Preserving original 'navigation if route exists' logic for now as a fallback or immediate jump?
                                  // Actually, standard flow now is: Send Invite -> Wait for Partner to Accept -> Both Navigate.
                                  // So we just close modal.
                                }

                                setShowFeatureModal(null);
                              } catch (err) {
                                console.error("Failed to start collaboration:", err);
                                alert("Failed to send invite. Please try again.");
                              }
                            }
                          }}
                        >
                          Start Activity
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>

              {/* Input Area */}
              <div className={styles.inputArea} style={{ position: 'relative' }}>
                {activeFactWarning && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '20px',
                    right: '20px',
                    marginBottom: '10px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 10
                  }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <div>
                      <div style={{ fontSize: '11px', color: '#b45309', fontWeight: '700' }}>FACT WARNING</div>
                      <div style={{ fontSize: '13px', color: '#92400e' }}>{activeFactWarning}</div>
                    </div>
                  </div>
                )}
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
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: 'block', minWidth: '20px', minHeight: '20px', color: '#ffffff' }}
                      className="text-white"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
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

// Wrapper component
export default function MessagesPage() {
  return (
    <MessagesPageContent />
  );
}
