// src/app/progress/page.tsx
"use client";

import { useEffect, useState } from "react";

type DayItem = { day: string; journal: number; joy: number; awe: number; bonds: number };
type Stats = { last7: DayItem[] };

export default function ProgressPage() {
  const [stats, setStats] = useState<Stats>({ last7: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load stats");
        const data = (await res.json()) as Partial<Stats>;
        setStats({ last7: data.last7 ?? [] });
      } catch (e) {
        console.error(e);
        setStats({ last7: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const last7 = stats.last7 ?? [];

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-semibold">Your Progress</h1>

      {loading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="rounded-lg border p-4">
        <h2 className="font-medium mb-4">Last 7 days</h2>
        <div className="grid sm:grid-cols-7 gap-2">
          {last7.map((d) => (
            <div key={d.day} className="grid gap-2 place-items-center">
              <div className="text-xs text-stone-600">{d.day}</div>

              {/* Simple tiny bars */}
              <div title="Journal" className="w-6 h-2 rounded bg-blue-400" style={{ opacity: Math.min(1, d.journal / 3 + 0.2) }} />
              <div title="Joy" className="w-6 h-2 rounded bg-emerald-400" style={{ opacity: Math.min(1, d.joy / 3 + 0.2) }} />
              <div title="Awe" className="w-6 h-2 rounded bg-amber-400" style={{ opacity: Math.min(1, d.awe / 3 + 0.2) }} />
              <div title="Bonds" className="w-6 h-2 rounded bg-rose-400" style={{ opacity: Math.min(1, d.bonds / 3 + 0.2) }} />
            </div>
          ))}

          {last7.length === 0 && !loading && (
            <div className="text-sm text-stone-500">No activity yet—log something today to see your chart!</div>
          )}
        </div>
      </div>
    </section>
  );
}
