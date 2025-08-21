// src/app/rankings/page.tsx
import { Suspense } from "react";

async function getData() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/rankings`, {
      cache: "no-store",
    });
    const data = await res.json();
    return Array.isArray(data) ? data : data?.items ?? [];
  } catch {
    return [];
  }
}

export default async function RankingsPage() {
  const items = await getData();

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-semibold">Global Happiness Rankings</h1>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[4rem_1fr_8rem] text-xs uppercase tracking-wide text-neutral-500 px-4 py-2">
            <div>#</div>
            <div>User</div>
            <div className="text-right">Score</div>
          </div>
          <ul>
            {items.length === 0 ? (
              <li className="px-4 py-6 text-neutral-500 text-sm">No rankings yet.</li>
            ) : (
              items.map((it: any, idx: number) => (
                <li key={it.userId} className="grid grid-cols-[4rem_1fr_8rem] items-center px-4 py-3 border-t">
                  <div className="font-mono">{idx + 1}</div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 grid place-items-center">
                      {(it.name ?? "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="font-medium truncate">{it.name ?? "Unknown"}</div>
                      <div className="text-xs text-neutral-500">{it.category ?? "Overall"}</div>
                    </div>
                  </div>
                  <div className="text-right font-semibold">{it.score ?? 0}</div>
                </li>
              ))
            )}
          </ul>
        </div>
      </Suspense>
    </section>
  );
}
