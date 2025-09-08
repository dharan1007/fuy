'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean; // keeps API same as next/link; default true
};

export default function InstantNavLink({ href, children, className, prefetch = true }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement | null>(null);

  // Prefetch as soon as visible (IntersectionObserver), plus on mount
  useEffect(() => {
    if (!prefetch) return;
    router.prefetch?.(href);

    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          router.prefetch?.(href);
          io.disconnect();
          break;
        }
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [href, prefetch, router]);

  // Prefetch on hover/focus as an extra hint
  const onPointerEnter = () => prefetch && router.prefetch?.(href);
  const onFocus = () => prefetch && router.prefetch?.(href);

  // Immediate client push (no waiting for server before URL changes)
  const onClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    // Let cmd/ctrl-click open in new tab as usual
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.push(href); // URL updates immediately; RouteProgress shows instantly
  };

  return (
    <Link
      ref={ref}
      href={href}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      className={className}
      prefetch
    >
      {children}
    </Link>
  );
}
