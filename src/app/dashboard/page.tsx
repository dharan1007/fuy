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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [goals, setGoals] = useState<EssenzGoal[]>([]);
  const [stats, setStats] = useState<EssenzStats>({
    totalGoals: 0,
    activeGoals: 0,
    completedTodos: 0,
    totalTodos: 0,
    diaryEntries: 0,
    resources: 0,
  });
  const [plans, setPlans] = useState<ITPPlan[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadDashboardData();
  }, [session?.user?.id]);

  const loadDashboardData = async () => {
    try {
      const res = await fetch("/api/essenz");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.essenzNodes || []);
        setStats({
          totalGoals: data.essenzNodes?.length || 0,
          activeGoals: data.essenzNodes?.filter((g: EssenzGoal) => g.status === "ACTIVE").length || 0,
          completedTodos: data.completedTodos || 0,
          totalTodos: data.totalTodos || 0,
          diaryEntries: data.diaryEntries || 0,
          resources: data.resources || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }

    // Load ITP plans
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(ITP_LS_KEY);
        if (raw) setPlans(JSON.parse(raw));
      } catch {}
    }
  };

  useLSWatch<ITPPlan[]>(
    ITP_LS_KEY,
    () => {
      const raw = localStorage.getItem(ITP_LS_KEY);
      return raw ? (JSON.parse(raw) as ITPPlan[]) : [];
    },
    (v) => setPlans(v ?? [])
  );

  const doneCount = useMemo(() => plans.filter((p) => p.doneToday).length, [plans]);
  const progressPercent = plans.length > 0 ? Math.round((doneCount / plans.length) * 100) : 0;

  if (!session) {
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

  const navItems = [
    { label: "[DASHBOARD]", active: true },
    { label: "[GOALS]" },
    { label: "[WELLNESS]" },
    { label: "[CALENDAR]" },
    { label: "[SETTINGS]" },
  ];

  const sidebarItems = [
    { label: "[GOALS]", icon: "[GOAL]" },
    { label: "[WELLNESS]", icon: "[HEALTH]" },
    { label: "[TRACKING]", icon: "[TRACK]" },
    { label: "[INSIGHTS]", icon: "[INSIGHT]" },
  ];

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      {/* SIDEBAR */}
      <div
        className={`transition-all duration-300 border-r flex flex-col ${
          sidebarOpen ? "w-72" : "w-20"
        }`}
        style={{
          backgroundColor: "#1a1a1a",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full text-left font-bold"
            style={{ color: "#e8d4c0" }}
          >
            {sidebarOpen ? "[FUY]" : "[F]"}
          </button>
        </div>

        {/* User Profile */}
        {sidebarOpen && (
          <div
            className="p-4 border-b space-y-3"
            style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <div
              className="w-full h-32 rounded-lg flex items-center justify-center text-3xl font-bold text-black"
              style={{ backgroundColor: "#e8d4c0" }}
            >
              {session.user?.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="font-bold text-white">{session.user?.name || "User"}</p>
              <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                {session.user?.email}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        {sidebarOpen && (
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {sidebarItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  backgroundColor: "rgba(232, 212, 192, 0.1)",
                  border: "1px solid rgba(232, 212, 192, 0.2)",
                }}
              >
                <p className="text-xs font-bold" style={{ color: "#e8d4c0" }}>
                  {item.icon} {item.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {sidebarOpen && (
          <div
            className="p-4 border-t text-xs"
            style={{
              borderColor: "rgba(255, 255, 255, 0.1)",
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            <p>[STATUS] Active</p>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP NAVBAR */}
        <div
          className="border-b p-4"
          style={{
            backgroundColor: "#1a1a1a",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              {navItems.map((item, idx) => (
                <button
                  key={idx}
                  className="text-sm font-bold transition-colors"
                  style={{
                    color: item.active ? "#e8d4c0" : "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Link
              href="/essenz"
              className="px-4 py-2 rounded text-sm font-bold"
              style={{
                backgroundColor: "rgba(232, 212, 192, 0.1)",
                color: "#e8d4c0",
                border: "1px solid rgba(232, 212, 192, 0.3)",
              }}
            >
              [ESSENZ] →
            </Link>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* WELCOME */}
            <div className="flex items-end justify-between">
              <div>
                <h1
                  className="text-5xl font-bold mb-2"
                  style={{ color: "#e8d4c0" }}
                >
                  Welcome in, {session.user?.name?.split(" ")[0] || "User"}
                </h1>
                <div className="flex gap-3 text-xs font-bold" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                  <span>[INTERVIEWS]</span>
                  <span>[HIRED]</span>
                  <span>[ACE]</span>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-right">
                  <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    [EMPLOYEES]
                  </p>
                  <p className="text-4xl font-bold text-white">78</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    [HOURS]
                  </p>
                  <p className="text-4xl font-bold text-white">56</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    [PROJECTS]
                  </p>
                  <p className="text-4xl font-bold text-white">{stats.totalGoals || 0}</p>
                </div>
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* PROFILE CARD */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-black"
                      style={{ backgroundColor: "#e8d4c0" }}
                    >
                      {session.user?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-white">{session.user?.name || "User"}</p>
                      <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                        UX/UI Designer
                      </p>
                    </div>
                  </div>
                  <div
                    className="px-3 py-2 rounded text-xs font-bold text-center"
                    style={{
                      backgroundColor: "rgba(232, 212, 192, 0.1)",
                      color: "#e8d4c0",
                    }}
                  >
                    $1,200
                  </div>
                </div>

                {/* PENSION CONTRIBUTIONS */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white">[CONTRIBUTIONS]</h3>
                    <button className="text-xs" style={{ color: "#e8d4c0" }}>
                      ↗
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div
                      className="p-3 rounded flex items-center gap-2"
                      style={{ backgroundColor: "rgba(232, 212, 192, 0.1)" }}
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: "#e8d4c0" }}
                      />
                      <span className="text-white">Macbook Air</span>
                    </div>
                  </div>
                </div>

                {/* DEVICES */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <h3 className="font-bold text-white mb-4">[DEVICES]</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded"
                        style={{ backgroundColor: "rgba(232, 212, 192, 0.2)" }}
                      />
                      <div>
                        <p className="font-bold text-white">Macbook Air</p>
                        <p style={{ color: "rgba(255, 255, 255, 0.5)" }}>M3</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COMPENSATION SUMMARY */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <h3 className="font-bold text-white mb-4">[COMPENSATION]</h3>
                  <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    View details
                  </p>
                </div>

                {/* EMPLOYEE BENEFITS */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <h3 className="font-bold text-white mb-4">[BENEFITS]</h3>
                  <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    Expand section
                  </p>
                </div>
              </div>

              {/* CENTER COLUMN */}
              <div className="space-y-6">
                {/* PROGRESS CARD */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white">[PROGRESS]</h3>
                    <button className="text-xs" style={{ color: "#e8d4c0" }}>
                      ↗
                    </button>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">
                    {doneCount}h
                  </p>
                  <p className="text-xs mb-4" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    [WORKTIME] This week
                  </p>
                  <div className="flex gap-1 items-end h-16">
                    {[4, 3, 5, 2, 6, 4, 3].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${(h / 6) * 100}%`,
                          backgroundColor: "rgba(232, 212, 192, 0.3)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* TIME TRACKER CARD */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <h3 className="font-bold text-white mb-6">[TIME TRACKER]</h3>
                  <div className="flex justify-center mb-6">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="rgba(232, 212, 192, 0.2)"
                          strokeWidth="2"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e8d4c0"
                          strokeWidth="3"
                          strokeDasharray={`${(progressPercent / 100) * 251} 251`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <p className="text-sm font-bold text-white">02:35</p>
                        <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                          [WORKTIME]
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <button
                      className="px-4 py-2 rounded text-xs font-bold"
                      style={{
                        backgroundColor: "rgba(232, 212, 192, 0.1)",
                        color: "#e8d4c0",
                        border: "1px solid rgba(232, 212, 192, 0.3)",
                      }}
                    >
                      ⏸ PAUSE
                    </button>
                  </div>
                </div>

                {/* CALENDAR PLACEHOLDER */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <h3 className="font-bold text-white mb-4">[CALENDAR]</h3>
                  <div className="grid grid-cols-7 gap-2 text-xs text-center mb-4">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                      <div key={d} style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  <div
                    className="grid grid-cols-7 gap-2 text-xs"
                    style={{ color: "rgba(255, 255, 255, 0.6)" }}
                  >
                    {Array.from({ length: 35 }, (_, i) => i + 1).map((n) => (
                      <div key={n} className="text-center p-2">
                        {n <= 31 ? n : ""}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* ONBOARDING CARD */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-white mb-1">[ONBOARDING]</h3>
                      <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                        18%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "rgba(232, 212, 192, 0.2)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: "30%", backgroundColor: "#e8d4c0" }}
                        />
                      </div>
                      <span className="text-xs font-bold" style={{ color: "#e8d4c0" }}>
                        30%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "rgba(232, 212, 192, 0.2)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: "25%", backgroundColor: "rgba(232, 212, 192, 0.3)" }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                        25%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "rgba(232, 212, 192, 0.2)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: "0%", backgroundColor: "rgba(232, 212, 192, 0.3)" }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                        0%
                      </span>
                    </div>
                  </div>
                </div>

                {/* STATS CARD */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <h3 className="font-bold text-white mb-4">[TASKS]</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                        [COMPLETED]
                      </span>
                      <span className="text-lg font-bold text-white">
                        {stats.completedTodos}/{stats.totalTodos}
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full" style={{ backgroundColor: "rgba(232, 212, 192, 0.2)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${
                            stats.totalTodos > 0
                              ? (stats.completedTodos / stats.totalTodos) * 100
                              : 0
                          }%`,
                          backgroundColor: "#e8d4c0",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* ONBOARDING TASK LIST */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#0a0a0a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <h3 className="font-bold text-white mb-4">[ONBOARDING TASKS] 2/8</h3>
                  <div className="space-y-3">
                    {[
                      { task: "[INTERVIEW]", date: "Sep 15, 10:30" },
                      { task: "[TEAM MEETING]", date: "Sep 16, 10:30" },
                      { task: "[PROJECT UPDATE]", date: "Sep 17" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-xs"
                          style={{
                            backgroundColor: "rgba(232, 212, 192, 0.2)",
                            color: "#e8d4c0",
                          }}
                        >
                          ●
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-white">{item.task}</p>
                          <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                            {item.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* WELLNESS SECTION */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">[WELLNESS TRACKING]</h2>
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
      className="rounded-lg p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#1a1a1a",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => router.push("/itp")}
    >
      <h3 className="text-lg font-bold text-white mb-4">[ITP] — Plan Tracker</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>[DONE]</span>
          <span className="text-white font-semibold">{doneCount}/{plans.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>[PENDING]</span>
          <span className="text-white font-semibold">{pendingCount}</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(232, 212, 192, 0.2)" }}>
          <div
            className="h-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: "#e8d4c0" }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          [CLICK] to manage plans
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
      className="rounded-lg p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#1a1a1a",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => router.push("/breathing")}
    >
      <h3 className="text-lg font-bold text-white mb-4">[BREATHING] Exercises</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>[PRESET]</span>
          <span className="text-white font-semibold">{info?.preset || "—"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>[CYCLES]</span>
          <span className="text-white font-semibold">{cycles}/12</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(232, 212, 192, 0.2)" }}>
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: "#e8d4c0" }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          [CLICK] to start exercise
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
      className="rounded-lg p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#1a1a1a",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => router.push("/thoughts")}
    >
      <h3 className="text-lg font-bold text-white mb-4">[THOUGHTS] Today</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>[RECORDED]</span>
          <span className="text-white font-semibold">{thoughts}</span>
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          [CLICK] to log thoughts
        </p>
      </div>
    </div>
  );
}

/* ========================================================================================
   GROUNDING PREVIEW
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
      className="rounded-lg p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#1a1a1a",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => router.push("/grounding")}
    >
      <h3 className="text-lg font-bold text-white mb-4">[GROUNDING] 5-4-3-2-1</h3>
      <div className="space-y-3">
        <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
          {info ? "[COMPLETED]" : "[NO DATA]"}
        </p>
        <p className="text-xs mt-2" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          [CLICK] to practice
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
      className="rounded-lg p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#1a1a1a",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => router.push("/self-compassion")}
    >
      <h3 className="text-lg font-bold text-white mb-4">[COMPASSION] Self-Talk</h3>
      <div className="space-y-3">
        <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
          {info ? "[COMPLETED]" : "[NO DATA]"}
        </p>
        <p className="text-xs mt-2" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          [CLICK] to practice
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
      className="rounded-lg p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#1a1a1a",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => router.push("/pomodoro")}
    >
      <h3 className="text-lg font-bold text-white mb-4">[POMODORO] Timer</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>[TODAY]</span>
          <span className="text-white font-semibold">{stats?.today || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>[TOTAL]</span>
          <span className="text-white font-semibold">{stats?.sessions || 0}</span>
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          [CLICK] to start timer
        </p>
      </div>
    </div>
  );
}
