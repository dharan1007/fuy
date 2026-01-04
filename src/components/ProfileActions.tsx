"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProfileActionsProps {
    targetUserId: string;
    initialStatus: "PENDING" | "ACCEPTED" | "NONE" | "ME";
    isPrivate: boolean;
}

export default function ProfileActions({ targetUserId, initialStatus, isPrivate }: ProfileActionsProps) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    // Fetch actual status on mount (since page is cached public)
    useEffect(() => {
        // Only fetch if initial was NONE (default for public cache)
        if (initialStatus === "NONE") {
            fetch(`/api/friends/check?userId=${targetUserId}`).then(async res => {
                if (res.ok) {
                    const data = await res.json();
                    if (data.status) setStatus(data.status);
                }
            }).catch(() => { });
        }
    }, [targetUserId, initialStatus]);

    async function handleFollow() {
        setLoading(true);
        try {
            const res = await fetch("/api/friends/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendId: targetUserId }),
            });
            if (res.ok) {
                setStatus("PENDING");
                router.refresh();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const handleAction = async (action: 'BLOCK' | 'GHOST') => {
        setIsMenuOpen(false);

        try {
            const res = await fetch('/api/friends/relations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, action })
            });
            if (res.ok) {
                alert(`User ${action === 'BLOCK' ? 'Blocked' : 'Ghosted'}!`);
                // Optionally redirect or refresh
                router.refresh();
            } else {
                console.error('Action failed');
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {status === "ME" ? (
                <button
                    onClick={() => router.push('/profile/edit')}
                    className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold transition-colors shadow-md border border-stone-800"
                >
                    Edit Profile
                </button>
            ) : status === "ACCEPTED" ? (
                <button disabled className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium opacity-90 cursor-default shadow-md">
                    Friends
                </button>
            ) : status === "PENDING" ? (
                <button disabled className="px-4 py-2 bg-stone-500 text-white rounded-lg font-medium opacity-90 cursor-default shadow-md">
                    Requested
                </button>
            ) : (
                <button
                    onClick={handleFollow}
                    disabled={loading}
                    className="px-6 py-2 bg-white hover:bg-gray-200 text-black rounded-lg font-bold transition-colors disabled:opacity-50 shadow-md"
                >
                    {loading ? "Sending..." : "Follow"}
                </button>
            )}

            {/* Action Menu */}
            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
                    title="More options"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-black border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-md">
                        <button
                            onClick={() => handleAction('GHOST')}
                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white font-bold transition-colors uppercase tracking-wide flex items-center gap-2"
                        >
                            <span className="text-lg">👻</span> Ghost User
                        </button>
                        <button
                            onClick={() => handleAction('BLOCK')}
                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 font-bold transition-colors uppercase tracking-wide flex items-center gap-2"
                        >
                            <span className="text-lg">🚫</span> Block User
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
