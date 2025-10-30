"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface EssenzGoal {
  id: string;
  title: string;
  goal: string;
  codename?: string;
  plan?: Array<{ title: string; steps: string[] }>;
  status: string;
  createdAt: string;
}

interface EssenzStats {
  totalGoals: number;
  activeGoals: number;
  completedTodos: number;
  totalTodos: number;
  diaryEntries: number;
  resources: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<EssenzGoal[]>([]);
  const [stats, setStats] = useState<EssenzStats>({
    totalGoals: 0,
    activeGoals: 0,
    completedTodos: 0,
    totalTodos: 0,
    diaryEntries: 0,
    resources: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [microGoal, setMicroGoal] = useState("");
  const [selectedValue, setSelectedValue] = useState<string>("");

  useEffect(() => {
    if (!session?.user?.id) return;
    loadDashboardData();
  }, [session?.user?.id]);

  const loadDashboardData = async () => {
    try {
      const res = await fetch("/api/essenz");
      if (res.ok) {
        const { goals: essenzGoals } = await res.json();
        setGoals(essenzGoals);

        let completedTodos = 0;
        let totalTodos = 0;
        let diaryCount = 0;
        let resourceCount = 0;

        for (const goal of essenzGoals) {
          const todosRes = await fetch(`/api/essenz/${goal.id}/todos`);
          const diaryRes = await fetch(`/api/essenz/${goal.id}/diary`);
          const resourcesRes = await fetch(`/api/essenz/${goal.id}/resources`);

          if (todosRes.ok) {
            const { todos } = await todosRes.json();
            totalTodos += todos.length;
            completedTodos += todos.filter((t: any) => t.completed).length;
          }
          if (diaryRes.ok) {
            const { entries } = await diaryRes.json();
            diaryCount += entries.length;
          }
          if (resourcesRes.ok) {
            const { resources } = await resourcesRes.json();
            resourceCount += resources.length;
          }
        }

        const activeGoals = essenzGoals.filter((g) => g.status === "ACTIVE").length;

        setStats({
          totalGoals: essenzGoals.length,
          activeGoals,
          completedTodos,
          totalTodos,
          diaryEntries: diaryCount,
          resources: resourceCount,
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!microGoal.trim() || !selectedValue) return;

    try {
      const res = await fetch("/api/essenz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: microGoal.trim(),
          goal: microGoal.trim(),
          codename: selectedValue,
        }),
      });

      if (res.ok) {
        setMicroGoal("");
        setSelectedValue("");
        await loadDashboardData();
      }
    } catch (err) {
      console.error("Failed to commit goal:", err);
    }
  };

  const values = ["Growth", "Health", "Kindness", "Courage", "Creativity", "Connection"];

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4">✨</p>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600 mb-8">Please log in to view your dashboard</p>
          <Link
            href="/login"
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-3xl font-bold hover:shadow-lg transition-all"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">✨</div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-xs text-slate-500 font-medium">Your b/w control room for tiny compounding wins.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/essenz"
                className="px-4 py-2 text-sm font-semibold text-purple-600 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-colors"
              >
                Essenz
              </Link>
              <Link
                href="/profile"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg"
              >
                {session.user?.name?.charAt(0) || "U"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="text-2xl">🎯</span>Micro-goal for today
              </h2>
              <p className="text-sm text-slate-500 mt-1">Focus capsule — define one outcome, commit once.</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          </div>

          <div className="space-y-4">
            <textarea
              value={microGoal}
              onChange={(e) => setMicroGoal(e.target.value)}
              placeholder="Describe the precise outcome you can finish today..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none bg-white text-slate-800 placeholder-slate-400"
              rows={2}
            />

            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <button
                  key={value}
                  onClick={() => setSelectedValue(selectedValue === value ? "" : value)}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    selectedValue === value
                      ? "bg-purple-500 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="w-5 h-5 accent-purple-500" defaultChecked />
                <span>Public (accountability)</span>
              </label>
              <button
                onClick={handleCommit}
                disabled={!microGoal.trim() || !selectedValue}
                className="px-6 py-2 bg-slate-800 text-white rounded-2xl font-semibold hover:bg-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Commit
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">ITP — plan tracker</h3>
              <Link href="/essenz" className="text-xs text-purple-600 font-semibold hover:text-purple-700">
                Open →
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-full border-8 border-slate-200 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-900">{stats.activeGoals}/</div>
                  <div className="text-sm text-slate-500">{stats.totalGoals}</div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Done</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalGoals - stats.activeGoals}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Pending</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeGoals}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Pomodoro</h3>
              <button className="text-xs text-purple-600 font-semibold hover:text-purple-700">Open →</button>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-full border-8 border-orange-200 flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600">
                    {Math.floor(stats.completedTodos / 4)}/{Math.floor(stats.totalTodos / 4)}
                  </div>
                  <div className="text-xs text-orange-600">sessions</div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Sessions</p>
                  <p className="text-2xl font-bold text-slate-900">{Math.floor(stats.completedTodos / 4)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Target</p>
                  <p className="text-2xl font-bold text-slate-900">{Math.floor(stats.totalTodos / 4)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Breathing</h3>
              <button className="text-xs text-purple-600 font-semibold hover:text-purple-700">Open →</button>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-full border-8 border-blue-200 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-center">
                  <div className="text-3xl">🫁</div>
                  <div className="text-xs text-blue-600 font-semibold mt-1">Ready</div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Preset</p>
                  <p className="text-2xl font-bold text-slate-900">—</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Cycles</p>
                  <p className="text-2xl font-bold text-slate-900">—</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-lg">🎯</span>Active Goals ({stats.activeGoals})
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {goals
                .filter((g) => g.status === "ACTIVE")
                .map((goal) => (
                  <div
                    key={goal.id}
                    className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedGoal(goal.id)}
                  >
                    <p className="font-semibold text-slate-900 text-sm">{goal.codename || goal.title}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{goal.goal}</p>
                  </div>
                ))}
              {stats.activeGoals === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">No active goals yet. Start with a micro-goal!</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-lg">📊</span>Essenz Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-pink-50 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📔</span>
                  <span className="font-semibold text-slate-900 text-sm">Diary Entries</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{stats.diaryEntries}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📚</span>
                  <span className="font-semibold text-slate-900 text-sm">Resources</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{stats.resources}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <span className="font-semibold text-slate-900 text-sm">Todos Today</span>
                </div>
                <span className="text-lg font-bold text-slate-900">
                  {stats.completedTodos}/{stats.totalTodos}
                </span>
              </div>
            </div>
          </div>
        </div>

        {selectedGoal && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center justify-between">
              <span>Goal Overview</span>
              <button
                onClick={() => setSelectedGoal(null)}
                className="text-xs text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1 rounded-lg"
              >
                Close
              </button>
            </h3>

            {goals
              .filter((g) => g.id === selectedGoal)
              .map((goal) => (
                <div key={goal.id} className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Goal Statement</p>
                    <p className="text-base font-semibold text-slate-900">{goal.goal}</p>
                  </div>

                  {goal.plan && goal.plan.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-600 mb-3">AI-Generated Plan</p>
                      <div className="grid grid-cols-3 gap-4">
                        {goal.plan.map((phase, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl">
                            <p className="font-semibold text-slate-900 mb-2">{phase.title}</p>
                            <ul className="space-y-1">
                              {phase.steps.map((step, sidx) => (
                                <li key={sidx} className="text-xs text-slate-600 flex items-start gap-2">
                                  <span className="text-purple-500 mt-1">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200">
                    <Link
                      href={`/essenz?goal=${goal.id}`}
                      className="inline-block px-6 py-2 bg-purple-500 text-white rounded-2xl font-semibold hover:bg-purple-600 transition-colors"
                    >
                      View Full Essenz →
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

