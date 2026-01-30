'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Music, TrendingUp, Clock, Play, Pause, Plus, X, Loader2 } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

interface AudioAsset {
    id: string;
    title: string | null;
    attributionText: string | null;
    duration: number;
    audioUrl: string;
    waveformData: number[] | null;
    coverImageUrl: string | null;
    usageCount: number;
    genre: string | null;
    originalCreator: {
        id: string;
        name: string;
        profile: {
            displayName: string | null;
            avatarUrl: string | null;
        } | null;
    };
}

interface AudioLibraryPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (audio: AudioAsset) => void;
    maxDuration?: number; // Filter by max duration
    excludeIds?: string[]; // Audio IDs to exclude (already added)
}

type TabType = 'trending' | 'recent' | 'search' | 'my-audio';

export default function AudioLibraryPicker({
    isOpen,
    onClose,
    onSelect,
    maxDuration,
    excludeIds = [],
}: AudioLibraryPickerProps) {
    const [activeTab, setActiveTab] = useState<TabType>('trending');
    const [searchQuery, setSearchQuery] = useState('');
    const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Fetch audio based on active tab
    const fetchAudio = useCallback(async () => {
        setLoading(true);
        try {
            let url = '/api/audio';
            const params = new URLSearchParams();

            switch (activeTab) {
                case 'trending':
                    url = '/api/audio/trending';
                    break;
                case 'recent':
                    params.set('sortBy', 'recent');
                    break;
                case 'search':
                    url = '/api/audio/search';
                    if (searchQuery) {
                        params.set('q', searchQuery);
                    }
                    break;
                case 'my-audio':
                    params.set('creatorId', 'me'); // Backend should handle 'me' as current user
                    break;
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            let assets = data.audioAssets || data.trending || data.results || [];

            // Filter by max duration if specified
            if (maxDuration) {
                assets = assets.filter((a: AudioAsset) => a.duration <= maxDuration);
            }

            // Filter out excluded IDs
            assets = assets.filter((a: AudioAsset) => !excludeIds.includes(a.id));

            setAudioAssets(assets);
        } catch (error) {
            console.error('Error fetching audio:', error);
            setAudioAssets([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, searchQuery, maxDuration, excludeIds]);

    useEffect(() => {
        if (isOpen) {
            fetchAudio();
        }
    }, [isOpen, activeTab, fetchAudio]);

    // Debounced search
    useEffect(() => {
        if (activeTab !== 'search') return;

        const timer = setTimeout(() => {
            fetchAudio();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, activeTab, fetchAudio]);

    // Audio playback
    const togglePlay = useCallback((audio: AudioAsset) => {
        if (playingId === audio.id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.src = audio.audioUrl;
                audioRef.current.play();
                setPlayingId(audio.id);
            }
        }
    }, [playingId]);

    // Stop audio when closing
    useEffect(() => {
        if (!isOpen && audioRef.current) {
            audioRef.current.pause();
            setPlayingId(null);
        }
    }, [isOpen]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <audio
                ref={audioRef}
                onEnded={() => setPlayingId(null)}
                className="hidden"
            />

            <div className="relative w-full max-w-2xl max-h-[85vh] bg-zinc-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Music size={20} />
                        Audio Library
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={20} className="text-white/70" />
                    </button>
                </div>

                {/* Search bar */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                        />
                        <input
                            type="text"
                            placeholder="Search audio by title, creator, or genre..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setActiveTab('search');
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-2 border-b border-white/10 bg-white/5">
                    {[
                        { id: 'trending', label: 'Trending', icon: TrendingUp },
                        { id: 'recent', label: 'Recent', icon: Clock },
                        { id: 'my-audio', label: 'My Audio', icon: Music },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id
                                    ? 'bg-white text-black font-medium'
                                    : 'text-white/70 hover:bg-white/10'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Audio list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-white/50" size={32} />
                        </div>
                    ) : audioAssets.length === 0 ? (
                        <div className="text-center py-12 text-white/50">
                            <Music size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No audio found</p>
                            {activeTab === 'search' && searchQuery && (
                                <p className="text-sm mt-1">Try a different search term</p>
                            )}
                        </div>
                    ) : (
                        audioAssets.map((audio) => (
                            <div
                                key={audio.id}
                                className="group flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                            >
                                {/* Cover image / Play button */}
                                <button
                                    onClick={() => togglePlay(audio)}
                                    className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center"
                                >
                                    {audio.coverImageUrl ? (
                                        <img
                                            src={audio.coverImageUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Music size={20} className="text-white/50" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {playingId === audio.id ? (
                                            <Pause size={20} className="text-white" />
                                        ) : (
                                            <Play size={20} className="text-white ml-0.5" />
                                        )}
                                    </div>
                                </button>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-white truncate">
                                        {audio.title || 'Untitled Audio'}
                                    </h4>
                                    <p className="text-sm text-white/60 truncate">
                                        {audio.attributionText || audio.originalCreator?.profile?.displayName || audio.originalCreator?.name}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                                        <span>{formatDuration(audio.duration)}</span>
                                        <span>{formatNumber(audio.usageCount)} uses</span>
                                        {audio.genre && <span>{audio.genre}</span>}
                                    </div>
                                </div>

                                {/* Mini waveform */}
                                {audio.waveformData && (
                                    <div className="hidden sm:block w-24 h-8">
                                        <AudioWaveform
                                            waveformData={audio.waveformData}
                                            duration={audio.duration}
                                            currentTime={0}
                                            height={32}
                                            barWidth={2}
                                            barGap={1}
                                            activeColor="rgba(255,255,255,0.3)"
                                            inactiveColor="rgba(255,255,255,0.2)"
                                        />
                                    </div>
                                )}

                                {/* Select button */}
                                <button
                                    onClick={() => {
                                        audioRef.current?.pause();
                                        setPlayingId(null);
                                        onSelect(audio);
                                        onClose();
                                    }}
                                    className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer info */}
                {maxDuration && (
                    <div className="p-3 border-t border-white/10 text-center text-xs text-white/50">
                        Showing audio {formatDuration(maxDuration)} or shorter
                    </div>
                )}
            </div>
        </div>
    );
}
