"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, X, Upload, Clock, Globe, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import StoryCircle from "@/components/Feed/StoryCircle";
import { createPortal } from "react-dom";

// ------------------------------------
// Internal CreateStoryModal Component
// ------------------------------------
interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

function CreateStoryModal({ isOpen, onClose, onCreated }: CreateStoryModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [duration, setDuration] = useState(24);
    const [visibility, setVisibility] = useState("PUBLIC");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Cleanup preview URL to prevent memory leaks and blob errors
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    if (!isOpen || !mounted) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        try {
            // 1. Upload File
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", file.type.startsWith("video") ? "video" : "image");

            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();
            const fileUrl = uploadData.url;

            // 2. Create Post (Clock/Story)
            const postRes = await fetch("/api/stories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mediaUrl: fileUrl,
                    mediaType: file.type.startsWith("video") ? "VIDEO" : "IMAGE",
                    duration, // in hours
                    visibility,
                }),
            });

            if (postRes.ok) {
                onCreated();
                handleClose();
            }
        } catch (e) {
            console.error(e);
            alert("Failed to create story");
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-[#1a1a1a] z-10">
                    <h3 className="font-bold text-white">Add to Clock</h3>
                    <button onClick={handleClose} className="text-white/60 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center overflow-y-auto custom-scrollbar">
                    {!preview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-[9/16] bg-white/5 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors shrink-0 min-h-[300px]"
                        >
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                                <Upload size={32} />
                            </div>
                            <p className="text-white/80 font-medium">Click to upload photo or video</p>
                            <p className="text-white/40 text-sm mt-2">Supports JPG, PNG, MP4</p>
                        </div>
                    ) : (
                        <div className="w-full aspect-[9/16] relative rounded-xl overflow-hidden bg-black mb-4 shrink-0 shadow-lg">
                            {file?.type.startsWith('video') ? (
                                <video src={preview} className="w-full h-full object-cover" controls />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            )}
                            <button
                                onClick={() => { setFile(null); setPreview(null); }}
                                className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {/* Settings */}
                    <div className="w-full space-y-6 mt-6 shrink-0 pb-4">
                        {/* Duration */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-white/80 font-medium">
                                <span className="flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Duration</span>
                                <span className="text-blue-400">{duration} Hours</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="48"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-white/40">
                                <span>1h</span>
                                <span>24h</span>
                                <span>48h</span>
                            </div>
                        </div>

                        {/* Visibility */}
                        <div className="space-y-3">
                            <span className="text-sm text-white/80 font-medium block">Visibility</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setVisibility("PUBLIC")}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2 ${visibility === "PUBLIC" ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]" : "bg-white/5 border-transparent text-white/60 hover:bg-white/10"}`}
                                >
                                    <Globe size={16} /> Public
                                </button>
                                <button
                                    onClick={() => setVisibility("FRIENDS")}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2 ${visibility === "FRIENDS" ? "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "bg-white/5 border-transparent text-white/60 hover:bg-white/10"}`}
                                >
                                    <Users size={16} /> Friends
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end shrink-0 bg-[#1a1a1a] z-10">
                    <button
                        disabled={!file || uploading}
                        onClick={handleUpload}
                        className="bg-white text-black px-8 py-2.5 rounded-xl font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 text-sm"
                    >
                        {uploading ? "Posting..." : "Share Clock"}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

// ------------------------------------
// StoriesRail Component
// ------------------------------------
interface StoryUser {
    id: string;
    profile?: {
        displayName: string | null;
        avatarUrl: string | null;
    };
}

interface StoryGroup {
    user: StoryUser;
    stories: any[];
    hasUnseen: boolean;
    latestCreatedAt: string;
}

export default function StoriesRail() {
    const { data: session } = useSession();
    const [stories, setStories] = useState<StoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    useEffect(() => {
        if (session?.user) {
            fetchStories();
        }
    }, [session]);

    const fetchStories = async () => {
        try {
            const res = await fetch("/api/stories");
            if (res.ok) {
                const data = await res.json();
                setStories(data);
            }
        } catch (e) {
            console.error("Failed to fetch stories", e);
        } finally {
            setLoading(false);
        }
    };

    const currentUser = session?.user;
    const userHasStory = stories.some((s) => s.user.id === currentUser?.id);

    return (
        <div className="relative mb-6">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {/* Create Clock Button (My Clock) */}
                <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group relative">
                    <div className="relative" onClick={() => userHasStory ? (window.location.href = `/stories/${currentUser?.id}`) : setIsCreateOpen(true)}>
                        {/* My Clock Ring: White if active, Dark/Border if empty or seen */}
                        <div className={`w-16 h-16 rounded-full p-[2px] mb-1 transition-all ${userHasStory ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "bg-transparent border border-white/20"}`}>
                            <div className="w-full h-full rounded-full border-2 border-black overflow-hidden relative bg-black">
                                <img
                                    src={currentUser?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.email}`}
                                    alt="My Clock"
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                    </div>
                    {/* Plus Button - Always accessible to add more */}
                    <div
                        className="absolute bottom-6 right-0 bg-blue-500 rounded-full p-1 border-2 border-black text-white hover:scale-110 transition-transform z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCreateOpen(true);
                        }}
                    >
                        <Plus size={12} strokeWidth={4} />
                    </div>

                    <span className="text-xs text-white/80 font-medium truncate max-w-[70px]">Your Clock</span>
                </div>

                {/* Stories List */}
                {stories.filter(s => s.user.id !== currentUser?.id).map((group) => (
                    <StoryCircle key={group.user.id} group={group} />
                ))}

                {loading && (
                    // Skeletons
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col items-center gap-2 shrink-0 animate-pulse">
                            <div className="w-16 h-16 rounded-full bg-white/10" />
                            <div className="w-12 h-2 rounded bg-white/10" />
                        </div>
                    ))
                )}
            </div>

            <CreateStoryModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchStories} />
        </div>
    );
}
