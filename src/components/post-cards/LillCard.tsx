import Link from 'next/link';
import { useState, useRef } from 'react';
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

    // Double-tap to like handler
    const handleDoubleTap = async () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap detected - trigger W reaction
            setShowLikeAnimation(true);
            setTimeout(() => setShowLikeAnimation(false), 800);

            try {
                await fetch('/api/posts/react', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: post?.id || lill.id, type: 'W' })
                });
                onRefresh?.();
            } catch (e) {
                console.error('Failed to react:', e);
            }
        }
        lastTapRef.current = now;
    };

    return (
        <div className="bg-black rounded-lg overflow-hidden relative h-full w-full aspect-[9/16] group">
            {/* Full Height Video with Double-Tap */}
            <div
                className="w-full h-full"
                onClick={handleDoubleTap}
            >
                <video
                    src={lill.videoUrl}
                    poster={lill.thumbnailUrl || undefined}
                    controls
                    className="w-full h-full object-cover"
                />
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
