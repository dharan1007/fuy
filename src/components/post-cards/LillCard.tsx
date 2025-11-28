'use client';

import React from 'react';
import { Play } from 'lucide-react';

type LillCardProps = {
    lill: {
        id: string;
        videoUrl: string;
        thumbnailUrl?: string | null;
        duration: number;
    };
};

export default function LillCard({ lill }: LillCardProps) {
    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="relative aspect-[9/16] max-h-[600px] bg-black">
                <video
                    src={lill.videoUrl}
                    poster={lill.thumbnailUrl || undefined}
                    controls
                    className="w-full h-full object-contain"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs">
                    {lill.duration}s
                </div>
            </div>
        </div>
    );
}
