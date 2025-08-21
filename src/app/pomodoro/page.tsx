"use client";

import { useRouter } from "next/navigation";
import { PomodoroPro } from "../../components/pomodoro";

export default function PomodoroPage() {
  const router = useRouter();

  return (
    <section
      className="relative min-h-[calc(100dvh-4rem)]"
      aria-label="Pomodoro — Focus Forge"
    >
      {/* Minimal gradient + geometric texture */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(1200px 600px at 10% -10%, rgba(0,0,0,.07), transparent 60%), radial-gradient(1000px 500px at 120% 20%, rgba(0,0,0,.05), transparent 55%), linear-gradient(to bottom, #fafafa, #f5f5f5)",
        }}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 grid gap-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Pomodoro — Focus Forge
            </h1>
            <p className="text-neutral-500 mt-1">
              Minimal. Adaptive. Interruption-aware focus blocks.
            </p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => router.push("/dashboard")}
            aria-label="Back to dashboard"
          >
            ← Back to dashboard
          </button>
        </div>

        <div className="rounded-2xl border border-neutral-200/70 bg-white/70 backdrop-blur px-5 py-6 shadow-sm">
          <PomodoroPro />
        </div>
      </div>
    </section>
  );
}
