"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Loader2, Play, Calendar } from "lucide-react";
import { SpaceBackground } from "@/components/SpaceBackground";
import UploadField from "@/components/UploadField";

export default function CreateEpisodePage() {
    const router = useRouter();
    const params = useParams();
    const showId = params.showId as string;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        episodeNumber: 1,
        coverUrl: "",
        videoUrl: "",
        duration: 0,
        releaseDate: "",
        isLive: false,
        credits: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/chans/episodes", {
                method: "POST",
                body: JSON.stringify({ ...formData, showId }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                router.push("/dashboard/channel");
            } else {
                alert("Failed to create episode");
            }
        } catch (error) {
            console.error(error);
            alert("Error creating episode");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-black text-white font-sans overflow-y-auto">
            <SpaceBackground />

            <div className="relative z-10 max-w-2xl mx-auto px-6 py-10">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" /> Back to Channel
                </button>

                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <Play className="w-8 h-8 text-green-400" />
                    New Episode
                </h1>
                <p className="text-white/50 mb-8">Add content to your show.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-white/70">Episode Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. The Pilot"
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-base focus:border-white/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-white/70">Episode #</label>
                            <input
                                type="number"
                                required
                                value={formData.episodeNumber}
                                onChange={(e) => setFormData({ ...formData, episodeNumber: parseInt(e.target.value) })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-base focus:border-white/50 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-white/70">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Episode details..."
                            rows={4}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-base focus:border-white/50 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-white/70">Episode Credits (Guest Stars, Crew)</label>
                        <textarea
                            value={(formData as any).credits || ""}
                            onChange={(e) => setFormData({ ...formData, credits: e.target.value } as any)}
                            placeholder="Guest Star: Alice Bob&#10;Writer: Charlie"
                            rows={3}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-base focus:border-white/50 focus:outline-none transition-colors font-mono"
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-white/70">Video File</label>
                            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/50">
                                {formData.videoUrl ? (
                                    <div className="relative aspect-video group bg-black">
                                        <video
                                            src={formData.videoUrl}
                                            controls
                                            className="w-full h-full object-contain"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, videoUrl: "" })}
                                            className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        <UploadField
                                            accept="video/*"
                                            onUpload={(result) => setFormData({ ...formData, videoUrl: result.url })}
                                        />
                                        <p className="text-xs text-white/30 mt-2 text-center">Supports MP4, MOV, WEBM (Max 500MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-white/70">Cover Image</label>
                            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/50">
                                {formData.coverUrl ? (
                                    <div className="relative aspect-video group">
                                        <img
                                            src={formData.coverUrl}
                                            alt="Cover"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, coverUrl: "" })}
                                            className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        <UploadField
                                            accept="image/*"
                                            onUpload={(result) => setFormData({ ...formData, coverUrl: result.url })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-white/70">Release Date</label>
                            <input
                                type="datetime-local"
                                value={formData.releaseDate}
                                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-base focus:border-white/50 focus:outline-none transition-colors dark-calendar"
                            />
                        </div>
                        <div className="flex items-center gap-4 border border-white/10 rounded-xl p-4 bg-white/5">
                            <input
                                type="checkbox"
                                id="isLive"
                                checked={formData.isLive}
                                onChange={(e) => setFormData({ ...formData, isLive: e.target.checked })}
                                className="w-6 h-6 rounded border-white/30 bg-black/50 text-red-600 focus:ring-red-500"
                            />
                            <label htmlFor="isLive" className="font-bold cursor-pointer">
                                This is a LIVE Broadcast
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:bg-gray-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Publish Episode"}
                    </button>
                </form>
            </div>

            <style jsx>{`
        .dark-calendar::-webkit-calendar-picker-indicator {
            filter: invert(1);
            cursor: pointer;
        }
      `}</style>
        </div>
    );
}
