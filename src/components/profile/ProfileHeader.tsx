"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";

type ProfileHeaderProps = {
    profile: {
        displayName?: string | null;
        name?: string | null;
        avatarUrl?: string | null;
        coverVideoUrl?: string | null;
        coverImageUrl?: string | null;
        bio?: string | null;
        location?: string | null;
        tags?: string | null;
    };
    isOwnProfile: boolean;
    stats?: {
        followers: number;
        following: number;
        posts: number;
        onOpenCard?: () => void;
    };
};

export default function ProfileHeader({ profile, isOwnProfile, stats }: ProfileHeaderProps) {
    const coverUrl = profile.coverVideoUrl || profile.coverImageUrl;
    const isVideo = !!profile.coverVideoUrl;

    const avatarSrc = useMemo(
        () =>
            profile.avatarUrl ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                profile.displayName || profile.name || "U"
            )}`,
        [profile.avatarUrl, profile.displayName, profile.name]
    );

    return (
        <div className="relative pb-4 bg-white dark:bg-neutral-900 shadow-sm">
            {/* Cover Area */}
            <div className="relative h-56 md:h-80 w-full overflow-hidden bg-gray-200 dark:bg-neutral-800 group">
                {coverUrl ? (
                    isVideo ? (
                        <video
                            src={coverUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                        />
                    ) : (
                        <img
                            src={coverUrl}
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                    )
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-neutral-800 via-neutral-900 to-black" />
                )}
            </div>

            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-end gap-6 mb-6">
                    {/* Avatar */}
                    <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full ring-4 ring-white dark:ring-neutral-900 overflow-hidden bg-black shadow-2xl z-10">
                        <img
                            src={avatarSrc}
                            alt={profile.displayName || "Profile"}
                            className="h-full w-full object-cover"
                        />
                    </div>

                    {/* Action Buttons (Right Side) */}
                    <div className="flex-1 w-full sm:w-auto flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">

                        {/* Name & Bio */}
                        <div className="text-center sm:text-left mb-2 sm:mb-0">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                                {profile.displayName || profile.name}
                                {profile.tags && <span className="text-xs font-normal px-2 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded-full text-gray-500">{profile.tags}</span>}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">@{profile.name?.toLowerCase().replace(/\s/g, '')}</p>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-3">
                            {isOwnProfile ? (
                                <>
                                    <button
                                        onClick={stats?.onOpenCard}
                                        className="px-6 py-2.5 rounded-full border-2 border-transparent bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center gap-2"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Profile Card
                                    </button>
                                    <Link
                                        href="/profile/setup"
                                        className="px-6 py-2.5 rounded-full border-2 border-black dark:border-white text-black dark:text-white font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                                    >
                                        Edit Profile
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <button className="px-8 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold hover:opacity-90 transition-all shadow-md">
                                        Follow
                                    </button>
                                    <button className="p-2.5 rounded-full border border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bio & Details */}
                <div className="max-w-3xl space-y-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {profile.bio || "No bio yet."}
                    </p>

                    <div className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
                        {profile.location && (
                            <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                {profile.location}
                            </div>
                        )}
                        {/* Stats Row */}
                        {stats && (
                            <>
                                <div><strong className="text-gray-900 dark:text-white">{stats.posts}</strong> Posts</div>
                                <div><strong className="text-gray-900 dark:text-white">{stats.followers}</strong> Followers</div>
                                <div><strong className="text-gray-900 dark:text-white">{stats.following}</strong> Following</div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
