"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface StoryUser {
    id: string;
    profile?: {
        displayName: string | null;
        avatarUrl: string | null;
    };
    name?: string | null;
    email?: string | null;
}

interface StoryGroup {
    user: StoryUser;
    stories: any[];
    hasUnseen: boolean;
    latestCreatedAt: string;
}

export default function StoryCircle({ group }: { group: StoryGroup }) {
    // Basic "Seen" logic using localStorage
    // We compare the `latestCreatedAt` timestamp with what we have stored locally
    const storageKey = `story_seen_${group.user.id}`;
    const [isUnseen, setIsUnseen] = useState(false);

    useEffect(() => {
        const lastSeen = localStorage.getItem(storageKey);
        if (!lastSeen || new Date(lastSeen) < new Date(group.latestCreatedAt)) {
            setIsUnseen(true);
        } else {
            setIsUnseen(false);
        }
    }, [group.latestCreatedAt, storageKey]);

    const handleClick = () => {
        // Mark as seen when clicked
        localStorage.setItem(storageKey, new Date().toISOString());
        setIsUnseen(false);
    };

    return (
        <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer" onClick={handleClick}>
            <Link href={`/stories/${group.user.id}`}>
                {/* 
                    Outer Ring Logic:
                    - Unseen: White (bg-white)
                    - Seen: Black/Invisible (bg-black or transparent). User said "black".
                    The p-[2px] creates the gap if we use border.
                    Let's use a bg container for the ring.
                */}
                <div className={`w-16 h-16 rounded-full p-[2px] mb-1 transition-all ${isUnseen ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "bg-black border border-white/10"}`}>
                    <div className="w-full h-full rounded-full border-2 border-black overflow-hidden relative bg-black">
                        <img
                            src={group.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${group.user.email || group.user.profile?.displayName || group.user.name || "User"}`}
                            alt={group.user.profile?.displayName || group.user.name || "User"}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </Link>
            <span className="text-xs text-white/80 font-medium truncate max-w-[70px]">
                {group.user.profile?.displayName || "User"}
            </span>
        </div>
    );
}
