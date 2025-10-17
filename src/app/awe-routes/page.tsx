"use client";

import { useEffect, useMemo, useState } from "react";
import PlanBoard from "@/components/plan-board";
import LeafletMap, {
  type POICategory,
  type LatLng,
} from "@/components/leaflet-map";

/* ---------- utils ---------- */
function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function fmt(n: number, unit: "km" | "mi" = "km") {
  return unit === "km"
    ? `${n.toFixed(2)} km`
    : `${(n * 0.621371).toFixed(2)} mi`;
}
function estimateHours(distanceKm: number, speedKmH: number) {
  if (!speedKmH) return 0;
  return distanceKm / speedKmH;
}
function hhmm(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
function download(
  filename: string,
  data: string,
  mime = "application/octet-stream"
) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- route storage ---------- */
const STORAGE_ROUTE = "awe-routes:leaflet";
function pointsFromLocal(): LatLng[] {
  try {
    const raw = localStorage.getItem(STORAGE_ROUTE);
    const pts = raw ? (JSON.parse(raw) as LatLng[]) : [];
    return Array.isArray(pts) ? pts : [];
  } catch {
    return [];
  }
}
function makeGeoJSONFromPts(pts: LatLng[]) {
  return { type: "LineString", coordinates: pts.map((p) => [p.lng, p.lat]) };
}
function makeGpxFromPts(pts: LatLng[]) {
  const trkpts = pts
    .map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="fuy" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Awe Route</name><trkseg>${trkpts}</trkseg></trk>
</gpx>`;
}

/* ---------- live metrics ---------- */
type LiveRoute = {
  distanceKm: number;
  isLoop: boolean;
  points: number;
  pts: LatLng[];
};
function useLiveRoute(): LiveRoute {
  const [pts, setPts] = useState<LatLng[]>(
    () => (typeof window === "undefined" ? [] : pointsFromLocal())
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setPts(pointsFromLocal());
    const id = window.setInterval(sync, 600);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_ROUTE) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const metrics = useMemo<LiveRoute>(() => {
    const len = pts.length;
    let km = 0;
    for (let i = 1; i < len; i++) km += haversineKm(pts[i - 1], pts[i]);
    const isLoop = len > 2 && haversineKm(pts[0], pts[len - 1]) < 0.05;
    return { distanceKm: km, isLoop, points: len, pts };
  }, [pts]);

  return metrics;
}

/* ---------- page ---------- */
export default function AweRoutesPage() {
  const { distanceKm, isLoop, points, pts } = useLiveRoute();

  const ETA = {
    walk: hhmm(estimateHours(distanceKm, 5)),
    run: hhmm(estimateHours(distanceKm, 9)),
    bike: hhmm(estimateHours(distanceKm, 16)),
  };

  const kcal = useMemo(
    () => ({
      walk: Math.round(distanceKm * 55),
      run: Math.round(distanceKm * 80),
      bike: Math.round(distanceKm * 30),
    }),
    [distanceKm]
  );

  const [cueSeed, setCueSeed] = useState("sky,texture,quiet,edges,colors");
  const cues = useMemo(
    () =>
      cueSeed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [cueSeed]
  );

  const [basemapStyle, setBasemapStyle] =
    useState<"dark" | "light" | "sepia">("dark");
  const [activeCategory, setActiveCategory] =
    useState<POICategory | null>(null);

  const suggestions = useMemo(() => {
    const km = distanceKm;
    if (km < 1)
      return [
        "Try adding 3–4 points to see ETA.",
        "Hold Alt while dragging for finer moves.",
      ];
    if (km < 5)
      return [
        "Great for a short walk. Add a coffee stop ☕",
        "Toggle map style on the left.",
      ];
    if (km < 15)
      return [
        "Nice loop candidate. Add cues for vistas.",
        "Export GPX for your watch.",
      ];
    return ["Ambitious route! Add hydration pins.", "Invite friends below."];
  }, [distanceKm]);

  const cueSheet = useMemo(() => {
    if (!pts.length || !cues.length) return [];
    const every = Math.max(
      1,
      Math.floor(pts.length / Math.min(12, pts.length))
    );
    const out: { km: number; text: string }[] = [];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      acc += haversineKm(pts[i - 1], pts[i]);
      if (i % every === 0 || i === pts.length - 1) {
        const cue = cues[out.length % cues.length];
        out.push({ km: acc, text: cue });
      }
    }
    return out;
  }, [cues, pts]);

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6 text-[16px] md:text-[17px] leading-7">
      {/* FULL WIDTH: no max-w cap */}
      <div className="mx-auto max-w-none">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[320px,1fr]">
          {/* ===== Sidebar ===== */}
          <aside className="md:sticky md:top-[96px] self-start rounded-2xl border border-black/10 bg-neutral-900 text-neutral-100 p-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Awe Routes</h1>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs">
                awe
              </span>
            </div>

            <div className="mt-4 text-[11px] uppercase tracking-widest text-neutral-400">
              Browse
            </div>
            <div className="mt-1 grid">
              {(
                [
                  "ATMs",
                  "Bus Stops",
                  "Cafés",
                  "Emergencies",
                  "Museums",
                  "Parkings",
                  "Restaurants",
                  "Sport Centers",
                ] as POICategory[]
              ).map((label) => (
                <button
                  key={label}
                  onClick={() =>
                    setActiveCategory((c) => (c === label ? null : label))
                  }
                  className={`rounded-md px-3 py-2 text-left hover:bg-white/10 ${
                    activeCategory === label
                      ? "bg-white/15 ring-1 ring-white/10"
                      : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 text-[11px] uppercase tracking-widest text-neutral-400">
              Map Style
            </div>
            <div className="mt-1 flex gap-2">
              {(["dark", "light", "sepia"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setBasemapStyle(s)}
                  className={`rounded-md border border-white/10 px-3 py-1 text-xs ${
                    basemapStyle === s ? "bg-white/20" : "bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="opacity-75">Now</span>
                <span className="font-medium">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="mt-1 opacity-80">Good conditions for a walk.</div>
            </div>
          </aside>

          {/* ===== Main ===== */}
          <section className="space-y-6">
            {/* Map + HUD */}
            <div className="relative rounded-2xl border border-black/10 bg-black/90 p-3">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[14px] text-white/90">
                <span className="rounded-2xl border border-white/10 bg-black/60 px-3 py-1.5">
                  Dist: <b>{fmt(distanceKm, "km")}</b> ·{" "}
                  <b>{fmt(distanceKm, "mi")}</b> · Points: <b>{points}</b>
                  {isLoop && (
                    <span className="ml-2 rounded bg-emerald-400/20 px-2 py-0.5 text-xs text-emerald-200">
                      loop
                    </span>
                  )}
                </span>
                <span className="rounded-2xl border border-white/10 bg-black/60 px-3 py-1.5">
                  ETA — Walk <b>{ETA.walk}</b> · Run <b>{ETA.run}</b> · Bike{" "}
                  <b>{ETA.bike}</b>
                </span>
                <span className="rounded-2xl border border-white/10 bg-black/60 px-3 py-1.5">
                  Tips:{" "}
                  {suggestions.map((s, i) => (
                    <span key={i}>💡 {s} </span>
                  ))}
                </span>
              </div>

              <LeafletMap
                basemapStyle={basemapStyle}
                activeCategory={activeCategory}
              />
            </div>

            {/* Info row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-black/10 bg-neutral-900 p-4 text-neutral-100">
                <div className="mb-1 font-medium text-white">
                  Effort & Calories
                </div>
                <div>
                  Walk: ~{kcal.walk} kcal · Run: ~{kcal.run} kcal · Bike: ~
                  {kcal.bike} kcal
                </div>
              </div>
              <div className="rounded-xl border border-black/10 bg-neutral-900 p-4 text-neutral-100">
                <div className="mb-1 font-medium text-white">Route Shape</div>
                <div>
                  {isLoop
                    ? "Looks like a loop (starts ≈ ends)"
                    : "Out & back / point-to-point"}
                </div>
              </div>
              <div className="rounded-xl border border-black/10 bg-neutral-900 p-4 text-neutral-100">
                <div className="mb-1 font-medium text-white">Data</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() =>
                      download(
                        "route.gpx",
                        makeGpxFromPts(pts),
                        "application/gpx+xml"
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-white/10 px-3 py-1.5 text-[14px] hover:bg-white/20"
                  >
                    ⤓ Export GPX
                  </button>
                  <button
                    onClick={() =>
                      download(
                        "route.json",
                        JSON.stringify(makeGeoJSONFromPts(pts), null, 2),
                        "application/json"
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-white/10 px-3 py-1.5 text-[14px] hover:bg-white/20"
                  >
                    {"{ }"} Export JSON
                  </button>
                </div>
              </div>
            </div>

            {/* Cue sheet + Plans */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-black/10 bg-neutral-900 p-4 text-neutral-100">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Attention Cue Sheet
                  </h2>
                  <button
                    onClick={async () => {
                      const lines = (cueSheet || [])
                        .map(
                          (c, i) => `${i + 1}. ${c.text} — ${c.km.toFixed(2)} km`
                        )
                        .join("\n");
                      try {
                        await navigator.clipboard.writeText(lines);
                        alert("Cue sheet copied");
                      } catch {
                        alert("Copy failed");
                      }
                    }}
                    className="rounded-2xl border border-white/10 bg-white/10 px-3 py-1.5 text-[14px] hover:bg-white/20"
                    disabled={!cueSheet.length}
                    title="Copy cue sheet to clipboard"
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="mb-2 text-sm text-neutral-400">
                  Rotate gentle cues along the route. Edit (comma separated),
                  then copy to share.
                </p>
                <input
                  value={cueSeed}
                  onChange={(e) => setCueSeed(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
                  placeholder="sky,texture,quiet,edges,colors"
                />
                <ol className="mt-3 grid gap-2 md:grid-cols-2">
                  {cueSheet.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-neutral-100"
                    >
                      <div className="font-medium text-white">
                        {i + 1}. {c.text}
                      </div>
                      <div className="text-neutral-400">
                        {c.km.toFixed(2)} km from start
                      </div>
                    </li>
                  ))}
                  {!cueSheet.length && (
                    <div className="text-sm text-neutral-500">
                      Add points on the map to generate a cue sheet.
                    </div>
                  )}
                </ol>
              </div>

              {/* PLAN BOARD — forced light skin so buttons/inputs are visible */}
              <div className="rounded-xl border border-black/10 bg-white p-0 text-neutral-900 overflow-hidden">
                <div className="px-4 pt-4">
                  <h2 className="mb-2 text-lg font-semibold">
                    Plans, Invites & Cards
                  </h2>
                  <p className="mb-3 text-sm text-neutral-600">
                    Create a plan, invite friends with a link, and add cards.
                    Attach cards to route waypoints — they’ll show up when you
                    click that pin on the map.
                  </p>
                </div>

                <div className="planboard-skin px-4 pb-4 max-h-[60vh] overflow-auto">
                  <PlanBoard currentWaypointCount={points} />
                </div>
              </div>

              {/* Style overrides for PlanBoard so everything is readable */}
              <style jsx global>{`
                .planboard-skin {
                  --pb-bg: #ffffff;
                  --pb-muted: #6b7280;
                  --pb-border: #e5e7eb;
                  --pb-text: #111827;
                  --pb-btn: #111827;
                  --pb-btn-text: #ffffff;
                }
                .planboard-skin,
                .planboard-skin * {
                  color: var(--pb-text);
                }
                .planboard-skin input,
                .planboard-skin textarea,
                .planboard-skin select {
                  background: #fff !important;
                  color: var(--pb-text) !important;
                  border: 1px solid var(--pb-border) !important;
                  border-radius: 12px !important;
                }
                .planboard-skin button {
                  border-radius: 12px !important;
                }
                .planboard-skin .btn,
                .planboard-skin button:not(.ghost) {
                  background: var(--pb-btn) !important;
                  color: var(--pb-btn-text) !important;
                  border: 1px solid #000 !important;
                }
                .planboard-skin .ghost,
                .planboard-skin .secondary {
                  background: #f3f4f6 !important;
                  color: var(--pb-text) !important;
                  border: 1px solid var(--pb-border) !important;
                }
                .planboard-skin .card,
                .planboard-skin .panel,
                .planboard-skin .group,
                .planboard-skin .box {
                  background: #ffffff !important;
                  border: 1px solid var(--pb-border) !important;
                  border-radius: 14px !important;
                }
                .planboard-skin .muted,
                .planboard-skin .hint,
                .planboard-skin .help {
                  color: var(--pb-muted) !important;
                }
              `}</style>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
