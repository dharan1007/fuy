"use client";

import { useSession } from "@/hooks/use-session";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SpaceBackground } from "@/components/SpaceBackground";
import { ChevronLeft, User as UserIcon, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function ChannelSubscribersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) fetchSubscribers();
    }, [session]);

    async function fetchSubscribers() {
        try {
            const res = await fetch("/api/chans/subscribers");
            if (res.ok) {
                const data = await res.json();
                setSubscribers(data.subscribers || []);
            }
        } catch (error) {
            console.error("Failed to fetch subscribers", error);
        } finally {
            setLoading(false);
        }
    }

    if (status === "loading" || loading) return <LoadingSpinner message="Identifying Frequencies..." />;

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen w-full bg-black text-white font-sans relative overflow-x-hidden">
            <SpaceBackground />

            {/* Header */}
            <div className="relative z-10 w-full px-8 py-6 flex items-center gap-4 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-white/50 hover:text-white" />
                </button>
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Channel Subscribers</h1>
                    <p className="text-white/40 text-xs font-mono">{subscribers.length} Entities Connected</p>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-10">
                {subscribers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                            <UserIcon className="w-10 h-10 text-white/20" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-white/80">No Subscribers Yet</h2>
                        <p className="text-white/40 max-w-xs">Your signal hasn't been intercepted yet. Keep broadcasting!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subscribers.map((sub) => (
                            <div key={sub.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <Link href={`/profile/${sub.id}`} className="flex items-center gap-4 flex-1">
                                    <div className="relative">
                                        {sub.profile?.avatarUrl ? (
                                            <img
                                                src={sub.profile.avatarUrl}
                                                alt={sub.name}
                                                className="w-12 h-12 rounded-full object-cover border border-white/20"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white border border-white/20">
                                                {sub.name?.[0] || 'U'}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-black rounded-full" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                                            {sub.profile?.displayName || sub.name || "Anonymous User"}
                                        </h3>
                                        <p className="text-xs text-white/40 font-mono">@{sub.username || sub.id.slice(0, 8)}</p>
                                    </div>
                                </Link>

                                <button
                                    onClick={() => router.push(`/chat?userId=${sub.id}`)}
                                    className="p-3 bg-white/5 hover:bg-white/20 rounded-xl border border-white/10 transition-all active:scale-95"
                                >
                                    <MessageSquare className="w-5 h-5 text-white/60" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
