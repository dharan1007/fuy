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

    // State for separate feeds
    const [postsByTab, setPostsByTab] = useState<{ [key: string]: Post[] }>({
        ALL: safePosts
    });
    const [loadingTab, setLoadingTab] = useState<{ [key: string]: boolean }>({});
    const [tabCursors, setTabCursors] = useState<{ [key: string]: string | null }>({});
    const [tabHasMore, setTabHasMore] = useState<{ [key: string]: boolean }>({});

    const [filter, setFilter] = useState<'ALL' | 'FILLS' | 'LILLS' | 'SIMPLE' | 'AUDIO' | 'CHANNELS'>('ALL');

    // Pre-load logic (Run once on mount)
    useEffect(() => {
        // Automatically pre-load FILLS if not already present
        const preloadTab = async (type: string) => {
            if (postsByTab[type]) return; // Already loaded or loading

            // Mark as loading silently (or visible if we want) - usually silent for reload
            // But here we just want to fetch.
            try {
                const res = await fetch(`/api/posts/user?userId=${userId}&type=${type}`);
                if (res.ok) {
                    const data = await res.json();
                    setPostsByTab(prev => ({ ...prev, [type]: data.posts || [] }));
                    setTabCursors(prev => ({ ...prev, [type]: data.nextCursor }));
                    setTabHasMore(prev => ({ ...prev, [type]: !!data.nextCursor }));
                }
            } catch (e) {
                console.error(`Failed to preload ${type}`, e);
            }
        };

        preloadTab('FILLS');
    }, [userId]); // Run once per userId

    // Handle Tab Change
    const handleTabChange = async (newFilter: typeof filter) => {
        setFilter(newFilter);

        // If data exists, no need to fetch (unless we implement 'refresh on click')
        if (postsByTab[newFilter]) return;

        setLoadingTab(prev => ({ ...prev, [newFilter]: true }));
        try {
            const res = await fetch(`/api/posts/user?userId=${userId}&type=${newFilter}`);
            if (res.ok) {
                const data = await res.json();
                setPostsByTab(prev => ({ ...prev, [newFilter]: data.posts || [] }));
                setTabCursors(prev => ({ ...prev, [newFilter]: data.nextCursor }));
                setTabHasMore(prev => ({ ...prev, [newFilter]: !!data.nextCursor }));
            }
        } catch (e) {
            console.error(`Failed to load ${newFilter}`, e);
        } finally {
            setLoadingTab(prev => ({ ...prev, [newFilter]: false }));
        }
    };

    // Current data based on active filter
    const currentPosts = postsByTab[filter] || [];
    const isCurrentLoading = loadingTab[filter];
    const currentHasMore = filter === 'ALL' ? hasMore : (tabHasMore[filter] || false);

    const handleLoadMoreTabs = async () => {
        const cursor = filter === 'ALL' ? nextCursor : tabCursors[filter];
        if (!cursor) return;

        const setGlobalLoading = filter === 'ALL' ? setLoadingMore : (val: boolean) => { }; // ALL uses existing state
        if (filter !== 'ALL') setLoadingTab(prev => ({ ...prev, [filter]: true }));
        else setGlobalLoading(true);

        try {
            const res = await fetch(`/api/posts/user?userId=${userId}&cursor=${cursor}&type=${filter}`);
            if (res.ok) {
                const data = await res.json();
                if (data.posts?.length > 0) {
                    if (filter === 'ALL') {
                        setPosts(prev => [...prev, ...data.posts]);
                        setNextCursor(data.nextCursor);
                        setHasMore(!!data.nextCursor);
                        // Sync ALLtab
                        setPostsByTab(prev => ({ ...prev, ALL: [...(prev.ALL || []), ...data.posts] }));
                    } else {
                        setPostsByTab(prev => ({ ...prev, [filter]: [...(prev[filter] || []), ...data.posts] }));
                        setTabCursors(prev => ({ ...prev, [filter]: data.nextCursor }));
                        setTabHasMore(prev => ({ ...prev, [filter]: !!data.nextCursor }));
                    }
                } else {
                    if (filter === 'ALL') setHasMore(false);
                    else setTabHasMore(prev => ({ ...prev, [filter]: false }));
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (filter !== 'ALL') setLoadingTab(prev => ({ ...prev, [filter]: false }));
            else setGlobalLoading(false);
        }
    }

    return (
        <section className="mb-10 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-6 border-b border-white/10 overflow-x-auto scrollbar-hide w-full sm:w-auto pb-2">
                    {(['ALL', 'FILLS', 'LILLS', 'SIMPLE', 'AUDIO', 'CHANNELS'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTabChange(t)}
                            className={`text-sm font-black tracking-widest uppercase pb-2 border-b-2 transition-all shrink-0 ${filter === t ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white/70'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                        {currentPosts.length} Posts
                    </span>
                    {isMe && currentPosts.length > 0 && (
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

            {isCurrentLoading && currentPosts.length === 0 ? (
                // SKELETON LOADER
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse border border-white/10" />
                    ))}
                </div>
            ) : currentPosts.length > 0 ? (
                <FeedRefreshProvider onRefresh={() => onActionComplete ? onActionComplete() : router.refresh()}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {currentPosts.map((p) => {
                            const isSelected = selectedIds.has(p.id);
                            let spanClass = "col-span-1";

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
            {currentHasMore && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={filter === 'ALL' ? handleLoadMore : handleLoadMoreTabs}
                        disabled={loadingMore || (filter !== 'ALL' && loadingTab[filter])}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full transition-colors disabled:opacity-50"
                    >
                        {(loadingMore || (filter !== 'ALL' && loadingTab[filter])) ? 'Loading...' : 'Load More'}
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
