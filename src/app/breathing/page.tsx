"use client";
import { BreathBox } from "@/components/breathing";
import { useRouter } from "next/navigation";

export default function BreathingPage() {
  const router = useRouter();
  return (
    <section className="grid gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Breathing practice</h1>
          <p className="text-neutral-500 mt-1">Calm your nervous system with guided breathing.</p>
        </div>
        <button className="btn btn-ghost" onClick={()=>router.push("/dashboard")}>← Back to dashboard</button>
      </div>
      <div className="card p-5">
        <BreathBox />
      </div>
    </section>
  );
}
