// src/app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function emailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      // will redirect to verification page (same route)
      await signIn("email", { email, callbackUrl: "/" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded border p-6 bg-white space-y-4">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <form className="space-y-3" onSubmit={emailSignIn}>
          <label className="block">
            <div className="text-sm font-medium">Email</div>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="you@example.com"
            />
          </label>
          <button
            disabled={sending}
            className="w-full rounded bg-blue-600 text-white py-2 disabled:opacity-60"
          >
            {sending ? "Sending link…" : "Send magic link"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">or</div>

        <div className="space-y-2">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full rounded border py-2"
          >
            Continue with Google
          </button>
          <a
            href="/passkeys"
            className="block w-full text-center rounded border py-2 hover:bg-gray-50"
          >
            Use Passkey
          </a>
        </div>
      </div>
    </div>
  );
}
