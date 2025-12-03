"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import StarfieldBackground from "@/components/LandingPage/StarfieldBackground";
import type { LatLng, POICategory } from "@/components/leaflet-map";

/* ---------- dynamic imports ---------- */
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-white/50">Loading map...</div>,
});

const PlanBoard = dynamic(() => import("@/components/plan-board"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-white/50">Loading plans...</div>,
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

function estimateHours(distanceKm: number, speedKmH: number) {
  if (!speedKmH) return 0;
  return distanceKm / speedKmH;
}

function hhmm(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatDistance(km: number): string {
  return `${km.toFixed(2)} km`;
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
  <trk><name>Hopin Route</name><trkseg>${trkpts}</trkseg></trk>
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
export default function HopinPage() {
  const { distanceKm, isLoop, points, pts } = useLiveRoute();

  const ETA = {
    walk: hhmm(estimateHours(distanceKm, 5)),
    run: hhmm(estimateHours(distanceKm, 9)),
    bike: hhmm(estimateHours(distanceKm, 16)),
  };

  const [cueSeed, setCueSeed] = useState("sky,texture,quiet,edges,colors");
  const cues = useMemo(
    () =>
      cueSeed
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
    [cueSeed]
  );

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
        "Keep it simple.",
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
    <div className="relative min-h-screen w-full bg-black text-white flex flex-col overflow-hidden font-sans">
      <StarfieldBackground />

      {/* Header */}
      <div className="relative z-20">
        <AppHeader title="Hopin" showBackButton />
      </div>

      {/* Main scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {/* Map section - sticky at top */}
        <div
          className="w-full border-b border-white/10"
          style={{
            height: '60vh',
            minHeight: '400px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            flexShrink: 0,
            display: 'block',
          }}
        >
          <div style={{ width: '100%', height: '100%' }}>
            <LeafletMap
              basemapStyle="dark"
              activeCategory={activeCategory}
              height="100%"
            />
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left sidebar - Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Route Stats */}
              <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">Route Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Distance</span>
                    <span className="font-light text-xl text-white">{formatDistance(distanceKm)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Points</span>
                    <span className="font-light text-xl text-white">{points}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Type</span>
                    <span className="font-light text-xl text-white">{isLoop ? "Loop" : "A→B"}</span>
                  </div>
                </div>
              </div>

              {/* ETA */}
              <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">Estimated Time</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">🚶 Walking</span>
                    <span className="font-light text-white">{ETA.walk}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">🚴 Cycling</span>
                    <span className="font-light text-white">{ETA.bike}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">🏃 Running</span>
                    <span className="font-light text-white">{ETA.run}</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Tips</h3>
                <ul className="space-y-2">
                  {suggestions.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-neutral-300 leading-relaxed">• {s}</li>
                  ))}
                </ul>
              </div>

              {/* Browse POIs */}
              <div>
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-3">
                  Browse POIs
                </div>
                <div className="space-y-2">
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
                  ).map((label: POICategory) => (
                    <button
                      key={label}
                      onClick={() =>
                        setActiveCategory((c: POICategory | null) => (c === label ? null : label))
                      }
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-all border ${activeCategory === label
                        ? "bg-white text-black border-white font-medium"
                        : "bg-transparent text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Card */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-sm">
                <div className="flex items-center justify-between text-white">
                  <span className="font-medium text-neutral-400">Now</span>
                  <span className="font-light text-lg" suppressHydrationWarning>
                    {typeof window !== 'undefined' && new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-500">Good conditions for an adventure.</div>
              </div>
            </div>

            {/* Right columns - Main content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Route Shape & Export */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6">
                  <div className="mb-2 font-light text-white text-lg">Route Shape</div>
                  <div className="text-neutral-400">
                    {isLoop
                      ? "🔄 Looks like a loop (start ≈ end)"
                      : "📍 Out & back / point-to-point"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6">
                  <div className="mb-4 font-light text-white text-lg">Export Data</div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() =>
                        download(
                          "route.gpx",
                          makeGpxFromPts(pts),
                          "application/gpx+xml"
                        )
                      }
                      className="rounded-xl bg-white text-black hover:bg-neutral-200 px-4 py-2 text-sm font-medium transition-colors"
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
                      className="rounded-xl bg-transparent border border-white/20 text-white hover:bg-white/10 px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {"{ }"} JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Cue Sheet */}
              <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-light text-white">
                    Attention Cue Sheet
                  </h2>
                  <button
                    onClick={async () => {
                      const lines = (cueSheet || [])
                        .map(
                          (c: any, i: number) => `${i + 1}. ${c.text} — ${c.km.toFixed(2)} km`
                        )
                        .join("\n");
                      try {
                        await navigator.clipboard.writeText(lines);
                        alert("Cue sheet copied!");
                      } catch {
                        alert("Copy failed");
                      }
                    }}
                    className="rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!cueSheet.length}
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="mb-4 text-sm text-neutral-400">
                  Rotate gentle cues along the route. Edit (comma separated), then copy to share.
                </p>
                <input
                  value={cueSeed}
                  onChange={(e) => setCueSeed(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30 placeholder:text-neutral-600 transition-colors"
                  placeholder="sky,texture,quiet,edges,colors"
                />
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cueSheet.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm"
                    >
                      <div className="font-medium text-white">
                        {i + 1}. {c.text}
                      </div>
                      <div className="text-neutral-500 text-xs mt-1">
                        {c.km.toFixed(2)} km from start
                      </div>
                    </div>
                  ))}
                  {!cueSheet.length && (
                    <div className="text-sm text-neutral-500 col-span-2 text-center py-6">
                      Add points on the map to generate a cue sheet.
                    </div>
                  )}
                </div>
              </div>

              {/* PLAN BOARD - Full Width */}
              <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden">
                <div className="border-b border-white/10 px-6 py-5 bg-white/5">
                  <h2 className="text-xl font-light text-white mb-1">
                    Plans
                  </h2>
                  <p className="text-neutral-400 text-sm">
                    Organize your adventure! Create cards and track progress.
                  </p>
                </div>

                <div className="planboard-skin px-6 pb-6 max-h-[60vh] overflow-auto">
                  <PlanBoard currentWaypointCount={points} />
                </div>
              </div>

              {/* Style overrides for PlanBoard to match monochrome theme */}
              <style jsx global>{`
                .planboard-skin {
                  --pb-bg: transparent;
                  --pb-muted: #a3a3a3;
                  --pb-border: rgba(255,255,255,0.1);
                  --pb-text: #ffffff;
                  --pb-btn: #ffffff;
                  --pb-btn-text: #000000;
                }
                .planboard-skin,
                .planboard-skin * {
                  color: var(--pb-text);
                  font-family: inherit;
                }
                .planboard-skin input,
                .planboard-skin textarea,
                .planboard-skin select {
                  background: rgba(255,255,255,0.05) !important;
                  color: #fff !important;
                  border: 1px solid rgba(255,255,255,0.1) !important;
                  border-radius: 12px !important;
                  padding: 10px 12px !important;
                  font-size: 14px !important;
                }
                .planboard-skin input:focus,
                .planboard-skin textarea:focus,
                .planboard-skin select:focus {
                  border-color: rgba(255,255,255,0.3) !important;
                  outline: none !important;
                }
                .planboard-skin button {
                  border-radius: 12px !important;
                  font-weight: 500 !important;
                }
                .planboard-skin .btn,
                .planboard-skin button:not(.ghost) {
                  background: var(--pb-btn) !important;
                  color: var(--pb-btn-text) !important;
                  border: none !important;
                }
                .planboard-skin .btn:hover,
                .planboard-skin button:not(.ghost):hover {
                  background: #e5e5e5 !important;
                }
                .planboard-skin .ghost,
                .planboard-skin .secondary {
                  background: transparent !important;
                  color: #fff !important;
                  border: 1px solid rgba(255,255,255,0.2) !important;
                }
                .planboard-skin .ghost:hover,
                .planboard-skin .secondary:hover {
                  background: rgba(255,255,255,0.1) !important;
                }
                .planboard-skin .card,
                .planboard-skin .panel,
                .planboard-skin .group,
                .planboard-skin .box {
                  background: rgba(255,255,255,0.03) !important;
                  border: 1px solid rgba(255,255,255,0.1) !important;
                  border-radius: 16px !important;
                  box-shadow: none !important;
                  backdrop-filter: blur(10px);
                }
                .planboard-skin .card:hover,
                .planboard-skin .panel:hover {
                  border-color: rgba(255,255,255,0.2) !important;
                  background: rgba(255,255,255,0.05) !important;
                }
              `}</style>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
