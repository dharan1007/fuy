"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/SpaceBackground";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
    Play,
    Tv,
    Users,
    Zap,
    Clock,
    ChevronLeft,
    MessageSquare,
    Share2,
    Calendar,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";

export default function ChannelProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [channel, setChannel] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
    const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (params.id) {
            fetchChannel();
        }
    }, [params.id]);

    async function fetchChannel() {
        try {
            const res = await fetch(`/api/chans/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setChannel(data);
                // Expand the first show by default if available
                if (data.shows && data.shows.length > 0) {
                    setExpandedShows(new Set([data.shows[0].id]));
                }
            }
        } catch (error) {
            console.error("Failed to fetch channel", error);
        } finally {
            setLoading(false);
        }
    }

    const toggleShow = (showId: string) => {
        const newSet = new Set(expandedShows);
        if (newSet.has(showId)) {
            newSet.delete(showId);
        } else {
            newSet.add(showId);
        }
        setExpandedShows(newSet);
    };

    if (loading) return <LoadingSpinner message="Locking to Frequency..." />;

    if (!channel) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
                <SpaceBackground />
                <h1 className="text-4xl font-black text-white mb-4">Channel Not Found</h1>
                <button
                    onClick={() => router.push('/explore')}
                    className="px-6 py-2 bg-white text-black font-bold rounded-xl"
                >
                    Back to Explore
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col overflow-x-hidden">
            <SpaceBackground />
            <AppHeader title={channel.channelName} />

            {/* Video Player Modal/Section if episode selected */}
            <AnimatePresence>
                {selectedEpisode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 pointer-events-none"
                    >
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl pointer-events-auto" onClick={() => setSelectedEpisode(null)} />

                        <div className="relative z-10 w-full max-w-6xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.1)] border border-white/10 pointer-events-auto">
                            <video
                                src={selectedEpisode.videoUrl}
                                className="w-full h-full"
                                controls
                                autoPlay
                                poster={selectedEpisode.coverUrl}
                            />
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                                <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                    <h2 className="text-xl font-black">{selectedEpisode.title}</h2>
                                    <p className="text-white/60 text-sm">Episode {selectedEpisode.episodeNumber}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedEpisode(null)}
                                    className="bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md border border-white/10 pointer-events-auto transition-all transition-colors active:scale-90"
                                >
                                    <ChevronDown className="w-6 h-6 rotate-180" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 w-full">
                {/* Banner / Cover */}
                <div className="relative w-full h-64 md:h-96">
                    {channel.coverImageUrl ? (
                        <img
                            src={channel.coverImageUrl}
                            alt={channel.channelName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                    {/* Channel Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-6">
                            <div className="relative flex-shrink-0">
                                <img
                                    src={channel.post.user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + channel.channelName}
                                    className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-black object-cover bg-black"
                                />
                                {channel.isLive && (
                                    <div className="absolute -top-3 -right-3 px-3 py-1 bg-red-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border-2 border-black">
                                        Live
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 pb-2">
                                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2 drop-shadow-xl">
                                    {channel.channelName}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-white/60 font-mono text-sm">
                                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {channel.stats.subscriberCount} SUBSCRIBERS</span>
                                    <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-500" /> {channel.stats.vibes} VIBES</span>
                                    <span className="flex items-center gap-1.5"><Tv className="w-4 h-4 text-blue-400" /> {channel.stats.activeShows} SHOWS</span>
                                </div>
                            </div>
                            <div className="flex gap-3 pb-2">
                                <button className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    Subscribe
                                </button>
                                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 active:scale-95">
                                    <Share2 className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="max-w-7xl mx-auto px-6 py-12">
                    {/* Shows & Content - Full Width */}
                    <div className="w-full space-y-12">
                        <section>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-8 flex items-center gap-3">
                                <Tv className="w-6 h-6 text-white/40" /> Broadcasting Schedule
                            </h2>

                            <div className="space-y-6">
                                {channel.shows?.map((show: any) => (
                                    <div key={show.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden transition-all hover:bg-white/10">
                                        {/* Show Header */}
                                        <div
                                            className="p-6 flex items-center justify-between cursor-pointer"
                                            onClick={() => toggleShow(show.id)}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-black border border-white/10">
                                                    {show.coverUrl ? (
                                                        <img src={show.coverUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><Tv className="w-8 h-8 text-white/20" /></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">{show.title}</h3>
                                                    {show.schedule && (
                                                        <p className="text-blue-400 font-mono text-xs mt-1 flex items-center gap-2">
                                                            <Calendar className="w-3 h-3" /> {show.schedule}
                                                        </p>
                                                    )}
                                                    <p className="text-white/40 text-sm mt-1 line-clamp-1">{show.description}</p>
                                                </div>
                                            </div>
                                            <button className="p-2 text-white/40">
                                                {expandedShows.has(show.id) ? <ChevronUp /> : <ChevronDown />}
                                            </button>
                                        </div>

                                        {/* Show Episodes */}
                                        <AnimatePresence>
                                            {expandedShows.has(show.id) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-white/10 overflow-hidden"
                                                >
                                                    <div className="p-4 md:p-6 space-y-4">
                                                        {show.episodes?.length > 0 ? (
                                                            show.episodes.map((ep: any) => (
                                                                <div
                                                                    key={ep.id}
                                                                    className="group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors"
                                                                >
                                                                    <div
                                                                        className="relative w-full md:w-48 aspect-video rounded-xl overflow-hidden bg-black flex-shrink-0 cursor-pointer"
                                                                        onClick={() => router.push(`/watch/${ep.id}`)}
                                                                    >
                                                                        {ep.coverUrl ? (
                                                                            <img src={ep.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                                                        ) : (
                                                                            <div className="w-full h-full bg-gray-900" />
                                                                        )}
                                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center">
                                                                                <Play className="w-6 h-6 fill-current ml-1" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] font-mono">
                                                                            {Math.floor(ep.duration / 60)}:{(ep.duration % 60).toString().padStart(2, '0')}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-white/40 font-mono text-[10px] uppercase">Episode {ep.episodeNumber}</span>
                                                                            {ep.isLive && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">Live Now</span>}
                                                                        </div>
                                                                        <h4 className="text-lg font-bold group-hover:text-blue-400 transition-colors cursor-pointer" onClick={() => router.push(`/watch/${ep.id}`)}>
                                                                            {ep.title}
                                                                        </h4>
                                                                        <p className="text-white/40 text-sm line-clamp-2 mt-1">{ep.description}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => router.push(`/watch/${ep.id}`)}
                                                                        className="hidden md:flex p-4 bg-white/5 group-hover:bg-white text-white group-hover:text-black rounded-full transition-all active:scale-90"
                                                                    >
                                                                        <Play className="w-5 h-5 fill-current" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-center py-12 text-white/20">
                                                                No episodes translated yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
