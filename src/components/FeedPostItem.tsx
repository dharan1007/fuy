"use client";

import React, { useState, memo } from 'react';
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
    const [isHidden, setIsHidden] = useState(false);
    const { onRefresh } = useFeedRefresh() || { onRefresh: () => { } };

    if (isHidden) return null;

    const handleHide = (postId: string) => {
        setIsHidden(true);
        if (onRefresh) onRefresh();
    };

    const commonProps = {
        post,
        currentUserId,
        // We pass onRefresh to others for compatibility until refactored
        // onRefresh, 
    };

    return (
        <FeedItemProvider onRefresh={onRefresh} onPostHidden={handleHide}>
            <div className={`${className} flex flex-col relative`}>
                {/* Badge */}
                <div className="absolute top-3 left-3 z-30 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm pointer-events-none">
                    {post.postType || 'POST'}
                </div>

                {(() => {
                    switch (post.postType || post.feature) {
                        case 'SIMPLE':
                            return <SimplePostCard {...commonProps} />;
                        case 'CHAPTER':
                            return <ChapterCard {...commonProps} onRefresh={onRefresh} onPostHidden={() => handleHide(post.id)} />;
                        case 'XRAY':
                            return <XrayCard xray={post.xrayData} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} />;
                        case 'LILL':
                            return <LillCard lill={post.lillData} user={post.user} post={post} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} />;
                        case 'FILL':
                            return <FillCard fill={post.fillData} user={post.user} post={post} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} />;
                        case 'AUD':
                            return <AudCard aud={post.audData} user={post.user} post={post} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} />;
                        case 'CHAN':
                            return <ChanCard chan={post.chanData} user={post.user} post={post} postId={post.id} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} />;
                        case 'PULLUPDOWN':
                            return (
                                <div className="bg-transparent relative group">
                                    <PullUpDownCard pullUpDown={post.pullUpDownData} userVote={post.userVote} isAuthenticated={!!currentUserId} />
                                    <div className="absolute top-2 right-2 z-30">
                                        <PostActionMenu post={post} currentUserId={currentUserId} />
                                    </div>
                                </div>
                            );
                        default:
                            return <SimplePostCard {...commonProps} />;
                    }
                })()}
                {/* PostActionMenu is handled within individual cards mostly, or we add global overlay here if needed */}
            </div>
        </FeedItemProvider>
    );
}

export default memo(FeedPostItem);
