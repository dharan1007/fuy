"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileActionsProps {
    targetUserId: string;
    initialStatus: "PENDING" | "ACCEPTED" | "NONE";
    isPrivate: boolean;
}

export default function ProfileActions({ targetUserId, initialStatus, isPrivate }: ProfileActionsProps) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleFollow() {
        setLoading(true);
        try {
            const res = await fetch("/api/friends/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId }),
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

    async function handleUnfollow() {
        if (!confirm("Are you sure you want to remove this friend?")) return;
        setLoading(true);
        try {
            // We need to find the friendship ID first or have an API that takes userId
            // For simplicity, assuming an API that takes targetUserId exists or we use the generic remove
            // Actually, existing API /api/friends/remove takes friendshipId. 
            // Let's assume we create a new convenience route or use the request route to toggle?
            // Better: Create a specific endpoint or just use the existing one if we had the ID.
            // Since we don't have the ID handy here without fetching, let's assume a new endpoint 
            // or we pass the ID. For now, I'll implement a simple "remove by user ID" API or 
            // just disable unfollow for this iteration if too complex. 
            // Wait, the user requirement is "send a follow request". 
            // I will focus on the FOLLOW action.
            alert("Unfollow not implemented in this view yet.");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (status === "ACCEPTED") {
        return (
            <button disabled className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium opacity-90 cursor-default">
                Friends
            </button>
        );
    }

    if (status === "PENDING") {
        return (
            <button disabled className="px-4 py-2 bg-stone-500 text-white rounded-lg font-medium opacity-90 cursor-default">
                Requested
            </button>
        );
    }

    return (
        <button
            onClick={handleFollow}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
            {loading ? "Sending..." : "Follow"}
        </button>
    );
}
