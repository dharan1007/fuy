'use client';

import React from 'react';

type FillCardProps = {
    fill: {
        id: string;
        videoUrl: string;
        thumbnailUrl?: string | null;
        duration: number;
    };
};

export default function FillCard({ fill }: FillCardProps) {
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="relative aspect-video bg-black">
                <video
                    src={fill.videoUrl}
                    poster={fill.thumbnailUrl || undefined}
                    controls
                    className="w-full h-full"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs">
                    {formatDuration(fill.duration)}
                </div>
            </div>
        </div>
    );
}
