"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Upload, Loader2, Layers } from "lucide-react";
import { SpaceBackground } from "@/components/SpaceBackground";
import UploadField from "@/components/UploadField";

export default function CreateShowPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        coverUrl: "",
        schedule: "",
        credits: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/chans/shows", {
                method: "POST",
                body: JSON.stringify(formData),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                router.push("/dashboard/channel");
            } else {
                alert("Failed to create show");
            }
        } catch (error) {
            console.error(error);
            alert("Error creating show");
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
                    <ChevronLeft className="w-5 h-5" /> Cancel
                </button>

                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <Layers className="w-8 h-8 text-blue-400" />
                    New Show Concept
                </h1>
                <p className="text-white/50 mb-8">Define a new series or program for your channel.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-white/70">Show Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Cooking with Stars"
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-lg focus:border-white/50 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-white/70">Synopsis / Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Briefly describe the concept of this show..."
                            rows={4}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-base focus:border-white/50 focus:outline-none transition-colors"
                        />
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:bg-gray-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Create Show"}
                    </button>
                </form>
            </div>
        </div>
    );
}
