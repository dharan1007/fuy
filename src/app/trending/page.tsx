'use client';

import Link from 'next/link';
import { ArrowLeft, TrendingUp, Flame, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function TrendingPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTrending() {
            try {
                const res = await fetch('/api/posts?scope=public&limit=20');
                if (res.ok) {
                    const data = await res.json();
                    // Sort by likes to get trending
                    const sorted = data.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0));
                    setPosts(sorted);
                }
            } catch (e) {
                console.error('Failed to load trending:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchTrending();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-red-500" size={28} />
                        <h1 className="text-3xl font-bold">Trending Now</h1>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
                    </div>
                )}

                {!loading && posts.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <Flame className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No trending content yet</p>
                    </div>
                )}

                {!loading && posts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {posts.map((post: any, index: number) => (
                            <Link key={post.id} href={`/post/${post.id}`} className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition-all">
                                {/* Rank Badge */}
                                {index < 3 && (
                                    <div className={`absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black' :
                                            index === 1 ? 'bg-gray-300 text-black' :
                                                'bg-orange-700 text-white'
                                        }`}>
                                        #{index + 1}
                                    </div>
                                )}

                                {/* Media */}
                                {post.media?.[0]?.url ? (
                                    <div className="aspect-video bg-black">
                                        <img src={post.media[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                        <span className="text-4xl opacity-20">TxT</span>
                                    </div>
                                )}

                                {/* Info */}
                                <div className="p-4">
                                    <p className="line-clamp-2 mb-2">{post.content || 'No caption'}</p>
                                    <div className="flex items-center justify-between text-sm text-gray-400">
                                        <span>{post.user?.profile?.displayName || 'User'}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1"><Eye size={14} /> {post.views || 0}</span>
                                            <span className="text-red-400">❤️ {post.likes || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
