"use client";

import { useRouter } from "next/navigation";
import { PomodoroPro } from "../../components/pomodoro";
import { useEffect } from "react";

export default function PomodoroPage() {
  const router = useRouter();

  // Enforce Notification Permissions on Load
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Notification permission granted.");
          } else {
            console.log("Notification permission denied/dismissed.");
          }
        });
      }
    }
  }, []);

  return (
    <>
      {/* White Dotted Grid Background */}
      <div className="fixed inset-0 z-0 bg-white">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <section
        className="relative z-10 min-h-screen-safe text-black"
        aria-label="Pomodoro — Planner View"
        style={{ touchAction: "pan-y" }}
      >
        <header className="w-full px-6 py-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide opacity-90">
            Pomodoro Console
          </h1>
          <button
            className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
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
