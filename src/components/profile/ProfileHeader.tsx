"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";

type ProfileHeaderProps = {
    profile: {
        id?: string; // userId needed for actions
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
        onOpenFollowers?: () => void;
        onOpenFollowing?: () => void;
    };
};

export default function ProfileHeader({ profile, isOwnProfile, stats }: ProfileHeaderProps) {
    const coverUrl = profile.coverVideoUrl || profile.coverImageUrl;
    const isVideo = !!profile.coverVideoUrl;
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleAction = async (action: 'BLOCK' | 'GHOST') => {
        setIsMenuOpen(false);
        if (!profile.id) return;

        try {
            const res = await fetch('/api/users/relations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: profile.id, action })
            });
            if (res.ok) {
                alert(`User ${action === 'BLOCK' ? 'Blocked' : 'Ghosted'}!`);
            } else {
                console.error('Action failed');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const avatarSrc = useMemo(
        () =>
            profile.avatarUrl ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                profile.displayName || profile.name || "U"
            )}`,
        [profile.avatarUrl, profile.displayName, profile.name]
    );

    return (
        <div className="relative pb-4 bg-transparent">
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
                            <h1 className="text-3xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                                {profile.displayName || profile.name}
                                {profile.tags && <span className="text-xs font-normal px-2 py-0.5 bg-white/20 rounded-full text-white">{profile.tags}</span>}
                            </h1>
                            <p className="text-gray-300 font-medium">@{profile.name?.toLowerCase().replace(/\s/g, '')}</p>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-3">
                            {isOwnProfile ? (
                                <>
                                    <button
                                        onClick={stats?.onOpenCard}
                                        className="px-6 py-2.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold transition-all flex items-center gap-2"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Profile Card
                                    </button>
                                    <Link
                                        href="/profile/setup"
                                        className="px-6 py-2.5 rounded-full border border-white text-white font-bold hover:bg-white hover:text-black transition-all"
                                    >
                                        Edit Profile
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <button className="px-8 py-2.5 rounded-full bg-white text-black font-bold hover:opacity-90 transition-all shadow-md">
                                        Follow
                                    </button>
                                    {/* Action Menu */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                                            className="p-2.5 rounded-full border border-white/20 hover:bg-white/10 transition-all text-white"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                        </button>

                                        {isMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-48 bg-black border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                                <button
                                                    onClick={() => handleAction('GHOST')}
                                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white font-bold transition-colors uppercase tracking-wide flex items-center gap-2"
                                                >
                                                    👻 Ghost User
                                                </button>
                                                <button
                                                    onClick={() => handleAction('BLOCK')}
                                                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 font-bold transition-colors uppercase tracking-wide flex items-center gap-2"
                                                >
                                                    🚫 Block User
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl space-y-4">
                    <p className="text-white whitespace-pre-wrap leading-relaxed">
                        {profile.bio || "No bio yet."}
                    </p>

                    <div className="flex flex-wrap gap-6 text-sm text-gray-300">
                        {profile.location && (
                            <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                {profile.location}
                            </div>
                        )}
                        {/* Stats Row */}
                        {stats && (
                            <>
                                <div><strong className="text-white">{stats.posts}</strong> Posts</div>
                                <button
                                    onClick={stats.onOpenFollowers}
                                    disabled={!stats.onOpenFollowers}
                                    className={`text-left hover:text-white transition-colors ${stats.onOpenFollowers ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    <strong className="text-white">{stats.followers}</strong> Followers
                                </button>
                                <button
                                    onClick={stats.onOpenFollowing}
                                    disabled={!stats.onOpenFollowing}
                                    className={`text-left hover:text-white transition-colors ${stats.onOpenFollowing ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    <strong className="text-white">{stats.following}</strong> Following
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
