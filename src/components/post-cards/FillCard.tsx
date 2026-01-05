'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Tv, MessageCircle, Send } from 'lucide-react';

import PostActionMenu from '@/components/PostActionMenu';
import ReactionControl from '@/components/ReactionControl';
import CommentsModal from '@/components/CommentsModal';
import ShareModal from '@/components/ShareModal';

type FillCardProps = {
    fill: {
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

export default function FillCard({ fill, user, post, currentUserId, onPostHidden, onRefresh }: FillCardProps) {
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    if (!fill) return null;
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-transparent group h-full flex flex-col">
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden relative shadow-lg mb-3">
                <video
                    src={fill.videoUrl}
                    poster={fill.thumbnailUrl || undefined}
                    controls
                    className="w-full h-full object-contain bg-black"
                />
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-sm">
                    {formatDuration(fill.duration)}
                </div>
                <div className="absolute top-2 right-2 z-20">
                    <PostActionMenu
                        post={post || { id: fill.id, user, userId: user?.id }}
                        currentUserId={currentUserId}
                        onPostHidden={onPostHidden}
                        onRefresh={onRefresh}
                    />
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-1 mb-3">
                <ReactionControl
                    postId={post?.id || fill.id}
                    initialReaction={post?.userReaction}
                    counts={post?.reactionCounts}
                    onReact={() => onRefresh?.()}
                    orientation="horizontal"
                />

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCommentsOpen(true)}
                        className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                    >
                        <MessageCircle size={20} />
                        <span className="text-xs font-medium">{post?.comments || 0}</span>
                    </button>
                    <button
                        onClick={() => setIsShareOpen(true)}
                        className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                    >
                        <Send size={20} />
                        <span className="text-xs font-medium">{post?.shares || 0}</span>
                    </button>
                </div>
            </div>

            {/* Details Section */}
            <div className="flex gap-3 px-1 mt-auto">
                {user && (
                    <Link href={`/profile/${user.id}`} className="shrink-0">
                        <img
                            src={user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                            alt={user.profile?.displayName}
                            className="w-10 h-10 rounded-full border border-white/10"
                        />
                    </Link>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">{post?.content || "Video Content"}</h3>
                    {user && (
                        <Link href={`/profile/${user.id}`} className="text-white/70 text-base hover:text-white transition-colors block mt-1">
                            {user.profile?.displayName || 'User'}
                        </Link>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CommentsModal
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                postId={post?.id || fill.id}
                currentUserId={currentUserId}
                onCommentAdded={onRefresh}
            />

            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                postId={post?.id || fill.id}
                postSnippet={post?.content || "Shared video"}
            />
        </div>
    );
}
