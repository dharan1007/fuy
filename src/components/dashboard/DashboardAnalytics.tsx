
"use client";

import React, { useState, useEffect } from "react";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend
} from "recharts";
import { Loader2, Users, Eye, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

// Types
interface AnalyticsData {
    profile: {
        views: number;
    };
    buddies: {
        collabmates: Buddy[];
        chat: Buddy[];
        shares: Buddy[];
        hopin: Buddy[];
        canvas: Buddy[];
        wrex: Buddy[];
    };
    usage: {
        featureSessions: { type: string; _count: number }[];
    };
    tasks: {
        stats: { status: string; _count: number }[];
    };
    history: {
        posts: { id: string; createdAt: string; feature: string; postType: string }[];
        tasks: { id: string; createdAt: string; title: string; status: string }[];
    };
    content: {
        posts: {
            id: string;
            snippet: string;
            createdAt: string;
            postType: string;
            views: number;
            reactions: number;
            breakdown: { W: number; L: number; CAP: number; FIRE: number };
        }[];
        rankings: {
            mostLiked: any;
            mostDisliked: any;
            mostCapped: any;
        };
        totalPosts: number;
        typeBreakdown: {
            type: string;
            count: number;
            bestPost: {
                id: string;
                snippet: string;
                wCount: number;
                createdAt: string;
            } | null;
        }[];
    };
}

interface Buddy {
    id: string;
    name: string;
    avatarUrl: string | null;
    stats: {
        chatTime: number;
        shares: number;
        hopin: number;
        canvas: number;
        wrex: number;
        total: number;
    };
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/dashboard/analytics")
            .then((res) => res.json())
            .then((d) => {
                setData(d);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch analytics", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-white/50">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="ml-2 font-mono text-xs tracking-widest uppercase">Analyzing Data Streams...</span>
            </div>
        );
    }

    if (!data) return null;

    // Transform Data for Charts
    const featureData = data.usage.featureSessions.map((s) => ({
        name: s.type,
        value: s._count,
    }));

    const taskData = data.tasks.stats.map((s) => ({
        name: s.status,
        value: s._count,
    }));

    // Buddy List Component
    const BuddyList = ({ title, buddies, type, redirect }: { title: string, buddies: Buddy[], type: keyof Buddy['stats'], redirect: (id: string) => void }) => (
        <div className="bg-transparent p-5 rounded-2xl border border-white/20 hover:border-white/40 transition-all col-span-1 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider opacity-90">{title}</h3>
            <div className="space-y-3">
                {buddies.length > 0 ? (
                    buddies.map((buddy) => (
                        <div
                            key={buddy.id}
                            className="flex items-center justify-between cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors group"
                            onClick={() => redirect(buddy.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center overflow-hidden border border-white/30 group-hover:border-white transition-colors">
                                    {buddy.avatarUrl ? (
                                        <img src={buddy.avatarUrl} alt={buddy.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white text-xs font-bold">{buddy.name[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-200 group-hover:text-white">{buddy.name}</p>
                                </div>
                            </div>
                            <div className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded border border-white/10">
                                {type === 'chatTime' ? `${buddy.stats[type]}m` : buddy.stats[type]}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 text-xs italic">No signals detected.</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">Mission Report</h2>
                <p className="text-gray-400 text-sm">Performance metrics and crew interactions.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Profile Views */}
                <div className="bg-transparent p-5 rounded-2xl border border-white/20 hover:bg-white/5 transition-all backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Views</h3>
                        <div className="p-1.5 bg-white/10 text-white rounded-lg border border-white/10">
                            <Eye size={16} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white">
                        {data.profile.views}
                    </div>
                </div>

                {/* Total Tasks Done */}
                <div className="bg-transparent p-5 rounded-2xl border border-white/20 hover:bg-white/5 transition-all backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Tasks</h3>
                        <div className="p-1.5 bg-white/10 text-white rounded-lg border border-white/10">
                            <CheckCircle size={16} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white">
                        {taskData.find(d => d.name === 'DONE')?.value || 0}
                    </div>
                </div>

                {/* Top Chatter */}
                <div className="bg-transparent p-5 rounded-2xl border border-white/20 hover:bg-white/5 transition-all backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Chatter</h3>
                        <div className="p-1.5 bg-white/10 text-white rounded-lg border border-white/10">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-white truncate">
                        {data.buddies.chat[0]?.name || "None"}
                    </div>
                </div>

                {/* Top Collabmate */}
                <div className="bg-transparent p-5 rounded-2xl border border-white/20 hover:bg-white/5 transition-all backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Ally</h3>
                        <div className="p-1.5 bg-white/10 text-white rounded-lg border border-white/10">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-white truncate">
                        {data.buddies.collabmates[0]?.name || "None"}
                    </div>
                </div>
            </div>


            {/* BUDDY GRIDS */}
            <h3 className="text-xl font-bold text-white pt-4">Crew Manifest</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <BuddyList title="Comms (Chat)" buddies={data.buddies.chat} type="chatTime" redirect={(id) => router.push(`/chat?userId=${id}`)} />
                <BuddyList title="Broadcasting (Shares)" buddies={data.buddies.shares} type="shares" redirect={(id) => router.push(`/chat?userId=${id}`)} />
                <BuddyList title="Operations (Collab)" buddies={data.buddies.collabmates} type="total" redirect={(id) => router.push(`/profile/${id}`)} />
                <BuddyList title="Hopin Unit" buddies={data.buddies.hopin} type="hopin" redirect={(id) => router.push('/hopin')} />
                <BuddyList title="Canvas Unit" buddies={data.buddies.canvas} type="canvas" redirect={(id) => router.push('/journal')} />
                <BuddyList title="Wrex Unit" buddies={data.buddies.wrex} type="wrex" redirect={(id) => router.push('/grounding')} />
            </div>


            {/* CONTENT BREAKDOWN */}
            <h3 className="text-xl font-bold text-white pt-4">Transmission Logs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Posts Card */}
                <div className="bg-transparent p-6 rounded-2xl border border-white/20 flex flex-col justify-between hover:border-white/40 transition-all backdrop-blur-sm">
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Total Transmissions</h3>
                        <p className="text-4xl font-black text-white">{data.content.totalPosts || 0}</p>
                    </div>
                </div>

                {/* Type Breakdown Cards */}
                {data.content.typeBreakdown && data.content.typeBreakdown.map((item) => (
                    <div
                        key={item.type}
                        className="bg-transparent p-6 rounded-2xl border border-white/20 cursor-pointer hover:bg-white/10 transition-all relative overflow-hidden group backdrop-blur-sm"
                        onClick={() => item.bestPost && router.push(`/post/${item.bestPost.id}`)}
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 font-black text-6xl pointer-events-none select-none text-white">
                            {item.type[0]}
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">{item.type}</h3>
                        <p className="text-xs text-gray-400 mb-4">{item.count} Records</p>

                        {item.bestPost ? (
                            <div className="mt-auto pt-4 border-t border-white/10">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Top Signal</p>
                                <p className="text-xs font-medium text-gray-200 line-clamp-2 italic">"{item.bestPost.snippet}"</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-white bg-white/10 border border-white/10 px-2 py-1 rounded">
                                        {item.bestPost.wCount} Wins
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-auto pt-4 border-t border-white/10">
                                <p className="text-xs text-gray-500">No data</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Feature Usage Chart */}
                <div className="bg-transparent p-6 rounded-2xl border border-white/20 hover:border-white/40 transition-all backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">System Usage</h3>
                    <div className="h-64 w-full min-h-[250px]">
                        {featureData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={featureData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {featureData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 font-mono text-xs">NO DATA</div>
                        )}
                    </div>
                </div>

                {/* Content Performance */}
                <div className="bg-transparent p-6 rounded-2xl border border-white/20 hover:border-white/40 transition-all backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Reaction Analysis</h3>
                    <div className="h-64 w-full min-h-[250px]">
                        {data.content.posts.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data.content.posts.slice(0, 5).map(p => ({
                                        name: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
                                        W: p.breakdown.W,
                                        L: p.breakdown.L,
                                        CAP: p.breakdown.CAP
                                    }))}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#ccc' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#ccc' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', color: '#fff' }} />
                                    <Bar dataKey="W" stackId="a" fill="#4ade80" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="L" stackId="a" fill="#f87171" />
                                    <Bar dataKey="CAP" stackId="a" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 font-mono text-xs">NO RECENT SIGNALS</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Lists Row */}
            <h3 className="text-xl font-bold text-white pt-4">Records</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Top Posts Rankings */}
                <div className="bg-transparent p-6 rounded-2xl border border-white/20 col-span-2 backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Hall of Fame</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Most W */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => data.content.rankings.mostLiked && router.push(`/post/${data.content.rankings.mostLiked.id}`)}
                        >
                            <span className="text-[10px] font-black text-white uppercase tracking-wider block mb-2 opacity-70">Most Liked</span>
                            {data.content.rankings.mostLiked ? (
                                <>
                                    <p className="text-sm text-white font-bold mb-1 line-clamp-2">"{data.content.rankings.mostLiked.snippet || 'Media Post'}"</p>
                                    <p className="text-xs text-white/70">{data.content.rankings.mostLiked.breakdown.W} Wins</p>
                                </>
                            ) : (
                                <p className="text-xs text-gray-500 italic">No data</p>
                            )}
                        </div>

                        {/* Most L */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => data.content.rankings.mostDisliked && router.push(`/post/${data.content.rankings.mostDisliked.id}`)}
                        >
                            <span className="text-[10px] font-black text-white uppercase tracking-wider block mb-2 opacity-70">Most Disliked</span>
                            {data.content.rankings.mostDisliked ? (
                                <>
                                    <p className="text-sm text-white font-bold mb-1 line-clamp-2">"{data.content.rankings.mostDisliked.snippet || 'Media Post'}"</p>
                                    <p className="text-xs text-white/70">{data.content.rankings.mostDisliked.breakdown.L} Ls</p>
                                </>
                            ) : (
                                <p className="text-xs text-gray-500 italic">No data</p>
                            )}
                        </div>

                        {/* Most Cap */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => data.content.rankings.mostCapped && router.push(`/post/${data.content.rankings.mostCapped.id}`)}
                        >
                            <span className="text-[10px] font-black text-white uppercase tracking-wider block mb-2 opacity-70">Biggest Cap</span>
                            {data.content.rankings.mostCapped ? (
                                <>
                                    <p className="text-sm text-white font-bold mb-1 line-clamp-2">"{data.content.rankings.mostCapped.snippet || 'Media Post'}"</p>
                                    <p className="text-xs text-white/70">{data.content.rankings.mostCapped.breakdown.CAP} Caps</p>
                                </>
                            ) : (
                                <p className="text-xs text-gray-500 italic">No data</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* History Timeline */}
                <div className="bg-transparent p-6 rounded-2xl border border-white/20 col-span-1 backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Recent Logs</h3>

                    <div className="relative border-l border-white/20 ml-3 space-y-6">
                        {/* Merge and sort history */}
                        {[...data.history.posts.map(p => ({ ...p, type: 'POST' })), ...data.history.tasks.map(t => ({ ...t, type: 'TASK' }))]
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .slice(0, 5) // Last 5
                            .map((item, idx) => (
                                <div
                                    key={idx}
                                    className="relative pl-6 cursor-pointer group"
                                    onClick={() => {
                                        // @ts-ignore
                                        if (item.type === 'POST') router.push(`/post/${item.id}`);
                                        // @ts-ignore
                                        if (item.type === 'TASK') router.push(`/dashboard`);
                                    }}
                                >
                                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-black border-2 border-gray-600 group-hover:border-white transition-colors" />
                                    <div className="flex flex-col">
                                        <div>
                                            <span className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase mb-1 ${item.type === 'POST' ? 'bg-white/10 text-white border border-white/10' : 'bg-white/10 text-white border border-white/10'}`}>
                                                {item.type === 'POST' ? 'POST' : 'TASK'}
                                            </span>
                                            <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors line-clamp-1">
                                                {item.type === 'POST'
                                                    // @ts-ignore
                                                    ? `${item.postType}`
                                                    // @ts-ignore
                                                    : `${item.title}`
                                                }
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-0.5 font-mono">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
