"use client";

import { useState } from "react";
import StressMapAdvanced from "@/components/grounding/stress-map-advanced";
// You can keep other modules too:
import CognitiveSwitchboard from "@/components/grounding/cognitive-switchboard";
import PulseTracker from "@/components/grounding/pulse-tracker";
import CalmBuilder from "@/components/grounding/calm-builder";

type Module = "map" | "switchboard" | "pulse" | "builder";

export default function GroundingPage() {
  const [active, setActive] = useState<Module>("map");

  return (
    <section className="grid gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Grounding Hub</h1>
          <p className="text-neutral-500 mt-1">Interactive modules to map tension, build calm, and learn your patterns.</p>
        </div>
        <div className="flex gap-2">
          <button className={`btn ${active==="map"?"btn-primary":"btn-ghost"}`} onClick={()=>setActive("map")}>Stress Map</button>
          <button className={`btn ${active==="switchboard"?"btn-primary":"btn-ghost"}`} onClick={()=>setActive("switchboard")}>Switchboard</button>
          <button className={`btn ${active==="pulse"?"btn-primary":"btn-ghost"}`} onClick={()=>setActive("pulse")}>Pulse</button>
          <button className={`btn ${active==="builder"?"btn-primary":"btn-ghost"}`} onClick={()=>setActive("builder")}>Calm Builder</button>
        </div>
      </div>

      {active === "map" && <StressMapAdvanced />}
      {active === "switchboard" && <CognitiveSwitchboard />}
      {active === "pulse" && <PulseTracker />}
      {active === "builder" && <CalmBuilder />}
    </section>
  );
}
