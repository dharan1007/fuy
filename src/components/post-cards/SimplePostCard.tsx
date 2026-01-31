"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Linkify } from '@/components/Linkify';
import { MoreVertical, Flag, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import ReactionBubbleList from '@/components/ReactionBubbleList';
import ReactionControl from '@/components/ReactionControl';
import PostActionMenu from '@/components/PostActionMenu';
import CommentsModal from '@/components/CommentsModal';
import ShareModal from '@/components/ShareModal';
import { useFeedItem } from '@/context/FeedItemContext';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useVideoAutoplay } from '@/context/FeedPlaybackContext';

interface SimplePostCardProps {
    post: any;
    currentUserId?: string;
}

export default function SimplePostCard({ post, currentUserId }: SimplePostCardProps) {
    const { onRefresh: contextOnRefresh, onPostHidden: contextOnPostHidden } = useFeedItem() || {};
    const onRefresh = contextOnRefresh || (() => { });
    const onPostHidden = contextOnPostHidden ? () => contextOnPostHidden(post.id) : (() => { });

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const { videoRef } = useVideoAutoplay(post.id, currentMediaIndex); // Dependent on slide change

    const [isHidden, setIsHidden] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    if (isHidden) return null;

    const nextMedia = (e: React.MouseEvent) => {

        e.preventDefault();
        e.stopPropagation();
        if (post.media && currentMediaIndex < post.media.length - 1) {
            setCurrentMediaIndex(prev => prev + 1);
        }
    };

    const prevMedia = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentMediaIndex > 0) {
            setCurrentMediaIndex(prev => prev - 1);
        }
    };

    return (
        <div className="bg-transparent rounded-xl flex flex-col h-full relative">
            {/* User Info & Header - Moved to Top */}
            <div className="p-5 pb-2 flex items-center gap-4">
                {post.user ? (
                    <div className="flex items-center gap-3 w-full">
                        <Link href={`/profile/${post.user.id}`} className="shrink-0">
                            <img
                                src={post.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user.id}`}
                                alt={post.user.profile?.displayName || "User"}
                                className="w-8 h-8 rounded-full border border-white/20"
                            />
                        </Link>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                                <Link href={`/profile/${post.user.id}`} className="text-sm font-bold text-white hover:underline leading-none">
                                    {post.user.profile?.displayName || "Unknown User"}
                                </Link>
                                <VerifiedBadge size={14} show={post.user.isHumanVerified} />
                            </div>
                            {post.location && (
                                <span className="text-[10px] text-white/50">{post.location}</span>
                            )}
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                            <span className="text-[10px] text-white/40">{new Date(post.createdAt).toLocaleDateString()}</span>
                            <PostActionMenu
                                post={post}
                                currentUserId={currentUserId}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white/50 leading-none">Unknown User</span>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                            <span className="text-[10px] text-white/40">{new Date(post.createdAt).toLocaleDateString()}</span>
                            <PostActionMenu
                                post={post}
                                currentUserId={currentUserId}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Visual Content Area */}
            {(!post.media || post.media.length === 0) ? (
                <div className="w-full px-6 pt-2 pb-4 flex flex-col bg-transparent">
                    <p className="text-white text-lg font-normal leading-relaxed whitespace-pre-wrap">
                        <Linkify>{post.content}</Linkify>
                    </p>
                </div>
            ) : (
                <div className="flex flex-col">
                    <div className={`relative w-full ${post.postType === 'STORY' ? 'aspect-[9/16]' : 'aspect-[4/5]'} bg-black/50 overflow-hidden group`}>
                        {post.media[currentMediaIndex].type === 'VIDEO' ? (
                            <video
                                ref={videoRef}
                                src={post.media[currentMediaIndex].url}
                                className="w-full h-full object-contain bg-black"
                                controls
                                muted
                                playsInline
                                loop
                                controlsList="nodownload nopictureinpicture noplaybackrate"
                                disablePictureInPicture
                            />
                        ) : (
                            <img
                                src={post.media[currentMediaIndex].url}
                                alt="Post content"
                                className="w-full h-full object-contain bg-black"
                            />
                        )}

                        {/* Navigation Arrows */}
                        {post.media.length > 1 && (
                            <>
                                {currentMediaIndex > 0 && (
                                    <button
                                        onClick={prevMedia}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                )}
                                {currentMediaIndex < post.media.length - 1 && (
                                    <button
                                        onClick={nextMedia}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                )}
                                {/* Dots Indicator */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                                    {post.media.map((_: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className={`w-1.5 h-1.5 rounded-full ${idx === currentMediaIndex ? 'bg-white' : 'bg-white/40'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {/* Caption for Media Posts */}
                    {post.content && (
                        <div className="px-5 pt-4">
                            <p className="text-base text-white/90 leading-relaxed">
                                <Linkify>{post.content}</Linkify>
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Reactions & Bubbles */}
            <div className="px-5 pb-5 pt-3">
                <div className="mb-3">
                    <ReactionBubbleList
                        postId={post.id}
                        bubbles={post.topBubbles || []}
                        totalBubbles={post.totalBubbles || 0}
                        onAddBubble={() => onRefresh()} // Simple refresh trigger
                    />
                </div>
                <div className="flex items-center justify-between">
                    <ReactionControl
                        postId={post.id}
                        initialReaction={post.userReaction}
                        counts={post.reactionCounts}
                        onReact={() => onRefresh()}
                    />
                    <div className="text-xs text-white/50 hover:text-white cursor-pointer transition-colors" onClick={() => setIsCommentsOpen(true)}>
                        {post.comments?.length || 0} comments
                    </div>
                </div>
                {/* Share Button Row */}
                <div className="mt-3 flex items-center justify-end border-t border-white/5 pt-2">
                    <button
                        onClick={() => setIsShareOpen(true)}
                        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-medium"
                    >
                        <Send size={14} />
                        Share
                    </button>
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
