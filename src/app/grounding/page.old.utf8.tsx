"use client";

import { useState } from "react";
import StressMapAdvanced from "@/components/grounding/stress-map-advanced";
import WorkoutTracker from "@/components/grounding/workout-tracker";
import HealthTracker from "@/components/grounding/health-tracker";

type Module = "map" | "workout" | "health";

export default function GroundingPage() {
  const [active, setActive] = useState<Module>("workout");

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Wellness Hub</h1>
        <p className="text-lg text-gray-600">
          Track your fitness journey, monitor your health, and manage stress with integrated insights
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 flex-wrap border-b border-gray-200 pb-4">
        <button
          onClick={() => setActive("workout")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            active === "workout"
              ? "bg-black text-white"
              : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
          }`}
        >
          Workout Tracker
        </button>
        <button
          onClick={() => setActive("health")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            active === "health"
              ? "bg-black text-white"
              : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
          }`}
        >
          Health Tracker
        </button>
        <button
          onClick={() => setActive("map")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            active === "map"
              ? "bg-black text-white"
              : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
          }`}
        >
          Stress Map
        </button>
      </div>

      {/* Content */}
      <div className="mt-8">
        {active === "workout" && <WorkoutTracker />}
        {active === "health" && <HealthTracker />}
        {active === "map" && <StressMapAdvanced />}
      </div>
    </section>
  );
}
