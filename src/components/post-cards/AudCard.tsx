'use client';

import React, { useRef, useState } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import Link from 'next/link';

import PostActionMenu from '@/components/PostActionMenu';

type AudCardProps = {
    aud: {
        id: string;
        audioUrl: string;
        duration: number;
        coverImageUrl?: string | null;
        title?: string | null;
        artist?: string | null;
    };
    user?: any;
    post?: any;
    currentUserId?: string;
    onPostHidden?: () => void;
    onRefresh?: () => void;
};

export default function AudCard({ aud, user, post, currentUserId, onPostHidden, onRefresh }: AudCardProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const togglePlay = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const total = audioRef.current.duration || aud.duration;
            setProgress((current / total) * 100);
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden aspect-square flex flex-col relative group">
            {/* Background Image Blur */}
            {aud.coverImageUrl && (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-30 blur-md scale-110"
                    style={{ backgroundImage: `url(${aud.coverImageUrl})` }}
                />
            )}
            <div className="absolute top-2 right-2 z-20">
                <PostActionMenu
                    post={post || { id: aud.id, user, userId: user?.id }}
                    currentUserId={currentUserId}
                    onPostHidden={onPostHidden}
                    onRefresh={onRefresh}
                />
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 text-center">
                {/* Album Art */}
                <div className="w-24 h-24 mb-3 rounded-lg overflow-hidden shadow-2xl border border-white/20 relative">
                    {aud.coverImageUrl ? (
                        <img
                            src={aud.coverImageUrl}
                            alt={aud.title || "Audio"}
                            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}`}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Music size={32} />
                        </div>
                    )}
                    {/* Play Button Overlay */}
                    <button
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {isPlaying ? <Pause size={32} className="fill-white" /> : <Play size={32} className="fill-white" />}
                    </button>
                </div>

                <h3 className="font-bold text-white text-sm truncate w-full">{aud.title || "Unknown Track"}</h3>
                <p className="text-white/60 text-xs truncate w-full">{aud.artist || user?.profile?.displayName || "Unknown Artist"}</p>
            </div>

            {/* Progress Bar */}
            <div className="relative z-10 h-1 bg-white/10 w-full mt-auto">
                <div
                    className="h-full bg-red-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <audio
                ref={audioRef}
                src={aud.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
            />
        </div>
    );
}
