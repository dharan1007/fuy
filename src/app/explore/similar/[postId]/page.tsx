
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react'; // Globe removed
import ScrollStarfield from '@/components/ScrollStarfield';
import FeedPostItem from '@/components/FeedPostItem';
import { FeedItemProvider } from '@/context/FeedItemContext';
import AppHeader from '@/components/AppHeader';

interface SimilarPost {
    id: string;
    content: string;
    user: any;
    media: any[];
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    impressions: number;
    matchReason: string;
    slashes: { tag: string }[];
    [key: string]: any;
}

export default function SimilarFeedPage() {
    const params = useParams();
    const router = useRouter();
    const postId = params.postId as string;

    const [posts, setPosts] = useState<SimilarPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSimilar = async () => {
            try {
                const res = await fetch(`/api/posts/similar?postId=${postId}&limit=50`);
                if (res.ok) {
                    const data = await res.json();
                    setPosts(data);
                }
            } catch (error) {
                console.error('Failed to load similar posts', error);
            } finally {
                setLoading(false);
            }
        };

        if (postId) {
            fetchSimilar();
        }
    }, [postId]);

    // Fetch source post specifically to show it at the top
    const [sourcePost, setSourcePost] = useState<SimilarPost | null>(null);
    useEffect(() => {
        if (!postId) return;
        fetch(`/api/posts/${postId}`).then(res => {
            if (res.ok) return res.json();
            return null;
        }).then(data => {
            if (data) setSourcePost(data);
        });
    }, [postId]);

    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col">
            {/* Background */}
            <ScrollStarfield />

            {/* Header */}
            <AppHeader title="Similar Vibes" showBackButton={true} />

            {/* Feed Content */}
            <main className="flex-1 w-full max-w-2xl mx-auto px-0 md:px-4 py-6 relative z-10">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin w-8 h-8 text-white/50" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-white/50">
                        <p>No similar posts found yet.</p>
                        <p className="text-sm mt-2">Try adding slashes to your own posts!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Source Post */}
                        {sourcePost && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 border-b-4 border-white/10 pb-6 mb-6">
                                <div className="px-4 mb-2">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                                        Selected Post
                                    </span>
                                </div>
                                <FeedItemProvider onRefresh={() => { }}>
                                    <FeedPostItem post={sourcePost} />
                                </FeedItemProvider>
                            </div>
                        )}

                        {posts.map((post) => (
                            <div key={post.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Match Reason Badge */}
                                <div className="px-4 mb-2 flex items-center gap-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 border border-white/10 px-2 py-0.5 rounded-full bg-black/40">
                                        {post.matchReason || 'Similar'}
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
                                </div>

                                {/* Feed Item Wrapper with Context */}
                                <FeedItemProvider
                                    onRefresh={() => { }} // No-op for now, or implement re-fetch
                                >
                                    <FeedPostItem
                                        post={post}
                                        currentUserId="currentUser" // Ideally from session, but FeedPostItem usually handles it internally or via prop. 
                                    // Note: FeedPostItem might need session prop. Assuming it handles it or we pass it if we have it easily.
                                    // For simplicity, we assume component handles auth or ignore for view-mostly.
                                    // Better: Get session here.
                                    />
                                </FeedItemProvider>

                                {/* Metrics & Slashes Footer for this view */}
                                <div className="px-4 mt-2 mb-8 flex flex-wrap gap-2 items-center justify-between text-xs text-white/30">
                                    <div className="flex gap-2">
                                        {post.slashes && post.slashes.map((slash: any, i: number) => (
                                            <span key={i} className="text-white/50">/{slash.tag}</span>
                                        ))}
                                    </div>
                                    <div className="flex gap-3">
                                        <span>{post.impressions || 0} views</span>
                                        <span>{post.sharesCount || 0} shares</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
