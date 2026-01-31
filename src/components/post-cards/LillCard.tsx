'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useVideoAutoplay } from '@/context/FeedPlaybackContext';
import { VolumeX, Volume2, Maximize, Play, Pause } from 'lucide-react';
import PostActionMenu from '@/components/PostActionMenu';
import ReactionControl from '@/components/ReactionControl';
import { MessageCircle, Send, Heart } from 'lucide-react';
import CommentsModal from '@/components/CommentsModal';
import ShareModal from '@/components/ShareModal';

type LillCardProps = {
    lill: {
        id: string;
        videoUrl: string;
        thumbnailUrl?: string | null;
        duration: number;
    };
    user?: any;
    post?: any;
    currentUserId?: string;
    onPostHidden?: () => void;
    onRefresh?: () => void;
};

export default function LillCard({ lill, user, post, currentUserId, onPostHidden, onRefresh }: LillCardProps) {
    // ALL hooks must be called unconditionally FIRST (React Rules of Hooks)
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const lastTapRef = useRef<number>(0);
    const [manualPaused, setManualPaused] = useState(false);

    // ALL hooks must be called unconditionally FIRST
    const { videoRef, isPlaying } = useVideoAutoplay(post?.id || lill.id);
    const [isMuted, setIsMuted] = useState(true);

    // Early returns AFTER all hooks
    if (!lill) return null;
    if (!lill.videoUrl) {
        // Fallback for missing video
        return (
            <div className="bg-black rounded-lg overflow-hidden relative h-full w-full aspect-[9/16] flex items-center justify-center">
                <p className="text-white/50 text-sm">Video unavailable</p>
            </div>
        );
    }

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoRef.current.requestFullscreen();
            }
        }
    };

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setManualPaused(false);
            } else {
                videoRef.current.pause();
                setManualPaused(true);
            }
        }
    };


    return (
        <div className="bg-black rounded-lg overflow-hidden relative h-full w-full aspect-[9/16] group">
            {/* Full Height Video with Double-Tap */}
            <div
                className="w-full h-full relative"
                onClick={handleDoubleTap}
            >
                <video
                    ref={videoRef}
                    src={lill.videoUrl}
                    poster={lill.thumbnailUrl || undefined}
                    className="w-full h-full object-cover"
                    playsInline
                    loop
                    muted={isMuted}
                />

                {/* Play/Pause Overlay Indicator (Manual) */}
                {/* We make this clickable to toggle play, but verify it doesn't conflict with double tap area.
                    Since it's absolute inset-0, it covers the video.
                    If we put onClick on this overlay, it works.
                    But user might want to double tap ANYWHERE.
                    If we combine them: onClick handles both?
                    Or we keep double tap on container, and Play/Pause button is strictly the icon?
                    User said "manual indication".
                    I'll make a specialized center button for Play/Pause that works reliably.
                */}
                <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${manualPaused || !isPlaying ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                    onClick={(e) => {
                        // If we click here, it might be interpreted as part of double tap sequence if we don't stop propagation?
                        // But we want double tap to work.
                        // Let's just USE the double tap handler for tap?
                        // If I separate them, it's safer.
                        // But I'll stick to: Click on icon = Play/Pause. Click elsewhere = Double Tap check.
                        // Since this overlay is inset-0, it covers everything.
                        // Pointer events none?
                        // If pointer-events-none, then click goes to container (handleDoubleTap).
                        // So handleDoubleTap receives all clicks.
                        // I will modify handleDoubleTap to play/pause on single tap?
                        // No, I'll just add the Visual Indicator (pointer-events-none) and let the container decide.
                        // Wait, container only has handleDoubleTap which does... nothing on single tap!
                        // So currently you CANNOT pause a Lill/Reel by tapping.
                        // I should fix that. Standard assumption: Tap to Pause/Play. Double Tap to Like.

                        // Fix: Logic to handle both in one handler.
                    }}
                    style={{ pointerEvents: 'none' }}
                >
                    <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm">
                        {manualPaused || (videoRef.current?.paused) ? (
                            <Play size={32} className="text-white fill-white" />
                        ) : (
                            <Pause size={32} className="text-white fill-white" />
                        )}
                    </div>
                </div>

                {/* Real Click Handler Layer for Play/Pause + Double Tap */}
                <div
                    className="absolute inset-0 z-10"
                    onClick={(e) => {
                        // Combined Handler
                        const now = Date.now();
                        const DOUBLE_TAP_DELAY = 300;
                        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
                            handleDoubleTap(e);
                        } else {
                            togglePlay(e);
                        }
                        lastTapRef.current = now;
                    }}
                ></div>

                {/* Mute Toggle Overlay (Bottom Right) */}
                <button
                    onClick={toggleMute}
                    className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-opacity z-20"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                {/* Fullscreen Toggle (Top Left) */}
                <button
                    onClick={toggleFullscreen}
                    className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-opacity z-20"
                >
                    <Maximize size={20} />
                </button>

            </div>

            {/* Like Animation Overlay */}
            {showLikeAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <Heart
                        size={100}
                        className="text-red-500 fill-red-500 animate-ping"
                        style={{ animationDuration: '0.6s' }}
                    />
                </div>
            )}

            {/* Right Sidebar Actions */}
            <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-20">
                {/* Reaction Control */}
                <div className="bg-black/50 backdrop-blur-md rounded-2xl p-2 border border-white/10">
                    <ReactionControl
                        postId={post?.id || lill.id}
                        initialReaction={post?.userReaction}
                        counts={post?.reactionCounts}
                        onReact={() => onRefresh?.()}
                        orientation="vertical"
                        className="scale-100"
                    />
                </div>

                {/* Comments */}
                <button
                    onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}
                    className="flex flex-col items-center gap-1 group/btn"
                >
                    <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 group-hover/btn:bg-white/10 transition-colors">
                        <MessageCircle size={26} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-white drop-shadow-lg">{post?.comments || 0}</span>
                </button>

                {/* Share - No count */}
                <button
                    onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }}
                    className="flex flex-col items-center group/btn"
                >
                    <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 group-hover/btn:bg-white/10 transition-colors">
                        <Send size={26} className="text-white" />
                    </div>
                </button>

                {/* Menu */}
                <div className="p-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                    <PostActionMenu
                        post={post || { id: lill.id, user, userId: user?.id }}
                        currentUserId={currentUserId}
                        onPostHidden={onPostHidden}
                        onRefresh={onRefresh}
                    />
                </div>
            </div>

            {/* Overlay Details (Bottom) */}
            <div className="absolute bottom-0 left-0 right-20 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3 z-10">
                <div className="flex items-center gap-3">
                    {user && (
                        <Link href={`/profile/${user.id}`} className="shrink-0 group/avatar">
                            <div className="p-[2px] rounded-full bg-gradient-to-tr from-red-500 to-orange-500 group-hover/avatar:scale-105 transition-transform">
                                <img
                                    src={user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                                    alt={user.profile?.displayName}
                                    className="w-10 h-10 rounded-full border-2 border-black"
                                />
                            </div>
                        </Link>
                    )}
                    <div className="flex flex-col justify-center">
                        <Link href={`/profile/${user?.id}`} className="text-white font-bold text-base hover:underline drop-shadow-lg">
                            {user?.profile?.displayName || 'User'}
                        </Link>
                    </div>
                </div>

                {/* Description / Caption */}
                {post?.content && (
                    <p className="text-white/90 text-sm line-clamp-2 leading-relaxed font-medium drop-shadow-md pr-4">
                        {post.content}
                    </p>
                )}
            </div>

            {/* Modals */}
            <CommentsModal
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                postId={post?.id || lill.id}
                currentUserId={currentUserId}
                onCommentAdded={onRefresh}
            />

            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                postId={post?.id || lill.id}
                postSnippet={post?.content}
            />
        </div>
    );
}
