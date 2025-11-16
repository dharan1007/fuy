"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/theme-context";
import TargetCursor from "@/components/TargetCursor";
import { useEffect } from "react";

// Client component to handle session refresh on app focus
function SessionRefresher() {
  useEffect(() => {
    // Refresh session when window regains focus
    const handleFocus = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('session-focus'));
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider refetchInterval={60} refetchOnWindowFocus={true}>
        <SessionRefresher />
        <TargetCursor targetSelector=".cursor-target" spinDuration={3} parallaxOn={true} />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
