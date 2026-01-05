import Link from 'next/link';
import { useState } from 'react';
import PostActionMenu from '@/components/PostActionMenu';
import ReactionControl from '@/components/ReactionControl';
import { MessageCircle, Send } from 'lucide-react';
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
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    if (!lill) return null;

    return (
        <div className="bg-black rounded-lg overflow-hidden relative h-full w-full aspect-[9/16] group">
            {/* Full Height Video */}
            <video
                src={lill.videoUrl}
                poster={lill.thumbnailUrl || undefined}
                controls
                className="w-full h-full object-cover"
            />

            {/* Right Sidebar Actions - Reels Style */}
            <div className="absolute right-2 bottom-20 flex flex-col items-center gap-6 z-20 pb-4">
                {/* Reactions */}
                <div className="flex flex-col gap-2 scale-90 origin-right">
                    {/* We pass a modified layout to ReactionControl via CSS classes? 
                       Actually ReactionControl is horizontal. We might need a vertical wrapper or custom styles for vertical.
                       For now, let's keep it horizontal but place it carefully, OR just let it be.
                       But Reels typically have vertical stack: Heart, Comment, Share.
                       ReactionControl has 3 buttons. Placing them horizontally sticks out.
                       Let's wrap them or adjust. Better yet, let's just place the Standard ReactionControl floating nearby
                       or assume vertical stack is better. 
                       Given current ReactionControl is horizontal, let's place it above the user info or distinct.
                   */}
                    {/* Vertical Stack wrapper for custom actions */}
                </div>

                {/* Horizontal Reaction Control (W/L/Cap) - Floating above details */}
                <div className="absolute right-0 bottom-32 flex flex-col items-end gap-2 pr-2">
                    <div className="bg-black/40 backdrop-blur-sm rounded-full p-1.5 border border-white/10 origin-bottom-right scale-90">
                        <ReactionControl
                            postId={post?.id || lill.id}
                            initialReaction={post?.userReaction}
                            counts={post?.reactionCounts}
                            onReact={() => onRefresh?.()}
                            orientation="vertical"
                        />
                    </div>

                    <button
                        onClick={() => setIsCommentsOpen(true)}
                        className="flex flex-col items-center gap-1 group/btn"
                    >
                        <div className="p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 group-hover/btn:bg-white/10 transition-colors">
                            <MessageCircle size={24} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{post?.comments || 0}</span>
                    </button>

                    <button
                        onClick={() => setIsShareOpen(true)}
                        className="flex flex-col items-center gap-1 group/btn"
                    >
                        <div className="p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 group-hover/btn:bg-white/10 transition-colors">
                            <Send size={24} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{post?.shares || 0}</span>
                    </button>

                    <div className="p-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
                        <PostActionMenu
                            post={post || { id: lill.id, user, userId: user?.id }}
                            currentUserId={currentUserId}
                            onPostHidden={onPostHidden}
                            onRefresh={onRefresh}
                        />
                    </div>
                </div>
            </div>

            {/* Overlay Details (Bottom) */}
            <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-3 z-10">
                <div className="flex items-center gap-3">
                    {user && (
                        <Link href={`/profile/${user.id}`} className="shrink-0 group/avatar">
                            <div className="p-[2px] rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 group-hover/avatar:scale-105 transition-transform">
                                <img
                                    src={user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                                    alt={user.profile?.displayName}
                                    className="w-10 h-10 rounded-full border-2 border-black"
                                />
                            </div>
                        </Link>
                    )}
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <Link href={`/profile/${user?.id}`} className="text-white font-bold text-base hover:underline shadow-black drop-shadow-md">
                                {user?.profile?.displayName || 'User'}
                            </Link>
                            {/* Follow button logic could go here */}
                        </div>
                    </div>
                </div>

                {/* Description / Caption */}
                {post?.content && (
                    <p className="text-white/90 text-sm line-clamp-2 leading-relaxed font-medium shadow-black drop-shadow-sm pr-4">
                        {post.content}
                    </p>
                )}

                {/* Audio / Track Info (Placeholder if needed) */}
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
