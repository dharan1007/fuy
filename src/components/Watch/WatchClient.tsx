
"use client";

import { useState, useRef, useEffect } from "react";
import {
    Play,
    Pause,
    ChevronRight,
    Users,
    MessageSquare,
    Share2,
    Tv,
    Clock,
    Settings,
    Maximize,
    Volume2,
    SkipForward,
    SkipBack,
    Heart,
    Zap,
    Check
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ReactionControl from "@/components/ReactionControl";
import ReactionBubbleList from "@/components/ReactionBubbleList";
import { useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/SpaceBackground";
import AppHeader from "@/components/AppHeader";

interface WatchClientProps {
    episode: any;
    show: any;
    channel: any;
    episodes: any[];
    similarChannels: any[];
    initialPost: any;
    initialIsSubscribed: boolean;
    initialIsLiked: boolean;
    initialReaction: any;
    currentUser: any;
}

export default function WatchClient({
    episode,
    show,
    channel,
    episodes,
    similarChannels,
    initialPost,
    initialIsSubscribed,
    initialIsLiked,
    initialReaction,
    currentUser
}: WatchClientProps) {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);
    const [post, setPost] = useState(initialPost);
    const [currentTime, setCurrentTime] = useState("0:00");
    const [duration, setDuration] = useState("0:00");
    const [volume, setVolume] = useState(1);
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    const now = new Date();

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            const p = (video.currentTime / video.duration) * 100;
            setProgress(p);
            setCurrentTime(formatTime(video.currentTime));
        };

        const handleLoadedMetadata = () => {
            setDuration(formatTime(video.duration));
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("loadedmetadata", handleLoadedMetadata);

        return () => {
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const p = x / rect.width;
        if (videoRef.current) {
            videoRef.current.currentTime = p * videoRef.current.duration;
        }
    };

    const handleLike = async () => {
        if (!currentUser) {
            router.push("/login");
            return;
        }
        const newLiked = !isLiked;
        setIsLiked(newLiked);
        try {
            await fetch(`/api/posts/${post.id}/like`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ like: newLiked }),
            });
        } catch (err) {
            console.error("Like failed", err);
            setIsLiked(!newLiked);
        }
    };

    const handleSubscribe = async () => {
        if (!currentUser) {
            router.push("/login");
            return;
        }
        const newSub = !isSubscribed;
        setIsSubscribed(newSub);
        try {
            await fetch(`/api/user/subscribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId: channel.post.userId }),
            });
        } catch (err) {
            console.error("Subscribe failed", err);
            setIsSubscribed(!newSub);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
    };

    const handleReact = (type: any) => {
        // ReactionControl already handles the API call
    };

    const handleAddBubble = async () => {
        // ReactionBubbleList handles the API call
        // We just need to refresh post data or add locally if needed
        const res = await fetch(`/api/posts/${post.id}`);
        const updated = await res.json();
        setPost(updated);
    };

    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col overflow-x-hidden">
            <SpaceBackground />
            <AppHeader title={`${show.title} - E${episode.episodeNumber}`} />

            <main className="relative z-10 w-full max-w-[1800px] mx-auto px-4 lg:px-12 py-6 lg:py-10 grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* Left Column: Video Player & Description */}
                <div className="xl:col-span-3 space-y-8">

                    {/* Advanced Video Player Area */}
                    <div className="relative aspect-video bg-black rounded-[32px] overflow-hidden shadow-[0_0_80px_rgba(255,255,255,0.05)] border border-white/5 ring-1 ring-white/10 group">
                        <video
                            ref={videoRef}
                            src={episode.videoUrl}
                            poster={episode.coverUrl}
                            className="w-full h-full object-contain cursor-pointer"
                            autoPlay
                            onClick={togglePlay}
                        />

                        {/* Custom Premium Controls Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            {/* Progress Bar */}
                            <div
                                className="w-full h-1.5 bg-white/20 rounded-full mb-6 cursor-pointer relative overflow-hidden group/bar"
                                onClick={handleSeek}
                            >
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-white rounded-full group-hover/bar:bg-blue-400 transition-colors"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <button onClick={togglePlay} className="p-2 hover:scale-110 transition-transform">
                                        {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
                                    </button>
                                    <button className="p-2 hover:scale-110 transition-transform"><SkipBack className="w-5 h-5" onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10 }} /></button>
                                    <button className="p-2 hover:scale-110 transition-transform"><SkipForward className="w-5 h-5" onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10 }} /></button>
                                    <div className="flex items-center gap-3">
                                        <Volume2 className="w-5 h-5 text-white/60" />
                                        <div className="w-20 h-1 bg-white/20 rounded-full relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-[80%] bg-white/80 rounded-full" />
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-white/60">{currentTime} / {duration}</span>
                                </div>

                                <div className="flex items-center gap-6">
                                    <button className="p-2 hover:scale-110 transition-transform text-white/60"><Settings className="w-5 h-5" /></button>
                                    <button
                                        className="p-2 hover:scale-110 transition-transform text-white/60"
                                        onClick={() => videoRef.current?.requestFullscreen()}
                                    >
                                        <Maximize className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {episode.isLive && (
                            <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-500/50 shadow-lg shadow-red-900/50">
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                Live
                            </div>
                        )}
                    </div>

                    {/* Reactions & Bubbles Area */}
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-4">
                            <ReactionControl
                                postId={post.id}
                                initialReaction={initialReaction}
                                counts={post.reactionsCount || { W: 0, L: 0, CAP: 0, FIRE: 0 }}
                                onReact={handleReact}
                            />
                            <div className="w-px h-6 bg-white/10 mx-2" />
                            <ReactionBubbleList
                                postId={post.id}
                                bubbles={post.bubbles || []}
                                totalBubbles={post.bubblesCount || (post.bubbles?.length || 0)}
                                onAddBubble={handleAddBubble}
                            />
                        </div>
                        <div className="text-white/40 text-xs font-mono uppercase tracking-widest">
                            {formatCount(channel.watchingCount || 0)} watching now
                        </div>
                    </div>

                    {/* Metadata Area */}
                    <div className="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-[32px] p-8 md:p-10 space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">{episode.title}</h1>
                                <div className="flex items-center gap-3 text-white/40 text-sm font-mono uppercase tracking-widest">
                                    <span>Episode {episode.episodeNumber}</span>
                                    <div className="w-1 h-1 bg-white/20 rounded-full" />
                                    <span>{format(new Date(episode.createdAt), "MMM dd, yyyy")}</span>
                                    {episode.duration > 0 && (
                                        <>
                                            <div className="w-1 h-1 bg-white/20 rounded-full" />
                                            <span>{Math.floor(episode.duration / 60)}:{(episode.duration % 60).toString().padStart(2, '0')}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleLike}
                                    className={cn(
                                        "px-6 py-3 rounded-2xl border transition-all flex items-center gap-2 group active:scale-95",
                                        isLiked ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                    )}
                                >
                                    <Heart className={cn("w-5 h-5", isLiked ? "fill-current" : "text-white/40 group-hover:text-red-500")} />
                                    <span className="font-bold text-sm">{isLiked ? "Saved" : "Save"}</span>
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all flex items-center gap-2 active:scale-95 relative"
                                >
                                    {showCopySuccess ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5 text-white/40" />}
                                    <span className="font-bold text-sm">{showCopySuccess ? "Copied" : "Share"}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                            <Link href={`/chan/${channel.id}`} className="shrink-0 group">
                                <img
                                    src={channel.post.user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + channel.channelName}
                                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border-2 border-white/10 group-hover:border-white/30 transition-all object-cover"
                                />
                            </Link>
                            <div className="flex-1">
                                <Link href={`/chan/${channel.id}`} className="block">
                                    <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                                        {channel.channelName}
                                    </h3>
                                </Link>
                                <p className="text-white/40 text-sm font-medium">{formatCount(channel.subscriberCount || 0)} Subscribers</p>
                            </div>
                            <button
                                onClick={handleSubscribe}
                                className={cn(
                                    "px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95",
                                    isSubscribed ? "bg-white/10 text-white border border-white/10" : "bg-white text-black hover:bg-gray-200"
                                )}
                            >
                                {isSubscribed ? "Subscribed" : "Subscribe"}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-white/40 text-xs font-black uppercase tracking-[0.2em]">Transmission Intel</h4>
                            <p className="text-lg text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
                                {episode.description || "The frequency signal is clear, but no description was translated for this broadcast."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Episode List & Stats */}
                <div className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-[32px] p-6 lg:p-8 flex flex-col h-full max-h-[1200px]">
                        <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-white/40" /> Sequence Order
                        </h3>

                        <div className="space-y-4 overflow-y-auto no-scrollbar flex-1">
                            {episodes.map((ep: any) => {
                                const epDate = ep.releaseDate ? new Date(ep.releaseDate) : null;
                                const isUpcoming = epDate && epDate > now;
                                const isCurrent = ep.id === episode.id;

                                return (
                                    <Link
                                        key={ep.id}
                                        href={isUpcoming ? "#" : `/watch/${ep.id}`}
                                        className={cn(
                                            "flex gap-4 p-3 rounded-2xl transition-all border group",
                                            isCurrent ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5',
                                            isUpcoming && 'opacity-50 grayscale cursor-not-allowed'
                                        )}
                                    >
                                        <div className="relative w-28 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-black">
                                            <img src={ep.coverUrl || episode.coverUrl} className="w-full h-full object-cover" />
                                            {isUpcoming && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 text-center">
                                                    <span className="text-[10px] font-black uppercase leading-tight text-white/60">Locked till {format(epDate!, "MMM dd")}</span>
                                                </div>
                                            )}
                                            {!isUpcoming && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Play className="w-6 h-6 fill-white" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono">
                                                {Math.floor(ep.duration / 60)}:{(ep.duration % 60).toString().padStart(2, '0')}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-black text-white/40 uppercase">E{ep.episodeNumber}</span>
                                                {ep.isLive && <span className="text-[8px] text-red-500 font-bold uppercase animate-pulse">Live Now</span>}
                                            </div>
                                            <h4 className={cn("text-sm font-bold truncate", isCurrent ? 'text-blue-400' : 'text-white')}>
                                                {ep.title}
                                            </h4>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Stats Widget - CHERRY RED THEME */}
                    <div className="bg-gradient-to-br from-red-900/40 to-transparent border border-red-500/20 rounded-[32px] p-8 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]">
                        <h4 className="text-xs font-black uppercase tracking-widest text-red-500 mb-6 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Global Audience
                        </h4>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-white/40 text-sm font-mono uppercase">Current Listening</span>
                                <span className="text-2xl font-black text-white">{formatCount(channel.watchingCount || 0)}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-white/40 text-sm font-mono uppercase">Total Signal Vibes</span>
                                <span className="text-2xl font-black text-white">{formatCount(channel.subscriberCount * 123 + 456)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                const chanId = channel.id;
                                router.push(`/chan/${chanId}`); // Navigate to channel for chat or implement inline chat
                            }}
                            className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all font-black uppercase tracking-widest text-sm active:scale-95 flex items-center justify-center gap-3"
                        >
                            <MessageSquare className="w-5 h-5" /> Transmission Chat
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function formatCount(count: number) {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(2) + 'K';
    return count.toString();
}

