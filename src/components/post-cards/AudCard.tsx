'use client';

import React from 'react';
import { Music } from 'lucide-react';

type AudCardProps = {
    aud: {
        id: string;
        audioUrl: string;
        duration: number;
        coverImageUrl?: string | null;
        title?: string | null;
        artist?: string | null;
    };
};

export default function AudCard({ aud }: AudCardProps) {
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    {aud.coverImageUrl ? (
                        <img
                            src={aud.coverImageUrl}
                            alt={aud.title || 'Audio cover'}
                            className="w-full h-full object-cover rounded-xl"
                        />
                    ) : (
                        <Music className="w-10 h-10" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    {aud.title && (
                        <h4 className="font-semibold truncate">{aud.title}</h4>
                    )}
                    {aud.artist && (
                        <p className="text-sm text-white/60 truncate">{aud.artist}</p>
                    )}
                    <p className="text-xs text-white/40 mt-1">{formatDuration(aud.duration)}</p>
                </div>
            </div>
            <audio src={aud.audioUrl} controls className="w-full mt-3" />
        </div>
    );
}
