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
            <div className={`${className} flex flex-col relative border-2 border-white/70 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm shadow-lg`}>
                {/* Badge & Date */}
                <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
                    <div className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        {(post.postType || post.feature) === 'CHAN' ? 'CHANNEL' : (post.postType || 'POST')}
                    </div>
                    {post.createdAt && (
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
                            return post.xrayData ? <XrayCard xray={post.xrayData} currentUserId={currentUserId} onPostHidden={() => handleHide(post.id)} onRefresh={onRefresh} /> : <SimplePostCard {...commonProps} />;
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
                {/* PostActionMenu is handled within individual cards mostly, or we add global overlay here if needed */}
            </div>
        </FeedItemProvider>
    );
}

export default memo(FeedPostItem);
