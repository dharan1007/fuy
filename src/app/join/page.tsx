"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-client";

export default function JoinPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (!error) {
      setSent(true);
    } else {
      setErr(error.message || "Failed to send sign-in link");
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">
          Get a one-time link by email. Or use <a className="underline" href="/passkeys">Passkeys</a>.
        </p>

        {sent ? (
          <div className="mt-4 rounded border bg-green-50 p-3 text-sm">
            Check your inbox at <b>{email}</b> for the sign-in link.
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                placeholder="you@example.com"
              />
            </label>
            {err ? <div className="text-sm text-red-600">{err}</div> : null}
            <button
              disabled={loading}
              className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
