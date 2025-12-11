"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

/* ========================================================================================
   CONSTANTS (localStorage keys)
======================================================================================== */

const POMO_LS_KEY = "fuy.pomo.v1";


const GROUND_LS_LAST = "fuy.grounding.last.v1";


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


              <StorePreview />
              <GroundingPreview />
              <PomodoroPreview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================
   BREATHING PREVIEW
======================================================================================== */





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
    } catch { }
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
    } catch { }
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

/* ========================================================================================
   CHATBOT PREVIEW ("dbot")
======================================================================================== */

function ChatbotPreview({ title = "dbot", description = "Chat with dbot" }: { title?: string, description?: string }) {
  const router = useRouter();

  return (
    <div
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border hover:shadow-lg transition-all backdrop-blur-md group active:scale-98 sm:active:scale-100"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        borderColor: "rgba(0, 0, 0, 0.1)",
      }}
      onClick={() => router.push("/chatbot")}
    >
      <h3 className="text-base sm:text-lg md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-black transition-colors line-clamp-2">
        {title}
      </h3>
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Status</span>
          <span className="text-xs sm:text-sm font-semibold text-black">Active</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}>
          <div
            className="h-full transition-all duration-500 bg-black"
            style={{ width: '100%' }}
          />
        </div>
        <p className="text-xs mt-2.5 sm:mt-3 text-gray-600">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ========================================================================================
   BRAND PREVIEW
======================================================================================== */

function StorePreview() {
  const router = useRouter();
  const [hasStore, setHasStore] = useState(false);

  useEffect(() => {
    // Check for brands OR products
    Promise.all([
      fetch('/api/shop/brands?mine=true').then(res => res.json()),
      fetch('/api/shop/user-products').then(res => res.json())
    ]).then(([brands, products]) => {
      if ((brands && brands.length > 0) || (products && products.length > 0)) {
        setHasStore(true);
      }
    }).catch(() => { });
  }, []);

  return (
    <div
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border hover:shadow-lg transition-all backdrop-blur-md group active:scale-98 sm:active:scale-100"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => router.push("/dashboard/store")}
    >
      <h3 className="text-base sm:text-lg md:text-lg font-bold text-white mb-3 sm:mb-4 group-hover:text-gray-300 transition-colors line-clamp-2">
        My Store
      </h3>
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-400">Status</span>
          <span className="text-xs sm:text-sm font-semibold text-white">{hasStore ? "Active" : "Start Selling"}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
          <div
            className="h-full transition-all duration-500 bg-white"
            style={{ width: hasStore ? '100%' : '0%' }}
          />
        </div>
        <p className="text-xs mt-2.5 sm:mt-3 text-gray-400">
          Manage your listings & sales
        </p>
      </div>
    </div>
  );
}
