"use client";

import { useEffect, useState } from "react";

/**
 * Theme toggle wired to <html data-theme="light|dark">.
 * - Reads localStorage("theme") or falls back to OS preference on first mount
 * - Persists selection to localStorage
 * - Uses your existing .btn / .glass-strong styles
 * - Positioned bottom-right; move it if you like
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Initialize from stored value or OS preference
  useEffect(() => {
    const root = document.documentElement;
    const saved = (localStorage.getItem("theme") as "light" | "dark" | null) || null;
    const initial =
      saved ??
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    root.dataset.theme = initial;
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <div className="fixed right-4 bottom-4 z-[1000]">
      <button
        onClick={toggle}
        aria-label="Toggle color theme"
        className="btn btn-sm glass-strong"
        style={{ gap: ".5rem" }}
      >
        {theme === "dark" ? (
          <>
            {/* Moon (current: dark) */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
              />
            </svg>
            <span>Dark</span>
          </>
        ) : (
          <>
            {/* Sun (current: light) */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 4V2m0 20v-2M4 12H2m20 0h-2M5 5l-1.4-1.4M20.4 20.4 19 19M19 5l1.4-1.4M4.6 20.4 6 19"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
            <span>Light</span>
          </>
        )}
      </button>
    </div>
  );
}
