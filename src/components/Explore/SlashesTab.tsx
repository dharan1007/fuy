
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Hash, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

// Reuse SimplePostCard or import similar
// We will need a way to render the feed when a slash is clicked.
// For now, let's keep it self-contained or use a prop to switch view in parent?
// The user asked for "when clicked should show all the posts linked with those slashes".
// I'll make this component handle the "list view" and "detail view" internally or via props.
// Let's stick to the Tab -> Grid, and maybe an Overlay for Feed.

interface Slash {
    tag: string;
    count: number;
}

export default function SlashesTab() {
    const [slashes, setSlashes] = useState<Slash[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSlash, setActiveSlash] = useState<string | null>(null);
    const [activeSlashPosts, setActiveSlashPosts] = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);

    // Fetch Trending Slashes
    useEffect(() => {
        const fetchSlashes = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/explore/slashes?search=${searchQuery}`);
                const data = await res.json();
                setSlashes(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to fetch slashes', error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search
        const timer = setTimeout(() => {
            fetchSlashes();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch Posts when Slash is clicked
    useEffect(() => {
        if (!activeSlash) return;
        const fetchPosts = async () => {
            setLoadingPosts(true);
            try {
                const res = await fetch(`/api/explore/slashes/${activeSlash}`);
                const data = await res.json();
                setActiveSlashPosts(data.posts || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingPosts(false);
            }
        };
        fetchPosts();
    }, [activeSlash]);

    const handleCreatePost = (e: React.MouseEvent, tag: string) => {
        e.stopPropagation();
        // Redirect to create post with tag pre-filled?
        // For now, simple link logic or we can use router.
        // But we are in a client component, Link is better.
        // Let's assume /create?tag=xyz exists or we just let them copy.
        // User asked for "option to add that slash in there existing posts or create a new post".
        // Navigating to create is safest.
        window.location.href = `/create?tag=${tag}`;
    };

    // If viewing a slash feed
    if (activeSlash) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-black/80 backdrop-blur-md">
                    <button onClick={() => setActiveSlash(null)} className="p-2 hover:bg-white/10 rounded-full">
                        <ArrowLeft className="text-white" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-1">
                            <Hash className="w-5 h-5 text-gray-400" />
                            {activeSlash}
                        </h2>
                        <p className="text-xs text-gray-400">{activeSlashPosts.length} posts</p>
                    </div>
                </div>

                {/* Feed */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-0 sm:p-4">
                    {loadingPosts ? (
                        <LoadingSpinner />
                    ) : activeSlashPosts.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">No posts found with this slash.</div>
                    ) : (
                        <div className="max-w-2xl mx-auto space-y-6">
                            {/* Simplified Post Render - Mimic Home Feed Card roughly */}
                            {activeSlashPosts.map((post) => (
                                <div key={post.id} className="bg-[#111] rounded-xl overflow-hidden border border-white/10">
                                    {/* Header */}
                                    <div className="p-3 flex items-center gap-3">
                                        <img src={post.user?.profile?.avatarUrl || "https://github.com/shadcn.png"} className="w-8 h-8 rounded-full bg-gray-800" />
                                        <div>
                                            <div className="font-bold text-sm text-white">{post.user?.profile?.displayName || post.user?.name}</div>
                                            <div className="text-xs text-gray-500">Just now</div>
                                        </div>
                                    </div>
                                    {/* Media */}
                                    {(post.mediaUrl || post.media?.[0]?.url) && (
                                        <div className="aspect-square w-full bg-black relative">
                                            {/* Simple video/image check */}
                                            {(post.mediaType === 'video' || post.media?.[0]?.type === 'VIDEO') ? (
                                                <video src={post.mediaUrl || post.media?.[0]?.url} className="w-full h-full object-cover" controls playsInline />
                                            ) : (
                                                <img src={post.mediaUrl || post.media?.[0]?.url} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    )}
                                    {/* Content */}
                                    <div className="p-4">
                                        <p className="text-sm text-gray-200">{post.description || post.content}</p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {post.slashes?.map((t: any) => (
                                                <span key={t.id} className="text-xs text-blue-400">#{t.tag} </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Main Slashes Grid
    return (
        <div className="absolute inset-x-0 bottom-0 top-32 overflow-y-auto p-6 animate-in fade-in bg-black">
            {/* Search */}
            <div className="max-w-2xl mx-auto mb-8 sticky top-0 z-10 pt-2 pb-4 bg-black/90 backdrop-blur-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search slashes..."
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-gray-600"
                    />
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {slashes.map((slash) => (
                        <div
                            key={slash.tag}
                            onClick={() => setActiveSlash(slash.tag)}
                            className="group relative aspect-square bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:bg-[#1a1a1a] transition-all cursor-pointer hover:border-white/30"
                        >
                            <div className="flex justify-between items-start">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                    <Hash className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-mono text-gray-500">{slash.count} posts</span>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-white mb-1 break-all line-clamp-1">
                                    {slash.tag}
                                </h3>
                                <p className="text-xs text-gray-500 group-hover:text-gray-400">Trending</p>
                            </div>

                            {/* Action Button - Create */}
                            <button
                                onClick={(e) => handleCreatePost(e, slash.tag)}
                                className="absolute top-3 right-3 p-2 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white text-white hover:text-black transition-all"
                                title="Create post with this slash"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {slashes.length === 0 && !loading && (
                        <div className="col-span-full text-center text-gray-500 mt-20">
                            <p>No slashes found.</p>
                            {searchQuery && <p className="text-sm mt-2">Try searching for generic terms or create a new post with this tag!</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
