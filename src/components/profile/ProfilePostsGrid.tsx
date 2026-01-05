"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Archive, CheckSquare, Square, X } from "lucide-react";
import { createPortal } from "react-dom";
import FeedPostItem from '@/components/FeedPostItem';
import { FeedRefreshProvider } from '@/context/FeedItemContext';

type Media = { type: "IMAGE" | "VIDEO" | "AUDIO"; url: string };

type Post = {
    id: string;
    content: string;
    visibility: string;
    feature: string;
    createdAt: Date | string;
    media: Media[];
    status?: string;
    postType?: string;
    user: any; // User object is needed for cards
    [key: string]: any;
};

interface ProfilePostsGridProps {
    posts: Post[];
    isMe: boolean;
    userId: string;
    onActionComplete?: () => void;
}

export default function ProfilePostsGrid({ posts: initialPosts, isMe, userId, onActionComplete }: ProfilePostsGridProps) {
    // Ensure initialPosts is always an array to prevent crashes
    const safePosts = initialPosts || [];

    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>(safePosts);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination State
    const [nextCursor, setNextCursor] = useState<string | null>(safePosts.length >= 12 ? safePosts[safePosts.length - 1]?.id : null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(safePosts.length >= 12);

    // Sync state when initialPosts changes (e.g. SWR load)
    useEffect(() => {
        if (initialPosts) {
            setPosts(initialPosts);
            setNextCursor(initialPosts.length >= 12 ? initialPosts[initialPosts.length - 1]?.id : null);
            setHasMore(initialPosts.length >= 12);
        }
    }, [initialPosts]);

    const handleLoadMore = async () => {
        if (loadingMore || !hasMore || !nextCursor) return;
        setLoadingMore(true);
        try {
            const res = await fetch(`/api/posts/user?userId=${userId}&cursor=${nextCursor}`);
            if (res.ok) {
                const data = await res.json();
                if (data.posts && data.posts.length > 0) {
                    setPosts(prev => [...prev, ...data.posts]);
                    setNextCursor(data.nextCursor);
                    setHasMore(!!data.nextCursor);
                } else {
                    setHasMore(false);
                }
            }
        } catch (error) {
            console.error("Failed to load more posts", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedIds(new Set());
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkAction = async (action: 'ARCHIVE' | 'RESTORE' | 'DELETE') => {
        if (selectedIds.size === 0) return;
        if (action === 'DELETE' && !confirm(`Permanently delete ${selectedIds.size} posts?`)) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/posts/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds), action })
            });

            if (!res.ok) throw new Error("Action failed");

            if (onActionComplete) onActionComplete();
            else router.refresh();

            setSelectionMode(false);
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            alert("Failed to perform action");
        } finally {
            setIsLoading(false);
        }
    };

    const [filter, setFilter] = useState<'ALL' | 'FILLS' | 'LILLS' | 'SIMPLE' | 'AUDIO' | 'CHANNELS'>('ALL');

    // ... (rest of state)

    const filteredPosts = posts.filter(p => {
        if (filter === 'ALL') return true;
        if (filter === 'FILLS') return p.postType === 'FILL';
        if (filter === 'LILLS') return p.postType === 'LILL';
        if (filter === 'SIMPLE') return !p.postType || p.postType === 'TEXT' || p.postType === 'SIMPLE';
        if (filter === 'AUDIO') return p.postType === 'AUD';
        if (filter === 'CHANNELS') return p.postType === 'CHAN';
        return true;
    });

    return (
        <section className="mb-10 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-6 border-b border-white/10 overflow-x-auto scrollbar-hide w-full sm:w-auto pb-2">
                    {(['ALL', 'FILLS', 'LILLS', 'SIMPLE', 'AUDIO', 'CHANNELS'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`text-sm font-black tracking-widest uppercase pb-2 border-b-2 transition-all shrink-0 ${filter === t ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white/70'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                        {filteredPosts.length} Posts
                    </span>
                    {isMe && posts.length > 0 && (
                        <button
                            onClick={toggleSelectionMode}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 ${selectionMode
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                }`}
                        >
                            {selectionMode ? (
                                <><X size={14} /> Cancel</>
                            ) : (
                                <><CheckSquare size={14} /> Select</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {filteredPosts.length > 0 ? (
                <FeedRefreshProvider onRefresh={() => onActionComplete ? onActionComplete() : router.refresh()}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPosts.map((p) => {
                            const isSelected = selectedIds.has(p.id);

                            // Determine layout - simple uniform grid for profile to maximize space/density
                            // Fills/Chans can still be larger if desired, but "horizontally grid wise" usually implies uniformity or masonry.
                            // Given user asked for "more posts horizontally", uniform grid is safer.
                            // However, key logic `spanClass` existed. I'll modify to be responsive but mostly uniform unless explicit.
                            let spanClass = "col-span-1";
                            // if (p.postType === 'CHAN' || p.postType === 'FILL') {
                            //    spanClass = "col-span-2"; // Optional: keep or remove. User said "more posts horizontally". Uniform might be better. 
                            //    I'll remove span to fit more posts, unless truly necessary.
                            // }

                            return (
                                <div key={p.id} className={`${spanClass} relative group`}>
                                    {/* Selection Overlay */}
                                    {selectionMode && (
                                        <div
                                            className={`absolute inset-0 z-50 rounded-xl cursor-pointer transition-colors ${isSelected ? "bg-blue-500/10 ring-2 ring-blue-500" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                                            onClick={() => toggleSelect(p.id)}
                                        >
                                            <div className="absolute top-3 right-3">
                                                {isSelected ? (
                                                    <div className="bg-blue-500 text-white rounded-md p-1"><CheckSquare size={20} /></div>
                                                ) : (
                                                    <div className="bg-white/50 dark:bg-black/50 text-gray-500 rounded-md p-1"><Square size={20} /></div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Card Rendering */}
                                    <div className={selectionMode ? "pointer-events-none" : ""}>
                                        <FeedPostItem
                                            post={p}
                                            currentUserId={isMe ? p.user?.id : undefined}
                                            isProfileView={true}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </FeedRefreshProvider>
            ) : (
                <div className="text-center py-12 bg-white/50 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700">
                    <p className="text-gray-500 dark:text-gray-400">No posts shared yet.</p>
                </div>
            )}

            {/* Load More Button */}
            {hasMore && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full transition-colors disabled:opacity-50"
                    >
                        {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}

            {/* Floating Action Bar */}
            {selectionMode && selectedIds.size > 0 && createPortal(
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 shadow-2xl rounded-full px-6 py-3 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <span className="text-sm font-medium mr-4 text-gray-600 dark:text-white/60">
                        {selectedIds.size} selected
                    </span>
                    <div className="h-4 w-px bg-gray-300 dark:bg-white/10 mr-2" />
                    <button onClick={() => handleBulkAction('ARCHIVE')} disabled={isLoading} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-yellow-600 dark:text-yellow-500 transition-colors disabled:opacity-50" title="Archive Selected">
                        <Archive size={20} />
                    </button>
                    <button onClick={() => handleBulkAction('DELETE')} disabled={isLoading} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full text-red-600 dark:text-red-500 transition-colors disabled:opacity-50" title="Delete Selected">
                        <Trash2 size={20} />
                    </button>
                </div>,
                document.body
            )}
        </section>
    );
}
