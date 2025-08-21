// src/components/friends-actions.tsx
"use client";

import { useTransition } from "react";

async function post(body: any) {
  const res = await fetch("/api/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export function AddFriendButton({ targetUserId }: { targetUserId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => post({ action: "request", targetUserId }).then(() => location.reload()))}
      className="px-3 py-1 rounded border hover:bg-neutral-100 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Sending…" : "Add"}
    </button>
  );
}

export function AcceptDeclineButtons({ friendshipId }: { friendshipId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        onClick={() => start(() => post({ action: "accept", friendshipId }).then(() => location.reload()))}
        className="px-3 py-1 rounded bg-green-600 text-white hover:opacity-90 disabled:opacity-60"
        disabled={pending}
      >
        Accept
      </button>
      <button
        onClick={() => start(() => post({ action: "decline", friendshipId }).then(() => location.reload()))}
        className="px-3 py-1 rounded bg-red-600 text-white hover:opacity-90 disabled:opacity-60"
        disabled={pending}
      >
        Decline
      </button>
    </div>
  );
}

export function UnfriendButton({ targetUserId }: { targetUserId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => post({ action: "unfriend", targetUserId }).then(() => location.reload()))}
      className="px-3 py-1 rounded border hover:bg-neutral-100 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "…" : "Unfriend"}
    </button>
  );
}
