"use client";

import Link from "next/link";

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

export default function StoryCircle({ group }: { group: StoryGroup }) {
    // TODO: Logic for 'seen' using local storage or backend status
    const isUnseen = true;

    return (
        <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer">
            <Link href={`/stories/${group.user.id}`}>
                <div className={`w-16 h-16 rounded-full p-[2px] ${isUnseen ? "bg-gradient-to-tr from-yellow-400 to-fuchsia-600" : "bg-white/20"}`}>
                    <div className="w-full h-full rounded-full border-2 border-black overflow-hidden relative bg-black">
                        <img
                            src={group.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${group.user.profile?.displayName}`}
                            alt={group.user.profile?.displayName || "User"}
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
