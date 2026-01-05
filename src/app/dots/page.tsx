'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from '@/hooks/use-session';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Circle as DotIcon, X, Search, ChevronLeft, Bell, Video as VideoIcon, User as UserIcon } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LandingPage from '@/components/LandingPage/LandingPage';
import { useRouter } from 'next/navigation';

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
}

export default function DotsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeCategory, setActiveCategory] = useState('fills');
    const [dots, setDots] = useState<DotData[]>([]);
    const [loading, setLoading] = useState(true);
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

    // Switch view mode based on category
    useEffect(() => {
        if (activeCategory === 'fills') {
            setViewMode('grid');
        } else {
            setViewMode('feed');
        }
    }, [activeCategory]);

    // Fetch posts and transform to Dots
    const fetchDots = useCallback(async () => {
        setLoading(true);
        try {
            let url = '/api/posts'; // Default fallback (e.g. for fills or generic)

            if (activeCategory === 'bloom') {
                url = '/api/dots/bloom';
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

                // Prioritize Media Relation (consistently R2/Cloudflare)
                if (post.media && post.media.length > 0) {
                    mediaUrl = post.media[0].url;
                    const type = post.media[0].type;
                    if (type === 'VIDEO') mediaType = 'video';
                    else if (type === 'AUDIO') mediaType = 'audio';
                    else mediaType = 'image';
                }
                // Fallbacks for legacy/specific data structures
                else if (post.lillData?.videoUrl) {
                    mediaUrl = post.lillData.videoUrl;
                    mediaType = 'video';
                } else if (post.fillData?.videoUrl) {
                    mediaUrl = post.fillData.videoUrl;
                    mediaType = 'video';
                } else if (post.audData?.audioUrl) {
                    mediaUrl = post.audData.audioUrl; // Fix: was coverImageUrl
                    mediaType = 'audio';
                }

                if (!mediaUrl) {
                    // Placeholder if absolutely nothing found
                    mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
                }

                // Real Data Mapping
                const viewsCount = post.views || 0;
                // Format relative time (simple version)
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
                    // Store extra fields for filtering if needed
                    feature: post.feature
                };
            });

            setDots(formattedDots);
        } catch (error) {
            console.error('Error loading dots:', error);
            setDots([]);
        } finally {
            setLoading(false);
        }
    }, [activeCategory]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchDots();
        }
    }, [status, fetchDots]);

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
        } catch (error) {
            console.error(error);
        }
    };

    const filteredDots = dots.filter(dot => {
        // 1. Search Query Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!dot.description.toLowerCase().includes(q) && !dot.username.toLowerCase().includes(q)) {
                return false;
            }
        }

        // 2. Category/Tab Filter (already handled by fetchDots for main categories, but refining here if mixed)
        // If activeCategory is 'fills', we also respect activeFillFilter
        if (activeCategory === 'fills' && activeFillFilter !== 'All') {
            // Mapping UI filters to data properties
            // 'New to you', 'Live', 'Stand-Up', 'Gaming', 'Music', 'Cartoons', 'Challenges', 'Visual Arts'
            // This is a naive client-side mapping. ideally backend handles this.
            // For now, we filter by 'feature' tag or description text as a fallback
            const filter = activeFillFilter.toLowerCase();
            const contentMatch = dot.description.toLowerCase().includes(filter) || dot.category.includes(filter);
            // If we had a specific 'feature' field mapped, we'd use it.
            // Since we dont have mapped features yet, we'll rely on text match or just allow all for now to avoid empty screens
            // until backend supports these specific tags.
            // BETTER: Check if the dot has a matching tag/feature
            // Let's assume we mapped 'feature' in DotData (added above).
            const featureMatch = (dot as any).feature?.toLowerCase() === filter;
            return contentMatch || featureMatch;
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

    const featuredItem = dots.length > 0
        ? dots.reduce((prev, current) => (prev.likes > current.likes) ? prev : current)
        : null;

    if (status === 'loading') return <LoadingSpinner />;
    if (status === 'unauthenticated') return <LandingPage />;

    // Helper to determine aspect ratio class based on category/type
    const getGridAspectRatio = (dot: DotData) => {
        if (dot.category === 'lills') return 'aspect-[9/16]';
        if (dot.category === 'fills') return 'aspect-video'; // 16:9
        if (dot.mediaType === 'image') return 'aspect-[4/3]';
        return 'aspect-square'; // Default fallback
    };

    const getFeedObjectFit = (dot: DotData) => {
        if (dot.category === 'fills') return 'object-contain'; // 16:9 in Feed -> Show full width (letterboxed)
        if (dot.mediaType === 'image') return 'object-contain'; // 4:3 in Feed -> Show full image
        return 'object-cover'; // Lills/Vertical -> Fill screen
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

                        <div className="flex-1 max-w-2xl mx-4">
                            <div className="flex items-center bg-[#222] rounded-full overflow-hidden border border-[#333] focus-within:border-blue-500 transition-colors">
                                <div className="pl-4 text-gray-400">
                                    <Search size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-none py-2 px-4 text-white placeholder:text-gray-500 focus:outline-none"
                                />
                                <button className="px-6 py-2 bg-[#222] hover:bg-[#333] border-l border-[#333] transition-colors">
                                    <Search size={20} />
                                </button>
                                <button className="px-5 py-2.5 bg-[#FF0050] hover:bg-[#D60045] text-white font-medium transition-colors">
                                    Search
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Icons removed as requested */}
                            <button className="p-1 ml-2">
                                <img src={session?.user?.image || "https://github.com/shadcn.png"} className="w-8 h-8 rounded-full" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => router.back()}
                                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all text-white"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <h1 className="text-2xl font-bold">Dots</h1>
                            </div>
                            {/* Categories Toggle Removed */}
                        </div>
                    </div>
                )}

                {showCategories && (
                    <div className={`flex gap-2 overflow-x-auto pb-2 no-scrollbar mt-4 ${viewMode === 'grid' ? 'max-w-[1800px] mx-auto' : ''}`}>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat.id
                                    ? 'bg-white text-black'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
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

                    {featuredItem && activeCategory === 'fills' && (
                        <div className="max-w-[1800px] mx-auto px-6 mb-8">
                            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden group cursor-pointer shadow-2xl">
                                {featuredItem.mediaType === 'video' ? (
                                    <video src={featuredItem.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" muted autoPlay loop playsInline />
                                ) : (
                                    <img src={featuredItem.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Hero" />
                                )}

                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-12">
                                    <h1 className="text-5xl font-extrabold max-w-xl leading-tight mb-4 text-white drop-shadow-lg">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">Featured Content</span>
                                    </h1>
                                    <p className="text-xl font-bold text-white mb-2">{featuredItem.description || "Check this out!"}</p>
                                    <div className="flex items-center gap-2 mb-8">
                                        <img src={featuredItem.avatar} className="w-8 h-8 rounded-full" />
                                        <span className="text-gray-200 font-medium">{featuredItem.username}</span>
                                    </div>

                                    <div className="flex items-center justify-between w-full max-w-4xl mt-auto absolute bottom-12 right-12 left-12">
                                        <div></div>
                                        <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                            <div className="flex flex-col text-right">
                                                <span className="text-xs text-uppercase font-bold tracking-wider text-gray-400">TRENDING</span>
                                                <span className="text-lg font-bold">Top Pick</span>
                                            </div>
                                            <button className="w-14 h-14 bg-[#FF0050] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-pink-500/30">
                                                <Play fill="white" size={24} className="ml-1" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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

                    <div className="max-w-[1800px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                        {filteredDots.map((dot, index) => (
                            <div
                                key={dot.id}
                                onClick={() => handleGridItemClick(index)}
                                className="group cursor-pointer flex flex-col gap-3"
                            >
                                <div className={`relative ${getGridAspectRatio(dot)} rounded-xl overflow-hidden bg-[#1a1a1a]`}>
                                    {dot.mediaType === 'video' ? (
                                        <video
                                            src={dot.mediaUrl}
                                            className="w-full h-full object-cover"
                                            muted
                                        />
                                    ) : (
                                        <img
                                            src={dot.mediaUrl}
                                            alt={dot.description}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    )}
                                    <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs font-medium text-white">
                                        12:42
                                    </div>
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="flex gap-3 items-start">
                                    <img src={dot.avatar} className="w-9 h-9 rounded-full mt-1 flex-shrink-0 bg-[#222]" />
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-white font-semibold text-base line-clamp-2 leading-snug group-hover:text-gray-200 transition-colors">
                                            {dot.description || 'Amazing content you must watch right now!'}
                                        </h3>
                                        <div className="flex flex-col text-[#AAAAAA] text-sm">
                                            <div className="flex items-center hover:text-white transition-colors">
                                                <span>{dot.username}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span>{dot.views} views</span>
                                                <span className="text-[10px]">•</span>
                                                <span>{dot.createdAt}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="ml-auto p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical size={20} className="text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredDots.length === 0 && (
                        <div className="text-center text-white/50 mt-20">
                            <p className="text-xl">No results found</p>
                            <p className="text-sm mt-2">Try different keywords or filters</p>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    ref={containerRef}
                    className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                >
                    {dots.map((dot, index) => (
                        <div
                            key={dot.id}
                            data-index={index}
                            className="dot-item w-full h-screen snap-start relative flex items-center justify-center bg-gray-900"
                        >
                            {/* Media Layer with Dynamic Content Fit */}
                            {dot.mediaType === 'video' ? (
                                <video
                                    src={dot.mediaUrl}
                                    className={`w-full h-full ${getFeedObjectFit(dot)}`}
                                    loop={!autoScroll}
                                    muted
                                    playsInline
                                    onEnded={handleVideoEnd}
                                    ref={(el) => {
                                        if (el) {
                                            if (index === activeDotIndex && isPlaying && viewMode === 'feed') el.play().catch(() => { });
                                            else el.pause();
                                        }
                                    }}
                                    onClick={() => setIsPlaying(!isPlaying)}
                                />
                            ) : (
                                <img
                                    src={dot.mediaUrl}
                                    alt="Dot content"
                                    className={`w-full h-full ${getFeedObjectFit(dot)}`}
                                />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

                            <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center">
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="p-2 bg-black/40 rounded-full backdrop-blur-sm hover:bg-black/60 transition-all"
                                >
                                    {isPlaying && dot.mediaType === 'video' ? <Pause size={24} /> : <Play size={24} />}
                                </button>

                                <div className="flex flex-col items-center gap-1">
                                    <button className="p-3 bg-black/40 rounded-full backdrop-blur-sm hover:bg-pink-500/20 hover:text-pink-500 transition-all">
                                        <Heart size={28} />
                                    </button>
                                    <span className="text-xs font-bold">{dot.likes}</span>
                                </div>

                                <div className="flex flex-col items-center gap-1">
                                    <button className="p-3 bg-black/40 rounded-full backdrop-blur-sm hover:bg-blue-500/20 hover:text-blue-500 transition-all">
                                        <MessageCircle size={28} />
                                    </button>
                                    <span className="text-xs font-bold">{dot.comments}</span>
                                </div>

                                <button className="p-3 bg-black/40 rounded-full backdrop-blur-sm hover:bg-white/20 transition-all">
                                    <Share2 size={28} />
                                </button>

                                <div className="more-menu-container relative">
                                    <button
                                        onClick={() => setShowMenuId(showMenuId === dot.id ? null : dot.id)}
                                        className="p-3 bg-black/40 rounded-full backdrop-blur-sm hover:bg-white/20 transition-all"
                                    >
                                        <MoreVertical size={28} />
                                    </button>
                                    {showMenuId === dot.id && (
                                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                                            <button onClick={() => { setAutoScroll(!autoScroll); setShowMenuId(null); }} className="w-full px-4 py-3 text-left hover:bg-white/10 flex justify-between">
                                                <span className="text-sm">Auto Scroll</span>
                                                <div className={`w-8 h-4 rounded-full ${autoScroll ? 'bg-pink-500' : 'bg-gray-600'}`} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="absolute left-4 bottom-24 right-20 max-w-lg">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={dot.avatar} alt={dot.username} className="w-10 h-10 rounded-full border-2 border-white" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-shadow-sm leading-tight">{dot.username}</span>
                                        <span className="text-[10px] text-white/70">{dot.followersCount} subscribers</span>
                                    </div>
                                    <button
                                        onClick={() => handleSubscribe(dot.userId, dot.isSubscribed, index)}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${dot.isSubscribed ? 'bg-white/20 text-white' : 'border border-white hover:bg-white hover:text-black'}`}
                                    >
                                        {dot.isSubscribed ? 'Subscribed' : 'Subscribe'}
                                    </button>
                                </div>
                                <p className="text-sm text-white/90 line-clamp-2">{dot.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
