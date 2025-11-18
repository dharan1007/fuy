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
    <div className="min-h-screen w-full overflow-x-hidden overflow-y-auto relative" style={{ backgroundColor: "#ffffff" }}>
      {/* Animated Dotted Grid Background - Responsive */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
        backgroundSize: "clamp(30px, 5vw, 40px) clamp(30px, 5vw, 40px)",
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
              background-position: clamp(30px, 5vw, 40px) clamp(30px, 5vw, 40px);
            }
          }
        `}</style>
      </div>

      {/* TOP NAVBAR - Minimal design, fully responsive */}
      <div
        className="relative z-10 border-b w-full flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(8px)",
          borderColor: "rgba(209, 213, 219, 0.3)",
          minHeight: "60px",
        }}
      >
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Dashboard</h1>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-white text-xs sm:text-sm flex-shrink-0 ml-2" style={{ backgroundColor: "#1f2937" }}>
          {session?.user?.name?.charAt(0) || "U"}
        </div>
      </div>

      {/* CONTENT AREA - Full width, responsive padding */}
      <div className="relative z-20 w-full overflow-y-auto" style={{ minHeight: "calc(100vh - 60px)" }}>
        <div className="w-full px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
          <div className="mx-auto max-w-6xl lg:max-w-7xl space-y-4 sm:space-y-6 md:space-y-8">
            {/* PAGE TITLE - Responsive typography */}
            <div className="mb-4 sm:mb-6 md:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Wellness Tracking</h2>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">Track your daily wellness activities and progress</p>
            </div>

            {/* WELLNESS CARDS - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full">
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
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border hover:shadow-lg transition-all backdrop-blur-md group active:scale-98 sm:active:scale-100"
      style={{
        backgroundColor: "rgba(124, 58, 237, 0.08)",
        borderColor: "rgba(124, 58, 237, 0.2)",
      }}
      onClick={() => router.push("/itp")}
    >
      <h3 className="text-base sm:text-lg md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-purple-600 transition-colors line-clamp-2">ITP — Plan Tracker</h3>
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Done</span>
          <span className="text-xs sm:text-sm font-semibold text-purple-600">{doneCount}/{plans.length}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Pending</span>
          <span className="text-xs sm:text-sm font-semibold text-gray-900">{pendingCount}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(124, 58, 237, 0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${percent}%`, backgroundColor: "#7c3aed" }}
          />
        </div>
        <p className="text-xs mt-2.5 sm:mt-3 text-gray-600">
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
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border hover:shadow-lg transition-all backdrop-blur-md group active:scale-98 sm:active:scale-100"
      style={{
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        borderColor: "rgba(59, 130, 246, 0.2)",
      }}
      onClick={() => router.push("/breathing")}
    >
      <h3 className="text-base sm:text-lg md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">Breathing Exercises</h3>
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Preset</span>
          <span className="text-xs sm:text-sm font-semibold text-blue-600 truncate">{info?.preset || "—"}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Cycles</span>
          <span className="text-xs sm:text-sm font-semibold text-gray-900">{cycles}/12</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: "#3b82f6" }}
          />
        </div>
        <p className="text-xs mt-2.5 sm:mt-3 text-gray-600">
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
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border hover:shadow-lg transition-all backdrop-blur-md group active:scale-98 sm:active:scale-100"
      style={{
        backgroundColor: "rgba(34, 197, 94, 0.08)",
        borderColor: "rgba(34, 197, 94, 0.2)",
      }}
      onClick={() => router.push("/thoughts")}
    >
      <h3 className="text-base sm:text-lg md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-green-600 transition-colors line-clamp-2">Thoughts Today</h3>
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Recorded</span>
          <span className="text-xs sm:text-sm font-semibold text-green-600">{thoughts}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${Math.min(100, (thoughts / 10) * 100)}%`, backgroundColor: "#22c55e" }}
          />
        </div>
        <p className="text-xs mt-2.5 sm:mt-3 text-gray-600">
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
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border hover:shadow-lg transition-all backdrop-blur-md group active:scale-98 sm:active:scale-100"
      style={{
        backgroundColor: "rgba(168, 85, 247, 0.08)",
        borderColor: "rgba(168, 85, 247, 0.2)",
      }}
      onClick={() => router.push("/grounding")}
    >
      <h3 className="text-base sm:text-lg md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-purple-600 transition-colors line-clamp-2">WREX</h3>
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Status</span>
          <span className="text-xs sm:text-sm font-semibold text-purple-600">
            {info ? "✓ Complete" : "Ready"}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168, 85, 247, 0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${info ? 100 : 0}%`, backgroundColor: "#a855f7" }}
          />
        </div>
        <p className="text-xs mt-2.5 sm:mt-3 text-gray-600">
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
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border hover:shadow-lg transition-all backdrop-blur-md group active:scale-98 sm:active:scale-100"
      style={{
        backgroundColor: "rgba(244, 63, 94, 0.08)",
        borderColor: "rgba(244, 63, 94, 0.2)",
      }}
      onClick={() => router.push("/self-compassion")}
    >
      <h3 className="text-base sm:text-lg md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-red-600 transition-colors line-clamp-2">Compassion Self-Talk</h3>
      <div className="space-y-2.5 sm:space-y-3">
        <p className="text-xs sm:text-sm text-gray-700">
          {info ? "Completed" : "No Data"}
        </p>
        <p className="text-xs sm:text-sm mt-2.5 sm:mt-3 text-gray-600">
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
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border hover:shadow-lg transition-all backdrop-blur-md group active:scale-98 sm:active:scale-100"
      style={{
        backgroundColor: "rgba(217, 119, 6, 0.08)",
        borderColor: "rgba(217, 119, 6, 0.2)",
      }}
      onClick={() => router.push("/pomodoro")}
    >
      <h3 className="text-base sm:text-lg md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-amber-600 transition-colors line-clamp-2">Pomodoro Timer</h3>
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Today</span>
          <span className="text-xs sm:text-sm font-semibold text-gray-900">{stats?.today || 0}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Total</span>
          <span className="text-xs sm:text-sm font-semibold text-gray-900">{stats?.sessions || 0}</span>
        </div>
        <p className="text-xs sm:text-sm mt-2.5 sm:mt-3 text-gray-600">
          Click to start timer
        </p>
      </div>
    </div>
  );
}
