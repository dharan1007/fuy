"use client";

import { useState } from "react";
import UserListModal from "@/components/UserListModal";

interface ProfileSocialStatsProps {
    userId: string;
    stats: {
        friends?: number;
        followers: number;
        following: number;
        posts: number;
    };
    isMe?: boolean;
}

export default function ProfileSocialStats({ userId, stats, isMe }: ProfileSocialStatsProps) {
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);

    // State for lists (fetched on demand like ProfileView)
    const [followersList, setFollowersList] = useState<any[]>([]);
    const [followingList, setFollowingList] = useState<any[]>([]);
    const [loadingFollowers, setLoadingFollowers] = useState(false);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [followersError, setFollowersError] = useState<string | null>(null);
    const [followingError, setFollowingError] = useState<string | null>(null);

    const fetchFollowers = async () => {
        setLoadingFollowers(true);
        setFollowersError(null);
        try {
            const response = await fetch(`/api/users/social?type=followers&userId=${userId}&limit=50`);
            const data = await response.json();
            if (response.ok) {
                setFollowersList(data.users || []);
            } else {
                setFollowersError(data.error || 'Failed to load followers');
            }
            setShowFollowersModal(true);
        } catch (err) {
            setFollowersError('Failed to load followers');
            setShowFollowersModal(true);
        } finally {
            setLoadingFollowers(false);
        }
    };

    const fetchFollowing = async () => {
        setLoadingFollowing(true);
        setFollowingError(null);
        try {
            const response = await fetch(`/api/users/social?type=following&userId=${userId}&limit=50`);
            const data = await response.json();
            if (response.ok) {
                setFollowingList(data.users || []);
            } else {
                setFollowingError(data.error || 'Failed to load following');
            }
            setShowFollowingModal(true);
        } catch (err) {
            setFollowingError('Failed to load following');
            setShowFollowingModal(true);
        } finally {
            setLoadingFollowing(false);
        }
    };

    // Handler for removing friend (only if isMe, but this component is usually for visitor. 
    // If used on MyProfile, we have ProfileView. 
    // But logically, if I look at my own profile via /profile/[id], I should be able to remove?
    // UserListModal handles isMe implicitly by checking friendship? No, UserListModal calling remove depends on prop.
    // Since this is generic stats, let's assume read-only/follow capability for now OR basic remove if owner.
    // For now, onRemoveFriend is mandatory. We can stub it or implement it.
    const handleRemoveFriend = async (friendshipId: string) => {
        // Implement if needed, or pass dummy if visitor view can't remove
        // If visiting another user, you can't remove THEIR followers.
        // So this is effectively read-only lists.
        return;
    };

    return (
        <>
            <div className="flex flex-wrap items-center gap-2 sm:gap-6 mb-6">
                <Stat label="Posts" value={stats.posts} />
                <Stat
                    label="Followers"
                    value={stats.followers}
                    onClick={fetchFollowers}
                    className="cursor-pointer hover:bg-white/20 transition-all active:scale-95"
                />
                <Stat
                    label="Following"
                    value={stats.following}
                    onClick={fetchFollowing}
                    className="cursor-pointer hover:bg-white/20 transition-all active:scale-95"
                />
            </div>

            <UserListModal
                isOpen={showFollowersModal}
                title="Followers"
                users={followersList}
                onClose={() => setShowFollowersModal(false)}
                onRemoveFriend={handleRemoveFriend}
                isLoading={loadingFollowers}
                error={followersError}
            />
            <UserListModal
                isOpen={showFollowingModal}
                title="Following"
                users={followingList}
                onClose={() => setShowFollowingModal(false)}
                onRemoveFriend={handleRemoveFriend}
                isLoading={loadingFollowing}
                error={followingError}
            />
        </>
    );
}

function Stat({ label, value, onClick, className }: { label: string; value: number; onClick?: () => void; className?: string }) {
    if (onClick) {
        return (
            <button
                onClick={onClick}
                className={`rounded-full bg-white/10 px-4 py-2 shadow text-sm border border-white/10 flex items-center gap-2 ${className}`}
            >
                <span className="font-semibold text-white">{value}</span> <span className="text-gray-300">{label}</span>
            </button>
        )
    }
    return (
        <div className="rounded-full bg-white/10 px-4 py-2 shadow text-sm border border-white/10 flex items-center gap-2">
            <span className="font-semibold text-white">{value}</span> <span className="text-gray-300">{label}</span>
        </div>
    );
}
