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
    <div className="flex min-h-screen" style={{ backgroundColor: "#f8f6fc" }}>
      {/* SIDEBAR */}
      <div
        className={`transition-all duration-300 border-r flex flex-col ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
        style={{
          backgroundColor: "#ffffff",
          borderColor: "#e5e7eb",
        }}
      >
        {/* Logo */}
        <div className="p-4 border-b flex items-center justify-center" style={{ borderColor: "#e5e7eb" }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
            style={{ backgroundColor: "#7c3aed", color: "#ffffff" }}
          >
            S
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { label: "Overview", icon: "⊕" },
            { label: "Campaigns", icon: "◈" },
            { label: "Ad Group", icon: "▢" },
            { label: "Keywords", icon: "◆" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3"
              style={{
                backgroundColor: idx === 0 ? "#ede9fe" : "transparent",
                color: idx === 0 ? "#7c3aed" : "#6b7280",
              }}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-center gap-3" style={{ borderColor: "#e5e7eb" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>
            U
          </div>
          {sidebarOpen && <span className="text-sm font-medium text-gray-700">Profile</span>}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP NAVBAR */}
        <div
          className="border-b p-6 flex items-center justify-between"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "#e5e7eb",
          }}
        >
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

          <div className="flex items-center gap-6">
            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search for anything"
              className="px-4 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: "#f3f4f6",
                borderColor: "#e5e7eb",
                color: "#6b7280",
              }}
            />

            {/* Date Range */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#f3f4f6" }}>
              <span className="text-sm text-gray-700">30 days Oct 16 / 21 - Nov 14 / 21</span>
              <span className="text-gray-400">▼</span>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-4">
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
                {session.user?.name?.charAt(0) || "U"}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: "#f8f6fc" }}>
          <div className="max-w-7xl mx-auto space-y-6">
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Overview", value: "1,552", icon: "⊕" },
                { label: "Campaigns", value: "1,552", icon: "◈" },
                { label: "Ad Group", value: "1,552", icon: "▢" },
                { label: "Keywords", value: "1,552", icon: "◆" },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border flex flex-col gap-2"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <p className="text-sm text-gray-600">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              ))}
            </div>

            {/* MAIN GRID - Modern Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT SECTION - Charts */}
              <div className="lg:col-span-7 space-y-6">
                {/* TOP 5 PRODUCTS & CAMPAIGNS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Donut Chart */}
                  <div
                    className="rounded-xl p-6 border"
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e7eb",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Top 5 products by spend</h3>
                      <button className="text-gray-400 text-lg">⋯</button>
                    </div>
                    <div className="flex justify-center py-8">
                      <div className="w-32 h-32 rounded-full flex items-center justify-center font-bold" style={{ background: "conic-gradient(#7c3aed 0deg 120deg, #a78bfa 120deg 180deg, #c4b5fd 180deg 240deg, #ddd6fe 240deg 280deg, #ede9fe 280deg 360deg)" }}>
                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">2,985</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Table */}
                  <div
                    className="rounded-xl p-6 border"
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e7eb",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Highest ACoS campaigns</h3>
                      <button className="text-gray-400 text-lg">⋯</button>
                    </div>
                    <div className="space-y-2 text-sm">
                      {[
                        { name: "BOBWYN3JMT", cost: "$30.25", prev: "$149.85", curr: "$149.85" },
                        { name: "Campaign - 3...", cost: "$40.00", prev: "$134.00", curr: "$134.50" },
                        { name: "Research - AC...", cost: "$43.55", prev: "$129.75", curr: "$125.00" },
                      ].map((row, idx) => (
                        <div key={idx} className="flex justify-between py-2 border-b border-gray-100" style={{ color: idx === 0 ? "#ec4899" : "#6b7280" }}>
                          <span className="font-medium">{row.name}</span>
                          <span>{row.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PROFILE CARD - Repositioned */}
                <div
                  className="rounded-xl p-6 border"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: "#7c3aed" }}
                    >
                      {session.user?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{session.user?.name || "User"}</p>
                      <p className="text-xs text-gray-500">
                        Product Manager
                      </p>
                    </div>
                  </div>
                  <div
                    className="px-3 py-2 rounded-lg text-xs font-bold text-center"
                    style={{
                      backgroundColor: "#ede9fe",
                      color: "#7c3aed",
                    }}
                  >
                    Profile Info
                  </div>
                </div>

                {/* METRIC CARDS - Orders, Sales, PPC */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Orders Created", value: "$134,970", change: "+12.8%", positive: true },
                    { label: "Total Sales", value: "$2,145,132.80", change: "+4.98%", positive: false },
                    { label: "PPC Sales", value: "$890.00", change: "-0.17%", positive: true },
                  ].map((metric, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl p-4 border"
                      style={{
                        backgroundColor: idx === 1 ? "#1f2937" : "#ffffff",
                        borderColor: idx === 1 ? "#374151" : "#e5e7eb",
                      }}
                    >
                      <p className="text-xs font-medium" style={{ color: idx === 1 ? "#9ca3af" : "#6b7280" }}>
                        {metric.label}
                      </p>
                      <p className="text-xl font-bold mt-2" style={{ color: idx === 1 ? "#ffffff" : "#1f2937" }}>
                        {metric.value}
                      </p>
                      <p className="text-xs mt-2" style={{ color: metric.positive ? "#10b981" : "#ef4444" }}>
                        {metric.change}
                      </p>
                    </div>
                  ))}
                </div>

                {/* PENSION CONTRIBUTIONS */}
                <div
                  className="rounded-xl p-6 border"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Cost Analysis</h3>
                    <button className="text-gray-400">⋯</button>
                  </div>
                  <div className="h-32 flex items-end justify-between gap-2">
                    {[40, 50, 35, 60, 45, 55, 50].map((height, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${height}%`,
                          backgroundColor: idx === 3 ? "#f59e0b" : "#ddd6fe",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT SECTION - More Metrics */}
              <div className="lg:col-span-5 space-y-6">
                {/* UNITS SALES & ORGANIC SALES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Units Sales", value: "$151,740", change: "-0.17%" },
                    { label: "Organic Sales Ra...", value: "100.00%", change: "-0.12%" },
                  ].map((metric, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl p-4 border"
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e5e7eb",
                      }}
                    >
                      <p className="text-xs font-medium text-gray-600">{metric.label}</p>
                      <p className="text-lg font-bold mt-2 text-gray-900">{metric.value}</p>
                      <p className="text-xs mt-2 text-red-500">{metric.change}</p>
                    </div>
                  ))}
                </div>

                {/* ACoS vs TACoS Chart */}
                <div
                  className="rounded-xl p-6 border"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">ACoS vs TACoS</h3>
                    <button className="text-gray-400">⋯</button>
                  </div>
                  <div className="flex items-end justify-center gap-8 py-6">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-lg flex items-center justify-center font-bold text-white relative" style={{ backgroundColor: "#7c3aed" }}>
                        <span className="text-2xl">84.9%</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">ACoS</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-lg flex items-center justify-center font-bold text-white relative" style={{ backgroundColor: "#a78bfa" }}>
                        <span className="text-2xl">76.26%</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">TACoS</p>
                    </div>
                  </div>
                </div>

                {/* PROGRESS CARD */}
                <div
                  className="rounded-xl p-6 border"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Progress</h3>
                    <button className="text-sm text-gray-400">⋯</button>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {doneCount}
                  </p>
                  <p className="text-xs mb-4 text-gray-500">
                    Worktime This week
                  </p>
                  <div className="flex gap-1 items-end h-16">
                    {[4, 3, 5, 2, 6, 4, 3].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${(h / 6) * 100}%`,
                          backgroundColor: "#c4b5fd",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* TIME TRACKER CARD */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <h3 className="font-bold text-gray-900 mb-6">Time Tracker</h3>
                  <div className="flex justify-center mb-6">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#ede9fe"
                          strokeWidth="2"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#7c3aed"
                          strokeWidth="3"
                          strokeDasharray={`${(progressPercent / 100) * 251} 251`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <p className="text-sm font-bold text-gray-900">02:35</p>
                        <p className="text-xs text-gray-500">
                          Worktime
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <button
                      className="px-4 py-2 rounded text-xs font-bold"
                      style={{
                        backgroundColor: "#ede9fe",
                        color: "#7c3aed",
                        border: "1px solid #ddd6fe",
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
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <h3 className="font-bold text-gray-900 mb-4">Calendar</h3>
                  <div className="grid grid-cols-7 gap-2 text-xs text-center mb-4">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                      <div key={d} className="text-gray-600">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div
                    className="grid grid-cols-7 gap-2 text-xs text-gray-600"
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
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Onboarding</h3>
                      <p className="text-xs text-gray-600">
                        18%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#ede9fe" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: "30%", backgroundColor: "#7c3aed" }}
                        />
                      </div>
                      <span className="text-xs font-bold text-purple-600">
                        30%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#ede9fe" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: "25%", backgroundColor: "#c4b5fd" }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                        25%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#ede9fe" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: "0%", backgroundColor: "#c4b5fd" }}
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
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <h3 className="font-bold text-gray-900 mb-4">Tasks</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">
                        Completed
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {stats.completedTodos}/{stats.totalTodos}
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full" style={{ backgroundColor: "#ede9fe" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${
                            stats.totalTodos > 0
                              ? (stats.completedTodos / stats.totalTodos) * 100
                              : 0
                          }%`,
                          backgroundColor: "#7c3aed",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* ONBOARDING TASK LIST */}
                <div
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                  }}
                >
                  <h3 className="font-bold text-gray-900 mb-4">Onboarding Tasks 2/8</h3>
                  <div className="space-y-3">
                    {[
                      { task: "[INTERVIEW]", date: "Sep 15, 10:30" },
                      { task: "[TEAM MEETING]", date: "Sep 16, 10:30" },
                      { task: "[PROJECT UPDATE]", date: "Sep 17" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 pb-3 border-b border-gray-100">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-xs text-purple-600"
                          style={{
                            backgroundColor: "#ede9fe",
                          }}
                        >
                          ●
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900">{item.task}</p>
                          <p className="text-xs text-gray-500">
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Wellness Tracking</h2>
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
      className="rounded-xl p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
      }}
      onClick={() => router.push("/itp")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">ITP — Plan Tracker</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Done</span>
          <span className="text-gray-900 font-semibold">{doneCount}/{plans.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Pending</span>
          <span className="text-gray-900 font-semibold">{pendingCount}</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#ede9fe" }}>
          <div
            className="h-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: "#7c3aed" }}
          />
        </div>
        <p className="text-xs mt-2 text-gray-500">
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
      className="rounded-xl p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
      }}
      onClick={() => router.push("/breathing")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Breathing Exercises</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Preset</span>
          <span className="text-gray-900 font-semibold">{info?.preset || "—"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Cycles</span>
          <span className="text-gray-900 font-semibold">{cycles}/12</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#ede9fe" }}>
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: "#7c3aed" }}
          />
        </div>
        <p className="text-xs mt-2 text-gray-500">
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
      className="rounded-xl p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
      }}
      onClick={() => router.push("/thoughts")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Thoughts Today</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Recorded</span>
          <span className="text-gray-900 font-semibold">{thoughts}</span>
        </div>
        <p className="text-xs mt-2 text-gray-500">
          Click to log thoughts
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
      <h3 className="text-lg font-bold text-gray-900 mb-4">Grounding 5-4-3-2-1</h3>
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          {info ? "Completed" : "No Data"}
        </p>
        <p className="text-xs mt-2 text-gray-500">
          Click to practice
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
      <h3 className="text-lg font-bold text-gray-900 mb-4">Compassion Self-Talk</h3>
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          {info ? "Completed" : "No Data"}
        </p>
        <p className="text-xs mt-2 text-gray-500">
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
      className="rounded-lg p-6 border hover:border-opacity-100 transition-colors cursor-pointer"
      style={{
        backgroundColor: "#1a1a1a",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => router.push("/pomodoro")}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Pomodoro Timer</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Today</span>
          <span className="text-gray-900 font-semibold">{stats?.today || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total</span>
          <span className="text-gray-900 font-semibold">{stats?.sessions || 0}</span>
        </div>
        <p className="text-xs mt-2 text-gray-500">
          Click to start timer
        </p>
      </div>
    </div>
  );
}
