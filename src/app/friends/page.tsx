// src/app/friends/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Types ---------- */
type FriendProfile = {
  id: string;
  name: string | null;
  profile: { displayName?: string | null; avatarUrl?: string | null } | null;
};
type FriendItem = { id: string; createdAt: string; friend: FriendProfile };

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
    <section className="grid gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Your Friends</h1>
        <p className="text-sm text-neutral-500">
          A calm overview of the people you’re connected with. Search, skim, and act—without visual noise.
        </p>
      </header>

      {/* Invite endpoint status hint */}
      {inviteApiOk === false && (
        <div className="rounded-2xl ring-1 ring-red-200 bg-red-50 text-red-700 p-3 text-sm">
          The invite API route <code className="text-red-800">{INVITE_ENDPOINT}</code> was not found (404).
          Ensure <code>src/app/api/friends/invite/route.ts</code> exists and restart dev server.
        </div>
      )}

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
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-full px-4 py-2 text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600"
          >
            Invite a friend
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList />
      ) : error ? (
        <div role="status" className="rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm p-6">
          <h2 className="font-medium">We couldn’t load your friends</h2>
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
              No matches for “{query}”. Try a different name.
            </li>
          ) : (
            filtered.map((f) => <FriendRow key={f.id} item={f} />)
          )}
        </ul>
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
  );
}

/* ---------- Parts ---------- */

function FriendRow({ item }: { item: FriendItem }) {
  const name = item.friend?.profile?.displayName ?? item.friend?.name ?? "Someone awesome";
  const avatar = item.friend?.profile?.avatarUrl;
  const since = formatSince(item.createdAt);

  return (
    <li className="group flex items-center justify-between rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm p-3 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/60 transition">
      <div className="flex min-w-0 items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden grid place-items-center ring-1 ring-neutral-200 dark:ring-neutral-800">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span aria-hidden className="text-sm text-neutral-600 dark:text-neutral-300">{initials(name)}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className="text-xs text-neutral-500">{since}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-full px-3 py-1.5 text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">Message</button>
        <button className="rounded-full px-3 py-1.5 text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">Challenge</button>
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
