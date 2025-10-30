"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { LatLng, POICategory } from "@/components/leaflet-map";

/* ---------- dynamic imports ---------- */
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
});

const PlanBoard = dynamic(() => import("@/components/plan-board"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading plans...</div>,
});

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
  const router = useRouter();
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
    <div className="h-screen w-full overflow-hidden bg-white">
      {/* Grid layout: sidebar | main */}
      <div className="grid grid-cols-[350px_1fr] h-full gap-0">
        {/* ===== LEFT SIDEBAR ===== */}
        <aside className="border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Awe Routes</h1>
                <p className="text-xs text-gray-500">Plan your adventure</p>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Current Stats Card */}
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Route Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Distance</span>
                  <span className="font-semibold text-gray-900">{fmt(distanceKm, "km")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Points</span>
                  <span className="font-semibold text-gray-900">{points}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Type</span>
                  <span className="font-semibold text-gray-900">{isLoop ? "Loop" : "A→B"}</span>
                </div>
              </div>
            </div>

            {/* ETA Card */}
            <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Estimated Time</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">🚶 Walking</span>
                  <span className="font-semibold text-gray-900">{ETA.walk}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">🚴 Cycling</span>
                  <span className="font-semibold text-gray-900">{ETA.bike}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">🏃 Running</span>
                  <span className="font-semibold text-gray-900">{ETA.run}</span>
                </div>
              </div>
            </div>

            {/* Tips Section */}
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">💡 Tips</h3>
              <ul className="space-y-1">
                {suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed">• {s}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
              Browse POIs
            </div>
            <div className="mt-2 grid gap-1">
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
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    activeCategory === label
                      ? "bg-blue-100 text-blue-900 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
              Map Style
            </div>
            <div className="mt-2 flex gap-2">
              {(["dark", "light", "sepia"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setBasemapStyle(s)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    basemapStyle === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-blue-50 p-3 text-sm">
              <div className="flex items-center justify-between text-gray-900">
                <span className="font-medium">Now</span>
                <span className="font-semibold" suppressHydrationWarning>
                  {typeof window !== 'undefined' && new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="mt-1 text-gray-600">Good conditions for an adventure.</div>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 overflow-hidden p-0 flex flex-col">
          {/* Map - Takes 65% of space */}
          <div style={{ flex: "1 1 auto", minHeight: "65%" }} className="overflow-hidden border-b border-gray-200">
            <LeafletMap
              basemapStyle={basemapStyle}
              activeCategory={activeCategory}
              height="100%"
            />
          </div>

          {/* Content below map - Scrollable, takes 35% */}
          <div style={{ flex: "0 1 35%" }} className="overflow-y-auto p-6 space-y-6 bg-white">

          {/* Info row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white shadow p-5">
              <div className="mb-2 font-semibold text-gray-900 text-lg">
                Effort & Calories
              </div>
              <div className="text-gray-700 space-y-1">
                <div>🚶 Walk: <span className="font-medium">~{kcal.walk} kcal</span></div>
                <div>🏃 Run: <span className="font-medium">~{kcal.run} kcal</span></div>
                <div>🚴 Bike: <span className="font-medium">~{kcal.bike} kcal</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow p-5">
              <div className="mb-2 font-semibold text-gray-900 text-lg">Route Shape</div>
              <div className="text-gray-700">
                {isLoop
                  ? "🔄 Looks like a loop (start ≈ end)"
                  : "📍 Out & back / point-to-point"}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow p-5">
              <div className="mb-2 font-semibold text-gray-900 text-lg">Export Data</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    download(
                      "route.gpx",
                      makeGpxFromPts(pts),
                      "application/gpx+xml"
                    )
                  }
                  className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  ⤓ GPX
                </button>
                <button
                  onClick={() =>
                    download(
                      "route.json",
                      JSON.stringify(makeGeoJSONFromPts(pts), null, 2),
                      "application/json"
                    )
                  }
                  className="rounded-lg bg-gray-700 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  {"{ }"} JSON
                </button>
              </div>
            </div>
          </div>

          {/* Cue sheet + Plans */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
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
                      alert("Cue sheet copied!");
                    } catch {
                      alert("Copy failed");
                    }
                  }}
                  className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!cueSheet.length}
                  title="Copy cue sheet to clipboard"
                >
                  📋 Copy
                </button>
              </div>
              <p className="mb-3 text-sm text-gray-600">
                Rotate gentle cues along the route. Edit (comma separated),
                then copy to share.
              </p>
              <input
                value={cueSeed}
                onChange={(e) => setCueSeed(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                placeholder="sky,texture,quiet,edges,colors"
              />
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {cueSheet.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {i + 1}. {c.text}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {c.km.toFixed(2)} km from start
                    </div>
                  </div>
                ))}
                {!cueSheet.length && (
                  <div className="text-sm text-gray-500 col-span-2 text-center py-4">
                    Add points on the map to generate a cue sheet.
                  </div>
                )}
              </div>
            </div>

            {/* PLAN BOARD */}
            <div className="rounded-xl border border-gray-200 bg-white shadow p-0 overflow-hidden">
              <div className="px-4 pt-4">
                <h2 className="mb-2 text-lg font-semibold">
                  Plans, Invites & Cards
                </h2>
                <p className="mb-3 text-sm text-neutral-600">
                  Create a plan, invite friends with a link, and add cards.
                  Attach cards to route waypoints — they'll show up when you
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
          </div>
        </main>
      </div>
    </div>
  );
}
