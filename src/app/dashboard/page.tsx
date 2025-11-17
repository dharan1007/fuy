"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

/* ========================================================================================
   TYPES
======================================================================================== */

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [plans, setPlans] = useState<ITPPlan[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    setIsLoadingData(true);
    // Load ITP plans
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(ITP_LS_KEY);
        if (raw) setPlans(JSON.parse(raw));
      } catch {}
    }
    setIsLoadingData(false);
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

  // Show loading spinner while session is being authenticated
  if (status === 'loading') {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="text-center">
          <p className="text-6xl mb-4">✨</p>
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400 mb-8">Please log in</p>
          <Link
            href="/login"
            className="inline-block text-white px-8 py-3 rounded-lg font-bold hover:opacity-90"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden relative" style={{ backgroundColor: "#ffffff" }}>
      {/* Animated Dotted Grid Background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        backgroundPosition: "0 0",
        animation: "dotGridMotion 20s linear infinite",
        zIndex: 0,
      }}>
        <style>{`
          @keyframes dotGridMotion {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 40px 40px;
            }
          }
        `}</style>
      </div>

      {/* TOP NAVBAR - No sidebar */}
      <div
        className="relative z-10 border-b p-4 sm:p-6 flex items-center justify-between"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(8px)",
          borderColor: "rgba(209, 213, 219, 0.3)",
        }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>

        <div className="flex items-center gap-2 sm:gap-6">
          {/* Search Bar - Hidden on mobile */}
          <input
            type="text"
            placeholder="Search..."
            className="hidden sm:block px-4 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: "#f3f4f6",
              borderColor: "#e5e7eb",
              color: "#6b7280",
            }}
          />

          {/* Date Range - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#f3f4f6" }}>
            <span className="text-sm text-gray-700">30 days Oct 16 / 21 - Nov 14 / 21</span>
            <span className="text-gray-400">▼</span>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>
              🌍
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>
              🔔
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>
              💬
            </button>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: "#1f2937" }}>
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA - Full width */}
      <div className="relative z-20 overflow-y-auto p-4 sm:p-8" style={{ minHeight: "calc(100vh - 80px)" }}>
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* PAGE TITLE */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Wellness Tracking</h2>
            <p className="text-sm sm:text-base text-gray-600">Track your daily wellness activities and progress</p>
          </div>

          {/* WELLNESS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
    <div
      className="rounded-2xl p-6 border hover:shadow-lg transition-all cursor-pointer backdrop-blur-md group"
      style={{
        backgroundColor: "rgba(124, 58, 237, 0.08)",
        borderColor: "rgba(124, 58, 237, 0.2)",
      }}
      onClick={() => router.push("/itp")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">ITP — Plan Tracker</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Done</span>
          <span className="text-sm font-semibold text-purple-600">{doneCount}/{plans.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Pending</span>
          <span className="text-sm font-semibold text-gray-900">{pendingCount}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(124, 58, 237, 0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${percent}%`, backgroundColor: "#7c3aed" }}
          />
        </div>
        <p className="text-xs mt-3 text-gray-600">
          Click to manage plans
        </p>
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
    <div
      className="rounded-2xl p-6 border hover:shadow-lg transition-all cursor-pointer backdrop-blur-md group"
      style={{
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        borderColor: "rgba(59, 130, 246, 0.2)",
      }}
      onClick={() => router.push("/breathing")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">Breathing Exercises</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Preset</span>
          <span className="text-sm font-semibold text-blue-600">{info?.preset || "—"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Cycles</span>
          <span className="text-sm font-semibold text-gray-900">{cycles}/12</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: "#3b82f6" }}
          />
        </div>
        <p className="text-xs mt-3 text-gray-600">
          Click to start exercise
        </p>
      </div>
    </div>
  );
}

/* ========================================================================================
   THOUGHTS PREVIEW
======================================================================================== */

function ThoughtsPreview() {
  const router = useRouter();
  const [thoughts, setThoughts] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(THOUGHTS_TODAY);
      if (raw) setThoughts(JSON.parse(raw).length || 0);
    } catch {}
  }, []);

  useLSWatch(
    THOUGHTS_TODAY,
    () => {
      const raw = localStorage.getItem(THOUGHTS_TODAY);
      return raw ? JSON.parse(raw) : [];
    },
    (v) => setThoughts(v?.length || 0)
  );

  return (
    <div
      className="rounded-2xl p-6 border hover:shadow-lg transition-all cursor-pointer backdrop-blur-md group"
      style={{
        backgroundColor: "rgba(34, 197, 94, 0.08)",
        borderColor: "rgba(34, 197, 94, 0.2)",
      }}
      onClick={() => router.push("/thoughts")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors">Thoughts Today</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Recorded</span>
          <span className="text-sm font-semibold text-green-600">{thoughts}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${Math.min(100, (thoughts / 10) * 100)}%`, backgroundColor: "#22c55e" }}
          />
        </div>
        <p className="text-xs mt-3 text-gray-600">
          Click to log thoughts
        </p>
      </div>
    </div>
  );
}

/* ========================================================================================
   WREX PREVIEW
======================================================================================== */

function GroundingPreview() {
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(GROUND_LS_LAST);
      if (raw) setInfo(JSON.parse(raw));
    } catch {}
  }, []);

  useLSWatch(
    GROUND_LS_LAST,
    () => {
      const raw = localStorage.getItem(GROUND_LS_LAST);
      return raw ? JSON.parse(raw) : null;
    },
    (v) => setInfo(v)
  );

  return (
    <div
      className="rounded-2xl p-6 border hover:shadow-lg transition-all cursor-pointer backdrop-blur-md group"
      style={{
        backgroundColor: "rgba(168, 85, 247, 0.08)",
        borderColor: "rgba(168, 85, 247, 0.2)",
      }}
      onClick={() => router.push("/grounding")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">WREX</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Status</span>
          <span className="text-sm font-semibold text-purple-600">
            {info ? "✓ Complete" : "Ready"}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168, 85, 247, 0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${info ? 100 : 0}%`, backgroundColor: "#a855f7" }}
          />
        </div>
        <p className="text-xs mt-3 text-gray-600">
          Click to practice wellness
        </p>
      </div>
    </div>
  );
}

/* ========================================================================================
   SELF-COMPASSION PREVIEW
======================================================================================== */

function SelfCompassionPreview() {
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SC_LS_LAST);
      if (raw) setInfo(JSON.parse(raw));
    } catch {}
  }, []);

  useLSWatch(
    SC_LS_LAST,
    () => {
      const raw = localStorage.getItem(SC_LS_LAST);
      return raw ? JSON.parse(raw) : null;
    },
    (v) => setInfo(v)
  );

  return (
    <div
      className="rounded-2xl p-6 border hover:shadow-lg transition-all cursor-pointer backdrop-blur-md group"
      style={{
        backgroundColor: "rgba(244, 63, 94, 0.08)",
        borderColor: "rgba(244, 63, 94, 0.2)",
      }}
      onClick={() => router.push("/self-compassion")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-red-600 transition-colors">Compassion Self-Talk</h3>
      <div className="space-y-3">
        <p className="text-xs text-gray-700">
          {info ? "Completed" : "No Data"}
        </p>
        <p className="text-xs mt-2 text-gray-600">
          Click to practice
        </p>
      </div>
    </div>
  );
}

/* ========================================================================================
   POMODORO PREVIEW
======================================================================================== */

function PomodoroPreview() {
  const router = useRouter();
  const [stats, setStats] = useState<{ sessions: number; today: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(POMO_LS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setStats({
          sessions: data.sessions?.length || 0,
          today: data.sessions?.filter((s: any) => new Date(s.startTime).toDateString() === new Date().toDateString()).length || 0,
        });
      }
    } catch {}
  }, []);

  useLSWatch(
    POMO_LS_KEY,
    () => {
      const raw = localStorage.getItem(POMO_LS_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    (v) => {
      if (v) {
        setStats({
          sessions: v.sessions?.length || 0,
          today: v.sessions?.filter((s: any) => new Date(s.startTime).toDateString() === new Date().toDateString()).length || 0,
        });
      }
    }
  );

  return (
    <div
      className="rounded-2xl p-6 border hover:shadow-lg transition-all cursor-pointer backdrop-blur-md group"
      style={{
        backgroundColor: "rgba(217, 119, 6, 0.08)",
        borderColor: "rgba(217, 119, 6, 0.2)",
      }}
      onClick={() => router.push("/pomodoro")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-amber-600 transition-colors">Pomodoro Timer</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Today</span>
          <span className="text-gray-900 font-semibold">{stats?.today || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Total</span>
          <span className="text-gray-900 font-semibold">{stats?.sessions || 0}</span>
        </div>
        <p className="text-xs mt-2 text-gray-600">
          Click to start timer
        </p>
      </div>
    </div>
  );
}
