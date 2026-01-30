'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Play,
    Pause,
    Music,
    ArrowLeft,
    Share2,
    Flag,
    Clock,
    Users,
    Eye,
    Heart,
    MessageCircle,
    Loader2,
} from 'lucide-react';
import AudioWaveform from '@/components/audio/AudioWaveform';

interface AudioAsset {
    id: string;
    title: string | null;
    attributionText: string | null;
    duration: number;
    genre: string | null;
    audioUrl: string;
    waveformData: number[] | null;
    coverImageUrl: string | null;
    usageCount: number;
    isReusable: boolean;
    isOriginal: boolean;
    createdAt: string;
    originalCreator: {
        id: string;
        name: string;
        profile: {
            displayName: string | null;
            avatarUrl: string | null;
        } | null;
    };
    musicalInfo: {
        tempo: number | null;
        key: string | null;
    } | null;
}

interface AudioPost {
    id: string;
    content: string;
    postType: string;
    createdAt: string;
    viewCount: number;
    shareCount: number;
    thumbnail: string | null;
    mediaType: string | null;
    user: {
        id: string;
        name: string;
        profile: {
            displayName: string | null;
            avatarUrl: string | null;
        } | null;
    };
    audioUsage: {
        startTime: number;
        endTime: number | null;
        volume: number;
        trackOrder: number;
    };
    _count: {
        comments: number;
        reactions: number;
    };
}

export default function AudioDetailPage() {
    const params = useParams();
    const router = useRouter();
    const audioId = params.id as string;

    const [audioAsset, setAudioAsset] = useState<AudioAsset | null>(null);
    const [posts, setPosts] = useState<AudioPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const audioRef = useRef<HTMLAudioElement>(null);

    // Fetch audio asset details
    useEffect(() => {
        const fetchAudioAsset = async () => {
            try {
                const res = await fetch(`/api/audio/${audioId}`);
                if (!res.ok) throw new Error('Failed to fetch audio');
                const data = await res.json();
                setAudioAsset(data.audioAsset);
            } catch (error) {
                console.error('Error fetching audio:', error);
            } finally {
                setLoading(false);
            }
        };

        if (audioId) {
            fetchAudioAsset();
        }
    }, [audioId]);

    // Fetch posts using this audio
    const fetchPosts = useCallback(async () => {
        if (!audioId || !hasMore) return;

        setPostsLoading(true);
        try {
            const res = await fetch(`/api/audio/${audioId}/posts?page=${page}&limit=12`);
            if (!res.ok) throw new Error('Failed to fetch posts');
            const data = await res.json();

            setPosts((prev) => (page === 1 ? data.posts : [...prev, ...data.posts]));
            setHasMore(data.pagination.page < data.pagination.totalPages);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setPostsLoading(false);
        }
    }, [audioId, page, hasMore]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // Audio playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlayback = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (time: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.currentTime = time;
        setCurrentTime(time);
    };

    const handleUseAudio = () => {
        router.push(`/create-post?audioId=${audioId}&type=LILL`);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-white/50\" size={48} />
            </div>
        );
    }

    if (!audioAsset) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Music size={64} className="mb-4 opacity-50" />
                <h1 className="text-xl font-semibold mb-2">Audio Not Found</h1>
                <p className="text-white/60 mb-4">This audio may have been removed or is unavailable.</p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <ArrowLeft size={16} />
                    Go Back
                </button>
            </div>
        );
    }

    const creatorName =
        audioAsset.originalCreator?.profile?.displayName ||
        audioAsset.originalCreator?.name ||
        'Unknown';
    const creatorAvatar = audioAsset.originalCreator?.profile?.avatarUrl;

    return (
        <div className="min-h-screen bg-black text-white">
            <audio ref={audioRef} src={audioAsset.audioUrl} preload="metadata" />

            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-semibold truncate flex-1">
                        {audioAsset.title || 'Audio'}
                    </h1>
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <Share2 size={18} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60">
                        <Flag size={18} />
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Audio player card */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-6 mb-8 border border-white/10">
                    <div className="flex items-start gap-6">
                        {/* Cover image */}
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                            {audioAsset.coverImageUrl ? (
                                <img
                                    src={audioAsset.coverImageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Music size={40} className="text-white/40" />
                                </div>
                            )}
                            {/* Play overlay */}
                            <button
                                onClick={togglePlayback}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            >
                                {isPlaying ? (
                                    <Pause size={40} className="text-white" />
                                ) : (
                                    <Play size={40} className="text-white ml-1" />
                                )}
                            </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold mb-2">
                                {audioAsset.title || 'Untitled Audio'}
                            </h2>

                            {/* Creator */}
                            <Link
                                href={`/profile/${audioAsset.originalCreator.id}`}
                                className="inline-flex items-center gap-2 mb-4 group"
                            >
                                {creatorAvatar ? (
                                    <img
                                        src={creatorAvatar}
                                        alt=""
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">
                                        {creatorName[0]?.toUpperCase()}
                                    </div>
                                )}
                                <span className="text-white/80 group-hover:text-white transition-colors">
                                    {audioAsset.attributionText}
                                </span>
                            </Link>

                            {/* Stats */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    {formatDuration(audioAsset.duration)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users size={14} />
                                    {formatNumber(audioAsset.usageCount)} uses
                                </div>
                                {audioAsset.musicalInfo?.tempo && (
                                    <div>{Math.round(audioAsset.musicalInfo.tempo)} BPM</div>
                                )}
                                {audioAsset.musicalInfo?.key && (
                                    <div>{audioAsset.musicalInfo.key}</div>
                                )}
                                {audioAsset.genre && (
                                    <div className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                                        {audioAsset.genre}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Waveform */}
                    {audioAsset.waveformData && (
                        <div className="mt-6">
                            <AudioWaveform
                                waveformData={audioAsset.waveformData}
                                duration={audioAsset.duration}
                                currentTime={currentTime}
                                isPlaying={isPlaying}
                                onSeek={handleSeek}
                                height={80}
                                activeColor="#fff"
                                inactiveColor="rgba(255,255,255,0.2)"
                            />
                        </div>
                    )}

                    {/* Use audio button */}
                    {audioAsset.isReusable && (
                        <button
                            onClick={handleUseAudio}
                            className="w-full mt-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Music size={18} />
                            Use This Audio
                        </button>
                    )}
                </div>

                {/* Posts using this audio */}
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Eye size={18} />
                        Posts Using This Audio
                        <span className="text-white/50 font-normal">
                            ({formatNumber(audioAsset.usageCount)})
                        </span>
                    </h3>

                    {posts.length === 0 && !postsLoading ? (
                        <div className="text-center py-12 text-white/50">
                            <Music size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No posts are using this audio yet</p>
                            <p className="text-sm mt-1">Be the first to create one!</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {posts.map((post) => (
                                    <Link
                                        key={post.id}
                                        href={`/post/${post.id}`}
                                        className="group relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden"
                                    >
                                        {/* Thumbnail */}
                                        {post.thumbnail ? (
                                            <img
                                                src={post.thumbnail}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Music size={32} className="text-white/30" />
                                            </div>
                                        )}

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                                {/* User */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    {post.user.profile?.avatarUrl ? (
                                                        <img
                                                            src={post.user.profile.avatarUrl}
                                                            alt=""
                                                            className="w-6 h-6 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                                                            {(post.user.profile?.displayName || post.user.name)[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium truncate">
                                                        {post.user.profile?.displayName || post.user.name}
                                                    </span>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center gap-3 text-xs text-white/70">
                                                    <span className="flex items-center gap-1">
                                                        <Heart size={12} />
                                                        {formatNumber(post._count.reactions)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageCircle size={12} />
                                                        {formatNumber(post._count.comments)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Post type badge */}
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/50 rounded text-[10px] font-medium">
                                            {post.postType}
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Load more */}
                            {hasMore && (
                                <div className="mt-6 text-center">
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={postsLoading}
                                        className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {postsLoading ? (
                                            <Loader2 className="animate-spin mx-auto" size={20} />
                                        ) : (
                                            'Load More'
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
