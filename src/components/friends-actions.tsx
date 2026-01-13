// src/components/follow-actions.tsx
"use client";

import { useTransition } from "react";

async function post(body: any) {
  const res = await fetch("/api/users/follow-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export function FollowButton({ targetUserId }: { targetUserId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => post({ action: "request", targetUserId }).then(() => location.reload()))}
      className="px-3 py-1 rounded border hover:bg-neutral-100 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Sending..." : "Follow"}
    </button>
  );
}

export function AcceptDeclineButtons({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        onClick={() => start(() => post({ action: "accept", friendshipId: requestId }).then(() => location.reload()))}
        className="px-3 py-1 rounded bg-green-600 text-white hover:opacity-90 disabled:opacity-60"
        disabled={pending}
      >
        Accept
      </button>
      <button
        onClick={() => start(() => post({ action: "decline", friendshipId: requestId }).then(() => location.reload()))}
        className="px-3 py-1 rounded bg-red-600 text-white hover:opacity-90 disabled:opacity-60"
        disabled={pending}
      >
        Decline
      </button>
    </div>
  );
}

export function UnfollowButton({ targetUserId }: { targetUserId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => post({ action: "unfollow", targetUserId }).then(() => location.reload()))}
      className="px-3 py-1 rounded border hover:bg-neutral-100 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "..." : "Unfollow"}
    </button>
  );
}

// For backward compatibility
export const AddFriendButton = FollowButton;
export const UnfriendButton = UnfollowButton;
