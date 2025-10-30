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
    }
  };

  const handleCommit = async () => {
    if (!microGoal.trim() || !selectedValue) return;

    try {
      await fetch("/api/essenz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: microGoal.trim(),
          goal: microGoal.trim(),
          codename: selectedValue,
        }),
      });

      setMicroGoal("");
      setSelectedValue("");
      await loadDashboardData();
    } catch (err) {
      console.error("Failed to commit goal:", err);
    }
  };

  const values = ["Growth", "Health", "Kindness", "Courage", "Creativity", "Connection"];

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4">✨</p>
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400 mb-8">Please log in</p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">✨</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-xs text-slate-400">Goal orchestration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/essenz"
              className="px-4 py-2 text-sm font-semibold text-blue-400 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              Essenz
            </Link>
            <Link
              href="/profile"
              className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold"
            >
              {session.user?.name?.charAt(0) || "U"}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Essenz Orchestration</h2>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-700 rounded-lg p-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">Goals</h3>
              <p className="text-white text-3xl font-bold">{stats.totalGoals}</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">Active</h3>
              <p className="text-white text-3xl font-bold">{stats.activeGoals}</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">Progress</h3>
              <p className="text-white text-3xl font-bold">{stats.completedTodos}/{stats.totalTodos}</p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">Create Goal</h3>
            <div className="space-y-4">
              <textarea
                value={microGoal}
                onChange={(e) => setMicroGoal(e.target.value)}
                placeholder="Describe your goal..."
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                rows={2}
              />

              <div className="flex flex-wrap gap-2">
                {values.map((value) => (
                  <button
                    key={value}
                    onClick={() => setSelectedValue(selectedValue === value ? "" : value)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      selectedValue === value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCommit}
                  disabled={!microGoal.trim() || !selectedValue}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  Commit
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Active Goals ({stats.activeGoals})</h3>
          <div className="space-y-3">
            {goals
              .filter((g) => g.status === "ACTIVE")
              .map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600"
                  onClick={() => setSelectedGoal(goal.id)}
                >
                  <p className="font-semibold text-white">{goal.codename || goal.title}</p>
                  <p className="text-sm text-slate-400 mt-1">{goal.goal}</p>
                </div>
              ))}
            {stats.activeGoals === 0 && (
              <p className="text-slate-400 text-center py-8">No active goals</p>
            )}
          </div>
        </div>

        {selectedGoal && (
          <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Goal Details</h3>
              <button
                onClick={() => setSelectedGoal(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {goals
              .filter((g) => g.id === selectedGoal)
              .map((goal) => (
                <div key={goal.id} className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Goal</p>
                    <p className="text-white font-semibold">{goal.goal}</p>
                  </div>

                  {goal.plan && goal.plan.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-400 mb-3">AI Plan</p>
                      <div className="grid grid-cols-3 gap-4">
                        {goal.plan.map((phase, idx) => (
                          <div key={idx} className="p-3 bg-slate-700 rounded-lg">
                            <p className="font-semibold text-white mb-2">{phase.title}</p>
                            <ul className="space-y-1">
                              {phase.steps.map((step, sidx) => (
                                <li key={sidx} className="text-xs text-slate-300">• {step}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/essenz?goal=${goal.id}`}
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    View Essenz →
                  </Link>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
