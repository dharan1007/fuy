"use client";

import { useEffect, useState } from "react";

/**
 * Small, self-contained toggle fixed to the top-right.
 * It saves preference to localStorage and toggles the 'dark' class on <html>.
 */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  // On mount, sync with localStorage (or system preference as a fallback)
  useEffect(() => {
    const root = document.documentElement;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      root.classList.add("dark");
      setIsDark(true);
    } else if (saved === "light") {
      root.classList.remove("dark");
      setIsDark(false);
    } else {
      // if no saved pref, follow system (optional)
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
        setIsDark(true);
      } else {
        root.classList.remove("dark");
        setIsDark(false);
      }
    }
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="fixed top-4 right-4 z-50 rounded-full border px-3 py-2 text-sm
                 bg-white text-black border-black/10 hover:bg-neutral-50
                 dark:bg-black dark:text-white dark:border-white/20 hover:dark:bg-neutral-900"
    >
      {isDark ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
