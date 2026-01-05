"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import StarfieldBackground from "@/components/LandingPage/StarfieldBackground";
import type { LatLng, POICategory } from "@/components/leaflet-map";
import CreatePlanModal from "@/components/CreatePlanModal";
import HopinDashboard from "@/components/HopinDashboard";
import { Plus, Search, X, Eye, EyeOff, MapPin } from "lucide-react";

/* ---------- dynamic imports ---------- */
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-white/50">Loading map...</div>,
});
const EventDetailSidebar = dynamic(() => import("@/components/Hopin/EventDetailSidebar"), { ssr: false });
const WaypointDetailSidebar = dynamic(() => import("@/components/Hopin/WaypointDetailSidebar"), { ssr: false });

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
  // Initialize with empty array to match server SSR
  const [pts, setPts] = useState<LatLng[]>([]);

  useEffect(() => {
    // Initial load from local storage after mount
    setPts(pointsFromLocal());

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

  // --- State ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{ name: string, lat: number, lng: number } | undefined>(undefined);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<POICategory | null>(null);
  const [showEventMarkers, setShowEventMarkers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<{ lat: number; lng: number; label: string; index: number } | null>(null);

  // --- Effects ---
  useEffect(() => {
    const handler = (e: any) => {
      setSelectedMapLocation(e.detail);
      setIsCreateOpen(true);
    };
    window.addEventListener('hopin:create-at-location', handler);
    return () => window.removeEventListener('hopin:create-at-location', handler);
  }, []);

  const fetchPlans = useCallback((bounds?: any, zoom?: number) => {
    const params = new URLSearchParams({ mode: 'map' });
    if (bounds) {
      params.set("minLat", bounds.minLat.toString());
      params.set("maxLat", bounds.maxLat.toString());
      params.set("minLng", bounds.minLng.toString());
      params.set("maxLng", bounds.maxLng.toString());
    }
    if (zoom) {
      params.set("zoom", zoom.toString());
    }

    fetch(`/api/hopin/plans?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchPlans(); // Initial fetch (will get global popular or recent)
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/hopin/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.events || []);
        setShowSearchResults(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Helpers / Memos ---
  const ETA = {
    walk: hhmm(estimateHours(distanceKm, 5)),
    run: hhmm(estimateHours(distanceKm, 9)),
    bike: hhmm(estimateHours(distanceKm, 16)),
  };

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
            {/* Search Bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events or places..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                  className="absolute right-3 top-2.5 text-neutral-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/10 rounded-xl max-h-60 overflow-y-auto z-50">
                  {searchResults.map((event: any) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedPlan(event);
                        setSearchQuery("");
                        setShowSearchResults(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-neutral-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-white">{event.title}</div>
                          <div className="text-xs text-neutral-500">{event.location || 'No location'}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {isSearching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/10 rounded-xl p-4 text-center text-sm text-neutral-500">
                  Searching...
                </div>
              )}
            </div>

            {/* Event Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                {showEventMarkers ? <Eye size={16} className="text-neutral-400" /> : <EyeOff size={16} className="text-neutral-400" />}
                <span className="text-sm text-neutral-300">Show Events</span>
              </div>
              <button
                onClick={() => setShowEventMarkers(!showEventMarkers)}
                className={`w-10 h-5 rounded-full transition-colors relative ${showEventMarkers ? 'bg-white' : 'bg-neutral-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${showEventMarkers ? 'left-5 bg-black' : 'left-0.5 bg-neutral-500'}`} />
              </button>
            </div>

            {/* 1. Route Stats */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">Route Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-sm text-neutral-400 block">Distance</span>
                  <span className="font-light text-xl text-white">{formatDistance(distanceKm)}</span>
                </div>
                <div>
                  <span className="text-sm text-neutral-400 block">Points</span>
                  <span className="font-light text-xl text-white">{points}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-neutral-400 block">Type</span>
                  <span className="font-light text-white">{isLoop ? "Loop" : "A→B"}</span>
                </div>
              </div>
            </div>

            {/* Dashboard & Plans */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Your Plans</h3>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="p-1.5 bg-white hover:bg-neutral-200 text-black rounded"
                >
                  <Plus size={16} />
                </button>
              </div>

              <Link href="/hopin/dashboard" className="block w-full bg-white/5 border border-white/10 rounded-lg p-3 text-center text-sm hover:bg-white/10 transition-colors text-neutral-300 hover:text-white">
                Go to Dashboard
              </Link>
            </div>

            {/* 3. Export Data */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">Export</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => download("route.gpx", makeGpxFromPts(pts), "application/gpx+xml")}
                  className="flex-1 rounded-lg bg-white text-black hover:bg-neutral-200 py-2.5 text-sm font-bold transition-colors"
                >
                  GPX
                </button>
                <button
                  onClick={() => download("route.json", JSON.stringify(makeGeoJSONFromPts(pts), null, 2), "application/json")}
                  className="flex-1 rounded-lg bg-transparent border border-white/20 text-white hover:bg-white/10 py-2.5 text-sm font-bold transition-colors"
                >
                  JSON
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-2">Tips</h3>
              <ul className="space-y-1">
                {suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-neutral-300 leading-relaxed">• {s}</li>
                ))}
              </ul>
            </div>

            {/* Time */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm flex justify-between items-center">
              <span className="text-neutral-400">Local Time</span>
              <span className="text-white font-mono" suppressHydrationWarning>
                {typeof window !== 'undefined' && new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

          </div>
        </div>

        {/* Right Map (Flex Grow) */}
        <div className="flex-1 h-full relative z-0 bg-neutral-900 border-l border-white/10">
          <LeafletMap
            basemapStyle="dark"
            activeCategory={activeCategory}
            height="100%"
            onCreatePlan={(loc) => {
              console.log("Create plan at", loc);
              setSelectedMapLocation({ ...loc, name: loc.name || "Custom Location" });
              setIsCreateOpen(true);
            }}
            plans={showEventMarkers ? plans : []}
            onSelectPlan={(plan) => setSelectedPlan(plan)}
            onSelectWaypoint={(waypoint) => setSelectedWaypoint(waypoint)}
            onMapMove={(bounds, zoom) => fetchPlans(bounds, zoom)}
          />
        </div>

      </div>

      <CreatePlanModal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setSelectedMapLocation(undefined); }}
        currentLocation={selectedMapLocation ? `${selectedMapLocation.name} (${selectedMapLocation.lat.toFixed(4)}, ${selectedMapLocation.lng.toFixed(4)})` : undefined}
        locationData={selectedMapLocation}
      />

      <EventDetailSidebar
        isOpen={!!selectedPlan}
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />

      <WaypointDetailSidebar
        isOpen={!!selectedWaypoint}
        waypoint={selectedWaypoint}
        onClose={() => setSelectedWaypoint(null)}
        onCreatePlan={(loc) => {
          setSelectedMapLocation({ ...loc, name: loc.name || "Custom Location" });
          setIsCreateOpen(true);
          setSelectedWaypoint(null);
        }}
      />

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
                  outline: none !important;
                }
                .planboard-skin input:focus,
                .planboard-skin textarea:focus,
                .planboard-skin select:focus {
                  border-color: rgba(255,255,255,0.3) !important;
                  outline: none !important;
                  box-shadow: none !important;
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
