"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/awe-routes", label: "Awe Routes" },
  { href: "/joy", label: "Joy" },
  { href: "/bonds", label: "Bonds" },          // NEW
  { href: "/progress", label: "Progress" },    // NEW
  { href: "/weekly-review", label: "Weekly Review" },
  { href: "/conflict-dojo", label: "Conflict Dojo" },
  { href: "/serendipity", label: "Serendipity" },
  { href: "/privacy", label: "Privacy" },
  { href: "/profile", label: "Profile" },
{ href: "/friends", label: "Friends" },
{ href: "/groups", label: "Groups" },
{ href: "/feed", label: "Feed" },
{ href: "/rankings", label: "Rankings" }
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-paper/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-green-500" />
          <span className="font-semibold tracking-tight">fuy</span>
          <span className="pill-yellow hidden sm:inline">Find Yourself</span>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-3 py-2 rounded-lg text-sm hover:bg-stone-100",
                pathname === l.href && "bg-stone-100 font-medium"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/passkeys" className="c-btn-ghost">Passkeys</Link>
          <Link href="/onboarding" className="c-btn-primary">Start</Link>
        </div>
      </div>
    </header>
  );
}
