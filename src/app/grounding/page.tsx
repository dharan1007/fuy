"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { LatLng } from "@/components/leaflet-map";

/* ---------- dynamic imports ---------- */
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">Loading map...</div>,
});

const StressMapAdvanced = dynamic(() => import("@/components/grounding/stress-map-advanced"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">Loading stress map...</div>,
});

const WorkoutTracker = dynamic(() => import("@/components/grounding/workout-tracker"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">Loading workout tracker...</div>,
});

const HealthTracker = dynamic(() => import("@/components/grounding/health-tracker"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">Loading health tracker...</div>,
});

/* ---------- types ---------- */
type Module = "map" | "workout" | "health" | "activity-training";
type ActivityType = "walk" | "run" | "bike";

type TogetherBurnUser = {
  id: string;
  name: string;
  caloriesBurned: number;
};

type ActivityMetrics = {
  distance: number;
  duration: number;
  calories: number;
  elevation: number;
  speed: number;
};

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

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatDistance(km: number): string {
  return `${km.toFixed(2)} km`;
}

function estimateCalories(distanceKm: number, activity: ActivityType, userWeightKg: number = 70) {
  const metValues = { walk: 3.5, run: 9.8, bike: 7.5 };
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

function useLiveRoute() {
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

  const metrics = useMemo(() => {
    const len = pts.length;
    let km = 0;
    for (let i = 1; i < len; i++) km += haversineKm(pts[i - 1], pts[i]);
    const isLoop = len > 2 && haversineKm(pts[0], pts[len - 1]) < 0.05;
    return { distanceKm: km, isLoop, points: len, pts };
  }, [pts]);

  return metrics;
}

/* ---------- page ---------- */
export default function GroundingPage() {
  const router = useRouter();
  const { distanceKm, isLoop, points, pts } = useLiveRoute();
  const [active, setActive] = useState<Module>("map");

  // Activity tracking
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [effortLevel, setEffortLevel] = useState<"easy" | "moderate" | "hard">("moderate");
  const [customCalories, setCustomCalories] = useState<Record<ActivityType, string>>({
    walk: "",
    run: "",
    bike: "",
  });

  // Together burn feature
  const [togetherBurnUsers, setTogetherBurnUsers] = useState<TogetherBurnUser[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserCalories, setNewUserCalories] = useState("");

  // Map styling
  const [basemapStyle, setBasemapStyle] = useState<"dark" | "light" | "sepia">("dark");

  // Calculated metrics
  const activityMetrics = useMemo<Record<ActivityType, ActivityMetrics>>(() => {
    return {
      walk: {
        distance: distanceKm,
        duration: estimateHours(distanceKm, 5),
        calories: estimateCalories(distanceKm, "walk"),
        elevation: estimateElevationGain(distanceKm, points),
        speed: 5,
      },
      run: {
        distance: distanceKm,
        duration: estimateHours(distanceKm, 9),
        calories: estimateCalories(distanceKm, "run"),
        elevation: estimateElevationGain(distanceKm, points),
        speed: 9,
      },
      bike: {
        distance: distanceKm,
        duration: estimateHours(distanceKm, 16),
        calories: estimateCalories(distanceKm, "bike"),
        elevation: estimateElevationGain(distanceKm, points),
        speed: 16,
      },
    };
  }, [distanceKm, points]);

  const currentMetrics = activityMetrics[activityType];
  const totalTogetherBurn = useMemo(
    () => togetherBurnUsers.reduce((sum, user) => sum + user.caloriesBurned, 0),
    [togetherBurnUsers]
  );

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

  return (
    <section className="space-y-8 p-6 min-h-screen bg-white dark:bg-neutral-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-neutral-700">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Wellness Hub</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Track your fitness journey, monitor your health, and manage stress with integrated insights
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 flex-wrap border-b border-gray-200 dark:border-neutral-700 pb-4">
        <button
          onClick={() => setActive("workout")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            active === "workout"
              ? "bg-blue-600 dark:bg-blue-500 text-white"
              : "bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
          }`}
        >
          Workout Tracker
        </button>
        <button
          onClick={() => setActive("health")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            active === "health"
              ? "bg-blue-600 dark:bg-blue-500 text-white"
              : "bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
          }`}
        >
          Health Tracker
        </button>
        <button
          onClick={() => setActive("map")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            active === "map"
              ? "bg-blue-600 dark:bg-blue-500 text-white"
              : "bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
          }`}
        >
          Stress Map
        </button>
        <button
          onClick={() => setActive("activity-training")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            active === "activity-training"
              ? "bg-blue-600 dark:bg-blue-500 text-white"
              : "bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
          }`}
        >
          Activity Training Maps
        </button>
      </div>

      {/* Content */}
      <div className="mt-8">
        {active === "workout" && <WorkoutTracker />}
        {active === "health" && <HealthTracker />}
        {active === "map" && <StressMapAdvanced />}

        {/* Activity Training Maps Section */}
        {active === "activity-training" && (
          <div className="space-y-8">
            {/* Activity Type Selector */}
            <div className="flex gap-3 flex-wrap">
              {(["walk", "run", "bike"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActivityType(type)}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all capitalize ${
                    activityType === type
                      ? "bg-blue-600 dark:bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Main Grid - Map and Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left: Map (3 columns) */}
              <div className="lg:col-span-3">
                <div
                  className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden shadow-lg"
                  style={{ height: "500px", width: "100%", position: "relative", display: "block" }}
                >
                  <LeafletMap
                    basemapStyle={basemapStyle}
                    activeCategory={null}
                    height="500px"
                  />
                </div>
              </div>

              {/* Right: Quick Stats (2 columns) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Primary Metrics Card */}
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 shadow">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
                    Activity Overview
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Distance</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDistance(currentMetrics.distance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(currentMetrics.duration)}</p>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Calories Burned</p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{currentMetrics.calories}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">kcal</p>
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase font-semibold">Elevation</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{currentMetrics.elevation}m</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase font-semibold">Speed</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{currentMetrics.speed} km/h</p>
                  </div>
                </div>

                {/* Map Style Selector */}
                <div className="flex gap-2">
                  {(["dark", "light", "sepia"] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setBasemapStyle(style)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                        basemapStyle === style
                          ? "bg-blue-600 dark:bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Effort Level & Custom Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Effort Level */}
              <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-4">Effort Level</label>
                <select
                  value={effortLevel}
                  onChange={(e) => setEffortLevel(e.target.value as "easy" | "moderate" | "hard")}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Route Type */}
              <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-4">Route Type</label>
                <div className="text-lg text-gray-700 dark:text-gray-300">
                  {isLoop ? "Loop" : "Point-to-Point"}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {points} waypoints
                </p>
              </div>
            </div>

            {/* Custom Calories & Burn Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Custom Calories Input */}
              <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Custom Calories</h3>
                <div className="space-y-2">
                  {(["walk", "run", "bike"] as const).map((type) => (
                    <input
                      key={type}
                      type="number"
                      placeholder={`${type} (optional)`}
                      value={customCalories[type]}
                      onChange={(e) =>
                        setCustomCalories({ ...customCalories, [type]: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-orange-300 dark:border-orange-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  ))}
                </div>
              </div>

              {/* Group Burn Stats */}
              <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Group Burn</h3>
                <div className="text-center py-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Total Group Calories</p>
                  <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{totalTogetherBurn}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">kcal</p>
                  {togetherBurnUsers.length > 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                      {togetherBurnUsers.length} {togetherBurnUsers.length === 1 ? "person" : "people"} included
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Add Friends / Together Burn */}
            <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Friends</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Friend's name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Calories burned"
                  value={newUserCalories}
                  onChange={(e) => setNewUserCalories(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                />
                <button
                  onClick={addTogetherBurnUser}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add Friend
                </button>
              </div>

              {/* Friends List */}
              {togetherBurnUsers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {togetherBurnUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.caloriesBurned} kcal</p>
                      </div>
                      <button
                        onClick={() => removeTogetherBurnUser(user.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Breakdown - All Activity Types */}
            <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Activity Comparison</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(["walk", "run", "bike"] as const).map((type) => {
                  const m = activityMetrics[type];
                  return (
                    <div
                      key={type}
                      className={`rounded-lg p-4 border ${
                        activityType === type
                          ? "bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-600"
                          : "bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700"
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize mb-3">{type}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Distance</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatDistance(m.distance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Time</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatDuration(m.duration)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Calories</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">{m.calories}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Elevation</span>
                          <span className="font-medium text-gray-900 dark:text-white">{m.elevation}m</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
