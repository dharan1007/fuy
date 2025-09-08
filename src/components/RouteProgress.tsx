'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Very light, dependency-free progress bar using CSS + JS toggles
export default function RouteProgress() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement | null>(null);

  // Whenever the pathname changes, show the bar briefly.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    // Start animation immediately
    el.style.opacity = '1';
    el.style.transform = 'scaleX(0.2)'; // jump to 20%
    // Ease toward 90% while route loads
    const mid = window.setTimeout(() => {
      el.style.transform = 'scaleX(0.9)';
    }, 50);

    // Hide and reset after a short grace (the new route will commit shortly after)
    const done = window.setTimeout(() => {
      el.style.transform = 'scaleX(1)';
      el.style.opacity = '0';
      // Reset transform for next time (after fade-out)
      const reset = window.setTimeout(() => {
        el.style.transform = 'scaleX(0)';
        window.clearTimeout(reset);
      }, 200);
      window.clearTimeout(done);
    }, 450);

    return () => {
      window.clearTimeout(mid);
      window.clearTimeout(done);
    };
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-neutral-900/80 transition-transform duration-500 ease-out"
      style={{ opacity: 0, transform: 'scaleX(0)' }}
      ref={barRef}
    />
  );
}
