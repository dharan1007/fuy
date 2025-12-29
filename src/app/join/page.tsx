"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";

import ScrollStarfield from "@/components/ScrollStarfield";

export default function JoinPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Force black background for starfield
  useEffect(() => {
    const originalBg = document.body.style.background;
    document.body.style.background = '#000000';
    return () => {
      document.body.style.background = originalBg;
    };
  }, []);

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
    <div className="min-h-screen">
      <ScrollStarfield>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 text-white relative z-10">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold">Sign in</h1>
              <p className="mt-2 text-sm text-gray-300">
                Get a one-time link by email. Or use <a className="text-blue-400 hover:text-blue-300 underline" href="/passkeys">Passkeys</a>.
              </p>
            </div>

            {sent ? (
              <div className="rounded border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-200 text-center">
                Check your inbox at <b className="text-white">{email}</b> for the sign-in link.
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <label className="block text-sm font-medium text-gray-200">
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                    placeholder="you@example.com"
                  />
                </label>
                {err ? <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{err}</div> : null}
                <button
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </form>
            )}
          </div>
        </div>
      </ScrollStarfield>
    </div>
  );
}
