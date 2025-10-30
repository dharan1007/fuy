// src/app/friends/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";

/* ---------- Types ---------- */
type FriendProfile = {
  id: string;
  name: string | null;
  profile: { displayName?: string | null; avatarUrl?: string | null } | null;
};
type FriendItem = { id: string; createdAt: string; friend: FriendProfile };

type SearchUser = {
  id: string;
  name: string | null;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  friendshipStatus: string;
  friendshipId: string | null;
  isPending: boolean;
  isSentByMe: boolean;
};

type FriendRequest = {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    profile: { displayName: string | null; avatarUrl: string | null } | null;
  };
  friend?: {
    id: string;
    name: string | null;
    profile: { displayName: string | null; avatarUrl: string | null } | null;
  };
};

/* ---------- Constants ---------- */
// Lock to our app-route endpoint. If your backend is elsewhere, set NEXT_PUBLIC_INVITE_ENDPOINT.
const INVITE_ENDPOINT =
  process.env.NEXT_PUBLIC_INVITE_ENDPOINT || "/api/friends/invite";
const INVITE_LINK_ENDPOINT =
  process.env.NEXT_PUBLIC_INVITE_LINK_ENDPOINT || "/api/friends/invite-link";
const FRIENDS_LIST_ENDPOINT = "/api/friends";

/* ---------- Page ---------- */
export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteApiOk, setInviteApiOk] = useState<boolean | null>(null); // null = unknown

  // New states for tabs and search
  const [activeTab, setActiveTab] = useState<"friends" | "search" | "requests">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Load friends list
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const res = await fetch(FRIENDS_LIST_ENDPOINT, { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        const list: FriendItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.friends)
          ? data.friends
          : [];
        setFriends(list);
      } catch (e: any) {
        console.error(e);
        setFriends([]);
        setError(e?.message || "Something went wrong while fetching friends.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load pending friend requests
  useEffect(() => {
    if (activeTab === "requests") {
      loadPendingRequests();
    }
  }, [activeTab]);

  // Search users with debounce
  useEffect(() => {
    if (activeTab !== "search" || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, activeTab]);

  async function loadPendingRequests() {
    setRequestsLoading(true);
    try {
      const res = await fetch("/api/friends/request");
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();
      setPendingRequests(data.requests || []);
    } catch (error) {
      console.error("Load requests error:", error);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function searchUsers() {
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function sendFriendRequest(userId: string) {
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId: userId }),
      });
      if (!res.ok) throw new Error("Failed to send request");
      // Refresh search results
      searchUsers();
    } catch (error) {
      console.error("Send request error:", error);
    }
  }

  async function handleFriendRequest(friendshipId: string, action: "ACCEPT" | "REJECT") {
    try {
      const res = await fetch("/api/friends/request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (!res.ok) throw new Error(`Failed to ${action.toLowerCase()} request`);
      // Refresh requests and friends list
      loadPendingRequests();
      if (action === "ACCEPT") {
        // Reload friends list
        const friendsRes = await fetch(FRIENDS_LIST_ENDPOINT, { cache: "no-store" });
        const data = await friendsRes.json();
        setFriends(Array.isArray(data?.friends) ? data.friends : []);
      }
    } catch (error) {
      console.error("Handle request error:", error);
    }
  }

  async function removeFriend(friendshipId: string) {
    try {
      const res = await fetch("/api/friends/request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      if (!res.ok) throw new Error("Failed to remove friend");
      // Refresh friends list
      const friendsRes = await fetch(FRIENDS_LIST_ENDPOINT, { cache: "no-store" });
      const data = await friendsRes.json();
      setFriends(Array.isArray(data?.friends) ? data.friends : []);
    } catch (error) {
      console.error("Remove friend error:", error);
    }
  }

  // Preflight the invite endpoint so we can tell you ASAP if it’s missing
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(INVITE_ENDPOINT, { method: "OPTIONS", cache: "no-store" });
        if (r.status === 404) { setInviteApiOk(false); return; }
        // 200/204/405/etc all mean the route exists
        setInviteApiOk(true);
      } catch {
        setInviteApiOk(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = [...friends].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!q) return base;
    return base.filter((f) => {
      const name = f.friend?.profile?.displayName || f.friend?.name || "Someone awesome";
      return name.toLowerCase().includes(q);
    });
  }, [friends, query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Friends" showBackButton />

      <section className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 grid gap-4 sm:gap-6">
        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "friends"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            My Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "search"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Search Users
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "requests"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Requests ({pendingRequests.length})
          </button>
        </div>

        {/* My Friends Tab */}
        {activeTab === "friends" && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="sr-only" htmlFor="friend-search">Search friends</label>
                <div className="relative">
                  <input
                    id="friend-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name"
                    autoComplete="off"
                    className="w-full rounded-full bg-neutral-50 dark:bg-neutral-900/50 ring-1 ring-neutral-200 dark:ring-neutral-800 px-4 py-2 text-sm outline-none transition focus:ring-neutral-300 dark:focus:ring-neutral-700"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-1.5 top-1.5 rounded-full px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Clear search"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-neutral-500 px-3 py-2 rounded-full bg-neutral-50 dark:bg-neutral-900/50 ring-1 ring-neutral-200 dark:ring-neutral-800">
                  {loading ? "Loading…" : `${filtered.length} of ${friends.length} shown`}
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <SkeletonList />
            ) : error ? (
              <div role="status" className="rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm p-6">
                <h2 className="font-medium">We couldn't load your friends</h2>
                <p className="text-sm text-neutral-500 mt-1">{error}</p>
                <div className="mt-4">
                  <button onClick={() => location.reload()} className="rounded-full px-4 py-2 text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    Try again
                  </button>
                </div>
              </div>
            ) : friends.length === 0 ? (
              <EmptyState onInvite={() => setInviteOpen(true)} />
            ) : (
              <ul className="grid gap-3">
                {filtered.length === 0 ? (
                  <li className="rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm p-6 text-neutral-500">
                    No matches for "{query}". Try a different name.
                  </li>
                ) : (
                  filtered.map((f) => <FriendRow key={f.id} item={f} />)
                )}
              </ul>
            )}
          </>
        )}

        {/* Search Users Tab */}
        {activeTab === "search" && (
          <>
            <div className="flex-1">
              <label className="sr-only" htmlFor="user-search">Search users</label>
              <input
                id="user-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email..."
                autoComplete="off"
                className="w-full rounded-full bg-white ring-1 ring-gray-200 px-4 py-2 text-sm outline-none transition focus:ring-blue-500"
              />
            </div>

            {searchQuery.length < 2 && (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="mt-4">Type at least 2 characters to search</p>
              </div>
            )}

            {searchLoading && <div className="text-center py-8 text-gray-500">Searching...</div>}

            {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No users found for "{searchQuery}"</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <ul className="grid gap-3">
                {searchResults.map((user) => (
                  <SearchUserRow key={user.id} user={user} onSendRequest={sendFriendRequest} />
                ))}
              </ul>
            )}
          </>
        )}

        {/* Pending Requests Tab */}
        {activeTab === "requests" && (
          <>
            {requestsLoading && <div className="text-center py-8 text-gray-500">Loading requests...</div>}

            {!requestsLoading && pendingRequests.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <p className="mt-4 text-gray-500">No pending friend requests</p>
              </div>
            )}

            {pendingRequests.length > 0 && (
              <ul className="grid gap-3">
                {pendingRequests.map((request) => (
                  <FriendRequestRow key={request.id} request={request} onHandle={handleFriendRequest} />
                ))}
              </ul>
            )}
          </>
        )}

        {/* Dialog */}
        {inviteOpen && (
          <InviteFriendDialog
            onClose={() => setInviteOpen(false)}
            onSent={() => setInviteOpen(false)}
            inviteEndpoint={INVITE_ENDPOINT}
            inviteLinkEndpoint={INVITE_LINK_ENDPOINT}
          />
        )}
      </section>
    </div>
  );
}

/* ---------- Parts ---------- */

function FriendRow({ item }: { item: FriendItem }) {
  const name = item.friend?.profile?.displayName ?? item.friend?.name ?? "Someone awesome";
  const avatar = item.friend?.profile?.avatarUrl;
  const since = formatSince(item.createdAt);

  return (
    <li className="group flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm p-3 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/60 transition gap-3">
      <div className="flex min-w-0 items-center gap-3 w-full sm:w-auto">
        <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden grid place-items-center ring-1 ring-neutral-200 dark:ring-neutral-800 flex-shrink-0">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span aria-hidden className="text-sm text-neutral-600 dark:text-neutral-300">{initials(name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate text-sm sm:text-base">{name}</div>
          <div className="text-xs text-neutral-500">{since}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button className="rounded-full px-3 py-1.5 text-xs sm:text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">Message</button>
        <button className="rounded-full px-3 py-1.5 text-xs sm:text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">Challenge</button>
      </div>
    </li>
  );
}

function SearchUserRow({ user, onSendRequest }: { user: SearchUser; onSendRequest: (userId: string) => void }) {
  const [showProfile, setShowProfile] = useState(false);
  const [sending, setSending] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const name = user.displayName || user.name || "Unknown User";
  const avatar = user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  function getButtonContent() {
    if (user.friendshipStatus === "ACCEPTED") {
      return { text: "Friends", color: "bg-green-100 text-green-700", disabled: true };
    }
    if (user.friendshipStatus === "PENDING") {
      if (user.isSentByMe) {
        return { text: "Request Sent", color: "bg-gray-100 text-gray-600", disabled: true };
      }
      return { text: "Pending", color: "bg-yellow-100 text-yellow-700", disabled: true };
    }
    return { text: "Add Friend", color: "bg-blue-600 text-white hover:bg-blue-700", disabled: false };
  }

  const handleAddFriend = async () => {
    setSending(true);
    try {
      onSendRequest(user.id);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 3000);
    } finally {
      setSending(false);
    }
  };

  const buttonProps = getButtonContent();

  return (
    <>
      <li className="flex items-center justify-between rounded-lg ring-1 ring-gray-200 bg-white p-4 hover:bg-gray-50 transition cursor-pointer group" onClick={() => setShowProfile(true)}>
        <div className="flex min-w-0 items-center gap-3 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
          <div className="min-w-0">
            <div className="font-medium truncate group-hover:text-blue-600">{name}</div>
            <div className="text-sm text-gray-500 truncate">{user.email}</div>
            {user.bio && <div className="text-xs text-gray-400 truncate mt-1">{user.bio}</div>}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            !buttonProps.disabled && handleAddFriend();
          }}
          disabled={buttonProps.disabled || sending}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${buttonProps.color} ${
            buttonProps.disabled ? "cursor-not-allowed" : ""
          } ${sending ? "opacity-50" : ""}`}
        >
          {sending ? "Adding..." : buttonProps.text}
        </button>
      </li>

      {/* Profile Card Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Avatar & Name */}
            <div className="text-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} alt={name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover ring-4 ring-blue-100" />
              <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
              <p className="text-gray-600">{user.email}</p>
            </div>

            {/* Bio Section */}
            {user.bio && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{user.bio}</p>
              </div>
            )}

            {/* Status Badge */}
            {justAdded && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-sm font-medium text-green-700">✓ Friend request sent & auto-accepted!</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!buttonProps.disabled && !justAdded && (
                <button
                  onClick={handleAddFriend}
                  disabled={sending}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {sending ? "Adding..." : "Add Friend"}
                </button>
              )}

              {(buttonProps.disabled || justAdded) && (
                <button
                  onClick={() => setShowProfile(false)}
                  className="w-full bg-gray-200 text-gray-900 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Close
                </button>
              )}

              {user.friendshipStatus === "ACCEPTED" && (
                <>
                  <a
                    href={`/chat?user=${user.id}`}
                    className="block w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-center"
                  >
                    💬 Message
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FriendRequestRow({ request, onHandle }: { request: FriendRequest; onHandle: (id: string, action: "ACCEPT" | "REJECT") => void }) {
  // Determine if this is a received request (someone sent to me) or sent request (I sent)
  const isReceived = request.user && request.user.id !== request.friendId;
  const person = isReceived ? request.user : request.friend;
  const name = person?.profile?.displayName || person?.name || "Unknown User";
  const avatar = person?.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return (
    <li className="flex items-center justify-between rounded-lg ring-1 ring-gray-200 bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
        <div className="min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className="text-sm text-gray-500">
            {isReceived ? "wants to be friends" : "waiting for response"}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(request.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isReceived ? (
          <>
            <button
              onClick={() => onHandle(request.id, "ACCEPT")}
              className="rounded-full px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Accept
            </button>
            <button
              onClick={() => onHandle(request.id, "REJECT")}
              className="rounded-full px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-100 transition"
            >
              Decline
            </button>
          </>
        ) : (
          <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-full">
            Pending
          </div>
        )}
      </div>
    </li>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm p-8 text-center grid gap-3 place-items-center">
      <div className="w-12 h-12 rounded-full ring-1 ring-neutral-200 dark:ring-neutral-800 grid place-items-center">
        <span className="text-xl" aria-hidden>👋</span>
      </div>
      <h2 className="font-medium">No friends yet</h2>
      <p className="text-sm text-neutral-500">
        Send your first invite to start building your circle. You’ll see new connections here with a calm, informative summary.
      </p>
      <div className="mt-2">
        <button onClick={onInvite} className="rounded-full px-4 py-2 text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          Invite a friend
        </button>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="grid gap-3" aria-busy="true" aria-label="Loading friends">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm p-3">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="flex-1 grid gap-2">
              <div className="h-3 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
              <div className="h-2 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="hidden sm:flex gap-2">
            <div className="h-8 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="h-8 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Invite Dialog ---------- */

function InviteFriendDialog({
  onClose,
  onSent,
  inviteEndpoint,
  inviteLinkEndpoint,
}: {
  onClose: () => void;
  onSent: () => void;
  inviteEndpoint: string;
  inviteLinkEndpoint: string;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<null | { kind: "error" | "success"; text: string }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) return setMsg({ kind: "error", text: "Please enter an email or username." });

    const target = raw.startsWith("@") ? raw.slice(1) : raw;
    const isEmail = isValidEmail(target);
    if (!isEmail && target.includes("@")) {
      return setMsg({ kind: "error", text: "That doesn’t look like a valid email." });
    }

    const payload = isEmail ? { email: target } : { username: target };

    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(inviteEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await compactErrorText(res, `Request failed (${res.status})`));
      setMsg({ kind: "success", text: "Invitation sent 🎉" });
      setValue("");
      setTimeout(() => onSent(), 600);
    } catch (err: any) {
      setMsg({ kind: "error", text: compactString(err?.message || "We couldn’t send the invite. Please try again.") });
    } finally {
      setSending(false);
    }
  }

  async function getLink() {
    try {
      const res = await fetch(inviteLinkEndpoint, { method: "GET", cache: "no-store" });
      if (!res.ok) return setMsg({ kind: "error", text: await compactErrorText(res, "Couldn’t fetch an invite link.") });
      const data = await res.json().catch(() => ({}));
      const url = data?.link || data?.url || null;
      if (!url) return setMsg({ kind: "error", text: "The server didn’t return a link." });
      await navigator.clipboard.writeText(url).catch(() => {});
      setMsg({ kind: "success", text: "Shareable link copied to clipboard." });
    } catch {
      setMsg({ kind: "error", text: "Couldn’t fetch an invite link." });
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-md rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/90 dark:bg-neutral-900/80 backdrop-blur p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-medium">Invite a friend</h3>
            <p className="text-sm text-neutral-500 mt-1">Enter an email or username. We’ll send them an invite to connect.</p>
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Close">Close</button>
        </div>

        <form onSubmit={handleInvite} className="mt-4 grid gap-3" noValidate>
          <label htmlFor="invite-input" className="sr-only">Email or username</label>
          <input
            id="invite-input"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="name@example.com or @username"
            autoComplete="off"
            inputMode="email"
            className="w-full rounded-full bg-neutral-50 dark:bg-neutral-900/50 ring-1 ring-neutral-200 dark:ring-neutral-800 px-4 py-2 text-sm outline-none transition focus:ring-neutral-300 dark:focus:ring-neutral-700"
          />

          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-500">We’ll never send spam.</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={getLink} className="rounded-full px-3 py-1.5 text-xs ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">Get link</button>
              <button type="submit" disabled={sending} className="rounded-full px-4 py-2 text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-60">
                {sending ? "Sending…" : "Send invite"}
              </button>
            </div>
          </div>

          {msg && (
            <div role="status" className={`mt-1 text-sm ${msg.kind === "error" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
              {msg.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[1][0] : "";
  return (first + second).toUpperCase();
}
function formatSince(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Joined—date unavailable";
  const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  return `Friends since ${date}`;
}
/* stricter email */
function isValidEmail(email: string) {
  if (/\.\.|\.@/.test(email)) return false;
  const re = /^[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!re.test(email)) return false;
  const [local] = email.split("@");
  if (local.endsWith(".")) return false;
  return true;
}
/* remove HTML + trim */
function compactString(s: string, max = 220) {
  if (!s) return s;
  const stripped = s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length <= max ? stripped : stripped.slice(0, max - 1) + "…";
}
/* extract best server error and compact it */
async function compactErrorText(res: Response, fallback = "") {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => ({}));
      return compactString(j?.error || j?.message || fallback || `${res.status} ${res.statusText}`);
    }
    const t = await res.text();
    return compactString(t || fallback || `${res.status} ${res.statusText}`);
  } catch {
    return fallback || `${res.status} ${res.statusText}`;
  }
}
