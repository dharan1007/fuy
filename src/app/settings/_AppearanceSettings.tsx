"use client";

import { useTheme } from "@/lib/theme-context";

export function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Appearance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-neutral-700">
            <div>
              <p className="font-medium dark:text-white text-gray-900">Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose between light and dark mode</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (theme !== "light") toggleTheme();
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === "light"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-neutral-600"
                }`}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => {
                  if (theme !== "dark") toggleTheme();
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-neutral-600"
                }`}
              >
                🌙 Dark
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
