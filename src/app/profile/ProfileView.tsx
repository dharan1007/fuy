"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import UserListModal from "@/components/UserListModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ProfileCardModal = dynamic(() => import("@/components/profile/ProfileCardModal").then(mod => mod.ProfileCardModal), { ssr: false });

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

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-white dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 pb-20">
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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-12">
        {/* Posts */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Your Recent Posts</h2>
          {data?.posts && (data.posts as Post[]).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(data.posts as Post[]).map((p) => (
                <article
                  key={p.id}
                  className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm dark:shadow-lg p-5 hover:shadow-md dark:hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                      {p.feature}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{p.visibility}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 mb-3 line-clamp-4">
                    {p.content}
                  </p>
                  {p.media?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {p.media.map((m, i) =>
                        m.type === "IMAGE" ? (
                          <img
                            key={i}
                            src={m.url}
                            alt="Post media"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        ) : m.type === "VIDEO" ? (
                          <video
                            key={i}
                            src={m.url}
                            className="w-full h-48 object-cover rounded-lg"
                            controls
                            playsInline
                          />
                        ) : null
                      )}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/50 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-500 dark:text-gray-400">No posts yet</p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Start sharing your journey!</p>
            </div>
          )}
        </section>

        {/* My Brands */}
        <MyBrandsSection />
      </div>

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
  const { data: brands, error } = useSWR('/api/shop/brands?mine=true', fetcher);
  const router = useRouter();

  if (!brands || brands.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">My Brands</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand: any) => (
          <div
            key={brand.id}
            onClick={() => router.push(`/shop/brand/${brand.slug}/dashboard`)}
            className="cursor-pointer rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm p-5 hover:shadow-md transition-all flex items-center gap-4"
          >
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-bold">
                {brand.name[0]}
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{brand.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manage Brand →</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
