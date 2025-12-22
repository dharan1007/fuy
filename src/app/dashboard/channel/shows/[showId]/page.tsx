"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Edit, Trash2, Plus, Play, Loader2 } from "lucide-react";
import { SpaceBackground } from "@/components/SpaceBackground";
import Link from "next/link";
import Image from "next/image";

interface Episode {
    id: string;
    title: string;
    episodeNumber: number;
    description: string;
    coverUrl?: string;
    videoUrl?: string;
    duration?: number;
    releaseDate?: string;
    isLive: boolean;
    credits?: string;
}

interface Show {
    id: string;
    title: string;
    description: string;
    coverUrl?: string;
    schedule?: string;
    credits?: string;
    episodes: Episode[];
}

export default function ShowDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const showId = params.showId as string;

    const [show, setShow] = useState<Show | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!showId) return;

        fetch(`/api/chans/shows/${showId}`)
            .then(res => res.json())
            .then(data => {
                setShow(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load show", err);
                setLoading(false);
            });
    }, [showId]);

    const handleDeleteShow = async () => {
        if (!confirm("Are you sure you want to delete this show and all its episodes?")) return;

        try {
            const res = await fetch(`/api/chans/shows/${showId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                router.push("/dashboard/channel");
            }
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleDeleteEpisode = async (episodeId: string) => {
        if (!confirm("Delete this episode?")) return;
        try {
            const res = await fetch(`/api/chans/episodes?id=${episodeId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                // Refresh local state
                if (show) {
                    setShow({
                        ...show,
                        episodes: show.episodes.filter(e => e.id !== episodeId)
                    });
                }
            }
        } catch (error) {
            console.error("Failed to delete episode", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    if (!show) return <div className="text-white">Show not found</div>;

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <SpaceBackground />
            <div className="relative z-10 p-6 md:p-12 max-w-7xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-white/50 hover:text-white transition-colors mb-8 group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Back to Channel
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
                    {/* Show Cover */}
                    <div className="aspect-[2/3] bg-white/5 rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
                        {show.coverUrl ? (
                            <Image
                                src={show.coverUrl}
                                alt={show.title}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10">
                                <Play className="w-20 h-20" />
                            </div>
                        )}
                    </div>

                    {/* Show Info */}
                    <div className="lg:col-span-2 flex flex-col justify-between">
                        <div>
                            <h1 className="text-4xl font-black mb-2">{show.title}</h1>
                            {show.schedule && (
                                <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400 text-sm font-mono mb-4">
                                    ⏱ {show.schedule}
                                </div>
                            )}
                            <p className="text-white/60 text-lg leading-relaxed max-w-2xl mb-6">{show.description}</p>

                            {show.credits && (
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10 max-w-md">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Cast & Crew</h3>
                                    <p className="text-sm font-mono whitespace-pre-line text-white/80">{show.credits}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-8">
                            {/* Buttons Container */}
                            <div className="flex gap-2">
                                <button className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-white" title="Edit Show">
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button onClick={handleDeleteShow} className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors text-red-400" title="Delete Show">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <Link
                                href={`/dashboard/channel/shows/${showId}/episodes/create`}
                                className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 ml-auto lg:ml-0"
                            >
                                <Plus className="w-5 h-5" /> New Episode
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Episodes List */}
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    Episodes <span className="bg-white/10 px-2 py-0.5 rounded text-sm text-white/70">{show.episodes.length}</span>
                </h2>

                <div className="space-y-4">
                    {show.episodes.length > 0 ? (
                        show.episodes.sort((a, b) => b.episodeNumber - a.episodeNumber).map((episode) => (
                            <div key={episode.id} className="group bg-white/5 border border-white/10 rounded-xl p-4 flex gap-6 hover:bg-white/10 transition-colors">
                                <div className="w-40 aspect-video bg-black rounded-lg overflow-hidden relative shrink-0">
                                    {episode.coverUrl ? (
                                        <img src={episode.coverUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/10">
                                            <Play className="w-8 h-8" />
                                        </div>
                                    )}
                                    {episode.isLive && (
                                        <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">LIVE</div>
                                    )}
                                </div>

                                <div className="flex-1 py-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-white mb-1">
                                                <span className="text-white/40 mr-2">#{episode.episodeNumber}</span>
                                                {episode.title}
                                            </h3>
                                            <p className="text-sm text-white/50 line-clamp-2">{episode.description}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteEpisode(episode.id)} className="p-2 hover:bg-red-900/20 rounded-lg text-white/50 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-4 text-xs text-white/30 font-mono">
                                        {episode.releaseDate && <span>Released: {new Date(episode.releaseDate).toLocaleDateString()}</span>}
                                        {episode.duration && <span>{Math.floor(episode.duration / 60)}m {episode.duration % 60}s</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-white/30">
                            <p>No episodes yet.</p>
                            <Link href={`/dashboard/channel/shows/${showId}/episodes/create`} className="mt-4 text-white underline">Add your first episode</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
