import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface ChanCarouselProps {
    chans: any[];
    onPostClick: (post: any) => void;
}

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'live', label: 'Live' },
    { id: 'music', label: 'Music' },
    { id: 'sports', label: 'Sports' },
    { id: 'drama', label: 'Drama' },
    { id: 'gaming', label: 'Gaming' },
];

const DUMMY_CHANS = [
    {
        id: 'd1',
        feature: 'CHAN',
        postType: 'CHAN',
        chanData: {
            id: 'c1',
            channelName: 'Cosmic Vibes',
            coverImageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
            isLive: true,
            watchingCount: 12500
        },
        user: { profile: { displayName: 'Stella Star', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' } },
        content: 'Exploring the universe through sound and vision.'
    },
    {
        id: 'd2',
        feature: 'CHAN',
        postType: 'CHAN',
        chanData: {
            id: 'c2',
            channelName: 'Tech Talk Live',
            coverImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
            isLive: false,
            watchingCount: 840
        },
        user: { profile: { displayName: 'Tech Guru', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' } },
        content: 'Deep dive into the latest gadgets.'
    },
    {
        id: 'd3',
        feature: 'CHAN',
        postType: 'CHAN',
        chanData: {
            id: 'c3',
            channelName: 'Urban Beats',
            coverImageUrl: 'https://images.unsplash.com/photo-1514525253440-b3933325d7ca?w=800&q=80',
            isLive: true,
            watchingCount: 3200
        },
        user: { profile: { displayName: 'Beat Maker', avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100' } },
        content: 'Street rhythm and culture.'
    }
];

function formatCount(count: number) {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
}

// Memoized Chan Card for grid
const ChanCard = React.memo(function ChanCard({
    chan,
    onClick
}: {
    chan: any;
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className="bg-transparent rounded-2xl overflow-hidden group cursor-pointer"
        >
            <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative mb-3 border border-white/10 group-hover:border-white/30 transition-colors">
                {chan.chanData?.coverImageUrl ? (
                    <img
                        src={chan.chanData.coverImageUrl}
                        alt={chan.chanData.channelName}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/20" />
                    </div>
                )}
                {chan.chanData?.isLive && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 rounded text-[10px] font-bold text-white">
                        LIVE
                    </span>
                )}
            </div>
            <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden border border-white/10">
                    {chan.user?.profile?.avatarUrl && (
                        <img src={chan.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-sm leading-tight mb-1 truncate">
                        {chan.chanData?.channelName || 'Untitled'}
                    </h4>
                    <p className="text-white/50 text-xs truncate">
                        {chan.user?.profile?.displayName}
                    </p>
                    <p className="text-white/40 text-[10px]">
                        {formatCount(chan.chanData?.watchingCount || 0)} watching
                    </p>
                </div>
            </div>
        </div>
    );
});

// Memoized Popular Chan Item - No video, just images
const PopularChanItem = React.memo(function PopularChanItem({
    chan,
    onClick
}: {
    chan: any;
    onClick: () => void;
}) {
    return (
        <div
            className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl min-w-[320px] w-[320px] flex flex-col hover:bg-white/10 transition-colors cursor-pointer overflow-hidden flex-shrink-0"
            onClick={onClick}
        >
            <div className="w-full h-[180px] bg-black relative">
                {chan.chanData?.coverImageUrl ? (
                    <img
                        src={chan.chanData.coverImageUrl}
                        className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity"
                        alt=""
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <Play className="w-10 h-10 text-white/20" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

                <div className="absolute bottom-3 left-0 w-full px-3 flex flex-col gap-1.5 pointer-events-none">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full border border-white/30 overflow-hidden bg-black">
                            {chan.user?.profile?.avatarUrl ? (
                                <img src={chan.user.profile.avatarUrl} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-xs font-bold">
                                    {chan.user?.profile?.displayName?.[0]}
                                </div>
                            )}
                        </div>
                        <span className="text-white text-xs font-bold truncate flex-1 drop-shadow-md">
                            {chan.chanData?.channelName || "Channel"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        {chan.chanData?.isLive ? (
                            <span className="text-[10px] text-red-500 font-bold uppercase bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                Live
                            </span>
                        ) : <span />}
                        <span className="text-[10px] text-white/60 font-mono">
                            {formatCount(chan.chanData?.watchingCount || 0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default React.memo(function ChanCarousel({ chans, onPostClick }: ChanCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeFilter, setActiveFilter] = useState('all');

    // Memoized valid chans
    const validChans = useMemo(() => {
        const incoming = chans.filter(p => p.chanData || p.feature === 'CHAN');
        return incoming.length > 0 ? incoming : DUMMY_CHANS;
    }, [chans]);

    // Limit carousel items for performance
    const carouselItems = useMemo(() => validChans.slice(0, 6), [validChans]);

    // Limit popular items
    const popularItems = useMemo(() => validChans.slice(0, 8), [validChans]);

    const handlePrev = useCallback(() => {
        if (carouselItems.length === 0) return;
        setActiveIndex(prev => (prev === 0 ? carouselItems.length - 1 : prev - 1));
    }, [carouselItems.length]);

    const handleNext = useCallback(() => {
        if (carouselItems.length === 0) return;
        setActiveIndex(prev => (prev === carouselItems.length - 1 ? 0 : prev + 1));
    }, [carouselItems.length]);

    const handlePostClick = useCallback((item: any) => {
        onPostClick(item);
    }, [onPostClick]);

    // Only render visible carousel cards (active + neighbors)
    const visibleCards = useMemo(() => {
        if (carouselItems.length === 0) return [];

        const result = [];
        for (let i = 0; i < carouselItems.length; i++) {
            let offset = i - activeIndex;
            const len = carouselItems.length;

            if (offset > len / 2) offset -= len;
            if (offset < -len / 2) offset += len;

            // Only render cards within view (-1, 0, 1)
            if (Math.abs(offset) <= 1) {
                result.push({ item: carouselItems[i], index: i, offset });
            }
        }
        return result;
    }, [carouselItems, activeIndex]);

    return (
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-auto">
            {/* Filter Pills */}
            <div className="pt-40 px-8 flex flex-wrap gap-2 justify-center mb-6">
                {FILTERS.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeFilter === filter.id
                                ? 'bg-white text-black shadow-lg'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/10'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-8 relative">

                {/* Carousel Section - Simplified */}
                <div
                    className="relative w-full max-w-[1200px] mx-auto h-[500px] flex items-center justify-center mb-16 px-12"
                    style={{ perspective: '1000px' }}
                >
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 z-30 p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white transition-all"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                        onClick={handleNext}
                        className="absolute right-4 z-30 p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white transition-all"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    <div className="relative w-full h-full flex items-center justify-center">
                        {visibleCards.length === 0 && (
                            <div className="text-white/50 text-xl font-bold">No channels to display</div>
                        )}

                        {visibleCards.map(({ item, index, offset }) => {
                            const isActive = offset === 0;

                            let transform = '';
                            let opacity = 0;
                            let zIndex = 0;

                            if (isActive) {
                                transform = 'translateX(0) scale(1)';
                                opacity = 1;
                                zIndex = 20;
                            } else if (offset === -1) {
                                transform = 'translateX(-55%) scale(0.85)';
                                opacity = 0.6;
                                zIndex = 10;
                            } else if (offset === 1) {
                                transform = 'translateX(55%) scale(0.85)';
                                opacity = 0.6;
                                zIndex = 10;
                            }

                            return (
                                <div
                                    key={item.id}
                                    className="absolute w-[70%] h-[400px] transition-all duration-400 ease-out"
                                    style={{ transform, opacity, zIndex }}
                                    onClick={() => isActive ? handlePostClick(item) : offset < 0 ? handlePrev() : handleNext()}
                                >
                                    <div className="w-full h-full rounded-2xl overflow-hidden relative shadow-2xl border border-white/10 bg-black/20 cursor-pointer group">
                                        {item.chanData?.coverImageUrl ? (
                                            <img
                                                src={item.chanData.coverImageUrl}
                                                alt={item.chanData.channelName}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                                                <Play className="w-16 h-16 text-white/20" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

                                        <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                            <div className="mb-auto flex items-center gap-3">
                                                {item.chanData?.isLive && (
                                                    <span className="px-3 py-1 rounded-full bg-red-600/90 text-white text-[10px] font-bold uppercase animate-pulse">
                                                        Live
                                                    </span>
                                                )}
                                                <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white/80 text-xs">
                                                    {formatCount(item.chanData?.watchingCount || 0)} watching
                                                </span>
                                            </div>

                                            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-2xl">
                                                {item.chanData?.channelName || 'Untitled Channel'}
                                            </h2>

                                            <div className="flex items-center gap-4 mb-6">
                                                {item.user?.profile?.avatarUrl && (
                                                    <img src={item.user.profile.avatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white/20" />
                                                )}
                                                <div>
                                                    <span className="text-white font-bold">{item.user?.profile?.displayName}</span>
                                                    <span className="text-white/60 text-sm block">Owner</span>
                                                </div>
                                            </div>

                                            <button className="flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all w-fit">
                                                <Play className="w-5 h-5 fill-current" />
                                                <span>Watch</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Popular Chans Section - Image only, no videos */}
                <div className="max-w-[1200px] mx-auto w-full px-8 mb-16">
                    <h3 className="text-xl font-bold text-white mb-6">Popular Channels</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {popularItems.map((chan, i) => (
                            <PopularChanItem
                                key={`${chan.id}-${i}`}
                                chan={chan}
                                onClick={() => handlePostClick(chan)}
                            />
                        ))}
                    </div>
                </div>

                {/* Grid Section */}
                <div className="max-w-[1200px] mx-auto w-full px-8 pb-32">
                    <h3 className="text-xl font-bold text-white mb-6">All Channels</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {validChans.slice(0, 12).map((chan) => (
                            <ChanCard
                                key={chan.id}
                                chan={chan}
                                onClick={() => handlePostClick(chan)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});
