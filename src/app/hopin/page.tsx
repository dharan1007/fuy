"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import type { LatLng, POICategory } from "@/components/leaflet-map";

/* ---------- dynamic imports ---------- */
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">Loading map...</div>,
});

const PlanBoard = dynamic(() => import("@/components/plan-board"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">Loading plans...</div>,
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

// Calculate calories based on MET (Metabolic Equivalent) values
function estimateCalories(distanceKm: number, activity: 'walk' | 'run' | 'bike', userWeightKg: number = 70) {
  const metValues = {
    walk: 3.5,
    run: 9.8,
    bike: 7.5,
  };

  const speeds = { walk: 5, run: 9, bike: 16 };
  const timeHours = distanceKm / speeds[activity];

  const calories = metValues[activity] * userWeightKg * timeHours;
  return Math.round(calories);
}

function estimateElevationGain(distanceKm: number, pointCount: number): number {
  if (pointCount < 2) return 0;
  const baseElevation = distanceKm * 12;
  const variation = (pointCount - 1) * 20;
  return Math.round(baseElevation + variation);
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
type TogetherBurnUser = {
  id: string;
  name: string;
  caloriesBurned: number;
};

export default function HopinPage() {
  const router = useRouter();
  const { distanceKm, isLoop, points, pts } = useLiveRoute();

  const ETA = {
    walk: hhmm(estimateHours(distanceKm, 5)),
    run: hhmm(estimateHours(distanceKm, 9)),
    bike: hhmm(estimateHours(distanceKm, 16)),
  };

  const kcal = useMemo(
    () => ({
      walk: estimateCalories(distanceKm, 'walk'),
      run: estimateCalories(distanceKm, 'run'),
      bike: estimateCalories(distanceKm, 'bike'),
    }),
    [distanceKm]
  );

  const elevationGain = useMemo(
    () => estimateElevationGain(distanceKm, points),
    [distanceKm, points]
  );

  const [cueSeed, setCueSeed] = useState("sky,texture,quiet,edges,colors");
  const cues = useMemo(
    () =>
      cueSeed
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
    [cueSeed]
  );

  const [basemapStyle, setBasemapStyle] =
    useState<"dark" | "light" | "sepia">("dark");
  const [activeCategory, setActiveCategory] =
    useState<POICategory | null>(null);

  // Custom calories and effort inputs
  const [customCalories, setCustomCalories] = useState<Record<string, string>>({
    walk: "",
    run: "",
    bike: "",
  });
  const [effortLevel, setEffortLevel] = useState<"easy" | "moderate" | "hard">("moderate");

  // Together burn feature
  const [togetherBurnUsers, setTogetherBurnUsers] = useState<TogetherBurnUser[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserCalories, setNewUserCalories] = useState("");

  const addTogetherBurnUser = () => {
    if (!newUserName.trim() || !newUserCalories.trim()) return;
    const newUser: TogetherBurnUser = {
      id: Date.now().toString(),
      name: newUserName,
      caloriesBurned: parseInt(newUserCalories, 10) || 0,
    };
    setTogetherBurnUsers([...togetherBurnUsers, newUser]);
    setNewUserName("");
    setNewUserCalories("");
  };

  const removeTogetherBurnUser = (id: string) => {
    setTogetherBurnUsers(togetherBurnUsers.filter(u => u.id !== id));
  };

  const totalTogetherBurn = useMemo(() => {
    return togetherBurnUsers.reduce((sum, user) => sum + user.caloriesBurned, 0);
  }, [togetherBurnUsers]);

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
    <div className="min-h-screen w-full bg-white dark:bg-neutral-900 dark:text-white flex flex-col">
      {/* Header */}
      <AppHeader title="Hopin" showBackButton />

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Map section - sticky at top */}
        <div className="w-full h-96 border-b border-gray-200 dark:border-neutral-700 overflow-hidden sticky top-0 z-40">
          <LeafletMap
            basemapStyle={basemapStyle}
            activeCategory={activeCategory}
            height="100%"
          />
        </div>

        {/* Content area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left sidebar - Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Route Stats */}
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-100 dark:border-blue-800 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Route Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Distance</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{fmt(distanceKm, "km")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Points</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{points}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Type</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{isLoop ? "Loop" : "A→B"}</span>
                  </div>
                </div>
              </div>

              {/* ETA */}
              <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-100 dark:border-green-800 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Estimated Time</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">🚶 Walking</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{ETA.walk}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">🚴 Cycling</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{ETA.bike}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">🏃 Running</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{ETA.run}</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-800 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">💡 Tips</h3>
                <ul className="space-y-1">
                  {suggestions.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">• {s}</li>
                  ))}
                </ul>
              </div>

              {/* Browse POIs */}
              <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-3">
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
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        activeCategory === label
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Style */}
              <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-3">
                  Map Style
                </div>
                <div className="flex gap-2">
                  {(["dark", "light", "sepia"] as const).map((s: string) => (
                    <button
                      key={s}
                      onClick={() => setBasemapStyle(s as "dark" | "light" | "sepia")}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                        basemapStyle === s
                          ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                          : "bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Card */}
              <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-blue-50 dark:bg-blue-950 p-3 text-sm">
                <div className="flex items-center justify-between text-gray-900 dark:text-white">
                  <span className="font-medium">Now</span>
                  <span className="font-semibold" suppressHydrationWarning>
                    {typeof window !== 'undefined' && new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="mt-1 text-gray-600 dark:text-gray-400">Good conditions for an adventure.</div>
              </div>
            </div>

            {/* Right columns - Main content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Effort & Calories Card with Custom Inputs */}
              <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 shadow p-6">
                <div className="mb-4 font-semibold text-gray-900 dark:text-white text-lg">🔥 Effort & Calories</div>

                {/* Effort Level Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Effort Level</label>
                  <select
                    value={effortLevel}
                    onChange={(e) => setEffortLevel(e.target.value as "easy" | "moderate" | "hard")}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Estimated Calories */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">🚶 Walk</p>
                    <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">{kcal.walk}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">kcal</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">🏃 Run</p>
                    <p className="text-lg font-semibold text-red-700 dark:text-red-300">{kcal.run}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">kcal</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">🚴 Bike</p>
                    <p className="text-lg font-semibold text-orange-600 dark:text-orange-300">{kcal.bike}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">kcal</p>
                  </div>
                </div>

                {/* Custom Calorie Inputs */}
                <div className="border-t border-orange-200 dark:border-orange-800 pt-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Custom Calories (Optional)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Walk"
                      value={customCalories.walk}
                      onChange={(e) => setCustomCalories({ ...customCalories, walk: e.target.value })}
                      className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Run"
                      value={customCalories.run}
                      onChange={(e) => setCustomCalories({ ...customCalories, run: e.target.value })}
                      className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Bike"
                      value={customCalories.bike}
                      onChange={(e) => setCustomCalories({ ...customCalories, bike: e.target.value })}
                      className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Elevation */}
                <div className="border-t border-orange-200 dark:border-orange-800 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">⛰️ Elevation Gain</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{elevationGain}m</span>
                  </div>
                </div>
              </div>

              {/* Together Burn Feature */}
              <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 shadow p-6">
                <div className="mb-4 font-semibold text-gray-900 dark:text-white text-lg">👥 Together Burn</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Add friends and track combined calories burned</p>

                {/* Add User Form */}
                <div className="mb-4 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Friend's name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Calories"
                      value={newUserCalories}
                      onChange={(e) => setNewUserCalories(e.target.value)}
                      className="px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={addTogetherBurnUser}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded font-medium text-sm transition-colors"
                    >
                      Add User
                    </button>
                  </div>
                </div>

                {/* Users List */}
                {togetherBurnUsers.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {togetherBurnUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between bg-white dark:bg-neutral-800 p-3 rounded border border-gray-200 dark:border-neutral-700">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user.caloriesBurned} kcal</p>
                        </div>
                        <button
                          onClick={() => removeTogetherBurnUser(user.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total Together Burn */}
                {togetherBurnUsers.length > 0 && (
                  <div className="border-t border-purple-200 dark:border-purple-800 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Together</span>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalTogetherBurn} kcal</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Route Shape & Export */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow p-5">
                  <div className="mb-2 font-semibold text-gray-900 dark:text-white text-lg">Route Shape</div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {isLoop
                      ? "🔄 Looks like a loop (start ≈ end)"
                      : "📍 Out & back / point-to-point"}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow p-5">
                  <div className="mb-2 font-semibold text-gray-900 dark:text-white text-lg">Export Data</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        download(
                          "route.gpx",
                          makeGpxFromPts(pts),
                          "application/gpx+xml"
                        )
                      }
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-3 py-2 text-sm font-medium transition-colors"
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
                      className="rounded-lg bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-3 py-2 text-sm font-medium transition-colors"
                    >
                      {"{ }"} JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Cue Sheet & Plans */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!cueSheet.length}
                      title="Copy cue sheet to clipboard"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                    Rotate gentle cues along the route. Edit (comma separated), then copy to share.
                  </p>
                  <input
                    value={cueSeed}
                    onChange={(e) => setCueSeed(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    placeholder="sky,texture,quiet,edges,colors"
                  />
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {cueSheet.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900 p-3 text-sm"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {i + 1}. {c.text}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                          {c.km.toFixed(2)} km from start
                        </div>
                      </div>
                    ))}
                    {!cueSheet.length && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 col-span-2 text-center py-4">
                        Add points on the map to generate a cue sheet.
                      </div>
                    )}
                  </div>
                </div>

                {/* PLAN BOARD */}
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-neutral-900 dark:to-purple-950 shadow p-0 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                    <h2 className="text-xl font-bold mb-2">
                      📋 Plans & Cards
                    </h2>
                    <p className="text-blue-100 text-sm leading-relaxed">
                      Organize your adventure! Create cards and track progress.
                    </p>
                  </div>

                  <div className="planboard-skin px-6 pb-6 max-h-[60vh] overflow-auto">
                    <PlanBoard currentWaypointCount={points} />
                  </div>
                </div>

                {/* Style overrides for PlanBoard */}
                <style jsx global>{`
                  .planboard-skin {
                    --pb-bg: #ffffff;
                    --pb-muted: #6b7280;
                    --pb-border: #e5e7eb;
                    --pb-text: #111827;
                    --pb-btn: #2563eb;
                    --pb-btn-text: #ffffff;
                  }
                  .planboard-skin,
                  .planboard-skin * {
                    color: var(--pb-text);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  }
                  .planboard-skin input,
                  .planboard-skin textarea,
                  .planboard-skin select {
                    background: #fff !important;
                    color: var(--pb-text) !important;
                    border: 1.5px solid var(--pb-border) !important;
                    border-radius: 8px !important;
                    padding: 10px 12px !important;
                    font-size: 14px !important;
                    transition: all 0.2s ease !important;
                  }
                  .planboard-skin input:focus,
                  .planboard-skin textarea:focus,
                  .planboard-skin select:focus {
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
                    outline: none !important;
                  }
                  .planboard-skin button {
                    border-radius: 8px !important;
                    font-weight: 600 !important;
                    transition: all 0.2s ease !important;
                  }
                  .planboard-skin .btn,
                  .planboard-skin button:not(.ghost) {
                    background: var(--pb-btn) !important;
                    color: var(--pb-btn-text) !important;
                    border: none !important;
                    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15) !important;
                  }
                  .planboard-skin .btn:hover,
                  .planboard-skin button:not(.ghost):hover {
                    background: #1d4ed8 !important;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
                    transform: translateY(-1px) !important;
                  }
                  .planboard-skin .ghost,
                  .planboard-skin .secondary {
                    background: #f9fafb !important;
                    color: var(--pb-text) !important;
                    border: 1.5px solid var(--pb-border) !important;
                  }
                  .planboard-skin .ghost:hover,
                  .planboard-skin .secondary:hover {
                    background: #f3f4f6 !important;
                    border-color: #d1d5db !important;
                  }
                  .planboard-skin .card,
                  .planboard-skin .panel,
                  .planboard-skin .group,
                  .planboard-skin .box {
                    background: #ffffff !important;
                    border: 1.5px solid #e5e7eb !important;
                    border-radius: 12px !important;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
                  }
                  .planboard-skin .card:hover,
                  .planboard-skin .panel:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
                    border-color: #d1d5db !important;
                  }
                  .planboard-skin .muted,
                  .planboard-skin .hint,
                  .planboard-skin .help {
                    color: var(--pb-muted) !important;
                    font-size: 13px !important;
                  }
                `}</style>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
