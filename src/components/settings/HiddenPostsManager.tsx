
"use client";

import React, { useState, useEffect } from 'react';
import { EyeOff, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

export default function HiddenPostsManager() {
    const [isOpen, setIsOpen] = useState(false);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) fetchPosts();
    }, [isOpen]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/interactions/hide');
            const data = await res.json();
            if (data.hiddenPosts) setPosts(data.hiddenPosts);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnhide = async (postId: string) => {
        try {
            const res = await fetch(`/api/interactions/hide?postId=${postId}`, { method: 'DELETE' });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.postId !== postId));
            }
        } catch (e) {
            console.error(e);
            alert("Failed to unhide post");
        }
    };

    return (
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-3">
                    <EyeOff className="w-5 h-5 text-white" />
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">Hidden Posts ({posts.length > 0 ? posts.length : (isOpen ? '...' : '')})</h2>
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronRight className="w-5 h-5 text-white" />}
            </div>

            {isOpen && (
                <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                    {loading ? (
                        <p className="text-gray-500 text-sm">Loading...</p>
                    ) : posts.length === 0 ? (
                        <p className="text-gray-500 text-sm">No hidden posts.</p>
                    ) : (
                        posts.map((item) => (
                            <div key={item.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10 gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-400 mb-1">
                                        From <span className="text-white font-bold">{item.post.user?.profile?.displayName || "User"}</span> • {new Date(item.post.createdAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-white truncate">
                                        {item.post.content || "Media content"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleUnhide(item.postId)}
                                    className="text-xs border border-white/30 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors shrink-0"
                                >
                                    UNHIDE
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </section>
    );
}
