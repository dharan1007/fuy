/**
 * Messages Page - Web Version
 * Displays conversations list with real-time messaging
 */

import { ArrowLeft, Flag, MoreVertical, Edit2, Check, X, Search, Paperclip, Smile } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { useMessaging, Message, Friend } from '../hooks/useMessaging';
import styles from './MessagesPage.module.css';
import { SpaceBackground } from '@/components/SpaceBackground';

// Helper for Tag Colors
const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
        case 'urgent': return 'bg-red-500/20 border-red-500';
        case 'fun': return 'bg-yellow-500/20 border-yellow-500';
        case 'work': return 'bg-blue-500/20 border-blue-500';
        case 'idea': return 'bg-purple-500/20 border-purple-500';
        default: return 'bg-white/10 border-white/20';
    }
};

const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Inner component that uses theme
function MessagesPageContent() {
    const router = useRouter();
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id;
    const theme = 'light';

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
        deleteConversation,
        activeCollaboration,
        markAsRead
    } = useMessaging();

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialUserId = searchParams?.get('userId');

    // Deep Link Handling
    useEffect(() => {
        if (initialUserId && userId && conversations.length > 0) {
            const existing = conversations.find(c => c.participantId === initialUserId);
            if (existing) {
                setSelectedConversationId(existing.id);
            } else {
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
    const [messageInput, setMessageInput] = useState('');
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const [searchResults, setSearchResults] = useState<Friend[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    const [activeContextMenuId, setActiveContextMenuId] = useState<string | null>(null); // For conversations
    const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null); // For messages

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    useEffect(() => {
        if (selectedConversationId && messages[selectedConversationId]) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, selectedConversationId]);


    const filteredConversations = conversations.filter(conv =>
        conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const allChatUsers = getAllChatUsers();
    const filteredLocalFriends = allChatUsers.filter(friend =>
        (friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            friend.profile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
        && searchQuery.length > 0
    );

    const filteredFriends = Array.from(
        new Map([...filteredLocalFriends, ...searchResults].map(f => [f.id, f])).values()
    );

    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        setShowFriendsDropdown(query.length > 0);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (query.length === 0) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const [followersRes, followingRes, allUsersRes] = await Promise.all([
                    fetch(`/api/users/followers-following?type=followers&search=${encodeURIComponent(query)}`),
                    fetch(`/api/users/followers-following?type=following&search=${encodeURIComponent(query)}`),
                    fetch(`/api/search/users?search=${encodeURIComponent(query)}`)
                ]);

                const followersData = followersRes.ok ? await followersRes.json() : { users: [] };
                const followingData = followingRes.ok ? await followingRes.json() : { users: [] };
                const allUsersData = allUsersRes.ok ? await allUsersRes.json() : { users: [] };

                const combined = [...followersData.users, ...followingData.users];
                const map = new Map(combined.map((u: Friend) => [u.id, u]));
                const others = allUsersData.users.filter((user: Friend) => !map.has(user.id));

                setSearchResults([...Array.from(map.values()), ...others]);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, []);

    const handleSendMessage = useCallback(async () => {
        if (!messageInput.trim() || !selectedConversationId || !userId) return;

        const content = messageInput.trim();
        setMessageInput('');
        stopTyping(selectedConversationId);
        await sendMessage(selectedConversationId, content);
    }, [messageInput, selectedConversationId, userId, sendMessage, stopTyping]);

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

    const [customTagInput, setCustomTagInput] = useState('');
    const [warningTag, setWarningTag] = useState<{ tag: string, snippet: string } | null>(null);

    const handleMessageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMessageInput(value);

        // Smart Warning Logic
        if (value.trim().length > 5 && selectedConversationId && messages[selectedConversationId]) {
            const relevantMsg = messages[selectedConversationId].find(m =>
                m.tags && m.tags.length > 0 &&
                (m.content.toLowerCase().includes(value.toLowerCase()) || value.toLowerCase().includes(m.content.toLowerCase())) &&
                Math.abs(m.content.length - value.length) < 50 // Simple proximity check to avoid matching everything if user types "the"
            );

            if (relevantMsg && relevantMsg.tags) {
                setWarningTag({ tag: relevantMsg.tags[0], snippet: relevantMsg.content.substring(0, 20) + '...' });
            } else {
                setWarningTag(null);
            }
        } else {
            setWarningTag(null);
        }

        if (value.trim().length > 0 && selectedConversationId) {
            startTyping(selectedConversationId);
            if (typingTimeout) clearTimeout(typingTimeout);
            const timeout = setTimeout(() => stopTyping(selectedConversationId), 1000);
            setTypingTimeout(timeout);
        } else {
            if (typingTimeout) clearTimeout(typingTimeout);
            if (selectedConversationId) stopTyping(selectedConversationId);
        }
    }, [selectedConversationId, startTyping, stopTyping, typingTimeout, messages]);

    const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

    useEffect(() => {
        if (selectedConversationId && selectedConversation) {
            if (!messages[selectedConversationId]) {
                fetchMessages(selectedConversationId);
            } else {
                // If we have messages, check if strict read logic needed
                markAsRead(selectedConversationId);
            }
        }
    }, [selectedConversationId, messages, fetchMessages, markAsRead, selectedConversation]);

    // Collab redirect
    useEffect(() => {
        if (activeCollaboration) {
            const { sessionId, featureType } = activeCollaboration;
            // Simple map or default
            const route = featureType === 'HOPIN' ? '/hopin' : '/journal';
            router.push(`${route}?sessionId=${sessionId}`);
        }
    }, [activeCollaboration, router]);

    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id);
        setShowMobileSidebar(false);
    };

    const handleDeleteConversation = async (conversationId: string) => {
        if (confirm("Delete this conversation?")) {
            await deleteConversation(conversationId);
            if (selectedConversationId === conversationId) setSelectedConversationId(null);
        }
    }

    const handleTagMessage = async (messageId: string, tag: string) => {
        // API Call placeholder - waiting for Schema check to confirm we can store it
        // For now we just implement the UI side.
        console.log("Tagging message", messageId, tag);
        // Optimistic Logic could be added here if we had state setter access from hook or local
        // Assuming API will update and realtime will push back
        try {
            await fetch('/api/chat/messages/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, tag })
            });
        } catch (e) {
            console.error("Failed to tag message", e);
        }
    };

    // --- Render ---

    return (
        <div className={styles.container} data-theme={theme} style={{ position: 'relative' }}>
            <SpaceBackground />

            {/* Sidebar */}
            <div className={`${styles.sidebar} ${showMobileSidebar ? styles.mobileOpen : ''}`}>
                <div className={styles.header}>
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className={styles.backButton}>←</button>
                        <h1 className="text-xl font-bold text-white m-0">Messages</h1>
                    </div>
                </div>

                {/* Search */}
                <div className={styles.searchContainer}>
                    <input
                        className={styles.searchInput}
                        placeholder="Search people..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {showFriendsDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-black/95 border border-white/10 z-10 max-h-60 overflow-y-auto rounded-b-lg">
                            {isSearching ? <div className="p-3 text-center text-white/50">Searching...</div> : (
                                filteredFriends.map(f => (
                                    <div key={f.id} onClick={() => handleStartConversation(f)} className="p-3 hover:bg-white/10 cursor-pointer flex items-center gap-3 border-b border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                            {f.profile?.displayName?.[0] || f.name[0]}
                                        </div>
                                        <div className="text-white text-sm">{f.profile?.displayName || f.name}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Conversation List */}
                <div className={styles.conversationsList}>
                    {filteredConversations.map(conv => (
                        <div
                            key={conv.id}
                            className={`${styles.conversationItem} ${selectedConversationId === conv.id ? styles.active : ''}`}
                            onClick={() => handleSelectConversation(conv.id)}
                        >
                            <div className={styles.avatar}>
                                {conv.avatar ? <img src={conv.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : conv.participantName[0]}
                                {onlineUsers.has(conv.participantId) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>}
                            </div>
                            <div className={styles.conversationInfo}>
                                <div className={styles.nameRow}>
                                    <span className={styles.name}>{conv.participantName}</span>
                                    <span className={styles.time}>{formatTime(conv.lastMessageTime)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={styles.preview}>
                                        {typingUsers[conv.id]?.size > 0
                                            ? <span className="text-green-400 italic">Typing...</span>
                                            : conv.lastMessage || 'Start chatting'}
                                    </span>
                                    {conv.unreadCount > 0 && <span className={styles.unreadBadge}>{conv.unreadCount}</span>}
                                </div>
                            </div>
                            <button
                                className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 text-white/50 hover:text-red-500 p-1"
                                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={styles.mainContent}>
                {!selectedConversation ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/50">
                        <div className="text-4xl mb-4">💬</div>
                        <p>Select a conversation to start chatting</p>
                    </div>
                ) : (
                    <div className={styles.chatArea}>
                        {/* Header */}
                        <div className={styles.chatHeader}>
                            <button className={styles.mobileMenuToggle} onClick={() => setShowMobileSidebar(!showMobileSidebar)}>☰</button>
                            <div className="flex-1 flex justify-between items-center">
                                <div>
                                    <h2 className="text-white font-bold text-lg">{selectedConversation.participantName}</h2>
                                    <p className="text-xs text-white/50">
                                        {onlineUsers.has(selectedConversation.participantId) ? '● Online' : 'Offline'}
                                    </p>
                                </div>
                                <button
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    title="View Bonding Dashboard"
                                    onClick={() => router.push(`/bonds?profileId=${selectedConversation.participantId}`)}
                                >
                                    <Search className="text-white w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className={styles.messagesList} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(messages[selectedConversationId!] || []).map((msg, i) => {
                                const isMe = msg.senderId === userId;
                                // Always show avatar for other person if it exists, or improve logic (User requested: "profile circle icons should be shown")
                                // Let's show it always for clarity or if it's the start of a block.
                                // The user said "profile circle icons should be shown in the message page side of the users" - likely meaning standard chat UI.
                                // We will show it if !isMe.
                                const showAvatar = !isMe;
                                const isMenuOpen = activeMessageMenuId === msg.id;
                                const tagColorClass = msg.tags?.[0] ? getTagColor(msg.tags[0]) : '';

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 group relative`}
                                        onMouseLeave={() => isMenuOpen && setActiveMessageMenuId(null)} // Auto close if mouse leaves the whole block? Maybe just leaving the menu area.
                                    >
                                        {!isMe && (
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden mb-1">
                                                {selectedConversation.avatar ? (
                                                    <img src={selectedConversation.avatar} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs">
                                                        {selectedConversation.participantName[0]}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Message Bubble Container */}
                                        <div className="relative group/bubble flex items-center gap-2 max-w-[70%]">
                                            {/* 3 Dots Menu Trigger (Left for Me, Right for Others) */}
                                            {isMe && (
                                                <button
                                                    className="opacity-0 group-hover/bubble:opacity-100 p-1 text-white/50 hover:text-white transition-opacity"
                                                    onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id); }}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                            )}

                                            <div
                                                className={`p-3 rounded-2xl text-sm relative ${tagColorClass || (isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'text-white rounded-tl-none border bg-white/10 border-white/20')
                                                    } transition-all duration-200 cursor-pointer shadow-sm`}
                                            // Removed global onClick clear
                                            >
                                                {msg.content}
                                                <div className={`text-[10px] opacity-60 text-right mt-1 flex gap-1 justify-end items-center ${tagColorClass && tagColorClass.includes('text-black') ? 'text-black/60' : ''}`}>
                                                    {formatTime(msg.timestamp)}
                                                    {isMe && (
                                                        <span>{msg.status === 'sending' ? '🕒' : msg.read ? '✓✓' : '✓'}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 3 Dots Menu Trigger (Right for Others) */}
                                            {!isMe && (
                                                <button
                                                    className="opacity-0 group-hover/bubble:opacity-100 p-1 text-white/50 hover:text-white transition-opacity"
                                                    onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id); }}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Message Context Menu */}
                                        {isMenuOpen && (
                                            <div
                                                className="absolute z-50 bg-black/95 border border-white/20 rounded-lg shadow-xl p-1 min-w-[140px] backdrop-blur-md"
                                                style={{
                                                    bottom: '100%',
                                                    [isMe ? 'right' : 'left']: '40px',
                                                    marginBottom: '5px'
                                                }}
                                                onMouseLeave={() => setActiveMessageMenuId(null)}
                                            >
                                                <div className="text-[10px] uppercase text-white/50 px-2 py-1 font-bold border-b border-white/10 mb-1">Tag As</div>
                                                {['Angry', 'Sad', 'Joy', 'Surprised', 'Reminders'].map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleTagMessage(msg.id, tag);
                                                            setActiveMessageMenuId(null);
                                                        }}
                                                        className="w-full text-left px-2 py-1.5 text-xs text-white hover:bg-white/10 rounded flex items-center gap-2"
                                                    >
                                                        {/* Color Dot */}
                                                        <div className={`w-2 h-2 rounded-full ${getTagColor(tag).split(' ')[0]}`} />
                                                        {tag}
                                                    </button>
                                                ))}
                                                {/* Custom Tag Input */}
                                                <div className="px-2 py-1 border-t border-white/10 mt-1">
                                                    <input
                                                        className="w-full bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white placeholder-white/30 mb-1"
                                                        placeholder="Custom..."
                                                        value={customTagInput}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => setCustomTagInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && customTagInput.trim()) {
                                                                handleTagMessage(msg.id, customTagInput.trim());
                                                                setCustomTagInput('');
                                                                setActiveMessageMenuId(null);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Typing Indicator */}
                            {typingUsers[selectedConversationId!]?.size > 0 && (
                                <div className="flex items-center gap-2 text-white/50 text-xs ml-10 p-2">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-100" />
                                        <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-200" />
                                    </div>
                                    {Array.from(typingUsers[selectedConversationId!] || []).join(', ')} is typing...
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area with Warning */}
                        <div className={styles.inputArea} style={{ position: 'relative' }}>
                            {/* Smart Warning Popover */}
                            {warningTag && (
                                <div className="absolute bottom-full left-4 mb-2 bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in">
                                    <span>⚠️ Similar to <b>{warningTag.tag}</b> message: "{warningTag.snippet}"</span>
                                    <button onClick={() => setWarningTag(null)} className="ml-2 opacity-50 hover:opacity-100">×</button>
                                </div>
                            )}
                            <input
                                value={messageInput}
                                onChange={handleMessageInputChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type a message..."
                                className={styles.messageInput}
                            />
                            <button onClick={handleSendMessage} className={styles.sendButton}>
                                Send
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ChatPage() {
    return <MessagesPageContent />;
}
