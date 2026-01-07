"use client";

import React, { useState, useEffect, memo } from 'react';
import SimplePostCard from '@/components/post-cards/SimplePostCard';
import ChapterCard from '@/components/post-cards/ChapterCard';
import XrayCard from '@/components/post-cards/XrayCard';
import LillCard from '@/components/post-cards/LillCard';
import FillCard from '@/components/post-cards/FillCard';
import AudCard from '@/components/post-cards/AudCard';
import ChanCard from '@/components/post-cards/ChanCard';
import PullUpDownCard from '@/components/post-cards/PullUpDownCard';
import PostActionMenu from '@/components/PostActionMenu';
import { FeedItemProvider, useFeedRefresh } from '@/context/FeedItemContext';

interface FeedPostItemProps {
    post: any;
    currentUserId?: string;
    className?: string;
    isProfileView?: boolean; // To pass specific props if needed
}

function FeedPostItem({ post, currentUserId, className, isProfileView }: FeedPostItemProps) {
    const [mounted, setMounted] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [showSlashes, setShowSlashes] = useState(false);
    const { onRefresh } = useFeedRefresh() || { onRefresh: () => { } };

    useEffect(() => {
        setMounted(true);
    }, []);

    if (isHidden) return null;

    const handleHide = (postId: string) => {
        setIsHidden(true);
        if (onRefresh) onRefresh();
    };

    const commonProps = {
        post,
        currentUserId,
    };

    return (
        <FeedItemProvider onRefresh={onRefresh} onPostHidden={handleHide}>
            <div className={`${className} flex flex-col relative border-2 border-white/70 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm shadow-lg`}>
                {/* Badge & Date */}
                <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
                    <div className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        {(post.postType || post.feature) === 'CHAN' ? 'CHANNEL' : (post.postType === 'SIMPLE_TEXT' ? 'sixts' : (post.postType || 'POST'))}
                    </div>
                    {mounted && post.createdAt && (
                        <span className="text-[10px] font-medium text-white/60 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-md">
                            {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                {(() => {
                    switch (post.postType || post.feature) {
                        case 'SIMPLE':
                        case 'SIMPLE_TEXT':
                            return <SimplePostCard {...commonProps} />;
                        case 'CHAPTER':
                            return <ChapterCard {...commonProps} onRefresh={onRefresh} onPostHidden={() => handleHide(post.id)} />;
                        case 'XRAY':
                            return post.xrayData ? <XrayCard post={post} xray={post.xrayData} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} /> : <SimplePostCard {...commonProps} />;
                        case 'LILL':
                            return post.lillData ? <LillCard lill={post.lillData} user={post.user} post={post} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} /> : <SimplePostCard {...commonProps} />;
                        case 'FILL':
                            return post.fillData ? <FillCard fill={post.fillData} user={post.user} post={post} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} /> : <SimplePostCard {...commonProps} />;
                        case 'AUD':
                            return post.audData ? <AudCard aud={post.audData} user={post.user} post={post} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} /> : <SimplePostCard {...commonProps} />;
                        case 'CHAN':
                            return post.chanData ? <ChanCard chan={post.chanData} user={post.user} post={post} postId={post.id} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} /> : <SimplePostCard {...commonProps} />;
                        case 'PULLUPDOWN':
                            return post.pullUpDownData ? (
                                <div className="bg-transparent relative group">
                                    <PullUpDownCard pullUpDown={post.pullUpDownData} userVote={post.userVote} isAuthenticated={!!currentUserId} />
                                    <div className="absolute top-2 right-2 z-30">
                                        <PostActionMenu post={post} currentUserId={currentUserId} />
                                    </div>
                                </div>
                            ) : <SimplePostCard {...commonProps} />;
                        default:
                            return <SimplePostCard {...commonProps} />;
                    }
                })()}

                {/* Global Slash Toggle */}
                {post.slashes && post.slashes.length > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSlashes(!showSlashes);
                        }}
                        className={`absolute top-3 right-3 z-40 w-8 h-8 rounded-full backdrop-blur-md border border-white/20 flex items-center justify-center transition-all font-mono font-bold text-sm ${showSlashes ? 'bg-white text-black' : 'bg-black/40 text-white/70 hover:text-white hover:bg-white/20'}`}
                        title="Show Slashes"
                    >
                        /
                    </button>
                )}

                {/* Slashes overlay could be added here when slashes feature is fully implemented */}
            </div>
        </FeedItemProvider>
    );
}

export default memo(FeedPostItem);
