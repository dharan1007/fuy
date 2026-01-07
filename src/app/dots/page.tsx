'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from '@/hooks/use-session';
import { Play, Pause, Search, ChevronLeft, MoreVertical, Check, Plus, X } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LandingPage from '@/components/LandingPage/LandingPage';
import { useRouter } from 'next/navigation';
import ReactionControl from '@/components/ReactionControl';

// Categories for content filtering
const CATEGORIES = [
    { id: 'fills', label: 'Fills' },
    { id: 'bloom', label: 'Bloom' },
    { id: 'lills', label: 'Lills' },
    { id: 'auds', label: 'Auds' },
];

const FILL_FILTERS = ['All', 'New to you', 'Live', 'Stand-Up', 'Gaming', 'Music', 'Cartoons', 'Challenges', 'Visual Arts'];

interface DotData {
    id: string;
    username: string;
    userId: string;
    avatar: string;
    description: string;
    likes: number;
    comments: number;
    mediaUrl: string;
    mediaType: 'video' | 'image' | 'audio';
    category: string;
    postId: string;
    isSubscribed: boolean;
    followersCount: number;
    views?: string;
    createdAt?: string;
    reactionCounts?: any;
    userReaction?: string;
}

export default function DotsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeCategory, setActiveCategory] = useState('fills');
    const [dots, setDots] = useState<DotData[]>([]);
    const [loading, setLoading] = useState(false); // Changed default to false to handle initial load carefully
    const [activeDotIndex, setActiveDotIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showCategories, setShowCategories] = useState(true);

    const [autoScroll, setAutoScroll] = useState(false);
    const [showMenuId, setShowMenuId] = useState<string | null>(null);

    // New State for Fills Explorer
    const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFillFilter, setActiveFillFilter] = useState('All');

    // Bloom Selection State
    const [bloomMode, setBloomMode] = useState<'selection' | 'feed'>('selection');
    const [availableSlashes, setAvailableSlashes] = useState<{ tag: string, count: number }[]>([]);
    const [selectedSlashes, setSelectedSlashes] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // User IDs
    const [selectedPosts, setSelectedPosts] = useState<any[]>([]); // Selected Post objects
    const [bloomLoading, setBloomLoading] = useState(false);

    // Bloom Search State
    const [bloomSearchQuery, setBloomSearchQuery] = useState('');
    const [bloomSearchResults, setBloomSearchResults] = useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });
    const [isSearching, setIsSearching] = useState(false);

    // Initial Load
    useEffect(() => {
        if (status === 'authenticated') {
            // If starting on a specific category, load it. 
            // Fills loads by default.
            if (activeCategory !== 'bloom') {
                fetchDots();
            }
        }
    }, [status]);


    // Switch view mode based on category
    useEffect(() => {
        if (activeCategory === 'fills') {
            setViewMode('grid');
        } else if (activeCategory === 'bloom') {
            // Bloom starts in selection mode
            setViewMode('feed'); // But if we go to feed it will be feed view
            setBloomMode('selection');
            fetchAvailableSlashes();
        } else {
            setViewMode('feed');
            if (activeCategory !== 'bloom') fetchDots(); // Fetch immediately for others
        }
    }, [activeCategory]);

    const fetchAvailableSlashes = async () => {
        try {
            const res = await fetch('/api/explore/slashes');
            if (res.ok) {
                const data = await res.json();
                setAvailableSlashes(data);
            }
        } catch (e) { console.error("Failed to load slashes", e); }
    };

    // Bloom Search Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!bloomSearchQuery.trim()) {
                setBloomSearchResults({ users: [], posts: [] });
                return;
            }

            setIsSearching(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(bloomSearchQuery)}&type=all`);
                if (res.ok) {
                    const data = await res.json();
                    setBloomSearchResults({ users: data.users || [], posts: data.posts || [] });
                }
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [bloomSearchQuery]);

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const togglePostSelection = (post: any) => {
        setSelectedPosts(prev =>
            prev.some(p => p.id === post.id) ? prev.filter(p => p.id !== post.id) : [...prev, post]
        );
    };

    // Fetch posts and transform to Dots
    const fetchDots = useCallback(async () => {
        if (activeCategory === 'bloom' && bloomMode === 'selection' && selectedSlashes.length === 0 && selectedUsers.length === 0 && selectedPosts.length === 0) {
            // Don't fetch if no selection in bloom mode
            return;
        }

        setLoading(true);
        try {
            let url = '/api/posts';

            if (activeCategory === 'bloom') {
                const params = new URLSearchParams();
                if (selectedSlashes.length > 0) params.append('slashes', selectedSlashes.join(','));
                if (selectedUsers.length > 0) params.append('userIds', selectedUsers.join(','));
                if (selectedPosts.length > 0) params.append('postIds', selectedPosts.map(p => p.id).join(','));
                url = `/api/dots/bloom?${params.toString()}`;
            } else if (activeCategory === 'lills') {
                url = '/api/dots/lills';
            } else if (activeCategory === 'auds') {
                url = '/api/dots/auds';
            } else if (activeCategory === 'fills') {
                url = '/api/posts?type=FILL&scope=public';
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch posts');
            const data = await res.json();

            // Handle different response structures
            const rawPosts = data.posts || data;

            const formattedDots: DotData[] = rawPosts.map((post: any) => {
                let mediaUrl = '';
                let mediaType: 'video' | 'image' | 'audio' = 'image';

                // Prioritize Media Relation
                if (post.media && post.media.length > 0) {
                    mediaUrl = post.media[0].url;
                    const type = post.media[0].type;
                    if (type === 'VIDEO') mediaType = 'video';
                    else if (type === 'AUDIO') mediaType = 'audio';
                    else mediaType = 'image';
                }
                // Fallbacks
                else if (post.lillData?.videoUrl) { mediaUrl = post.lillData.videoUrl; mediaType = 'video'; }
                else if (post.fillData?.videoUrl) { mediaUrl = post.fillData.videoUrl; mediaType = 'video'; }
                else if (post.audData?.audioUrl) { mediaUrl = post.audData.audioUrl; mediaType = 'audio'; }

                if (!mediaUrl) mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';

                const viewsCount = post.views || 0;
                const date = new Date(post.createdAt);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const timeAgo = diffDays > 30 ? `${Math.floor(diffDays / 30)} mo ago` : `${diffDays}d ago`;

                return {
                    id: `dot-${post.id}`,
                    postId: post.id,
                    username: post.user?.profile?.displayName || post.user?.name || 'User',
                    userId: post.user?.id,
                    avatar: post.user?.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user?.id}`,
                    description: post.content || '',
                    likes: post._count?.likes ?? post.likes ?? 0,
                    comments: post._count?.comments ?? post.comments ?? 0,
                    mediaUrl,
                    mediaType,
                    category: (post.postType || 'MIX').toLowerCase(),
                    isSubscribed: post.isSubscribed || false,
                    followersCount: post.user?.followersCount || 0,
                    views: viewsCount > 1000 ? (viewsCount / 1000).toFixed(1) + 'K' : viewsCount.toString(),
                    createdAt: timeAgo,
                    reactionCounts: post.reactionCounts || {},
                    userReaction: post.userReaction
                };
            });

            setDots(formattedDots);
        } catch (error) {
            console.error('Error loading dots:', error);
            setDots([]);
        } finally {
            setLoading(false);
        }
    }, [activeCategory, bloomMode]); // Depend on bloom filters? No, specific dependency below.

    // Trigger fetch when Bloom Mode switches to feed
    useEffect(() => {
        if (activeCategory === 'bloom' && bloomMode === 'feed') {
            fetchDots();
        }
    }, [bloomMode, activeCategory]);

    useEffect(() => {
        if (viewMode !== 'feed') return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        setActiveDotIndex(index);
                        setIsPlaying(true);
                    }
                });
            },
            { threshold: 0.6 }
        );

        const dotElements = document.querySelectorAll('.dot-item');
        dotElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [dots, viewMode]);

    const handleVideoEnd = () => {
        if (autoScroll && activeDotIndex < dots.length - 1) {
            const nextIndex = activeDotIndex + 1;
            const nextElement = document.querySelector(`[data-index="${nextIndex}"]`);
            nextElement?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleSubscribe = async (targetUserId: string, currentStatus: boolean, index: number) => {
        if (!session) return;
        const newDots = [...dots];
        const dot = newDots[index];
        dot.isSubscribed = !currentStatus;
        dot.followersCount += (!currentStatus ? 1 : -1);
        setDots(newDots);
        try {
            await fetch('/api/user/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId })
            });
        } catch (error) { console.error(error); }
    };

    const filteredDots = dots.filter(dot => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return dot.description.toLowerCase().includes(q) || dot.username.toLowerCase().includes(q);
        }
        if (activeCategory === 'fills' && activeFillFilter !== 'All') {
            const filter = activeFillFilter.toLowerCase();
            return dot.description.toLowerCase().includes(filter) || dot.category.includes(filter);
        }
        return true;
    });

    const handleGridItemClick = (index: number) => {
        const dot = filteredDots[index];
        const mainIndex = dots.findIndex(d => d.id === dot.id);
        setActiveDotIndex(mainIndex);
        setViewMode('feed');
        setTimeout(() => {
            const element = document.querySelector(`[data-index="${mainIndex}"]`);
            element?.scrollIntoView({ behavior: 'auto' });
        }, 100);
    };

    const toggleSlashSelection = (tag: string) => {
        if (selectedSlashes.includes(tag)) {
            setSelectedSlashes(prev => prev.filter(t => t !== tag));
        } else {
            setSelectedSlashes(prev => [...prev, tag]);
        }
    };

    const startBloom = () => {
        setBloomMode('feed');
    };

    const featuredItem = dots.length > 0
        ? dots.reduce((prev, current) => (prev.likes > current.likes) ? prev : current)
        : null;

    if (status === 'loading') return <LoadingSpinner />;
    if (status === 'unauthenticated') return <LandingPage />;

    // Bloom Selection UI
    if (activeCategory === 'bloom' && bloomMode === 'selection') {
        return (
            <div className="bg-black min-h-screen text-white">
                {/* Category Tabs at TOP */}
                <div className="sticky top-0 z-50 bg-black border-b border-white/10 p-4">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat.id
                                        ? 'bg-white text-black'
                                        : 'bg-transparent text-white/50 hover:text-white border border-white/20 hover:border-white/40'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        <div className="w-10" /> {/* Spacer */}
                    </div>
                </div>

                {/* Selection Content */}
                <div className="max-w-2xl mx-auto p-6 pt-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Bloom Your Feed</h1>
                    <p className="text-gray-500 mb-8">Select topics and users to curate your personalized feed.</p>

                    {/* Topics Section (Slashes) */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="text-white/60">#</span> Topics
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {availableSlashes.length === 0 ? (
                                <p className="text-sm text-gray-600">Loading topics...</p>
                            ) : (
                                availableSlashes.map(slash => (
                                    <button
                                        key={slash.tag}
                                        onClick={() => toggleSlashSelection(slash.tag)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedSlashes.includes(slash.tag)
                                            ? 'bg-white text-black border border-white'
                                            : 'bg-transparent text-gray-400 border border-gray-700 hover:border-white/50 hover:text-white'
                                            }`}
                                    >
                                        #{slash.tag} <span className="text-xs opacity-50">({slash.count})</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Users & Posts Search Section */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="text-white/60">@</span> Add Users & Posts
                        </h2>

                        {/* Search Input */}
                        <div className="bg-[#111] border border-white/10 rounded-xl p-4 relative z-10">
                            <div className="flex items-center gap-2 mb-4 bg-black/50 border border-white/10 rounded-lg px-3 py-2">
                                <Search size={18} className="text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search users or posts..."
                                    value={bloomSearchQuery}
                                    onChange={(e) => setBloomSearchQuery(e.target.value)}
                                    className="w-full bg-transparent text-white placeholder-gray-600 focus:outline-none text-sm"
                                />
                                {isSearching && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                            </div>

                            {/* Search Results */}
                            {bloomSearchQuery && (
                                <div className="mb-4 max-h-60 overflow-y-auto no-scrollbar border-b border-white/10 pb-2">
                                    {bloomSearchResults.users.length === 0 && bloomSearchResults.posts.length === 0 && !isSearching ? (
                                        <p className="text-sm text-center text-gray-600 py-2">No results found.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* User Results */}
                                            {bloomSearchResults.users.length > 0 && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Users</h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {bloomSearchResults.users.map(user => (
                                                            <button
                                                                key={user.id}
                                                                onClick={() => { toggleUserSelection(user.id); setBloomSearchQuery(''); }}
                                                                disabled={selectedUsers.includes(user.id)}
                                                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 text-left transition-colors disabled:opacity-50"
                                                            >
                                                                <img src={user.avatar} className="w-8 h-8 rounded-full bg-gray-800 object-cover" />
                                                                <div className="overflow-hidden">
                                                                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                                                    <p className="text-xs text-gray-500 truncate">{user.handle}</p>
                                                                </div>
                                                                {selectedUsers.includes(user.id) && <Check size={14} className="ml-auto text-green-500" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Post Results */}
                                            {bloomSearchResults.posts.length > 0 && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Posts</h3>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {bloomSearchResults.posts.map(post => {
                                                            const isSelected = selectedPosts.some(p => p.id === post.id);
                                                            return (
                                                                <button
                                                                    key={post.id}
                                                                    onClick={() => { togglePostSelection(post); setBloomSearchQuery(''); }}
                                                                    disabled={isSelected}
                                                                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/10 text-left transition-colors disabled:opacity-50"
                                                                >
                                                                    {post.image ? (
                                                                        <img src={post.image} className="w-10 h-10 rounded bg-gray-800 object-cover flex-shrink-0" />
                                                                    ) : (
                                                                        <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 text-xs text-gray-500">TxT</div>
                                                                    )}
                                                                    <div className="flex-1 overflow-hidden">
                                                                        <p className="text-sm text-gray-300 line-clamp-1">{post.content}</p>
                                                                        <p className="text-xs text-gray-600 truncate">by {post.author}</p>
                                                                    </div>
                                                                    {isSelected && <Check size={14} className="ml-auto text-green-500 mt-1" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Selected Items Display */}
                            <div className="space-y-3">
                                {/* Selected Users */}
                                {selectedUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUsers.map(userId => (
                                            <div key={userId} className="flex items-center gap-2 pl-3 pr-2 py-1 bg-white text-black rounded-full text-xs font-medium">
                                                <span>User: {userId}</span> {/* Ideally show name but ID for now */}
                                                <button onClick={() => toggleUserSelection(userId)} className="p-0.5 hover:bg-black/10 rounded-full">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Selected Posts */}
                                {selectedPosts.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedPosts.map(post => (
                                            <div key={post.id} className="flex items-center gap-2 p-2 bg-white/10 border border-white/20 rounded-lg">
                                                {post.image && <img src={post.image} className="w-8 h-8 rounded object-cover" />}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white truncate">{post.content}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{post.author}</p>
                                                </div>
                                                <button onClick={() => togglePostSelection(post)} className="text-gray-400 hover:text-white">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedUsers.length === 0 && selectedPosts.length === 0 && !bloomSearchQuery && (
                                    <p className="text-sm text-gray-600 italic">No users or posts selected yet.</p>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Content from selected users, posts and similar creators will appear in your bloom.</p>
                    </div>

                    {/* Info */}
                    <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Bloom shows posts matching your selected topics, users, and specific posts.
                            We also include similar content to help you discover more of what you like.
                        </p>
                    </div>

                    {/* Start Bloom Button */}
                    <button
                        onClick={startBloom}
                        disabled={selectedSlashes.length === 0 && selectedUsers.length === 0 && selectedPosts.length === 0}
                        className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-100 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        Start Bloom <Check size={20} />
                    </button>
                </div>
            </div>
        );
    }

    const getGridAspectRatio = (dot: DotData) => {
        if (dot.category === 'lills') return 'aspect-[9/16]';
        if (dot.category === 'fills') return 'aspect-video';
        if (dot.mediaType === 'image') return 'aspect-[4/3]';
        return 'aspect-square';
    };

    const getFeedObjectFit = (dot: DotData) => {
        if (dot.category === 'fills') return 'object-contain';
        if (dot.mediaType === 'image') return 'object-contain';
        return 'object-cover';
    };

    return (
        <div className="bg-black min-h-screen text-white overflow-hidden relative font-sans">
            {/* Header */}
            <div className={`fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-300 ${viewMode === 'grid' ? 'bg-[#0f0f0f]' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
                {viewMode === 'grid' ? (
                    <div className="flex items-center justify-between gap-4 max-w-[1800px] mx-auto">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <ChevronLeft size={24} />
                            </button>
                            <h1 className="text-xl font-bold tracking-tight">Dots</h1>
                        </div>
                        {/* Search Bar & Profile (omitted for brevity, keeping existing structure mostly) */}
                        <div className="flex-1 max-w-2xl mx-4">
                            <div className="flex items-center bg-[#222] rounded-full overflow-hidden border border-[#333] focus-within:border-blue-500 transition-colors">
                                <div className="pl-4 text-gray-400"><Search size={20} /></div>
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-none py-2 px-4 text-white placeholder:text-gray-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <button onClick={() => {
                                    if (activeCategory === 'bloom') setBloomMode('selection');
                                    else router.back();
                                }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all text-white">
                                    <ChevronLeft size={20} />
                                </button>
                                <h1 className="text-2xl font-bold text-shadow-md">Dots</h1>
                            </div>
                        </div>
                    </div>
                )}

                {showCategories && (activeCategory !== 'bloom' || bloomMode !== 'selection') && (
                    <div className={`flex gap-2 overflow-x-auto pb-2 no-scrollbar mt-4 ${viewMode === 'grid' ? 'max-w-[1800px] mx-auto' : ''}`}>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all shadow-lg ${activeCategory === cat.id
                                    ? 'bg-white text-black'
                                    : 'bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:bg-white/20'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {viewMode === 'grid' ? (
                <div className="pt-[140px] h-screen overflow-y-auto pb-20 no-scrollbar bg-[#0f0f0f]">
                    {/* Fill Filters - Only show for Fills category */}
                    {activeCategory === 'fills' && (
                        <div className="max-w-[1800px] mx-auto px-6 mb-8">
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                {FILL_FILTERS.map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFillFilter(filter)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeFillFilter === filter
                                            ? 'bg-[#E5E5E5] text-black'
                                            : 'bg-[#272727] text-white hover:bg-[#3F3F3F]'
                                            }`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trending & Recent Section - Always Visible on Fills Tab */}
                    {activeCategory === 'fills' && filteredDots.length > 0 && (
                        <div className="max-w-[1800px] mx-auto px-6 mb-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Most Trending */}
                                <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl overflow-hidden">
                                    <div className="p-4 border-b border-white/10">
                                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                            🔥 Most Trending
                                        </h3>
                                    </div>
                                    {(() => {
                                        const trending = [...filteredDots].sort((a, b) => b.likes - a.likes)[0];
                                        return trending ? (
                                            <div
                                                onClick={() => handleGridItemClick(filteredDots.indexOf(trending))}
                                                className="cursor-pointer group"
                                            >
                                                <div className="aspect-video relative overflow-hidden bg-black">
                                                    {trending.mediaType === 'video' ? (
                                                        <video src={trending.mediaUrl} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={trending.mediaUrl} alt={trending.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <img src={trending.avatar} className="w-8 h-8 rounded-full" />
                                                            <span className="text-white font-medium text-sm">{trending.username}</span>
                                                        </div>
                                                        <p className="text-white font-semibold line-clamp-2 mb-1">{trending.description}</p>
                                                        <div className="flex items-center gap-4 text-xs text-gray-300">
                                                            <span>{trending.views} views</span>
                                                            <span>❤️ {trending.likes}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>

                                {/* Most Recent */}
                                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl overflow-hidden">
                                    <div className="p-4 border-b border-white/10">
                                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                            ⚡ Most Recent
                                        </h3>
                                    </div>
                                    {(() => {
                                        const recent = filteredDots[0]; // First item is most recent
                                        return recent ? (
                                            <div
                                                onClick={() => handleGridItemClick(0)}
                                                className="cursor-pointer group"
                                            >
                                                <div className="aspect-video relative overflow-hidden bg-black">
                                                    {recent.mediaType === 'video' ? (
                                                        <video src={recent.mediaUrl} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={recent.mediaUrl} alt={recent.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <img src={recent.avatar} className="w-8 h-8 rounded-full" />
                                                            <span className="text-white font-medium text-sm">{recent.username}</span>
                                                        </div>
                                                        <p className="text-white font-semibold line-clamp-2 mb-1">{recent.description}</p>
                                                        <div className="flex items-center gap-4 text-xs text-gray-300">
                                                            <span>{recent.views} views</span>
                                                            <span>{recent.createdAt}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}


                    <div className="max-w-[1800px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                        {filteredDots.map((dot, index) => (
                            <div key={dot.id} onClick={() => handleGridItemClick(index)} className="group cursor-pointer flex flex-col gap-3">
                                <div className={`relative ${getGridAspectRatio(dot)} rounded-xl overflow-hidden bg-[#1a1a1a]`}>
                                    {dot.mediaType === 'video' ? (
                                        <video src={dot.mediaUrl} className="w-full h-full object-cover" muted />
                                    ) : (
                                        <img src={dot.mediaUrl} alt={dot.description} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    )}
                                </div>
                                <div className="flex gap-3 items-start">
                                    <img src={dot.avatar} className="w-9 h-9 rounded-full mt-1 flex-shrink-0 bg-[#222]" />
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-white font-semibold text-base line-clamp-2 leading-snug group-hover:text-gray-200">{dot.description}</h3>
                                        <div className="flex flex-col text-[#AAAAAA] text-sm">
                                            <span>{dot.username}</span>
                                            <span>{dot.views} views • {dot.createdAt}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div ref={containerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar">
                    {dots.map((dot, index) => (
                        <div key={dot.id} data-index={index} className="dot-item w-full h-screen snap-start relative flex items-center justify-center bg-gray-900">
                            {dot.mediaType === 'video' ? (
                                <video
                                    src={dot.mediaUrl}
                                    className={`w-full h-full ${getFeedObjectFit(dot)}`}
                                    loop={!autoScroll}
                                    muted={false} // Should be unmuted on tap, handled by playing state usually
                                    playsInline
                                    onEnded={handleVideoEnd}
                                    ref={(el) => {
                                        if (el) {
                                            if (index === activeDotIndex && isPlaying) el.play().catch(() => { });
                                            else el.pause();
                                        }
                                    }}
                                    onClick={() => setIsPlaying(!isPlaying)}
                                />
                            ) : (
                                <img src={dot.mediaUrl} className={`w-full h-full ${getFeedObjectFit(dot)}`} />
                            )}

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

                            {/* Right Sidebar - REACTIONS FIXED */}
                            <div className="absolute right-2 bottom-32 flex flex-col items-end gap-4 pr-2">
                                {/* Profile Avatar */}
                                <div className="flex flex-col items-center gap-1 mb-2">
                                    <div className="relative">
                                        <img src={dot.avatar} className="w-10 h-10 rounded-full border-2 border-white" />
                                        {!dot.isSubscribed && (
                                            <button
                                                onClick={() => handleSubscribe(dot.userId, dot.isSubscribed, index)}
                                                className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-500 rounded-full p-0.5"
                                            >
                                                <Plus size={12} className="text-white" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Vertical Reactions */}
                                <div className="bg-black/30 backdrop-blur-md rounded-full p-2 border border-white/10">
                                    <ReactionControl
                                        postId={dot.postId}
                                        counts={dot.reactionCounts}
                                        initialReaction={dot.userReaction as any}
                                        orientation="vertical"
                                        onReact={() => { }} // Optimistic update handled internally by component mostly, or we refresh
                                    />
                                </div>

                                {/* Menu */}
                                <button onClick={() => setShowMenuId(showMenuId === dot.id ? null : dot.id)} className="p-3 bg-black/40 rounded-full backdrop-blur-sm hover:bg-white/20">
                                    <MoreVertical size={24} />
                                </button>
                                {showMenuId === dot.id && (
                                    <div className="absolute right-12 bottom-0 w-48 bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                                        <button onClick={() => { setAutoScroll(!autoScroll); setShowMenuId(null); }} className="w-full px-4 py-3 text-left hover:bg-white/10 flex justify-between">
                                            <span className="text-sm">Auto Scroll</span>
                                            <div className={`w-8 h-4 rounded-full ${autoScroll ? 'bg-pink-500' : 'bg-gray-600'}`} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Info */}
                            <div className="absolute left-4 bottom-8 right-20 max-w-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-bold text-lg text-shadow-sm">{dot.username}</span>
                                </div>
                                <p className="text-base text-white/95 line-clamp-3 font-medium leading-relaxed drop-shadow-md">{dot.description}</p>
                                <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                                    <span>{dot.category}</span> • <span>{dot.createdAt}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {dots.length === 0 && !loading && (
                        <div className="w-full h-screen flex items-center justify-center text-white/50">
                            {activeCategory === 'bloom' ? 'No posts found for selection.' : 'No posts yet.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
