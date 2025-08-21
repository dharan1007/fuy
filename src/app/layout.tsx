// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Fuy",
  description: "Find your joy, share it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen h-full bg-white text-neutral-900 antialiased">
        {/* Page frame */}
        <div className="flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <Link href="/" className="font-semibold tracking-tight">fuy</Link>
              <nav className="flex gap-4 text-sm">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/friends">Friends</Link>
                <Link href="/feed">Feed</Link>
                <Link href="/rankings">Rankings</Link>
                <Link href="/profile">profile</Link>
              </nav>
            </div>
          </header>

          {/* Main content grows */}
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
          </main>

          {/* Footer sticks to bottom via mt-auto on the flex column wrapper */}
          <footer className="mt-auto border-t bg-white">
            <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-neutral-600 flex items-center justify-between">
              <span>© {new Date().getFullYear()} fuy</span>
              <div className="flex gap-4">

              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
