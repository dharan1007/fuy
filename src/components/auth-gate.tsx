"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Checking session…</div>;
  }

  if (!session) {
    return (
      <div className="p-6">
        <div className="rounded border p-4 bg-white max-w-md">
          <h2 className="text-lg font-semibold mb-2">Please sign in</h2>
          <p className="text-sm text-gray-600 mb-4">
            You need to be signed in to view this page.
          </p>
          <button
            className="rounded bg-black text-white px-3 py-1.5"
            onClick={() => router.push("/join")}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
