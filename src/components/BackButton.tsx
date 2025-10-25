// src/components/BackButton.tsx
"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white dark:bg-black/80 dark:hover:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm transition-colors backdrop-blur-sm"
      aria-label="Go back"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span className="text-sm font-medium">Back</span>
    </button>
  );
}
