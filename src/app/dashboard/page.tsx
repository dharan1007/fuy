"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ========================================================================================
   TYPES
======================================================================================== */

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

interface ITPPlan {
  id: string;
  title: string;
  cue: string;
  cueType: string;
  action: string;
  priority?: number;
  confidence?: number;
  doneToday?: boolean;
  tags?: string[];
  category?: string;
}

/* ========================================================================================
   CONSTANTS (localStorage keys)
======================================================================================== */

const ITP_LS_KEY = "fuy.itp.plans.v1";
const POMO_LS_KEY = "fuy.pomo.v1";
const BREATH_LS_LAST = "fuy.breath.last.v1";
const THOUGHTS_TODAY = "fuy.thoughts.today.v1";
const GROUND_LS_LAST = "fuy.grounding.last.v1";
const SC_LS_LAST = "fuy.sc.last.v1";

/* ========================================================================================
   HOOKS
======================================================================================== */

function useLSWatch<T>(
  key: string,
  read: () => T | null,
  set: (v: T | null) => void
) {
  const readRef = useRef(read);
  const setRef = useRef(set);
  const prevRef = useRef<T | null>(null);

  readRef.current = read;
  setRef.current = set;

  useEffect(() => {
    let mounted = true;

    const deepEqual = (a: unknown, b: unknown) => {
      if (Object.is(a, b)) return true;
      const ta = typeof a;
      const tb = typeof b;
      const isObjA = a !== null && (ta === "object" || ta === "function");
      const isObjB = b !== null && (tb === "object" || tb === "function");
      if (isObjA || isObjB) {
        try {
          return JSON.stringify(a) === JSON.stringify(b);
        } catch {
          return false;
        }
      }
      return false;
    };

    const refresh = () => {
      if (typeof window === "undefined" || !mounted) return;
      try {
        const next = readRef.current();
        if (!deepEqual(prevRef.current, next)) {
          prevRef.current = next;
          setRef.current(next);
        }
      } catch {
        // ignore
      }
    };

    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) refresh();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [key]);
}

/* ========================================================================================
   MAIN DASHBOARD
======================================================================================== */

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
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

        const activeGoals = essenzGoals.filter((g: EssenzGoal) => g.status === "ACTIVE").length;

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
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">✨</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-xs text-slate-400">Goal orchestration & wellness</p>
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

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Essenz Section */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
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
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
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
              .filter((g: EssenzGoal) => g.status === "ACTIVE")
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
              .filter((g: EssenzGoal) => g.id === selectedGoal)
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

        {/* Wellness Features Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Wellness Tracking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ITPPreview />
            <BreathingPreview />
            <ThoughtsPreview />
            <GroundingPreview />
            <SelfCompassionPreview />
            <PomodoroPreview />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================
   ITP PREVIEW
======================================================================================== */

function ITPPreview() {
  const router = useRouter();
  const [plans, setPlans] = useState<ITPPlan[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(ITP_LS_KEY);
      if (raw) setPlans(JSON.parse(raw));
    } catch {}
  }, []);

  useLSWatch<ITPPlan[]>(
    ITP_LS_KEY,
    () => {
      const raw = localStorage.getItem(ITP_LS_KEY);
      return raw ? (JSON.parse(raw) as ITPPlan[]) : [];
    },
    (v) => setPlans(v ?? [])
  );

  const doneCount = useMemo(() => plans.filter((p) => p.doneToday).length, [plans]);
  const total = plans.length || 1;
  const percent = Math.round((doneCount / total) * 100);
  const pendingCount = Math.max(0, plans.length - doneCount);

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push("/itp")}>
      <h3 className="text-lg font-bold text-white mb-4">ITP — Plan Tracker</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Done</span>
          <span className="text-white font-semibold">{doneCount}/{plans.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Pending</span>
          <span className="text-white font-semibold">{pendingCount}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div className="bg-blue-500 h-full transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Click to manage plans</p>
      </div>
    </div>
  );
}

/* ========================================================================================
   BREATHING PREVIEW
======================================================================================== */

function BreathingPreview() {
  const router = useRouter();
  const [info, setInfo] = useState<{ preset?: string; cycles?: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(BREATH_LS_LAST);
      if (raw) setInfo(JSON.parse(raw));
    } catch {}
  }, []);

  useLSWatch(
    BREATH_LS_LAST,
    () => {
      const raw = localStorage.getItem(BREATH_LS_LAST);
      return raw ? JSON.parse(raw) : null;
    },
    (v) => setInfo(v)
  );

  const cycles = info?.cycles ?? 0;
  const pct = Math.min(100, Math.round((Math.min(12, cycles) / 12) * 100));

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push("/breathing")}>
      <h3 className="text-lg font-bold text-white mb-4">Breathing Exercises</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Preset</span>
          <span className="text-white font-semibold">{info?.preset || "—"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Cycles</span>
          <span className="text-white font-semibold">{cycles || "—"}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Click to practice</p>
      </div>
    </div>
  );
}

/* ========================================================================================
   THOUGHTS PREVIEW
======================================================================================== */

function ThoughtsPreview() {
  const router = useRouter();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(THOUGHTS_TODAY);
      if (raw) {
        const d = JSON.parse(raw) as { date: string; count: number };
        const today = new Date().toISOString().slice(0, 10);
        setCount(d.date === today ? d.count : 0);
      }
    } catch {}
  }, []);

  useLSWatch(
    THOUGHTS_TODAY,
    () => {
      const raw = localStorage.getItem(THOUGHTS_TODAY);
      if (!raw) return 0;
      const d = JSON.parse(raw) as { date: string; count: number };
      const today = new Date().toISOString().slice(0, 10);
      return d.date === today ? d.count : 0;
    },
    (v) => setCount(v ?? 0)
  );

  const cap = Math.max(5, Math.min(12, count + 4));
  const pct = Math.round((count / cap) * 100);

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push("/thoughts")}>
      <h3 className="text-lg font-bold text-white mb-4">Thought Labeling</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Entries Today</span>
          <span className="text-white font-semibold">{count}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div className="bg-purple-500 h-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Click to label thoughts</p>
      </div>
    </div>
  );
}

/* ========================================================================================
   GROUNDING PREVIEW
======================================================================================== */

function GroundingPreview() {
  const router = useRouter();
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(GROUND_LS_LAST);
      if (raw) setDelta((JSON.parse(raw) as any).delta);
    } catch {}
  }, []);

  useLSWatch(
    GROUND_LS_LAST,
    () => {
      const raw = localStorage.getItem(GROUND_LS_LAST);
      if (!raw) return null;
      const obj = JSON.parse(raw) as any;
      return typeof obj?.delta === "number" ? obj.delta : null;
    },
    (v) => setDelta(v)
  );

  const display = delta === null ? "—" : delta > 0 ? `-${delta}` : `${delta}`;
  const mag = delta === null ? 0 : Math.min(10, Math.abs(delta));
  const pct = Math.round((mag / 10) * 100);

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push("/grounding")}>
      <h3 className="text-lg font-bold text-white mb-4">Grounding Exercises</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">SUDS Change</span>
          <span className="text-white font-semibold">{display}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div className="bg-orange-500 h-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Lower = more grounded</p>
      </div>
    </div>
  );
}

/* ========================================================================================
   SELF-COMPASSION PREVIEW
======================================================================================== */

function SelfCompassionPreview() {
  const router = useRouter();
  const [soothe, setSoothe] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SC_LS_LAST);
      if (raw) setSoothe((JSON.parse(raw) as any).soothe);
    } catch {}
  }, []);

  useLSWatch(
    SC_LS_LAST,
    () => {
      const raw = localStorage.getItem(SC_LS_LAST);
      if (!raw) return null;
      const obj = JSON.parse(raw) as any;
      return typeof obj?.soothe === "number" ? obj.soothe : null;
    },
    (v) => setSoothe(v)
  );

  const val = soothe ?? 0;
  const pct = Math.round((Math.min(10, Math.max(0, val)) / 10) * 100);

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push("/self-compassion")}>
      <h3 className="text-lg font-bold text-white mb-4">Self-Compassion</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Soothe Level</span>
          <span className="text-white font-semibold">{soothe === null ? "—" : val}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div className="bg-pink-500 h-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Higher = more soothed</p>
      </div>
    </div>
  );
}

/* ========================================================================================
   POMODORO PREVIEW
======================================================================================== */

function PomodoroPreview() {
  const router = useRouter();
  const [state, setState] = useState<{ completedToday: number; targetPerDay: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(POMO_LS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as any;
        const today = new Date().toISOString().slice(0, 10);
        if (s.lastResetDate !== today) s.completedToday = 0;
        setState({ completedToday: s.completedToday ?? 0, targetPerDay: s.targetPerDay ?? 4 });
      }
    } catch {}
  }, []);

  useLSWatch(
    POMO_LS_KEY,
    () => {
      const raw = localStorage.getItem(POMO_LS_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as any;
      const today = new Date().toISOString().slice(0, 10);
      if (s.lastResetDate !== today) s.completedToday = 0;
      return { completedToday: s.completedToday ?? 0, targetPerDay: s.targetPerDay ?? 4 };
    },
    (v) => setState(v)
  );

  const done = state?.completedToday ?? 0;
  const target = state?.targetPerDay ?? 4;
  const pct = Math.max(0, Math.min(100, Math.round((done / Math.max(1, target)) * 100)));

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push("/pomodoro")}>
      <h3 className="text-lg font-bold text-white mb-4">Pomodoro Sessions</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Sessions</span>
          <span className="text-white font-semibold">{done}/{target}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div className="bg-red-500 h-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Click to start session</p>
      </div>
    </div>
  );
}
