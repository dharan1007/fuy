'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ChapterCardProps = {
    chapter: {
        id: string;
        title?: string | null;
        description?: string | null;
        mediaUrls: string;
        mediaTypes: string;
    };
};

export default function ChapterCard({ chapter }: ChapterCardProps) {
    const mediaUrls = JSON.parse(chapter.mediaUrls || '[]');
    const mediaTypes = JSON.parse(chapter.mediaTypes || '[]');
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextMedia = () => {
        setCurrentIndex((prev) => (prev + 1) % mediaUrls.length);
    };

    const prevMedia = () => {
        setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
    };

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            {chapter.title && (
                <h3 className="text-lg font-bold mb-2">{chapter.title}</h3>
            )}
            {chapter.description && (
                <p className="text-sm text-white/70 mb-3">{chapter.description}</p>
            )}

            <div className="relative aspect-video bg-black/20 rounded-xl overflow-hidden">
                {mediaTypes[currentIndex] === 'VIDEO' ? (
                    <video
                        src={mediaUrls[currentIndex]}
                        controls
                        className="w-full h-full object-cover"
                    />
                ) : mediaTypes[currentIndex] === 'AUDIO' ? (
                    <div className="flex items-center justify-center h-full">
                        <audio src={mediaUrls[currentIndex]} controls className="w-full px-4" />
                    </div>
                ) : (
                    <img
                        src={mediaUrls[currentIndex]}
                        alt={chapter.title || 'Chapter media'}
                        className="w-full h-full object-cover"
                    />
                )}

                {mediaUrls.length > 1 && (
                    <>
                        <button
                            onClick={prevMedia}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextMedia}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {mediaUrls.map((_: any, i: number) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/30'
                                        }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
