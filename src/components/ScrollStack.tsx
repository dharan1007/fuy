// src/components/ScrollStack.tsx
import React, { ReactNode, useEffect, useRef, useCallback, useState } from "react";
import "./ScrollStack.css";

export type ScrollStackProps = {
  children?: ReactNode;
  className?: string;
  /** fraction of viewport the card must fill to be considered active (0..1) */
  activeThreshold?: number;
};

export const ScrollStackItem = ({ children, itemClassName = "" }: { children?: ReactNode; itemClassName?: string }) => {
  return <section className={`scroll-snap-section ${itemClassName}`.trim()}>{children}</section>;
};

export default function ScrollStack({ children, className = "", activeThreshold = 0.6 }: ScrollStackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      // pick the entry with largest intersectionRatio
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible && visible.target) {
        const nodes = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(".scroll-snap-section") ?? []);
        const idx = nodes.indexOf(visible.target as HTMLElement);
        if (idx >= 0) setActiveIndex(idx);
      }
    },
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = Array.from(container.querySelectorAll<HTMLElement>(".scroll-snap-section"));
    const observer = new IntersectionObserver(handleIntersect, {
      root: container,
      threshold: Array.from({ length: 21 }, (_, i) => i / 20), // fine-grained thresholds 0 .. 1
    });

    sections.forEach(s => observer.observe(s));

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect]);

  // apply an "active" class to the visible card (used by CSS transitions)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sections = Array.from(container.querySelectorAll<HTMLElement>(".scroll-snap-section"));
    sections.forEach((s, i) => {
      s.classList.toggle("active", i === activeIndex);
      s.classList.toggle("inactive", i !== activeIndex);
    });
  }, [activeIndex]);

  return (
    <div ref={containerRef} className={`scroll-snap-container ${className}`}>
      <div className="scroll-snap-inner">{children}</div>
    </div>
  );
}
