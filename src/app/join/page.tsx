// Handles /join?token=...
"use client";

import { useEffect, useState } from "react";

export default function JoinPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = (searchParams?.token || "").trim();
  const [status, setStatus] = useState<"checking" | "ok" | "invalid" | "expired" | "error">("checking");
  const [info, setInfo] = useState<{ inviterName?: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) { setStatus("invalid"); return; }
      try {
        const r = await fetch(`/api/join/verify?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setInfo({ inviterName: j?.inviterName || "your friend" });
          setStatus("ok");
        } else if (r.status === 410) {
          setStatus("expired");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <main className="mx-auto max-w-lg px-4 py-10 grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Join Fuy</h1>

      {status === "checking" && (
        <p className="text-neutral-500">Checking your invitation…</p>
      )}

      {status === "ok" && (
        <div className="rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm p-6 grid gap-3">
          <p>Welcome! You were invited by <strong>{info?.inviterName}</strong>.</p>
          {/* TODO: sign-in / sign-up flow or one-click accept */}
          <a
            href="/signup"
            className="inline-block rounded-full px-4 py-2 text-sm ring-1 ring-neutral-300 dark:ring-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Create your account
          </a>
        </div>
      )}

      {status === "invalid" && <p className="text-red-600">This invitation link is invalid.</p>}
      {status === "expired" && <p className="text-red-600">This invitation link has expired.</p>}
      {status === "error" && <p className="text-red-600">We couldn’t verify this invitation right now.</p>}
    </main>
  );
}
