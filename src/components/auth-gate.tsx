"use client";

import { useSession, signIn } from "next-auth/react";
import React from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") {
    return <div className="p-4 text-sm text-gray-600">Checking session…</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-6">
        <div className="rounded border p-4 bg-white max-w-md">
          <h2 className="text-lg font-semibold mb-2">Please sign in</h2>
          <p className="text-sm text-gray-600 mb-4">
            You need to be signed in to view this page.
          </p>
          <button
            className="rounded bg-black text-white px-3 py-1.5"
            onClick={() => signIn(undefined, { callbackUrl: "/" })}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
