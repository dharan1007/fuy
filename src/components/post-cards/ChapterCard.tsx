'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, BookOpen, Lock, Unlock } from 'lucide-react';

type ChapterCardProps = {
    chapter: {
        id: string;
        title?: string | null;
        description?: string | null;
        mediaUrls: string;
        mediaTypes: string;
        // Navigation & Access Data
        linkedPostId?: string | null;
        post?: {
            id: string;
            chapterAccessPolicy?: string;
            chapterAccessRequests?: {
                id: string;
                status: string;
                requesterId: string;
            }[];
        }
    };
    connectedPrev?: { id: string; title: string } | null;
    connectedNext?: { id: string; title: string } | null;
    currentUserId?: string; // Passed from parent to check access
};

export default function ChapterCard({ chapter, connectedPrev, connectedNext, currentUserId }: ChapterCardProps) {
    const mediaUrls = JSON.parse(chapter.mediaUrls || '[]');
    const mediaTypes = JSON.parse(chapter.mediaTypes || '[]');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [accessStatus, setAccessStatus] = useState<'GRANTED' | 'PENDING' | 'DENIED' | 'NONE'>('NONE');

    // Determine Access Status (simplification, real logic might need fetch)
    // If the post is private and not owned by current user...
    const isPrivate = chapter.post?.chapterAccessPolicy === 'PRIVATE';
    // const hasAccess = ... check requests

    const nextMedia = () => {
        setCurrentIndex((prev) => (prev + 1) % mediaUrls.length);
    };

    const prevMedia = () => {
        setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
    };

    const handleRequestAccess = async () => {
        // Call API to request access
        try {
            await fetch('/api/chapters/request-access', {
                method: 'POST',
                body: JSON.stringify({ targetPostId: chapter.post?.id })
            });
            setAccessStatus('PENDING');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 relative group">
            {/* Chapter Navigation Header */}
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-pink-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-pink-500">Chapter</span>
                </div>

                <div className="flex items-center gap-2">
                    {connectedPrev ? (
                        <a href={`/post/${connectedPrev.id}`} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                            <ChevronLeft size={12} />
                            Prev
                        </a>
                    ) : (
                        <span className="text-[10px] text-gray-600 cursor-not-allowed flex items-center gap-1">
                            <ChevronLeft size={12} /> Prev
                        </span>
                    )}

                    <div className="h-3 w-[1px] bg-white/10" />

                    {connectedNext ? (
                        <a href={`/post/${connectedNext.id}`} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                            Next
                            <ChevronRight size={12} />
                        </a>
                    ) : (
                        <span className="text-[10px] text-gray-600 cursor-not-allowed flex items-center gap-1">
                            Next <ChevronRight size={12} />
                        </span>
                    )}
                </div>
            </div>

            {chapter.title && (
                <h3 className="text-lg font-bold mb-1">{chapter.title}</h3>
            )}

            {/* Connection Request UI (Placeholder logic) */}
            {isPrivate && accessStatus === 'NONE' && (
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                    <Lock size={32} className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-300 font-medium mb-3">Private Chapter</p>
                    <button
                        onClick={handleRequestAccess}
                        className="px-4 py-2 bg-pink-500 text-white text-xs font-bold rounded-full hover:bg-pink-600 transition-colors"
                    >
                        Request Connection
                    </button>
                </div>
            )}
            {isPrivate && accessStatus === 'PENDING' && (
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                    <Lock size={32} className="text-yellow-500 mb-2" />
                    <p className="text-sm text-gray-300 font-medium mb-3">Request Pending</p>
                </div>
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
