"use client";

import React from "react";
import { Block } from "@/lib/templates";
import BlockCard from "./BlockCard";

export default function CanvasArea({
  viewportRef,
  zoom,
  offset,
  blocks,
  activeId,
}: {
  viewportRef: React.MutableRefObject<HTMLDivElement | null>;
  zoom: number;
  offset: { x: number; y: number };
  blocks: Block[];
  activeId: string | null;
}) {
  return (
    <div
      ref={viewportRef}
      className="relative h-[calc(100dvh-140px)] w-full overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
    >
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: 4000,
          height: 3000,
        }}
      >
        {blocks.map((b) => (
          <BlockCard key={b.id} block={b} active={b.id === activeId} />
        ))}
      </div>
    </div>
  );
}
