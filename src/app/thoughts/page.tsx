"use client";

import { useRouter } from "next/navigation";
import { ThoughtLab } from "../../components/thought-labeling";

export default function ThoughtsPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Cognitive Studio
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Calm thinking tools. Gentle visuals. Tiny experiments.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          aria-label="Back to dashboard"
        >
          <span aria-hidden>←</span>
          <span>Dashboard</span>
        </button>
      </header>

      <ThoughtLab />
    </main>
  );
}
