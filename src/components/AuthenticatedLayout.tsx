// src/components/AuthenticatedLayout.tsx
"use client";

import AppHeader from "@/components/AppHeader";

export default function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with settings and logout */}
      <AppHeader />

      {/* Main content — full width so sections can be wide/full-bleed */}
      <main className="flex-1 overflow-y-auto snap-y snap-mandatory touch-pan-y">
        <div className="w-full px-6 md:px-10 py-0">
          {children}
        </div>
      </main>

      {/* Footer sticks to bottom via mt-auto on the flex column wrapper */}
      <footer className="mt-auto border-t bg-white dark:bg-black dark:border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
          <span>© {new Date().getFullYear()} fuy</span>
          <div className="flex gap-4" />
        </div>
      </footer>
    </div>
  );
}
