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
    <div className="fixed inset-0 w-full h-full bg-black text-white flex flex-col font-sans overflow-hidden">
      <StarfieldBackground />

      {/* Header - Fixed Height */}
      <div className="relative z-20 flex-shrink-0">
        <AppHeader title="Hopin" showBackButton />
      </div>

      {/* Main Layout: Side-by-Side - Fills remaining height */}
      <div className="relative z-10 flex flex-1 w-full overflow-hidden">

        {/* Left Sidebar (25% or fixed width) */}
        <div className="w-[320px] lg:w-[25%] flex-shrink-0 h-full border-r border-white/10 bg-black/40 backdrop-blur-md overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-6 pb-20">
            {/* ... Content remains the same ... */}

            {/* 1. Route Stats */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Route Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-neutral-400 block">Distance</span>
                  <span className="font-light text-lg text-white">{formatDistance(distanceKm)}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block">Points</span>
                  <span className="font-light text-lg text-white">{points}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-neutral-400 block">Type</span>
                  <span className="font-light text-white">{isLoop ? "Loop" : "A→B"}</span>
                </div>
              </div>
            </div>

            {/* 2. ETA */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Est. Time</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">🚶 Walk</span>
                  <span className="text-white">{ETA.walk}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">🚴 Cycle</span>
                  <span className="text-white">{ETA.bike}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">🏃 Run</span>
                  <span className="text-white">{ETA.run}</span>
                </div>
              </div>
            </div>

            {/* 3. Export Data */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Export</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => download("route.gpx", makeGpxFromPts(pts), "application/gpx+xml")}
                  className="flex-1 rounded-lg bg-white text-black hover:bg-neutral-200 py-2 text-xs font-bold transition-colors"
                >
                  GPX
                </button>
                <button
                  onClick={() => download("route.json", JSON.stringify(makeGeoJSONFromPts(pts), null, 2), "application/json")}
                  className="flex-1 rounded-lg bg-transparent border border-white/20 text-white hover:bg-white/10 py-2 text-xs font-bold transition-colors"
                >
                  JSON
                </button>
              </div>
            </div>

            {/* 4. POIs */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-2">
                Browse POIs
              </div>
              <div className="space-y-1.5">
                {(["ATMs", "Bus Stops", "Cafés", "Emergencies", "Museums", "Parkings", "Restaurants", "Sport Centers"] as POICategory[]).map((label) => (
                  <button
                    key={label}
                    onClick={() => setActiveCategory((c) => (c === label ? null : label))}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-all border ${activeCategory === label
                      ? "bg-white text-black border-white font-medium"
                      : "bg-transparent text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Tips */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Tips</h3>
              <ul className="space-y-1">
                {suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-neutral-300 leading-relaxed">• {s}</li>
                ))}
              </ul>
            </div>

            {/* 6. Plan Board */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 overflow-hidden">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-2">Plans</h3>
              <div className="planboard-skin text-xs overflow-x-auto pb-2">
                <div className="min-w-[280px]">
                  <PlanBoard currentWaypointCount={points} />
                </div>
              </div>
            </div>

            {/* 7. Cue Sheet */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Cues</h3>
                <button
                  onClick={async () => {
                    const lines = (cueSheet || []).map((c: any, i: number) => `${i + 1}. ${c.text} — ${c.km.toFixed(2)} km`).join("\n");
                    try { await navigator.clipboard.writeText(lines); alert("Copied!"); } catch { }
                  }}
                  className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white"
                  disabled={!cueSheet.length}
                >
                  Copy
                </button>
              </div>
              <input
                value={cueSeed}
                onChange={(e) => setCueSeed(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-white/30 mb-3"
                placeholder="sky,texture..."
              />
              <div className="space-y-2">
                {cueSheet.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="rounded border border-white/5 bg-white/5 p-2 text-xs">
                    <span className="font-medium text-white">{i + 1}. {c.text}</span>
                    <span className="block text-neutral-500 text-[10px]">{c.km.toFixed(2)} km</span>
                  </div>
                ))}
                {cueSheet.length > 5 && <div className="text-[10px] text-center text-white/40">+{cueSheet.length - 5} more</div>}
              </div>
            </div>

            {/* Time */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs flex justify-between items-center">
              <span className="text-neutral-400">Local Time</span>
              <span className="text-white font-mono" suppressHydrationWarning>
                {typeof window !== 'undefined' && new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

          </div>
        </div>

        {/* Right Map (Flex Grow) */}
        <div className="flex-1 h-full relative z-0 bg-neutral-900 border-l border-white/10">
          {/* Debug background color removed, assuming it works now */}
          {/* Using key to force re-render if needed, but flex layout should handle it */}
          <LeafletMap basemapStyle="dark" activeCategory={activeCategory} height="100%" />
        </div>

      </div>

      {/* Styles for PlanBoard (Compact) */}
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
                  border-radius: 8px !important;
                  padding: 8px 10px !important;
                  font-size: 12px !important;
                  width: 100% !important;
                }
                .planboard-skin input:focus,
                .planboard-skin textarea:focus,
                .planboard-skin select:focus {
                  border-color: rgba(255,255,255,0.3) !important;
                  outline: none !important;
                }
                .planboard-skin button {
                  border-radius: 8px !important;
                  font-weight: 500 !important;
                  font-size: 11px !important;
                  padding: 4px 8px !important;
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
                  background: #000000 !important;
                  border: 1px solid rgba(255,255,255,0.15) !important;
                  border-radius: 8px !important;
                  box-shadow: none !important;
                  backdrop-filter: blur(10px);
                  padding: 8px !important;
                  margin-bottom: 6px !important;
                }
                .planboard-skin .card:hover,
                .planboard-skin .panel:hover {
                  border-color: rgba(255,255,255,0.4) !important;
                  background: #000000 !important;
                }
              `}</style>
    </div>
  );
}
