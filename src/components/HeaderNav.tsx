'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InstantNavLink from './InstantNavLink';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/friends',   label: 'Friends' },
  { href: '/feed',      label: 'Feed' },
  { href: '/rankings',  label: 'Rankings' },
  { href: '/profile',   label: 'Profile' },
];

export default function HeaderNav() {
  const router = useRouter();

  // Aggressive prefetch on mount (safe in production)
  useEffect(() => {
    NAV_LINKS.forEach(({ href }) => router.prefetch?.(href));
  }, [router]);

  return (
    <nav className="flex gap-4 text-sm">
      {NAV_LINKS.map(({ href, label }) => (
        <InstantNavLink key={href} href={href}>
          {label}
        </InstantNavLink>
      ))}
    </nav>
  );
}
