import React, { useState, useEffect } from 'react';
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
    { id: 'news', label: 'News' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'tourism', label: 'Tourism' },
    { id: 'food', label: 'Food' },
    { id: 'tutorials', label: 'Tutorials' },
    { id: 'movies', label: 'Movies' },
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
            watchingCount: 12500,
            shows: [{ episodes: [{ videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }] }]
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
            watchingCount: 840,
            shows: [{ episodes: [{ videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' }] }]
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
            watchingCount: 3200,
            shows: [{ episodes: [{ videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }] }]
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

export default function ChanCarousel({ chans, onPostClick }: ChanCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeFilter, setActiveFilter] = useState('all');

    // Only use chans that actually have chanData
    const incomingChans = chans.filter(p => p.chanData || p.feature === 'CHAN');
    const validChans = incomingChans.length > 0 ? incomingChans : DUMMY_CHANS;

    // For the carousel, we might want to show a subset or all
    const carouselItems = validChans.length > 0 ? validChans.slice(0, 10) : [];

    const handlePrev = () => {
        if (carouselItems.length === 0) return;
        setActiveIndex(prev => (prev === 0 ? carouselItems.length - 1 : prev - 1));
    };

    const handleNext = () => {
        if (carouselItems.length === 0) return;
        setActiveIndex(prev => (prev === carouselItems.length - 1 ? 0 : prev + 1));
    };

    // Check if we have data to display
    const hasData = carouselItems.length > 0;

    return (
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-auto">
            {/* Filter Pills - Top */}
            <div className="pt-40 px-8 flex flex-wrap gap-2 justify-center mb-6">
                {FILTERS.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeFilter === filter.id
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

                {/* Carousel Section - Top */}
                <div
                    className="relative w-full max-w-[1400px] mx-auto h-[700px] flex items-center justify-center mb-20 px-12"
                    style={{ perspective: '1000px' }}
                >
                    {/* Prev Button */}
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 z-30 p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/30 text-white transition-all duration-300 group"
                    >
                        <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={handleNext}
                        className="absolute right-4 z-30 p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/30 text-white transition-all duration-300 group"
                    >
                        <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* Cards Container */}
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {!hasData && (
                            <div className="text-white/50 text-xl font-bold absolute">No channels to display</div>
                        )}

                        {carouselItems.map((item, index) => {
                            // Calculate offset from active index with wrapping
                            let offset = index - activeIndex;
                            const len = carouselItems.length;

                            if (offset > len / 2) offset -= len;
                            if (offset < -len / 2) offset += len;

                            // Removed filter temporarily to ensure everything renders
                            // if (Math.abs(offset) > 2) return null;

                            const isActive = offset === 0;
                            const isPrev = offset === -1;
                            const isNext = offset === 1;

                            let transform = '';
                            let opacity = 0;
                            let zIndex = 0;
                            let pointerEvents = 'none';

                            // Simplified transforms
                            if (isActive) {
                                transform = 'translateX(0) scale(1) translateZ(0)';
                                opacity = 1;
                                zIndex = 20;
                                pointerEvents = 'auto';
                            } else if (isPrev) {
                                transform = 'translateX(-60%) scale(0.85) translateZ(-100px)'; // Removed rotate for safety
                                opacity = 0.7;
                                zIndex = 10;
                                pointerEvents = 'auto';
                            } else if (isNext) {
                                transform = 'translateX(60%) scale(0.85) translateZ(-100px)'; // Removed rotate for safety
                                opacity = 0.7;
                                zIndex = 10;
                                pointerEvents = 'auto';
                            } else {
                                // Hide others but keep in DOM for now
                                transform = `translateX(${offset * 100}%) scale(0.5)`;
                                opacity = 0;
                            }

                            // Debug: force opacity if needed
                            // if (!opacity && Math.abs(offset) <= 2) opacity = 0.2;

                            return (
                                <div
                                    key={item.id}
                                    className="absolute w-[75%] h-[500px] transition-all duration-500 ease-out origin-center"
                                    style={{
                                        transform,
                                        opacity,
                                        zIndex,
                                        pointerEvents: pointerEvents as any,
                                        // backgroundColor: 'rgba(255,0,0,0.1)' // Debug background
                                    }}
                                    onClick={() => isActive ? onPostClick(item) : offset < 0 ? handlePrev() : handleNext()}
                                >
                                    <div className="w-full h-full rounded-3xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 bg-black/20 backdrop-blur-sm group cursor-pointer">
                                        {/* Image/Video Background */}
                                        {item.chanData?.coverImageUrl ? (
                                            <img
                                                src={item.chanData.coverImageUrl}
                                                alt={item.chanData.channelName}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                                                <Play className="w-20 h-20 text-white/20" />
                                            </div>
                                        )}

                                        {/* Content Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

                                        <div className="absolute inset-0 p-10 flex flex-col justify-end items-start text-left">
                                            {/* Live Badge */}
                                            <div className="mb-auto mt-2 flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    {item.chanData?.isLive && (
                                                        <span className="px-3 py-1 rounded-full bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-lg shadow-red-900/50">
                                                            Live
                                                        </span>
                                                    )}
                                                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white/80 text-xs shadow-lg">
                                                        {formatCount(item.chanData?.watchingCount || 0)} watching
                                                    </div>
                                                </div>
                                            </div>

                                            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl font-sans tracking-tight">
                                                {item.chanData?.channelName || 'Untitled Channel'}
                                            </h2>

                                            <div className="flex items-center gap-4 mb-8">
                                                {item.user?.profile?.avatarUrl && (
                                                    <img src={item.user.profile.avatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white/20" />
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-lg">{item.user?.profile?.displayName}</span>
                                                    <span className="text-white/60 text-sm">Owner</span>
                                                </div>
                                            </div>

                                            <button className="flex items-center gap-3 px-8 py-3.5 rounded-full bg-white text-black font-bold hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">
                                                <Play className="w-5 h-5 fill-current" />
                                                <span>Watch</span>
                                            </button>

                                            <div className="mt-6 text-white/60 text-sm font-medium tracking-wide">
                                                LIVE: Watch my Exclusive video '{item.content?.substring(0, 30)}...'
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Popular Chans Section - Below Carousel */}
                <div className="max-w-[1400px] mx-auto w-full px-8 mb-24">
                    <h3 className="text-xl font-bold text-white mb-6">Popular chans in Live</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {validChans.length > 0 ? validChans.concat(validChans).slice(0, 15).map((chan, i) => {
                            const latestShow = chan.chanData?.shows?.[0];
                            const latestEpisode = latestShow?.episodes?.[0];
                            // Use episode video if available, else nothing
                            const videoUrl = latestEpisode?.videoUrl;

                            return (
                                <div
                                    key={`${chan.id}-${i}`}
                                    className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-0 min-w-[360px] w-[360px] flex flex-col items-center hover:bg-white/10 transition-colors cursor-pointer group overflow-hidden relative flex-shrink-0"
                                    onClick={() => onPostClick(chan)}
                                >
                                    {/* Video Preview Container */}
                                    <div className="w-full h-[220px] bg-black relative">
                                        {videoUrl ? (
                                            <video
                                                src={videoUrl}
                                                poster={chan.chanData?.coverImageUrl}
                                                preload="none"
                                                muted
                                                loop
                                                playsInline
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                                                onMouseOver={e => e.currentTarget.play().catch(() => { })}
                                                onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                        ) : (
                                            // Fallback if no video
                                            chan.chanData?.coverImageUrl ? (
                                                <img
                                                    src={chan.chanData.coverImageUrl}
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                    alt=""
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                                    <Play className="w-10 h-10 text-white/20" />
                                                </div>
                                            )
                                        )}

                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

                                        {/* Avatar & Stats Overlay */}
                                        <div className="absolute bottom-4 left-0 w-full px-4 flex flex-col gap-2 pointer-events-none">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full border border-white/30 overflow-hidden bg-black">
                                                    {chan.user?.profile?.avatarUrl ? (
                                                        <img src={chan.user.profile.avatarUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-xs font-bold">
                                                            {chan.user?.profile?.displayName?.[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-white text-xs font-bold truncate flex-1 shadow-black drop-shadow-md">
                                                    {chan.chanData?.channelName || "Channel"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                {chan.chanData?.isLive ? (
                                                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
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
                        }) : (
                            /* Dummy placeholders */
                            [1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="min-w-[360px] h-[220px] bg-white/5 rounded-2xl animate-pulse flex-shrink-0" />
                            ))
                        )}
                    </div>
                </div>

                {/* Grid Section */}
                <div className="max-w-[1400px] mx-auto w-full px-8 pb-32">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {validChans.map((chan) => (
                            <div
                                key={chan.id}
                                onClick={() => onPostClick(chan)}
                                className="bg-transparent rounded-2xl overflow-hidden group cursor-pointer"
                            >
                                <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative mb-3 border border-white/10 group-hover:border-white/30 transition-colors">
                                    {chan.chanData?.coverImageUrl ? (
                                        <img
                                            src={chan.chanData.coverImageUrl}
                                            alt={chan.chanData.channelName}
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Play className="w-12 h-12 text-white/20" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden border border-white/10">
                                        {chan.user?.profile?.avatarUrl && (
                                            <img src={chan.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-bold text-sm leading-tight mb-1 truncate group-hover:text-white/80 transition-colors">
                                            {chan.chanData?.channelName || 'Untitled'}
                                        </h4>
                                        <p className="text-white/50 text-xs mb-1 truncate">
                                            {chan.user?.profile?.displayName}
                                        </p>
                                        <p className="text-white/40 text-[10px]">
                                            {chan.chanData?.watchingCount ? `${formatCount(chan.chanData.watchingCount)} watching` : 'Offline'} • {new Date(chan.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
