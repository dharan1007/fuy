// src/app/profile/_ProfileEditor.tsx
"use client";

import useSWR from "swr";
import { useMemo, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import UserListModal from "@/components/UserListModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Media = { type: "IMAGE" | "VIDEO" | "AUDIO"; url: string };
type Post = { id: string; content: string; visibility: string; feature: string; createdAt: string; media: Media[] };

export default function ProfileEditor() {
  const { data, mutate, isLoading } = useSWR("/api/profile", fetcher);
  const [saving, setSaving] = useState(false);

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const profile = data?.profile || {};
  const stats = data?.stats || { friends: 0, posts: 0 };

  const [localAvatar, setLocalAvatar] = useState<File | null>(null);
  const [localCover, setLocalCover] = useState<File | null>(null);

  // Followers/Following modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followersError, setFollowersError] = useState<string | null>(null);
  const [followingError, setFollowingError] = useState<string | null>(null);

  const avatarPreview = useMemo(
    () => (localAvatar ? URL.createObjectURL(localAvatar) : profile?.avatarUrl || ""),
    [localAvatar, profile?.avatarUrl]
  );
  const coverPreview = useMemo(
    () => (localCover ? URL.createObjectURL(localCover) : profile?.coverVideoUrl || ""),
    [localCover, profile?.coverVideoUrl]
  );

  if (isLoading || !data) return <div className="p-6">Loading…</div>;
  if (data.error) return <div className="p-6 text-red-600">{data.error}</div>;

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    if (localAvatar) fd.set("avatar", localAvatar);
    if (localCover) fd.set("cover", localCover);

    const res = await fetch("/api/profile", { method: "PUT", body: fd });
    setSaving(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed to save profile");
      return;
    }
    setLocalAvatar(null);
    setLocalCover(null);
    mutate();
  }

  // Fetch followers
  const fetchFollowers = async () => {
    setLoadingFollowers(true);
    setFollowersError(null);
    try {
      const response = await fetch('/api/followers');
      const data = await response.json();

      if (response.ok) {
        setFollowersList(data.followers || []);
        setFollowersError(null);
      } else {
        setFollowersList([]);
        setFollowersError(data.error || 'Failed to load followers');
      }
      setShowFollowersModal(true);
    } catch (err) {
      console.error('Error fetching followers:', err);
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
        setFollowingError(null);
      } else {
        setFollowingList([]);
        setFollowingError(data.error || 'Failed to load following');
      }
      setShowFollowingModal(true);
    } catch (err) {
      console.error('Error fetching following:', err);
      setFollowingList([]);
      setFollowingError('Failed to load following');
      setShowFollowingModal(true);
    } finally {
      setLoadingFollowing(false);
    }
  };

  // Handle remove friend
  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });

      if (response.ok) {
        // Update the lists by removing the friend
        setFollowersList((prev) =>
          prev.filter((f) => f.friendshipId !== friendshipId)
        );
        setFollowingList((prev) =>
          prev.filter((f) => f.friendshipId !== friendshipId)
        );
        // Refresh profile to update counts
        mutate();
      }
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-white dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 pb-20">
      {/* Header with Settings and Logout */}
      <AppHeader title="Profile" showSettingsAndLogout />

      {/* Cover video / banner */}
      <div className="relative">
        {coverPreview ? (
          <video
            src={coverPreview}
            className="w-full h-56 md:h-72 lg:h-80 object-cover"
            controls
            playsInline
            muted
            loop
          />
        ) : (
          <div className="w-full h-56 md:h-72 lg:h-80 bg-gradient-to-r from-indigo-200 via-sky-200 to-emerald-200 dark:from-indigo-900 dark:via-blue-900 dark:to-emerald-900" />
        )}

        {/* Avatar */}
        <div className="absolute -bottom-10 left-4 sm:left-6 flex flex-col sm:flex-row items-start sm:items-end gap-2 sm:gap-4">
          <div className="relative">
            <img
              src={
                avatarPreview ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  data?.name || profile?.displayName || "U"
                )}`
              }
              alt="profile"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full ring-4 ring-white dark:ring-neutral-800 object-cover bg-white dark:bg-neutral-700"
            />
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-black/80 text-white text-xs px-2 py-1 sm:px-2.5 sm:py-1.5"
            >
              Change
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setLocalAvatar(e.target.files?.[0] ?? null)}
            />
          </div>

          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            className="rounded-full bg-white dark:bg-neutral-700 dark:text-white shadow px-3 py-1.5 text-xs sm:text-sm hover:shadow-md"
          >
            Change cover video
          </button>
          <input
            ref={coverInput}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => setLocalCover(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {/* Content card */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-14">
        {/* Stats */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
          <button onClick={fetchFollowers} className="hover:opacity-75 transition-opacity">
            <Stat label="Followers" value={data?.followersCount || stats.followers || 0} clickable />
          </button>
          <button onClick={fetchFollowing} className="hover:opacity-75 transition-opacity">
            <Stat label="Following" value={data?.followingCount || stats.following || 0} clickable />
          </button>
          <Stat label="Posts" value={stats.posts} />
        </div>

        <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-white/80 dark:bg-neutral-800/80 backdrop-blur rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">Name (account)</label>
            <input
              name="name"
              defaultValue={data?.name ?? ""}
              className="mt-1 w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-white p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">Display Name</label>
            <input
              name="displayName"
              defaultValue={profile?.displayName ?? ""}
              className="mt-1 w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-white p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">Location</label>
            <input
              name="location"
              defaultValue={profile?.location ?? ""}
              className="mt-1 w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-white p-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">Bio</label>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              className="mt-1 w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-white p-2 min-h-[96px]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">Tags (comma-separated)</label>
            <input
              name="tags"
              defaultValue={profile?.tags ?? ""}
              className="mt-1 w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-white p-2"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              disabled={saving}
              className="rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {(localAvatar || localCover) && (
              <span className="text-sm text-gray-500 dark:text-gray-400">You have unsaved media changes</span>
            )}
          </div>
        </form>

        {/* Posts */}
        <section className="mt-10 mb-10">
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

function Stat({ label, value, clickable }: { label: string; value: number; clickable?: boolean }) {
  return (
    <div className={`rounded-full bg-white/80 dark:bg-neutral-700/80 px-4 py-2 shadow text-sm border border-gray-200 dark:border-neutral-600 ${clickable ? 'cursor-pointer' : ''}`}>
      <span className="font-semibold text-gray-900 dark:text-white">{value}</span> <span className="text-gray-600 dark:text-gray-300">{label}</span>
    </div>
  );
}
