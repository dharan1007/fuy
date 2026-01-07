'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import ReactionBubbleList from '@/components/ReactionBubbleList';
import ReactionControl from '@/components/ReactionControl';
import PostActionMenu from '@/components/PostActionMenu';
import CommentsModal from '@/components/CommentsModal';
import ShareModal from '@/components/ShareModal';

type XrayCardProps = {
    post: any;
    xray: {
        id: string;
        topLayerUrl: string;
        bottomLayerUrl: string;
        topLayerType: string;
        bottomLayerType: string;
    };
    currentUserId?: string;
    onPostHidden?: () => void;
    onRefresh?: () => void;
};

export default function XrayCard({ post, xray, currentUserId, onPostHidden, onRefresh }: XrayCardProps) {
    // Debug logging
    useEffect(() => {
        if (!xray.topLayerUrl || !xray.bottomLayerUrl) {
            console.warn('[XrayCard] Missing layer URLs:', xray);
        }
    }, [xray]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScratching, setIsScratching] = useState(false);
    const lastPos = useRef<{ x: number, y: number } | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

    // Modal states
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    const [isActivated, setIsActivated] = useState(false);

    useEffect(() => {
        // Only initialize canvas if activated
        if (!isActivated) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Logging here is fine
        if (!xray.topLayerUrl) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            setAspectRatio(img.width / img.height);
            ctx.drawImage(img, 0, 0);
            setImageLoaded(true);
        };
        img.src = `/api/proxy-image?url=${encodeURIComponent(xray.topLayerUrl)}`;
    }, [xray.topLayerUrl, isActivated]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isActivated) return;
        setIsScratching(true);
        lastPos.current = getCoordinates(e);
    };

    const handleEnd = () => {
        setIsScratching(false);
        lastPos.current = null;
    };

    const scratch = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isScratching || !isActivated) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const currentPos = getCoordinates(e);
        if (!currentPos) return;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 100;

        ctx.beginPath();
        if (lastPos.current) {
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
        } else {
            ctx.moveTo(currentPos.x, currentPos.y);
        }
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();

        lastPos.current = currentPos;
    };

    const revealAll = () => {
        if (!isActivated) setIsActivated(true);
        // Wait for next tick/effect to handle canvas? No, if we setActivated, effect runs.
        // But if we want to reveal immediately:
        setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setImageLoaded(true);
        }, 100);
    };

    const handleInteractionStart = () => {
        if (!isActivated) setIsActivated(true);
    };

    return (
        <div className="bg-transparent rounded-xl flex flex-col h-full relative">
            {/* Visual Header / Content Area */}
            <div
                className="relative bg-black w-full overflow-hidden group rounded-t-xl"
                style={{ aspectRatio: aspectRatio }}
            >
                {/* Bottom layer */}
                {xray.bottomLayerType === 'VIDEO' ? (
                    <video
                        src={xray.bottomLayerUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        controls
                        muted
                        autoPlay
                        loop
                    />
                ) : (
                    <img
                        src={xray.bottomLayerUrl || "/placeholder.png"} // Fallback
                        alt="Hidden layer"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                {/* Scratch canvas - Only rendered/active when activated */}
                {isActivated && (
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none"
                        onMouseDown={handleStart}
                        onMouseUp={handleEnd}
                        onMouseLeave={handleEnd}
                        onMouseMove={scratch}
                        onTouchStart={handleStart}
                        onTouchEnd={handleEnd}
                        onTouchMove={scratch}
                        style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                    />
                )}

                {/* Static Top Layer (Cover) - Visible until activated and canvas loaded */}
                {(!isActivated || !imageLoaded) && xray.topLayerUrl && (
                    <img
                        src={xray.topLayerUrl}
                        className="absolute inset-0 w-full h-full object-cover z-20 cursor-pointer"
                        alt="Scratch cover"
                        onClick={handleInteractionStart}
                        onTouchStart={handleInteractionStart}
                    />
                )}


                <div className="absolute bottom-3 right-3 flex items-center gap-2 z-30">
                    <button
                        onClick={revealAll}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-xl border border-white/10 transition-all active:scale-95"
                    >
                        Reveal All
                    </button>
                    {!isActivated && (
                        <button
                            className="px-3 py-1.5 bg-black/80 hover:bg-black/90 rounded-lg text-[10px] font-black backdrop-blur-xl border border-white/20 uppercase tracking-widest text-white shadow-2xl animate-pulse"
                            onClick={handleInteractionStart}
                        >
                            ✨ Scratch to reveal
                        </button>
                    )}
                </div>
            </div>

            {/* Details Section (Below Content) */}
            <div className="p-4 flex flex-col gap-3 bg-black/20 rounded-b-xl border-x border-b border-white/5">
                {/* User Info */}
                <div className="flex items-center gap-3">
                    <Link href={`/profile/${post.user?.id}`} className="shrink-0">
                        <img
                            src={post.user?.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user?.id}`}
                            alt={post.user?.profile?.displayName || "User"}
                            className="w-8 h-8 rounded-full border border-white/20"
                        />
                    </Link>
                    <div className="flex flex-col">
                        <Link href={`/profile/${post.user?.id}`} className="text-sm font-bold text-white hover:underline">
                            {post.user?.profile?.displayName || "Unknown User"}
                        </Link>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <PostActionMenu
                            post={post}
                            currentUserId={currentUserId}
                            onPostHidden={onPostHidden}
                            onRefresh={onRefresh}
                        />
                    </div>
                </div>

                {/* Caption */}
                {post.content && (
                    <p className="text-sm text-white/90 leading-relaxed font-medium">
                        {post.content}
                    </p>
                )}

                {/* Reactions & Bubbles */}
                <div className="pt-2 border-t border-white/10">
                    <div className="mb-2">
                        <ReactionBubbleList
                            postId={post.id}
                            bubbles={post.topBubbles || []}
                            totalBubbles={post.totalBubbles || 0}
                            onAddBubble={() => onRefresh && onRefresh()}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <ReactionControl
                            postId={post.id}
                            initialReaction={post.userReaction}
                            counts={post.reactionCounts}
                            onReact={() => onRefresh && onRefresh()}
                        />
                        <div
                            className="text-[10px] uppercase tracking-tighter font-black text-white/40 hover:text-white cursor-pointer transition-colors"
                            onClick={() => setIsCommentsOpen(true)}
                        >
                            {post.comments?.length || 0} comments
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end border-t border-white/5 pt-2">
                        <button
                            onClick={() => setIsShareOpen(true)}
                            className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                            <Send size={12} />
                            Share
                        </button>
                    </div>
                </div>
            </div>

            <CommentsModal
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                postId={post.id}
                currentUserId={currentUserId}
                onCommentAdded={onRefresh}
            />

            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                postId={post.id}
                postSnippet={post.content}
            />
        </div>
    );
}
