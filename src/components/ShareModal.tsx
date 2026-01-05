'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Check, Send } from 'lucide-react';

interface Friend {
    id: string;
    name: string;
    username: string;
    profile?: {
        displayName: string | null;
        avatarUrl: string | null;
    };
}

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    postSnippet?: string;
}

export default function ShareModal({ isOpen, onClose, postId, postSnippet }: ShareModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [recentChats, setRecentChats] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState<Record<string, boolean>>({});
    const [sent, setSent] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            fetchRecentChats();
        }
    }, [isOpen]);

    const fetchRecentChats = async () => {
        setLoading(true);
        try {
            // Reusing the endpoint that MessagesPage uses or a dedicated one
            // For now, let's assume we can fetch "friends" or "conversations"
            const res = await fetch('/api/friends'); // Or /api/chat/conversations
            // We'll use friends for now as "Share to..." usually implies people you know
            // Ideally, we'd merge recent conversations + friends.

            if (res.ok) {
                const data = await res.json();
                // Normalize data structure if needed
                const friends = data.friends?.map((f: any) => ({
                    id: f.friend?.id, // Correct mapping from /api/friends
                    name: f.friend?.name,
                    username: f.friend?.email, // Fallback
                    profile: f.friend?.profile
                })) || [];
                setRecentChats(friends);
            }
        } catch (e) {
            console.error("Failed to load share targets", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (userId: string) => {
        setSending(prev => ({ ...prev, [userId]: true }));
        try {
            // 1. Get or Create Conversation
            // We can use the existing /api/chat/conversations endpoint or just rely on a "send message" endpoint 
            // that handles conversation creation internally if we pass a targetUserId.
            // However, our current POST /api/chat/messages requires conversationId.

            // So first, resolve conversation ID:
            const convRes = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // FIX: API expects targetUserId, not participantId
                body: JSON.stringify({ targetUserId: userId })
            });

            if (!convRes.ok) throw new Error('Failed to resolve conversation');
            const { conversation } = await convRes.json();
            const conversationId = conversation.id; // Correct destructuring from response structure { conversation: {...} }

            // 2. Send the Message with sharedPostId
            const msgRes = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    content: 'Shared a post', // Provide default content to satisfy API check
                    type: 'post',
                    sharedPostId: postId
                })
            });

            if (!msgRes.ok) throw new Error('Failed to send');

            setSent(prev => ({ ...prev, [userId]: true }));
            // Optional: Close modal after a delay or let user share to multiple
        } catch (e) {
            console.error("Share failed", e);
            alert("Failed to share post");
        } finally {
            setSending(prev => ({ ...prev, [userId]: false }));
        }
    };

    const filteredUsers = recentChats.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.profile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-white font-bold text-lg">Share Post</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-white/70" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="Search people..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="text-center py-8 text-white/30 text-sm">Loading chats...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-white/30 text-sm">No users found</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                        {user.profile?.avatarUrl ? (
                                            <img src={user.profile.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            (user.profile?.displayName || user.name || '?')[0]
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium text-sm">
                                            {user.profile?.displayName || user.name}
                                        </div>
                                        <div className="text-white/40 text-xs">
                                            @{user.username || 'user'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => !sent[user.id] && handleSend(user.id)}
                                    disabled={sending[user.id] || sent[user.id]}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${sent[user.id]
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50 cursor-default'
                                        : 'bg-white text-black hover:bg-gray-200'
                                        }`}
                                >
                                    {sending[user.id] ? (
                                        <span className="animate-pulse">Sending...</span>
                                    ) : sent[user.id] ? (
                                        <span className="flex items-center gap-1"><Check size={12} /> Sent</span>
                                    ) : (
                                        'Send'
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer with Link Copy (Optional addition for later) */}
            </div>
        </div>
    );
}
