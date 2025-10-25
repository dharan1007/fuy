// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import RouteProgress from "@/components/RouteProgress";
import { Providers } from "@/components/Providers";

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

        {/* Instant visual feedback on route changes */}
        <RouteProgress />

        <Providers>
          {/* Each route can define its own layout */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
