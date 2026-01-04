
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Tv, MessageSquare, Send } from 'lucide-react';
import PostActionMenu from '@/components/PostActionMenu';
import CommentsModal from '@/components/CommentsModal';
import ShareModal from '@/components/ShareModal';

type ChanCardProps = {
    chan: {
        id: string;
        channelName: string;
        description?: string | null;
        coverImageUrl?: string | null;
        episodes: string | any[];
    };
    user: any;
    postId: string;
    post?: any; // Full post object for menu
    currentUserId?: string;
    onPostHidden?: () => void;
    onRefresh?: () => void;
};

export default function ChanCard({ chan, user, postId, post, currentUserId, onPostHidden, onRefresh }: ChanCardProps) {
    if (!chan) return null;

    // 1. Try to find the latest active episode from all shows
    const shows = (chan as any).shows || [];
    const activeShows = shows.filter((s: any) => !s.isArchived);

    let allEpisodes: any[] = [];
    activeShows.forEach((show: any) => {
        if (show.episodes) {
            allEpisodes = [...allEpisodes, ...show.episodes.map((ep: any) => ({
                ...ep,
                showTitle: show.title,
                url: ep.videoUrl || ep.url, // Handle both field names
                thumbnail: ep.coverUrl || ep.thumbnail
            }))];
        }
    });

    // 2. Fallback to deprecated episodes field if no shows found
    if (allEpisodes.length === 0) {
        const legacyEpisodes = typeof chan.episodes === 'string' ? JSON.parse(chan.episodes || '[]') : chan.episodes || [];
        allEpisodes = legacyEpisodes.map((ep: any) => ({
            ...ep,
            url: ep.url,
            thumbnail: ep.thumbnail
        }));
    }

    // Sort by created date if available to get the actual latest
    allEpisodes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const [selectedEpisode, setSelectedEpisode] = useState(0);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const hasEpisodes = allEpisodes.length > 0;
    const currentEp = hasEpisodes ? allEpisodes[selectedEpisode] : null;

    return (
        <div className="bg-transparent group">
            {/* Thumbnail / Video Area - Full Width & Rounded */}
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden relative shadow-lg mb-3">
                {hasEpisodes ? (
                    <div className="w-full h-full relative group">
                        <video
                            src={currentEp.url}
                            poster={currentEp.thumbnail}
                            controls
                            className="w-full h-full object-contain bg-black"
                        />
                        {/* Overlay Title (Youtube Style) */}
                        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <h4 className="text-white font-bold text-lg line-clamp-1">{currentEp.title}</h4>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-white/5">
                        <Tv className="w-12 h-12 mb-2" />
                        <p>No episodes yet</p>
                    </div>
                )}
            </div>

            {/* Details Section - Below Video */}
            <div className="flex gap-3 px-1">
                {/* Avatar */}
                <Link href={`/profile/${user?.id}`} className="shrink-0">
                    <img
                        src={user?.profile?.avatarUrl || chan.coverImageUrl || "https://api.dicebear.com/7.x/initials/svg?seed=Chan"}
                        alt={chan.channelName}
                        className="w-10 h-10 rounded-full border border-white/10"
                    />
                </Link>

                <div className="flex-1 min-w-0">
                    {/* Title and Controls Row */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-white font-bold text-2xl leading-tight line-clamp-2 md:line-clamp-1 mb-1">
                                {hasEpisodes ? currentEp.title : chan.channelName}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Link href={`/chan/${chan.id}`} className="text-white/80 text-lg hover:text-white transition-colors font-medium">
                                    {chan.channelName}
                                </Link>
                                <span className="text-white/50 text-base">• {allEpisodes.length} episodes</span>
                            </div>
                        </div>

                        <div className="z-10 flex items-center gap-1">
                            <button
                                onClick={() => setIsCommentsOpen(true)}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                title="Comments"
                            >
                                <MessageSquare size={20} />
                            </button>
                            <button
                                onClick={() => setIsShareOpen(true)}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                title="Share"
                            >
                                <Send size={20} />
                            </button>
                            <PostActionMenu
                                post={post || { id: postId, user: user, userId: user?.id }}
                                currentUserId={currentUserId}
                                onPostHidden={onPostHidden}
                                onRefresh={onRefresh}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <CommentsModal
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                postId={postId}
                currentUserId={currentUserId}
                onCommentAdded={onRefresh}
            />

            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                postId={postId}
                postSnippet={chan.channelName}
            />
        </div>
    );
}
