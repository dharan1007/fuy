"use client";

import { useSession } from "@/hooks/use-session";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SpaceBackground } from "@/components/SpaceBackground";
import { ChevronLeft, Save, Trash2, AlertCircle, Loader2 } from "lucide-react";
import UploadField from "@/components/UploadField";

export default function ChannelSettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [channel, setChannel] = useState<any>(null);
    const [formData, setFormData] = useState({
        channelName: "",
        description: "",
        coverImageUrl: "",
        showOnProfile: false
    });

    useEffect(() => {
        if (session) fetchChannel();
    }, [session]);

    async function fetchChannel() {
        try {
            const res = await fetch("/api/chans/mine");
            if (res.ok) {
                const data = await res.json();
                setChannel(data);
                setFormData({
                    channelName: data.channelName || "",
                    description: data.description || "",
                    coverImageUrl: data.coverImageUrl || "",
                    showOnProfile: data.showOnProfile || false
                });
            }
        } catch (error) {
            console.error("Failed to fetch channel", error);
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/chans/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push("/dashboard/channel");
            } else {
                alert("Failed to update channel settings");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading" || loading) return <LoadingSpinner message="Calibrating Frequencies..." />;

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    if (!channel) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <SpaceBackground />
                <div className="relative z-10 text-center">
                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">No Channel Found</h2>
                    <p className="text-white/50 mb-6">You need to create a channel first.</p>
                    <button
                        onClick={() => router.push("/dashboard/channel/create")}
                        className="px-6 py-2 bg-white text-black font-bold rounded-xl"
                    >
                        Create Channel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-black text-white font-sans relative overflow-x-hidden">
            <SpaceBackground />

            {/* Header */}
            <div className="relative z-10 w-full px-8 py-6 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-white/50 hover:text-white" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-white">Channel Settings</h1>
                        <p className="text-white/40 text-xs font-mono">Broadcast Configuration</p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-10">
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Channel Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-white/60">Channel Name</label>
                        <input
                            type="text"
                            required
                            value={formData.channelName}
                            onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-lg focus:border-white/30 focus:outline-none transition-all"
                            placeholder="Enter channel name"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-white/60">Bio / Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-base focus:border-white/30 focus:outline-none transition-all"
                            placeholder="Tell your audience about your channel"
                        />
                    </div>

                    {/* Cover Image */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-white/60">Cover Frequency (Banner)</label>
                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5 relative group">
                            {formData.coverImageUrl ? (
                                <>
                                    <img
                                        src={formData.coverImageUrl}
                                        alt="Cover"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, coverImageUrl: "" })}
                                            className="p-3 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full p-4 flex items-center justify-center">
                                    <UploadField
                                        onUpload={(res) => setFormData({ ...formData, coverImageUrl: res.url })}
                                        accept="image/*"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Show on Profile Toggle */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                        <div>
                            <h4 className="text-white font-bold uppercase tracking-tight">Tag on Profile</h4>
                            <p className="text-white/40 text-xs mt-1">Feature this channel on your public profile and profile card.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, showOnProfile: !formData.showOnProfile })}
                            className={`w-14 h-8 rounded-full transition-all duration-300 relative ${formData.showOnProfile ? 'bg-white' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-transform duration-300 ${formData.showOnProfile ? 'translate-x-6 bg-black' : 'bg-white/40'}`} />
                        </button>
                    </div>

                    {/* Submit */}
                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save className="w-5 h-5" /> Update Broadcasting Signature</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
