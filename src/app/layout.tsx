// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import HeaderNav from "@/components/HeaderNav";
import RouteProgress from "@/components/RouteProgress";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Prevents the initial flash of the wrong theme.
 * It reads localStorage.theme (or system preference) and adds 'dark' to <html> before React hydrates.
 */
function ThemeNoFlashScript() {
  const code = `
  (() => {
    try {
      const saved = localStorage.getItem("theme");
      const sysDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldDark = saved === "dark" || (!saved && sysDark);
      const root = document.documentElement;
      if (shouldDark) root.classList.add("dark"); else root.classList.remove("dark");
    } catch {}
  })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export const metadata: Metadata = {
  title: "Fuy",
  description: "Find your joy, share it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning avoids class mismatch warnings while we toggle 'dark' pre-hydration
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-screen h-full bg-white text-neutral-900 antialiased dark:bg-black dark:text-white">
        {/* Ensure correct theme before anything paints */}
        <ThemeNoFlashScript />

        {/* Top-right theme toggle (fixed) */}
        <ThemeToggle />

        {/* Instant visual feedback on route changes */}
        <RouteProgress />

        {/* Page frame */}
        <div className="flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:bg-black/70 dark:supports-[backdrop-filter]:bg-black/50 dark:border-white/10">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <Link href="/" className="font-semibold tracking-tight">
                fuy
              </Link>
              <HeaderNav />
            </div>
          </header>

          {/* Main content grows */}
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
          </main>

          {/* Footer sticks to bottom via mt-auto on the flex column wrapper */}
          <footer className="mt-auto border-t bg-white dark:bg-black dark:border-white/10">
            <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
              <span>© {new Date().getFullYear()} fuy</span>
              <div className="flex gap-4" />
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
