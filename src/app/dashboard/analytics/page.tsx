'use client';

import Link from 'next/link';
import { ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Users, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AnalyticsPage() {
    const [stats, setStats] = useState({
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        followers: 0,
        following: 0,
        postsCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        totalViews: data.totalViews || 0,
                        totalLikes: data.totalLikes || 0,
                        totalComments: data.totalComments || 0,
                        followers: data.followersCount || 0,
                        following: data.followingCount || 0,
                        postsCount: data.postsCount || 0
                    });
                }
            } catch (e) {
                console.error('Failed to load analytics:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    const statCards = [
        { label: 'Total Views', value: stats.totalViews, icon: Eye, color: 'text-blue-400' },
        { label: 'Total Likes', value: stats.totalLikes, icon: Heart, color: 'text-red-400' },
        { label: 'Total Comments', value: stats.totalComments, icon: MessageCircle, color: 'text-green-400' },
        { label: 'Followers', value: stats.followers, icon: Users, color: 'text-yellow-400' },
        { label: 'Following', value: stats.following, icon: Users, color: 'text-cyan-400' },
        { label: 'Posts Created', value: stats.postsCount, icon: Calendar, color: 'text-orange-400' },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-green-400" size={28} />
                        <h1 className="text-3xl font-bold">Analytics</h1>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
                    </div>
                )}

                {!loading && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            {statCards.map((stat) => (
                                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <stat.icon className={`${stat.color} mb-3`} size={24} />
                                    <p className="text-3xl font-bold mb-1">{stat.value.toLocaleString()}</p>
                                    <p className="text-gray-400 text-sm">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Placeholder for Charts */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                            <h3 className="text-xl font-bold mb-2">Detailed Analytics Coming Soon</h3>
                            <p className="text-gray-400">Charts, graphs, and insights will be available here.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
