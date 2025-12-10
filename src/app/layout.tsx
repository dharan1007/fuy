// src/app/layout.tsx
import "./globals.css";
import "@/styles/global.css";
import "@/styles/atrium.css";
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
  title: "FUY - Find Your Joy",
  description: "Find your joy, share it. The next generation social platform.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "FUY",
    description: "Find your joy, share it.",
    url: "https://fuy.app",
    siteName: "FUY",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FUY",
    description: "Find your joy, share it.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning avoids class mismatch warnings while we toggle 'dark' pre-hydration
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Permissions policy meta tag for microphone access */}

      </head>
      <body className="min-h-screen h-full bg-black text-white antialiased">
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
