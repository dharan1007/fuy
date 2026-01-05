
/**
 * Messages Page - Web Version
 * Displays conversations list with real-time messaging
 */

import {
    ArrowLeft, Flag, MoreVertical, Edit2, Check, X, Search, Paperclip, Smile,
    Users, HeartHandshake, Pin, EyeOff, Ban, Tag, AlertTriangle, Send, Image as ImageIcon, Mic, Phone, Video, Info, Lock, Trash2, Settings, Palette, Menu, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/hooks/use-session';
import { useMessaging, Message, Friend, Conversation } from '../hooks/useMessaging';
import styles from './MessagesPage.module.css';
import { SpaceBackground } from '@/components/SpaceBackground';

// Helper for Tag Colors - NO PURPLE, Pro Colors
const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
        case 'urgent': return 'bg-red-500/20 border-red-500 text-red-200';
        case 'fun': return 'bg-yellow-500/20 border-yellow-500 text-yellow-200';
        case 'work': return 'bg-blue-500/20 border-blue-500 text-blue-200';
        case 'joy': return 'bg-emerald-500/20 border-emerald-500 text-emerald-200';
        case 'sad': return 'bg-slate-500/20 border-slate-500 text-slate-200';
        case 'angry': return 'bg-orange-600/20 border-orange-600 text-orange-200';
        case 'surprised': return 'bg-cyan-500/20 border-cyan-500 text-cyan-200';
        case 'reminders': return 'bg-indigo-500/20 border-indigo-500 text-indigo-200'; // Indigo is deep blue, safe from Purple ban? If risky, use Sky.
        default: return 'bg-white/10 border-white/20 text-white';
    }
};

const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function MessagesPageContent() {
    const router = useRouter();
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id;
    const theme = 'light';

    const {
        conversations,
        messages,
        onlineUsers,
        typingUsers,
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
    const [showSettings, setShowSettings] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Chat Search State
    const [showChatSearch, setShowChatSearch] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [chatSearchFilter, setChatSearchFilter] = useState<'all' | 'messages' | 'tags'>('all');
    const [chatSearchResults, setChatSearchResults] = useState<Message[]>([]);
    const [searchDateFrom, setSearchDateFrom] = useState('');
    const [searchDateTo, setSearchDateTo] = useState('');

    // Wallpaper customization
    const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);
    const [chatWallpapers, setChatWallpapers] = useState<Record<string, string>>({});

    const [activeContextMenuId, setActiveContextMenuId] = useState<string | null>(null);
    const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);

    // Nickname Editing State
    const [editingNicknameId, setEditingNicknameId] = useState<string | null>(null);
    const [nicknameInput, setNicknameInput] = useState('');

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    useEffect(() => {
        if (selectedConversationId && messages[selectedConversationId]) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, selectedConversationId]);

    // Load wallpapers from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('chat-wallpapers');
        if (saved) {
            try {
                setChatWallpapers(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load wallpapers:', e);
            }
        }
    }, []);

    // Save wallpapers to localStorage when changed
    useEffect(() => {
        if (Object.keys(chatWallpapers).length > 0) {
            localStorage.setItem('chat-wallpapers', JSON.stringify(chatWallpapers));
        }
    }, [chatWallpapers]);

    // --- Render ---

    const ghostedConversations = conversations.filter(c => c.isGhosted);
    const filteredConversations = conversations.filter(c => {
        if (c.isGhosted) return false;
        if (!searchQuery) return true;
        return c.participantName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const allChatUsers = getAllChatUsers();
    const filteredLocalFriends = allChatUsers.filter(friend =>
        friend.profile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFriends = searchQuery
        ? [...searchResults, ...filteredLocalFriends.filter(f => !searchResults.some(sr => sr.id === f.id))]
        : [];

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

                if (followersRes.status === 401 || followingRes.status === 401 || allUsersRes.status === 401) {
                    console.warn("Session expired (401) - Check auth cookies");
                    // signOut({ redirect: true });
                    return;
                }

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
    const [recalledMessages, setRecalledMessages] = useState<Message[]>([]);

    const handleMessageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMessageInput(value);

        if (selectedConversationId && messages[selectedConversationId]) {
            const currentMessages = messages[selectedConversationId];

            // 1. Smart Warning Logic (Repetition Check)
            if (value.trim().length > 5) {
                const relevantMsg = currentMessages.find(m =>
                    m.tags && m.tags.length > 0 &&
                    (m.content.toLowerCase().includes(value.toLowerCase()) || value.toLowerCase().includes(m.content.toLowerCase())) &&
                    Math.abs(m.content.length - value.length) < 50
                );

                if (relevantMsg && relevantMsg.tags) {
                    setWarningTag({ tag: relevantMsg.tags[0], snippet: relevantMsg.content.substring(0, 20) + '...' });
                } else {
                    setWarningTag(null);
                }
            } else {
                setWarningTag(null);
            }

            // 2. Smart Recall Logic (Trigger Match)
            // Check if input EXACTLY matches a known tag (case-insensitive)
            // We search through all unique tags in this conversation to find a match
            const uniqueTags = new Set<string>();
            currentMessages.forEach(m => m.tags?.forEach(t => uniqueTags.add(t.toLowerCase())));

            const matchedTag = Array.from(uniqueTags).find(t => t === value.trim().toLowerCase());

            if (matchedTag) {
                const foundContext = currentMessages.filter(m => m.tags?.some(t => t.toLowerCase() === matchedTag));
                setRecalledMessages(foundContext.slice(0, 5)); // Limit to 5
            } else {
                if (recalledMessages.length > 0 && value.trim().length < recalledMessages[0]?.tags?.[0]?.length!) {
                    // Clear if user backspaces
                    setRecalledMessages([]);
                }
            }
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
    }, [selectedConversationId, startTyping, stopTyping, typingTimeout, messages, recalledMessages]);

    const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

    const markingReadRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (selectedConversationId && selectedConversation && userId) {
            if (!messages[selectedConversationId]) {
                fetchMessages(selectedConversationId);
            } else {
                const hasUnread = messages[selectedConversationId].some(m => !m.read && m.senderId !== userId);

                if (hasUnread && !markingReadRef.current.has(selectedConversationId)) {
                    markingReadRef.current.add(selectedConversationId);
                    markAsRead(selectedConversationId).finally(() => {
                        setTimeout(() => {
                            markingReadRef.current.delete(selectedConversationId);
                        }, 2000);
                    });
                }
            }
        }
    }, [selectedConversationId, messages, fetchMessages, markAsRead, selectedConversation, userId]);

    // Collab redirect
    useEffect(() => {
        if (activeCollaboration) {
            const { sessionId, featureType } = activeCollaboration;
            const route = featureType === 'HOPIN' ? '/hopin' : '/journal';
            router.push(`${route}?sessionId=${sessionId}`);
        }
    }, [activeCollaboration, router]);

    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id);
        setShowMobileSidebar(false);
    };

    // --- User Management Handlers ---

    const updateSettings = async (conversationId: string, action: string, value: any) => {
        try {
            await fetch('/api/chat/conversations/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, action, value })
            });
            // Force refresh conversations - effectively mostly handled by realtime or simple reload for now
            // Ideally we optimistically update state here.
            window.location.reload(); // Temporary for simplicity to refetch sorted list
        } catch (e) {
            console.error("Failed to update settings", e);
            alert("Failed to update setting");
        }
    };

    const handlePin = (convId: string, currentVal: boolean) => updateSettings(convId, 'PIN', !currentVal);
    const handleGhost = (convId: string, currentVal: boolean) => updateSettings(convId, 'GHOST', !currentVal);

    // Block Flow
    const handleBlock = async (blockedId: string) => {
        if (confirm("Are you sure you want to BLOCK this user? They will not be able to message you.")) {
            try {
                await fetch('/api/users/block', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ blockedId, reason: "Chat Block" })
                });
                alert("User blocked.");
                window.location.reload();
            } catch (e) {
                console.error("Block failed", e);
            }
        }
    };

    const handleNicknameSubmit = (convId: string) => {
        updateSettings(convId, 'NICKNAME', nicknameInput);
        setEditingNicknameId(null);
        setNicknameInput('');
    };


    const handleTagMessage = async (messageId: string, tag: string) => {
        console.log("Tagging message", messageId, tag);
        try {
            await fetch('/api/chat/messages/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, tag })
            });
            // Ideally optimistic update of message list via swr mutate or context
            // For now, let's just refetch messages or wait for realtime
            if (selectedConversationId) fetchMessages(selectedConversationId);
        } catch (e) {
            console.error("Failed to tag message", e);
        }
    }; // Closing brace for handleTagMessage

    const handleReport = async (userId: string) => {
        const reason = prompt("Reason for reporting this user:");
        if (!reason) return;

        try {
            await fetch('/api/users/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportedId: userId, reason })
            });
            alert("User reported. Admin will review.");
        } catch (e) {
            console.error("Report failed", e);
            alert("Failed to send report.");
        }
    };

    // Chat Search Handler
    const handleChatSearch = () => {
        if (!selectedConversationId || !chatSearchQuery.trim()) {
            setChatSearchResults([]);
            return;
        }

        const currentMessages = messages[selectedConversationId] || [];
        let filtered = currentMessages;

        // Filter by type
        if (chatSearchFilter === 'tags') {
            filtered = filtered.filter(m => m.tags && m.tags.length > 0 &&
                m.tags.some(tag => tag.toLowerCase().includes(chatSearchQuery.toLowerCase())));
        } else if (chatSearchFilter === 'messages') {
            filtered = filtered.filter(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()));
        } else {
            // Search in both content and tags
            filtered = filtered.filter(m =>
                m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                (m.tags && m.tags.some(tag => tag.toLowerCase().includes(chatSearchQuery.toLowerCase())))
            );
        }

        // Filter by date range
        if (searchDateFrom) {
            const fromDate = new Date(searchDateFrom).getTime();
            filtered = filtered.filter(m => m.timestamp >= fromDate);
        }
        if (searchDateTo) {
            const toDate = new Date(searchDateTo).setHours(23, 59, 59, 999);
            filtered = filtered.filter(m => m.timestamp <= toDate);
        }

        setChatSearchResults(filtered);
    };

    useEffect(() => {
        if (showChatSearch) {
            handleChatSearch();
        }
    }, [chatSearchQuery, chatSearchFilter, searchDateFrom, searchDateTo, showChatSearch]);

    // Function to handle wallpaper upload
    const handleWallpaperUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && selectedConversationId) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setChatWallpapers(prev => ({
                    ...prev,
                    [selectedConversationId]: reader.result as string
                }));
                setShowWallpaperMenu(false); // Close modal after upload
            };
            reader.readAsDataURL(file);
        }
    };

    // Function to remove wallpaper
    const handleRemoveWallpaper = () => {
        if (selectedConversationId) {
            setChatWallpapers(prev => {
                const newWallpapers = { ...prev };
                delete newWallpapers[selectedConversationId];
                return newWallpapers;
            });
            setShowWallpaperMenu(false); // Close modal after removal
        }
    };

    return (
        <div className={styles.container} data-theme={theme} style={{ position: 'relative' }}>
            <SpaceBackground />



            {/* Sidebar */}
            <div className={`${styles.sidebar} ${showMobileSidebar ? styles.mobileOpen : ''}`} style={{ display: sidebarCollapsed ? 'none' : 'flex' }}>
                <div className={styles.header}>
                    <div className="flex items-center gap-3 w-full">
                        <button onClick={() => router.back()} className={styles.backButton}>←</button>
                        <h1 className="text-xl font-bold text-white m-0 flex-1">Messages</h1>
                        <button
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            title="Hide Sidebar"
                            onClick={() => setSidebarCollapsed(true)}
                        >
                            <PanelLeftClose className="text-white w-5 h-5" />
                        </button>
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
                    {filteredConversations.filter(c => !c.isGhosted).map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv.id)}
                            className={`${styles.conversationItem} ${selectedConversationId === conv.id ? styles.selected : ''} relative group`}
                        >
                            <div className="relative">
                                <div className={`w-14 h-14 rounded-full overflow-hidden bg-white/10 ${onlineUsers.has(conv.participantId) ? 'ring-2 ring-green-500' : ''}`}>
                                    {conv.avatar ? (
                                        <img src={conv.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                            {conv.participantName[0]}
                                        </div>
                                    )}
                                </div>
                                {onlineUsers.has(conv.participantId) && (
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 pr-6 pl-3">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-base font-bold text-white flex items-center gap-1 truncate">
                                        {conv.participantName}
                                        {conv.isGhosted && <EyeOff size={14} className="text-white/30" />}
                                    </span>
                                    <span className="text-xs text-white/40 shrink-0 ml-2">{formatTime(conv.lastMessageTime)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400 truncate">
                                        {typingUsers[conv.id]?.size > 0
                                            ? <span className="text-green-400 italic">Typing...</span>
                                            : conv.lastMessage || 'Start chatting'}
                                    </span>
                                    {conv.unreadCount > 0 && (
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 3 Dots Trigger */}
                            <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                onClick={(e) => { e.stopPropagation(); setActiveContextMenuId(activeContextMenuId === conv.id ? null : conv.id); }}
                            >
                                <MoreVertical size={16} />
                            </button>

                            {/* Context Menu */}
                            {activeContextMenuId === conv.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-black border border-white/20 rounded-lg shadow-xl w-40 overflow-hidden" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handlePin(conv.id, !!conv.isPinned)} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2">
                                        <Pin size={12} /> {conv.isPinned ? 'Unpin' : 'Pin to Top'}
                                    </button>
                                    <button onClick={() => { setEditingNicknameId(conv.id); setNicknameInput(conv.participantName); setActiveContextMenuId(null); }} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2">
                                        <Edit2 size={12} /> Set Nickname
                                    </button>
                                    <button onClick={() => handleGhost(conv.id, !!conv.isGhosted)} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2">
                                        <EyeOff size={12} /> {conv.isGhosted ? 'Un-Ghost' : 'Ghost'}
                                    </button>
                                    <button onClick={() => handleReport(conv.participantId)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/10 flex items-center gap-2">
                                        <Flag size={12} /> Report
                                    </button>
                                    <button onClick={() => handleBlock(conv.participantId)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/10 flex items-center gap-2">
                                        <Lock size={12} /> Block
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

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
                                <div className="flex items-center gap-3">
                                    {sidebarCollapsed && (
                                        <button
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                            title="Show Sidebar"
                                            onClick={() => setSidebarCollapsed(false)}
                                        >
                                            <PanelLeftOpen className="text-white w-5 h-5" />
                                        </button>
                                    )}
                                    <div>
                                        <h2 className="text-white font-bold text-xl flex items-center gap-2">
                                            {selectedConversation.participantName}
                                            {selectedConversation.isPinned && <Pin size={14} className="text-yellow-400 fill-current" />}
                                        </h2>
                                        <p className="text-xs text-white/50">
                                            {onlineUsers.has(selectedConversation.participantId) ? '● Online' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2"
                                        title="Collaboration Features"
                                        onClick={() => {
                                            // Logic to start collab or view active
                                            alert("Collaboration Init (Placeholder)");
                                        }}
                                    >
                                        <Users className="text-white w-5 h-5" />
                                    </button>
                                    <button
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        title="Bonding Dashboard"
                                        onClick={() => router.push(`/bonds?profileId=${selectedConversation.participantId}`)}
                                    >
                                        <HeartHandshake className="text-white w-5 h-5" />
                                    </button>
                                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                                    <button
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        title="Search in Chat"
                                        onClick={() => setShowChatSearch(!showChatSearch)}
                                    >
                                        <Search className="text-white w-5 h-5" />
                                    </button>
                                    <button
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        title="Customize Chat"
                                        onClick={() => setShowWallpaperMenu(!showWallpaperMenu)}
                                    >
                                        <Menu className="text-white w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Wallpaper Customization Modal */}
                        {showWallpaperMenu && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={() => setShowWallpaperMenu(false)}>
                                <div className="bg-black/98 border border-white/20 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-white font-bold text-lg">Chat Wallpaper</h3>
                                        <button
                                            onClick={() => setShowWallpaperMenu(false)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <X size={20} className="text-white" />
                                        </button>
                                    </div>

                                    {selectedConversationId && chatWallpapers[selectedConversationId] && (
                                        <div className="mb-4">
                                            <div className="relative aspect-video rounded-lg overflow-hidden border border-white/20">
                                                <img
                                                    src={chatWallpapers[selectedConversationId]}
                                                    alt="Current wallpaper"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleWallpaperUpload}
                                            className="hidden"
                                            id="wallpaper-upload"
                                        />
                                        <label
                                            htmlFor="wallpaper-upload"
                                            className="block w-full text-center px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all border border-white/20"
                                        >
                                            <ImageIcon size={20} className="inline-block mr-2" />
                                            {selectedConversationId && chatWallpapers[selectedConversationId] ? 'Change Wallpaper' : 'Upload Wallpaper'}
                                        </label>

                                        {selectedConversationId && chatWallpapers[selectedConversationId] && (
                                            <button
                                                onClick={handleRemoveWallpaper}
                                                className="w-full px-4 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-all border border-red-500/30"
                                            >
                                                <Trash2 size={16} className="inline-block mr-2" />
                                                Remove Wallpaper
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search Modal - Fixed positioning */}
                        {showChatSearch && (
                            <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-md" onClick={() => setShowChatSearch(false)}>
                                <div className="bg-black/98 border border-white/20 rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white font-bold text-lg">Search Messages</h3>
                                        <button
                                            onClick={() => setShowChatSearch(false)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <X size={20} className="text-white" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Search messages, tags..."
                                            value={chatSearchQuery}
                                            onChange={(e) => setChatSearchQuery(e.target.value)}
                                            className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white text-sm outline-none focus:border-white/40"
                                        />
                                    </div>

                                    <div className="flex gap-2 mb-3">
                                        <button
                                            onClick={() => setChatSearchFilter('all')}
                                            className={`px-3 py-1 rounded-lg text-xs ${chatSearchFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setChatSearchFilter('messages')}
                                            className={`px-3 py-1 rounded-lg text-xs ${chatSearchFilter === 'messages' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}
                                        >
                                            Messages
                                        </button>
                                        <button
                                            onClick={() => setChatSearchFilter('tags')}
                                            className={`px-3 py-1 rounded-lg text-xs ${chatSearchFilter === 'tags' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}
                                        >
                                            Tags
                                        </button>
                                        <div className="flex-1"></div>
                                        <input
                                            type="date"
                                            value={searchDateFrom}
                                            onChange={(e) => setSearchDateFrom(e.target.value)}
                                            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white"
                                            placeholder="From"
                                        />
                                        <input
                                            type="date"
                                            value={searchDateTo}
                                            onChange={(e) => setSearchDateTo(e.target.value)}
                                            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white"
                                            placeholder="To"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0 mt-2">
                                        <div className="text-xs text-white/30 mb-2">{chatSearchResults.length} result(s)</div>
                                        {chatSearchResults.length === 0 ? (
                                            <div className="text-center text-white/30 text-sm py-4">
                                                {chatSearchQuery ? 'No results found' : 'Enter search query'}
                                            </div>
                                        ) : (
                                            chatSearchResults.map(msg => (
                                                <div key={msg.id} className="bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs text-white/50">{formatTime(msg.timestamp)}</span>
                                                        {msg.tags && msg.tags.length > 0 && (
                                                            <div className="flex gap-1">
                                                                {msg.tags.map((tag, i) => (
                                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/70">{tag}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-white">{msg.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className={styles.messagesList} style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            backgroundImage: selectedConversationId && chatWallpapers[selectedConversationId] ? `url(${chatWallpapers[selectedConversationId]})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                        }}>
                            {(messages[selectedConversationId!] || []).map((msg, i) => {
                                const isMe = msg.senderId === userId;
                                const showAvatar = !isMe;
                                const isMenuOpen = activeMessageMenuId === msg.id;
                                const hasTag = msg.tags && msg.tags.length > 0;
                                const tagColorClass = hasTag ? getTagColor(msg.tags![0]) : '';

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 group relative`}

                                    >

                                        {/* Message Bubble Container */}
                                        <div className="relative group/bubble flex items-center gap-2 max-w-[70%]">
                                            {/* 3 Dots Menu Trigger */}
                                            <button
                                                className={`p-1 text-white/30 hover:text-white transition-colors ${isMe ? 'order-1' : 'order-3'}`}
                                                onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id); }}
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            <div
                                                className={`p-3 rounded-2xl text-sm relative order-2
                                                    ${hasTag ? tagColorClass : (isMe ? 'bg-white text-black rounded-tr-none' : 'text-white rounded-tl-none border bg-white/10 border-white/20')}
                                                    ${hasTag ? 'border' : ''} transition-all duration-200 cursor-pointer shadow-sm`}
                                            >
                                                {/* Content */}
                                                {msg.sharedPost ? (
                                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                                        {/* Shared Post Header */}
                                                        <div className="flex items-center gap-2 mb-1 border-b border-white/20 pb-1.5">
                                                            <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10">
                                                                {/* ... shared post avatar ... */}
                                                                {msg.sharedPost.user.profile?.avatarUrl ? (
                                                                    <img src={msg.sharedPost.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                                                                        {msg.sharedPost.user.profile?.displayName?.[0] || '?'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-xs opacity-90">{msg.sharedPost.user.profile?.displayName || 'Unknown User'}</span>
                                                        </div>
                                                        {/* ... shared post content ... */}
                                                        {msg.sharedPost.media && msg.sharedPost.media.length > 0 && (
                                                            <div className="rounded-lg overflow-hidden aspect-video bg-black/50 relative border border-white/10">
                                                                {msg.sharedPost.media[0].type === 'VIDEO' ? (
                                                                    <video src={msg.sharedPost.media[0].url} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <img src={msg.sharedPost.media[0].url} alt="Post content" className="w-full h-full object-cover" />
                                                                )}
                                                            </div>
                                                        )}
                                                        {msg.sharedPost.content && (
                                                            <p className="text-xs opacity-90 line-clamp-3 italic">"{msg.sharedPost.content}"</p>
                                                        )}
                                                        <a href={`/post/${msg.sharedPost.id}`} className="text-[10px] text-blue-300 hover:text-blue-200 hover:underline mt-0.5 block">View Full Post</a>
                                                        {msg.content && <div className="text-sm border-t border-white/10 pt-2 mt-1">{msg.content}</div>}
                                                    </div>
                                                ) : (
                                                    msg.content
                                                )}

                                                {/* Tag moved to bottom */}
                                                {hasTag && (
                                                    <div className="mt-2 flex items-center gap-1.5 bg-black/20 rounded px-2 py-1 w-fit border border-white/10">
                                                        <Tag size={10} className="opacity-70" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{msg.tags![0]}</span>
                                                    </div>
                                                )}

                                                <div className={`text-[10px] opacity-60 text-right mt-1 flex gap-1 justify-end items-center ${tagColorClass && tagColorClass.includes('text-black') ? 'text-black/60' : ''}`}>
                                                    {formatTime(msg.timestamp)}
                                                    {isMe && (
                                                        <span>{msg.status === 'sending' ? '🕒' : msg.read ? '✓✓' : '✓'}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Message Context Menu */}
                                            {isMenuOpen && (
                                                <div
                                                    className="absolute z-50 bg-black border border-white/20 rounded-lg shadow-xl p-1 min-w-[150px] max-h-[300px] overflow-y-auto"
                                                    style={{
                                                        top: '0',
                                                        [isMe ? 'right' : 'left']: '100%',
                                                        marginLeft: isMe ? '0' : '10px',
                                                        marginRight: isMe ? '10px' : '0'
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <div className="text-[10px] uppercase text-white/50 px-2 py-1 font-bold border-b border-white/10 mb-1 flex items-center gap-1">
                                                        <Tag size={10} /> Tag Message
                                                    </div>
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
                                                            <div className={`w-1.5 h-1.5 rounded-sm ${getTagColor(tag).split(' ')[0].replace('/20', '')}`} />
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
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area with Warning & Smart Recall */}
                        <div className={styles.inputArea} style={{ position: 'relative' }}>
                            {/* Smart Warning Popover */}
                            {warningTag && (
                                <div className="absolute bottom-full left-4 mb-2 bg-yellow-900/80 border border-yellow-600 text-yellow-100 px-3 py-2 rounded-lg text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in shadow-xl backdrop-blur-sm z-50 max-w-sm">
                                    <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
                                    <div>
                                        <div className="font-bold">Repetition Warning</div>
                                        <span>Similar to a message tagged <b>{warningTag.tag}</b>: "{warningTag.snippet}"</span>
                                    </div>
                                    <button onClick={() => setWarningTag(null)} className="ml-2 opacity-50 hover:opacity-100">×</button>
                                </div>
                            )}

                            {/* Smart Recall Popover */}
                            {recalledMessages.length > 0 && (
                                <div className="absolute bottom-full right-4 mb-2 bg-blue-900/90 border border-blue-500 text-blue-100 p-3 rounded-lg text-xs animate-in slide-in-from-bottom-2 fade-in shadow-xl backdrop-blur-sm z-50 w-80 max-h-60 overflow-y-auto">
                                    <div className="flex justify-between items-center mb-2 border-b border-blue-400/30 pb-1">
                                        <div className="font-bold flex items-center gap-2">
                                            <Tag size={12} /> Recall: {messageInput}
                                        </div>
                                        <button onClick={() => setRecalledMessages([])} className="opacity-50 hover:opacity-100">×</button>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {recalledMessages.map(msg => (
                                            <div key={msg.id} className="bg-black/30 p-2 rounded hover:bg-black/50 cursor-pointer transition-colors"
                                                onClick={() => {
                                                    setMessageInput(prev => prev + (prev.trim() ? " " : "") + `"${msg.content}" `);
                                                    setRecalledMessages([]);
                                                }}>
                                                <div className="flex justify-between text-[10px] opacity-70 mb-1">
                                                    <span>{formatTime(msg.timestamp)} • {msg.senderId === userId ? 'You' : 'Them'}</span>
                                                    <span className="bg-blue-500/30 px-1 rounded text-[9px]">{msg.tags![0]}</span>
                                                </div>
                                                <div className="text-white line-clamp-2">{msg.content}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <input
                                value={messageInput}
                                onChange={handleMessageInputChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type a message or tag..."
                                className={styles.messageInput}
                            />
                            <button onClick={handleSendMessage} className="w-10 h-10 rounded-full bg-black border-none flex items-center justify-center hover:bg-black/80 transition-colors flex-shrink-0">
                                <Send size={18} className="text-red-500" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}





export default function ChatPage() {
    return <MessagesPageContent />;
}
