// C:\Users\dhara\fuy\src\app\self-compassion\page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { SelfCompassionPro } from "@/components/self-compassion";
import { useRouter } from "next/navigation";

/* ---------- Floating Emojis (edge-only, clickable, draggable) ---------- */

type Floater = {
  id: number;
  emoji: string;
  top: number; // %
  left: number; // %
  edge: "top" | "bottom" | "left" | "right";
  anim: "bobX" | "bobY";
  size: number; // px
  rotate: number;
  dragging?: boolean;
};

function EmojiFloaters() {
  const EMOJIS = useMemo(() => ["💙", "🌿", "✨", "🧘", "😊", "🌈"], []);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  const randomEdge = (): Floater["edge"] => {
    const r = Math.floor(Math.random() * 4);
    return r === 0 ? "top" : r === 1 ? "bottom" : r === 2 ? "left" : "right";
  };

  const randomFloater = (id: number): Floater => {
    const edge = randomEdge();
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    let top = 5;
    let left = 5;
    let anim: Floater["anim"] = "bobY";

    if (edge === "top") {
      top = 4 + Math.random() * 4; // 4–8%
      left = 10 + Math.random() * 80; // 10–90%
      anim = "bobY";
    } else if (edge === "bottom") {
      top = 90 + Math.random() * 6; // 90–96%
      left = 10 + Math.random() * 80;
      anim = "bobY";
    } else if (edge === "left") {
      top = 15 + Math.random() * 70; // 15–85%
      left = 3 + Math.random() * 3; // 3–6%
      anim = "bobX";
    } else {
      top = 15 + Math.random() * 70;
      left = 94 + Math.random() * 3; // 94–97%
      anim = "bobX";
    }

    return {
      id,
      emoji,
      top,
      left,
      edge,
      anim,
      size: 28 + Math.floor(Math.random() * 30),
      rotate: Math.floor(Math.random() * 20) - 10,
    };
  };

  useEffect(() => {
    const n = 2 + Math.floor(Math.random() * 2); // 2 or 3
    setFloaters(Array.from({ length: n }, (_, i) => randomFloater(i)));

    const iv = setInterval(() => {
      const k = 2 + Math.floor(Math.random() * 2);
      setFloaters(Array.from({ length: k }, (_, i) => randomFloater(i)));
    }, 5000);

    return () => clearInterval(iv);
  }, [EMOJIS]);

  const boop = (id: number) => {
    setFloaters((prev) =>
      prev.map((f) =>
        f.id === id ? { ...randomFloater(id), size: f.size, rotate: f.rotate + 360 } : f
      )
    );
  };

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>, id: number) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setFloaters((prev) => prev.map((f) => (f.id === id ? { ...f, dragging: true } : f)));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>, id: number) => {
    setFloaters((prev) =>
      prev.map((f) => {
        if (f.id !== id || !f.dragging) return f;
        const rect = document.body.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const distances = [
          { edge: "top" as const, d: Math.abs(y - 0) },
          { edge: "bottom" as const, d: Math.abs(y - 100) },
          { edge: "left" as const, d: Math.abs(x - 0) },
          { edge: "right" as const, d: Math.abs(x - 100) },
        ].sort((a, b) => a.d - b.d);
        const edge = distances[0].edge;
        let top = y;
        let left = x;
        if (edge === "top") top = Math.max(1, Math.min(10, y));
        if (edge === "bottom") top = Math.max(90, Math.min(99, y));
        if (edge === "left") left = Math.max(1, Math.min(6, x));
        if (edge === "right") left = Math.max(94, Math.min(99, x));
        return { ...f, top, left, edge };
      })
    );
  };
  const onPointerUp = (_e: React.PointerEvent<HTMLSpanElement>, id: number) => {
    setFloaters((prev) => prev.map((f) => (f.id === id ? { ...f, dragging: false } : f)));
  };

  return (
    <>
      <style jsx global>{`
        @keyframes bobX {
          from { transform: translateX(0); }
          to { transform: translateX(14px); }
        }
        @keyframes bobY {
          from { transform: translateY(0); }
          to { transform: translateY(14px); }
        }
        .float-x { animation: bobX 2.6s ease-in-out infinite alternate; }
        .float-y { animation: bobY 2.6s ease-in-out infinite alternate; }
        .boop { transition: transform 320ms ease; }
        .dragging { animation: none !important; cursor: grabbing; filter: drop-shadow(0 6px 10px rgba(0,0,0,.15)); }
      `}</style>

      {/* IMPORTANT: wrapper is pointer-events-none so it DOESN'T block clicks.
          Individual emoji spans are pointer-events-auto so they remain clickable. */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {floaters.map((f) => (
          <span
            key={f.id}
            role="img"
            aria-label="decorative emoji"
            className={`absolute select-none drop-shadow-md boop pointer-events-auto ${
              f.anim === "bobX" ? "float-x" : "float-y"
            } ${f.dragging ? "dragging" : ""}`}
            style={{
              top: `${f.top}%`,
              left: `${f.left}%`,
              fontSize: `${f.size}px`,
              transform: `rotate(${f.rotate}deg)`,
              userSelect: "none",
              touchAction: "none",
            }}
            onClick={() => boop(f.id)}
            onPointerDown={(e) => onPointerDown(e, f.id)}
            onPointerMove={(e) => onPointerMove(e, f.id)}
            onPointerUp={(e) => onPointerUp(e, f.id)}
          >
            {f.emoji}
          </span>
        ))}
      </div>
    </>
  );
}

/* ----------------------------------- Page ----------------------------------- */

export default function SelfCompassionPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-neutral-900 antialiased">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#e7eef9] via-[#eef3f8] to-[#f9fbff]" />
        <div className="absolute -left-40 -top-24 h-[620px] w-[620px] rounded-[64px] rotate-6 bg-white/70 shadow-2xl backdrop-blur-xl" />
        <div className="absolute right-[-180px] top-10 h-[820px] w-[820px] rounded-[72px] -rotate-3 bg-white/60 shadow-xl backdrop-blur-2xl" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />
        {/* extra shapes (trimmed for brevity; keep yours) */}
        <div className="absolute left-[15%] top-[48%] h-28 w-28 [clip-path:polygon(50%_0%,0%_100%,100%_100%)] bg-white/30 shadow-lg ring-1 ring-white/40 backdrop-blur-xl" />
        <div className="absolute right-[22%] top-[46%] h-32 w-36 [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0%_50%)] bg-gradient-to-br from-white/35 to-[#d6e6ff]/35 shadow-lg ring-1 ring-white/40 backdrop-blur-xl" />
        <div className="absolute left-[45%] top-[55%] h-24 w-24 rotate-45 rounded-[12px] bg-white/25 shadow-lg ring-1 ring-white/40 backdrop-blur-xl" />
        <div className="absolute left-[8%] bottom-[10%] h-56 w-56 -rotate-12 rounded-[40px] bg-gradient-to-tr from-white/40 to-[#d9e7ff]/40 shadow-xl ring-1 ring-white/40 backdrop-blur-2xl" />
        <div className="absolute right-[12%] bottom-[9%] h-24 w-48 [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)] bg-gradient-to-r from-white/35 to-transparent shadow-xl ring-1 ring-white/40 backdrop-blur-xl" />
      </div>

      {/* Edge-only interactive emojis that no longer block UI */}
      <EmojiFloaters />

      <section className="mx-auto max-w-[90rem] px-6 py-12 lg:py-16 grid gap-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-base sm:text-lg font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Practice
            </p>
            <h1 className="text-6xl sm:text-7xl font-extrabold leading-[1.03] tracking-tight">
              Self-compassion
            </h1>
            <p className="text-xl sm:text-2xl text-neutral-600">
              Respond to struggle with kindness.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              className="btn btn-ghost rounded-full px-6 py-3 text-lg"
              onClick={() => router.push("/dashboard")}
            >
              ← Back to dashboard
            </button>
          </div>
        </div>

        {/* Glass container */}
        <div className="relative overflow-hidden rounded-[36px] p-1 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.35)]">
          <div className="rounded-[34px] bg-white/10 backdrop-blur-2xl ring-1 ring-white/30">
            <div className="rounded-[34px] p-7 sm:p-10 lg:p-12">
              <SelfCompassionPro />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
