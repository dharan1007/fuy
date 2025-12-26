"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Share2, Send, Check } from "lucide-react";

export default function StoryViewerPage() {
    const params = useParams(); // { userId }
    const router = useRouter();
    const [stories, setStories] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Reply / Share State
    const [replyText, setReplyText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [shareMode, setShareMode] = useState(false); // false = Reply, true = Share

    // Followers State
    const [followers, setFollowers] = useState<any[]>([]);
    const [followersLoading, setFollowersLoading] = useState(false);
    const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchUserStories = async () => {
            try {
                const res = await fetch("/api/stories");
                if (res.ok) {
                    const data = await res.json();
                    const userGroup = data.find((g: any) => g.user.id === params.userId);
                    if (userGroup) {
                        setStories(userGroup.stories);
                        setUser(userGroup.user);
                    } else {
                        router.push("/"); // Redirect if not found
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (params.userId) {
            fetchUserStories();
        }
    }, [params.userId, router]);

    // Fetch followers when Share Mode is activated
    useEffect(() => {
        if (shareMode && followers.length === 0) {
            setFollowersLoading(true);
            fetch("/api/followers")
                .then(res => res.json())
                .then(data => {
                    setFollowers(data.followers || []);
                })
                .catch(err => console.error(err))
                .finally(() => setFollowersLoading(false));
        }
    }, [shareMode, followers.length]);

    // Auto-advance & Progress
    const [progress, setProgress] = useState(0);
    const STORY_DURATION = 5000; // 5 seconds for images

    useEffect(() => {
        if (!stories.length || shareMode || replyText) return;

        const currentStory = stories[currentIndex];
        const isVideo = currentStory.media?.[0]?.type === 'VIDEO';

        // Reset progress on story change
        setProgress(0);

        if (isVideo) {
            // For video, we handle progress in onTimeUpdate of the video element
            // and onEnded for next track. We don't use a timer here.
            return;
        }

        // For Images: Manual Timer with animation frame or interval for smooth progress
        const start = Date.now();
        const duration = STORY_DURATION;

        const timer = setInterval(() => {
            const elapsed = Date.now() - start;
            const p = Math.min((elapsed / duration) * 100, 100);
            setProgress(p);

            if (elapsed >= duration) {
                clearInterval(timer);
                if (currentIndex < stories.length - 1) {
                    setCurrentIndex(c => c + 1);
                } else {
                    router.push("/");
                }
            }
        }, 50); // Update every 50ms

        return () => clearInterval(timer);
    }, [currentIndex, stories.length, shareMode, replyText, router]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    if (!stories.length) return null;

    const currentStory = stories[currentIndex];
    const mediaItem = currentStory.media?.[0];
    const isVideo = mediaItem?.type === 'VIDEO';

    // Handle Selection of Followers
    const toggleFollower = (followerId: string) => {
        const newSet = new Set(selectedFollowers);
        if (newSet.has(followerId)) newSet.delete(followerId);
        else newSet.add(followerId);
        setSelectedFollowers(newSet);
    };

    const handleSendAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSending) return;

        setIsSending(true);
        try {
            const messageContent = shareMode
                ? `Check out this Clock by ${user.profile.displayName}:\n ${window.location.origin}/stories/${user.id}`
                : replyText; // Just the text, we attach image via mediaUrl

            let targets = shareMode ? Array.from(selectedFollowers) : [user.id];

            if (shareMode && targets.length === 0) {
                alert("Select at least one follower to share with.");
                setIsSending(false);
                return;
            }

            // Loop and send (for MVP, sequential is fine)
            for (const targetId of targets) {
                // 1. Get/Create Conversation
                const convRes = await fetch("/api/chat/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ targetUserId: targetId }),
                });
                if (!convRes.ok) continue; // Skip failed
                const { conversation } = await convRes.json();

                // 2. Send Message
                // If it's a SHARE, we send the link (TEXT).
                // If it's a REPLY, we send the media (IMAGE/VIDEO) + Content.
                const payload: any = {
                    conversationId: conversation.id,
                    content: messageContent,
                };

                if (!shareMode) {
                    // It's a reply: Attach the clock media
                    // We treat it as an 'image' or 'video' message so the chat renders it.
                    // Prefixed content to indicate it's a reply
                    payload.content = `Replying to your Clock: ${replyText}`;
                    payload.type = isVideo ? 'video' : 'image';
                    payload.mediaUrl = mediaItem?.url;
                }

                await fetch("/api/chat/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            if (shareMode) {
                setShareMode(false);
                setSelectedFollowers(new Set());
                alert("Shared successfully!");
            } else {
                setReplyText("");
                alert("Reply sent!");
            }

        } catch (err) {
            console.error(err);
            alert("Failed to send.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
            {/* Header / Progress */}
            <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-12 bg-gradient-to-b from-black/70 to-transparent flex flex-col gap-2">
                <div className="flex gap-1 h-1">
                    {stories.map((_, idx) => (
                        <div key={idx} className="flex-1 bg-white/20 rounded-full overflow-hidden h-1">
                            <div
                                className={`h-full bg-white transition-all ease-linear ${idx < currentIndex ? "w-full duration-0" :
                                    idx === currentIndex ? "duration-100" : // Smooth updates for current
                                        "w-0 duration-0"
                                    }`}
                                style={{ width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' }}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mt-2">
                    {/* ... (User info) ... */}
                    <div className="flex items-center gap-3 text-white">
                        <img
                            src={user?.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                            className="w-10 h-10 rounded-full border border-white/20"
                        />
                        <div>
                            <p className="font-bold text-sm drop-shadow-md">{user?.profile?.displayName}</p>
                            <p className="text-xs opacity-70 drop-shadow-md">{new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                setShareMode(!shareMode);
                                setReplyText("");
                            }}
                            className={`text-white hover:opacity-70 drop-shadow-md ${shareMode ? 'text-red-500 scale-110' : ''}`}
                        >
                            <Share2 size={24} />
                        </button>

                        <button onClick={() => router.push("/")} className="text-white hover:opacity-70 drop-shadow-md">
                            <X size={28} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Media Content */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden w-full h-full">
                {isVideo ? (
                    <video
                        src={mediaItem?.url}
                        className="w-full h-full object-contain"
                        autoPlay
                        // Remove controls, we use custom progress
                        controls={false}
                        loop={false}
                        onTimeUpdate={(e) => {
                            if (shareMode || replyText) return;
                            const vid = e.currentTarget;
                            if (vid.duration) {
                                const p = (vid.currentTime / vid.duration) * 100;
                                setProgress(p);
                            }
                        }}
                        onEnded={() => {
                            if (currentIndex < stories.length - 1) setCurrentIndex(c => c + 1);
                            else router.push("/");
                        }}
                    />
                ) : (
                    <img
                        src={mediaItem?.url}
                        className="w-full h-full object-contain"
                        alt="Clock Content"
                        onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/400x800?text=Error+Loading+Image";
                        }}
                    />
                )}

                {/* Navigation Overlays */}
                <div className="absolute inset-0 flex z-10">
                    <div className="w-1/3 h-full cursor-pointer" onClick={() => !shareMode && currentIndex > 0 && setCurrentIndex(c => c - 1)} />
                    <div className="w-1/3 h-full cursor-pointer" onClick={() => {/* Pause logic could go here */ }} />
                    <div className="w-1/3 h-full cursor-pointer" onClick={() => {
                        if (!shareMode) {
                            if (currentIndex < stories.length - 1) setCurrentIndex(c => c + 1);
                            else router.push("/");
                        }
                    }} />
                </div>

                {/* Right Arrow (Keep existing) */}
                {!shareMode && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (currentIndex < stories.length - 1) setCurrentIndex(c => c + 1);
                            else router.push("/");
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 p-2 rounded-full"
                    >
                        <ChevronRight size={32} />
                    </button>
                )}
            </div>

            {/* Share Modal & Reply Bar (Keep existing) */}
            {shareMode && (
                <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    {/* Modal Content */}
                    <div className="bg-neutral-900 rounded-3xl w-full max-w-sm flex flex-col overflow-hidden border border-white/10 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-neutral-800/50">
                            <h3 className="text-white font-bold text-lg">Share with...</h3>
                            <button
                                onClick={() => setShareMode(false)}
                                className="text-white/50 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Followers List */}
                        <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {followersLoading ? (
                                <div className="text-white/50 text-center py-8">Loading followers...</div>
                            ) : followers.length === 0 ? (
                                <div className="text-white/50 text-center py-8">No followers found.</div>
                            ) : (
                                followers.map((f: any) => {
                                    const isSelected = selectedFollowers.has(f.user.id);
                                    return (
                                        <div
                                            key={f.user.id}
                                            onClick={() => toggleFollower(f.user.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-red-900/40 border-red-500' : 'hover:bg-white/5 border-transparent'}`}
                                        >
                                            <div className="relative">
                                                <img
                                                    src={f.user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                                                    className="w-10 h-10 rounded-full bg-neutral-800 object-cover"
                                                />
                                                {isSelected && (
                                                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-neutral-900">
                                                        <Check size={10} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-white font-medium">{f.user.profile?.displayName || f.user.name}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-white/5 bg-neutral-800/50">
                            <button
                                onClick={handleSendAction}
                                disabled={selectedFollowers.size === 0 || isSending}
                                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                <Send size={18} className="text-white fill-white" />
                                {isSending ? 'Sending...' : `Send to ${selectedFollowers.size} people`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reply Bar (Only visible if not sharing) */}
            {!shareMode && (
                <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/90 to-transparent">
                    <form
                        onSubmit={handleSendAction}
                        className="flex gap-2 items-center w-full max-w-lg mx-auto"
                    >
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${user?.profile?.displayName || 'user'}...`}
                            className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all backdrop-blur-sm"
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        />
                        {replyText.trim() && (
                            <button
                                type="submit"
                                disabled={isSending}
                                // Updated to be White Circle with Red Icon (implied request) or sticking to Red branding?
                                // User said "send icon to white" and "in the circle change the black to white"
                                // I will make the Button Background WHITE and Icon RED.
                                className="bg-white p-3 rounded-full hover:scale-105 transition-transform disabled:opacity-50 border border-transparent shadow-lg"
                            >
                                <Send size={20} className="text-red-500" />
                            </button>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
}
