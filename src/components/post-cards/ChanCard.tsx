'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Tv, MoreVertical } from 'lucide-react';
import ReactionControl from '@/components/ReactionControl';

type ChanCardProps = {
    chan: {
        id: string;
        channelName: string;
        description?: string | null;
        coverImageUrl?: string | null;
        episodes: string | any[];
    };
    user: any; // Add user prop for linking
    postId: string;
};

export default function ChanCard({ chan, user, postId }: ChanCardProps) {
    const episodes = typeof chan.episodes === 'string' ? JSON.parse(chan.episodes || '[]') : chan.episodes || [];
    const [selectedEpisode, setSelectedEpisode] = useState(0);
    const hasEpisodes = episodes.length > 0;
    const currentEp = hasEpisodes ? episodes[selectedEpisode] : null;

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
                    {/* Title */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-white font-bold text-base leading-tight line-clamp-2 md:line-clamp-1">
                                {hasEpisodes ? currentEp.title : chan.channelName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Link href={`/profile/${user?.id}`} className="text-white/60 text-sm hover:text-white transition-colors">
                                    {chan.channelName}
                                </Link>
                                <span className="text-white/40 text-xs">• {episodes.length} episodes</span>
                            </div>
                        </div>
                        <button className="text-white/40 hover:text-white">
                            <MoreVertical size={18} />
                        </button>
                    </div>

                    {/* Reactions Bar (Optional for Chans? User said "basic stuff") */}
                    {/* Adding simplified reaction control */}
                    <div className="mt-2 text-xs">
                        {/* Assuming reaction props are passed down or fetched - simplified for layout now */}
                    </div>
                </div>
            </div>
        </div>
    );
}
