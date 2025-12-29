"use client";

import { useSession } from "@/hooks/use-session";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SpaceBackground } from "@/components/SpaceBackground";
import { Plus, Video, Radio, Layers, ChevronRight, Settings, Edit } from "lucide-react";
import Link from "next/link";

export default function ChannelDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [channel, setChannel] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedShowIds, setSelectedShowIds] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (session) fetchChannel();
    }, [session]);

    async function fetchChannel() {
        try {
            const res = await fetch("/api/chans/mine");
            if (res.ok) {
                const data = await res.json();
                setChannel(data);
            }
        } catch (error) {
            console.error("Failed to fetch channel", error);
        } finally {
            setLoading(false);
        }
    }

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedShowIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedShowIds(newSet);
    };

    const handleBulkArchive = async () => {
        if (selectedShowIds.size === 0) return;
        if (!confirm(`Are you sure you want to archive ${selectedShowIds.size} shows?`)) return;

        setActionLoading(true);
        try {
            const res = await fetch("/api/chans/shows", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: Array.from(selectedShowIds),
                    action: "ARCHIVE"
                })
            });

            if (res.ok) {
                await fetchChannel();
                setIsSelectionMode(false);
                setSelectedShowIds(new Set());
            } else {
                alert("Failed to archive shows");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedShowIds.size === 0) return;
        if (!confirm(`WARNING: This will PERMANENTLY DELETE ${selectedShowIds.size} shows and all their episodes.\n\nAre you absolutely sure?`)) return;

        setActionLoading(true);
        try {
            const res = await fetch("/api/chans/shows", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: Array.from(selectedShowIds)
                })
            });

            if (res.ok) {
                await fetchChannel();
                setIsSelectionMode(false);
                setSelectedShowIds(new Set());
            } else {
                alert("Failed to delete shows");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    if (status === "loading" || loading) return <LoadingSpinner message="Accessing Broadcast Frequency..." />;

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    // Filter out archived shows for now, unless we want a separate 'Archived' tab.
    // For now, let's assuming Archive just hides them from this main view, or shows them dimmed.
    // Let's show active shows mainly.
    const activeShows = channel?.shows?.filter((s: any) => !s.isArchived) || [];

    return (
        <div className="min-h-screen w-full bg-black text-white font-sans relative overflow-x-hidden">
            <SpaceBackground />

            {/* Header */}
            <div className="relative z-10 w-full px-8 py-6 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronRight className="rotate-180 w-6 h-6 text-white/50 hover:text-white" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Channel Command</h1>
                        <p className="text-white/40 text-xs font-mono">Broadcast & Content Management</p>
                    </div>
                </div>
                {channel && (
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase rounded-full animate-pulse">
                            {channel.isLive ? "LIVE SIGNAL ACTIVE" : "OFFLINE"}
                        </div>
                        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <Settings className="w-5 h-5 text-white/70" />
                        </button>
                    </div>
                )}
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-10">
                {!channel ? (
                    /* Empty State - Create Channel */
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                            <Radio className="w-10 h-10 text-white/30" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Initialize Broadcast Channel</h2>
                        <p className="text-white/50 max-w-md text-center mb-8">
                            Start your own channel to stream content, manage shows, and build your audience across the galaxy.
                        </p>
                        <button
                            onClick={() => router.push("/dashboard/channel/create")}
                            className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            Create Channel
                        </button>
                    </div>
                ) : (
                    /* Dashboard Content */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Stats / Overview */}
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <StatCard label="Subscribers" value={channel.subscriberCount || 0} />
                            <StatCard label="Total Views" value="2.4M" />
                            <StatCard label="Active Shows" value={channel.shows?.length || 0} />
                            <StatCard label="Content Hours" value="142" />
                        </div>

                        {/* Actions */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Your Shows</h3>

                                <div className="flex items-center gap-2">
                                    {isSelectionMode ? (
                                        <button
                                            onClick={() => { setIsSelectionMode(false); setSelectedShowIds(new Set()); }}
                                            className="px-4 py-2 text-white/70 hover:text-white text-sm font-bold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setIsSelectionMode(true)}
                                            className="px-4 py-2 text-white/70 hover:text-white text-sm font-bold transition-colors"
                                        >
                                            Select
                                        </button>
                                    )}

                                    <button
                                        onClick={() => router.push('/dashboard/channel/shows/create')}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> New Show
                                    </button>
                                </div>
                            </div>

                            {/* Shows Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {channel.shows?.length > 0 ? (
                                    channel.shows.sort((a: any, b: any) => {
                                        if (a.schedule && !b.schedule) return -1;
                                        if (!a.schedule && b.schedule) return 1;
                                        return 0;
                                    }).map((show: any) => {
                                        const isSelected = selectedShowIds.has(show.id);
                                        const isArchived = show.isArchived;

                                        // In select mode, clicking card selects it. Otherwise, it navigates.
                                        // Archived shows are dimmed.

                                        return (
                                            <div
                                                key={show.id}
                                                onClick={() => {
                                                    if (isSelectionMode) toggleSelection(show.id);
                                                    else router.push(`/dashboard/channel/shows/${show.id}`);
                                                }}
                                                className={`
                                                    bg-white/5 border p-4 rounded-xl transition-all cursor-pointer group relative
                                                    ${isSelectionMode && isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:bg-white/10'}
                                                    ${isArchived ? 'opacity-50 grayscale' : ''}
                                                `}
                                            >
                                                {isSelectionMode && (
                                                    <div className={`absolute top-4 right-4 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/50 bg-black/50'}`}>
                                                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                                    </div>
                                                )}

                                                <div className="aspect-video bg-black/50 rounded-lg mb-3 overflow-hidden relative">
                                                    {show.coverUrl ? (
                                                        <img src={show.coverUrl} alt={show.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><Layers className="text-white/20" /></div>
                                                    )}
                                                    {isArchived && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                                            <span className="text-xs font-bold text-white uppercase tracking-widest border border-white/20 px-2 py-1 rounded">Archived</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <h4 className="font-bold truncate">{show.title}</h4>
                                                {show.schedule && (
                                                    <p className="text-xs text-blue-400 font-mono mb-1">{show.schedule}</p>
                                                )}
                                                <p className="text-xs text-white/40">{show.episodes?.length || 0} Episodes</p>

                                                {!isSelectionMode && (
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <div className="p-1.5 bg-black/50 hover:bg-black/80 rounded-md text-white block backdrop-blur-sm">
                                                            <Edit className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-2 py-10 text-center text-white/30 border border-dashed border-white/10 rounded-xl">
                                        No shows created yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Actions */}
                        <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <Radio className="w-4 h-4 text-red-400" /> Live Control
                                </h3>
                                <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg mb-2 shadow-lg shadow-red-900/50">
                                    GO LIVE
                                </button>
                                <p className="text-xs text-white/40 text-center">
                                    Stream directly from your dashboard or use external software via RTMP.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Actions Floating Bar */}
            {isSelectionMode && selectedShowIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-neutral-900 border border-white/20 p-2 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5">
                    <span className="px-4 text-sm font-bold text-white/70">{selectedShowIds.size} selected</span>
                    <div className="h-6 w-px bg-white/10" />
                    <button
                        onClick={handleBulkArchive}
                        disabled={actionLoading}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                        Archive
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        disabled={actionLoading}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-black">{value}</p>
        </div>
    )
}
