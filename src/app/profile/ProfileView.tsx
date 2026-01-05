"use client";

import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import UserListModal from "@/components/UserListModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ProfilePostsGrid from "@/components/profile/ProfilePostsGrid";
import { SpaceBackground } from "@/components/SpaceBackground";

const ProfileCardModal = dynamic(() => import("@/components/profile/ProfileCardModal").then(mod => mod.ProfileCardModal), { ssr: false });
import ProfileDetailsSection from "@/components/profile/ProfileDetailsSection";
import FloatingNavBar from "@/components/FloatingNavBar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Media = { type: "IMAGE" | "VIDEO" | "AUDIO"; url: string };
type Post = { id: string; content: string; visibility: string; feature: string; createdAt: string; media: Media[] };

export default function ProfileView() {
  const { data, mutate, isLoading } = useSWR("/api/profile", fetcher);
  const router = useRouter();

  // Followers/Following modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false); // New State

  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followersError, setFollowersError] = useState<string | null>(null);
  const [followingError, setFollowingError] = useState<string | null>(null);

  if (isLoading || !data) return <div className="p-6">Loading…</div>;
  if (data.error) return <div className="p-6 text-red-600">{data.error}</div>;

  const profile = data.profile || {};
  const stats = data.stats || { friends: 0, posts: 0, followers: 0, following: 0 };

  // Inject handler
  const headerStats = { ...stats, onOpenCard: () => setShowCardModal(true) };

  // Fetch followers
  const fetchFollowers = async () => {
    setLoadingFollowers(true);
    setFollowersError(null);
    try {
      const response = await fetch('/api/followers');
      const data = await response.json();
      if (response.ok) {
        setFollowersList(data.followers || []);
      } else {
        setFollowersList([]);
        setFollowersError(data.error || 'Failed to load followers');
      }
      setShowFollowersModal(true);
    } catch (err) {
      setFollowersList([]);
      setFollowersError('Failed to load followers');
      setShowFollowersModal(true);
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Fetch following
  const fetchFollowing = async () => {
    setLoadingFollowing(true);
    setFollowingError(null);
    try {
      const response = await fetch('/api/following');
      const data = await response.json();
      if (response.ok) {
        setFollowingList(data.following || []);
      } else {
        setFollowingList([]);
        setFollowingError(data.error || 'Failed to load following');
      }
      setShowFollowingModal(true);
    } catch (err) {
      setFollowingList([]);
      setFollowingError('Failed to load following');
      setShowFollowingModal(true);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });
      if (response.ok) {
        setFollowersList((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
        setFollowingList((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
        mutate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Unread Counts
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const fetchUnreadCounts = async () => {
    try {
      const [notifRes, chatRes] = await Promise.all([
        fetch("/api/notifications?unreadOnly=true"),
        fetch("/api/chat/unread")
      ]);
      if (notifRes.ok && chatRes.ok) {
        const notifData = await notifRes.json();
        const chatData = await chatRes.json();
        setUnreadCount(notifData.notifications?.length || 0);
        setUnreadMessageCount(chatData.count || 0);
      }
    } catch (e) {
      console.error("Failed to fetch unread counts", e);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    // Poll every 30s
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black relative pb-20 text-white">
      <SpaceBackground />
      <AppHeader title="Profile" showSettingsAndLogout />

      {/* Header */}
      <ProfileHeader
        profile={profile}
        isOwnProfile={true}
        stats={headerStats}
      />

      {/* Profile Card Modal */}
      <ProfileCardModal
        isOpen={showCardModal}
        closeModal={() => setShowCardModal(false)}
        profile={profile}
        isOwnProfile={true}
      />

      {/* Content card */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-12 relative z-10">
        {/* Posts */}
        <section className="mb-12">
          <ProfileDetailsSection profile={profile} />
          <ProfilePostsGrid
            posts={(data?.posts || []).map((p: any) => ({
              ...p,
              // Ensure dates are strings or Date objects as expected
              createdAt: p.createdAt
            }))}
            isMe={true}
            userId={data.id} // Assuming the API returns the user object with ID
            onActionComplete={() => mutate()} // Revalidate SWR cache after actions
          />
        </section>

        {/* My Brands */}
        <MyBrandsSection />
      </div>

      {/* Floating Nav Bar */}
      <FloatingNavBar
        unreadCount={unreadCount}
        unreadMessageCount={unreadMessageCount}
        onClearUnread={() => setUnreadCount(0)}
      />

      {/* Modals */}
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
    </div>
  );
}

function MyBrandsSection() {
  const { data, error } = useSWR('/api/shop/brands?mine=true', fetcher);
  const router = useRouter();

  const brands = data?.brands;

  if (!brands || brands.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4 text-white">My Brands</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand: any) => (
          <div
            key={brand.id}
            onClick={() => router.push(`/shop/brand/${brand.slug}/dashboard`)}
            className="cursor-pointer rounded-xl border border-white/10 bg-white/5 shadow-sm p-5 hover:shadow-md transition-all flex items-center gap-4 hover:bg-white/10"
          >
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold text-white">
                {brand.name[0]}
              </div>
            )}
            <div>
              <h3 className="font-bold text-white">{brand.name}</h3>
              <p className="text-xs text-gray-400">Manage Brand →</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
