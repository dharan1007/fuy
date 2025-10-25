// src/components/HomePageLayout.tsx
import Link from "next/link";
import HeaderNav from "@/components/HeaderNav";

export default function HomePageLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:bg-black/70 dark:supports-[backdrop-filter]:bg-black/50 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            fuy
          </Link>
          <HeaderNav />
        </div>
      </header>

      {/* Main content */}
      {children}
    </>
  );
}
