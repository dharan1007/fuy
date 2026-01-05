"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { MoreVertical, Flag, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import ReactionBubbleList from '@/components/ReactionBubbleList';
import ReactionControl from '@/components/ReactionControl';
import PostActionMenu from '@/components/PostActionMenu';
import CommentsModal from '@/components/CommentsModal';
import ShareModal from '@/components/ShareModal';
import { useFeedItem } from '@/context/FeedItemContext';

interface SimplePostCardProps {
    post: any;
    currentUserId?: string;
}

export default function SimplePostCard({ post, currentUserId }: SimplePostCardProps) {
    const { onRefresh: contextOnRefresh, onPostHidden: contextOnPostHidden } = useFeedItem() || {};
    const onRefresh = contextOnRefresh || (() => { });
    const onPostHidden = contextOnPostHidden ? () => contextOnPostHidden(post.id) : (() => { });

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
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
            {/* Visual Header / Content Area */}
            {/* If there is media, show it. If purely text, show text in a nice container. */}
            <div className="relative w-full aspect-square bg-black/50 overflow-hidden group rounded-t-xl">
                {post.media && post.media.length > 0 ? (
                    <>
                        {post.media[currentMediaIndex].type === 'VIDEO' ? (
                            <video
                                src={post.media[currentMediaIndex].url}
                                className="w-full h-full object-cover"
                                controls
                                controlsList="nodownload nopictureinpicture noplaybackrate"
                                disablePictureInPicture
                            />
                        ) : (
                            <img
                                src={post.media[currentMediaIndex].url}
                                alt="Post content"
                                className="w-full h-full object-cover"
                            />
                        )}

                        {/* Navigation Arrows */}
                        {post.media.length > 1 && (
                            <>
                                {currentMediaIndex > 0 && (
                                    <button
                                        onClick={prevMedia}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                )}
                                {currentMediaIndex < post.media.length - 1 && (
                                    <button
                                        onClick={nextMedia}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                )}
                                {/* Dots Indicator */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                    {post.media.map((_: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className={`w-1.5 h-1.5 rounded-full ${idx === currentMediaIndex ? 'bg-white' : 'bg-white/40'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    // Text Only Post Styling
                    <div className="w-full h-full p-8 flex items-center justify-center text-center bg-gradient-to-br from-white/5 to-white/10">
                        <p className="text-white text-2xl font-medium leading-relaxed line-clamp-6">
                            {post.content}
                        </p>
                    </div>
                )}
            </div>

            {/* Details Section (Below Content) */}
            <div className="p-5 flex flex-col gap-4">
                {/* User Info */}
                {post.user ? (
                    <div className="flex items-center gap-4">
                        <Link href={`/profile/${post.user.id}`} className="shrink-0">
                            <img
                                src={post.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user.id}`}
                                alt={post.user.profile?.displayName || "User"}
                                className="w-10 h-10 rounded-full border border-white/20"
                            />
                        </Link>
                        <div className="flex flex-col">
                            <Link href={`/profile/${post.user.id}`} className="text-base font-bold text-white hover:underline">
                                {post.user.profile?.displayName || "Unknown User"}
                            </Link>
                            {post.location && (
                                <span className="text-sm text-white/50">{post.location}</span>
                            )}
                        </div>
                        {/* Timestamp / Menu */}
                        <div className="ml-auto flex items-center gap-3">
                            <span className="text-sm text-white/40">{new Date(post.createdAt).toLocaleDateString()}</span>
                            <PostActionMenu
                                post={post}
                                currentUserId={currentUserId}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-base font-bold text-white/50">Unknown User</span>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                            <span className="text-sm text-white/40">{new Date(post.createdAt).toLocaleDateString()}</span>
                            <PostActionMenu
                                post={post}
                                currentUserId={currentUserId}
                            />
                        </div>
                    </div>
                )}

                {/* Caption (if media present, otherwise it's in the main area) */}
                {post.media && post.media.length > 0 && post.content && (
                    <p className="text-base text-white/90 line-clamp-3 leading-relaxed">
                        {post.user?.profile?.displayName && (
                            <span className="font-bold mr-2 text-white">{post.user.profile.displayName}</span>
                        )}
                        {post.content}
                    </p>
                )}

                {/* Reactions & Bubbles */}
                <div className="pt-3 border-t border-white/10">
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
