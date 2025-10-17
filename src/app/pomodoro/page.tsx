"use client";

import { useRouter } from "next/navigation";
import { PomodoroPro } from "../../components/pomodoro";

export default function PomodoroPage() {
  const router = useRouter();

  return (
    <>
      {/* Dark backdrop */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black" />

      <section
        className="relative min-h-screen-safe text-white"
        aria-label="Pomodoro — Planner View"
        style={{ touchAction: "pan-y" }}
      >
        <header className="w-full px-6 py-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide opacity-90">
            Pomodoro Console
          </h1>
          <button
            className="btn-ghost text-sm opacity-90 hover:opacity-100"
            onClick={() => router.push("/dashboard")}
            aria-label="Back to dashboard"
          >
            ← Back
          </button>
        </header>

        {/* FULL WIDTH content */}
        <main className="w-full px-6 pb-28 grid gap-6">
          <PomodoroPro />
        </main>
      </section>
    </>
  );
}
