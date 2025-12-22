"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import DashboardAnalytics from "@/components/dashboard/DashboardAnalytics";
import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SpaceBackground } from "@/components/SpaceBackground";



/* ========================================================================================
   CONSTANTS (localStorage keys)
======================================================================================== */
const POMO_LS_KEY = "fuy.pomo.v1";
const GROUND_LS_LAST = "fuy.grounding.last.v1";

/* ========================================================================================
   HOOKS
======================================================================================== */
function useLSWatch<T>(key: string, read: () => T | null, set: (v: T | null) => void) {
  const readRef = useRef(read); const setRef = useRef(set); const prevRef = useRef<T | null>(null);
  readRef.current = read; setRef.current = set;
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (typeof window === "undefined" || !mounted) return;
      try {
        const next = readRef.current();
        if (JSON.stringify(prevRef.current) !== JSON.stringify(next)) { prevRef.current = next; setRef.current(next); }
      } catch { }
    };
    refresh();
    const onStorage = (e: StorageEvent) => { if (e.key === key) refresh(); };
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("storage", onStorage); document.addEventListener("visibilitychange", onVis);
    return () => { mounted = false; window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVis); };
  }, [key]);
}

/* ========================================================================================
   MAIN DASHBOARD
======================================================================================== */

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <LoadingSpinner message="Entering Command Deck..." />;
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <SpaceBackground />
        <div className="relative z-10 text-center backdrop-blur-md p-10 rounded-3xl border border-white/10 bg-white/5">
          <p className="text-6xl mb-6">🪐</p>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Access Denied</h1>
          <p className="text-gray-400 mb-8">Identification required for bridge access.</p>
          <Link href="/login" className="inline-block text-black bg-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"> Login </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden overflow-y-auto relative bg-black font-sans text-white">
      <SpaceBackground />

      {/* TOP NAVBAR */}
      <div className="relative z-10 w-full flex items-center justify-between px-6 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          COMMAND DECK
        </h1>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
          <span className="text-xs font-bold uppercase tracking-widest text-green-400">Systems Online</span>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="relative z-20 w-full pb-20">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">

            {/* METEOR CARDS - Organic Floating Shapes */}
            {/* Meteor Grid */}
            <div
              className="
                        grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 
                        perspective-1000 transform-style-3d
                        px-4 w-full max-w-7xl
                    "
            >
              <StoreMeteor />
              <GroundingMeteor />
              <PomodoroMeteor />
              <OrdersMeteor />
              <ChannelMeteor />
            </div>




            <div className="pt-8 w-full max-w-7xl px-4">
              <DashboardAnalytics />
            </div>

          </div>
        </div>
      </div>

      {/* Meteor CSS Styles */}
      <style jsx global>{`
        .meteor-card {
           position: relative;
           aspect-ratio: 1/1;
           display: flex;
           flex-direction: column;
           align-items: center;
           justify-content: center;
           text-align: center;
           transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
           cursor: pointer;
           overflow: hidden;
        }
        .meteor-card:hover {
           transform: translateY(-10px) scale(1.02);
           z-index: 10;
        }
        
        /* Individual Meteor Shapes */
        .meteor-store {
           border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
           background: radial-gradient(circle at 30% 30%, #404040, #1a1a1a);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(255,255,255,0.1),
              0 0 30px rgba(255, 255, 255, 0.05);
           animation: float 6s ease-in-out infinite;
        }
        .meteor-wrex {
           border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
           background: radial-gradient(circle at 70% 20%, #4a2b69, #1e102e);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(216, 180, 254, 0.1),
              0 0 30px rgba(168, 85, 247, 0.1);
           animation: float 7s ease-in-out infinite reverse;
        }
        .meteor-pomo {
           border-radius: 50% 50% 60% 40% / 50% 60% 30% 60%;
           background: radial-gradient(circle at 20% 80%, #7c2d12, #290e05);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(253, 186, 116, 0.1),
              0 0 30px rgba(249, 115, 22, 0.1);
           animation: float 8s ease-in-out infinite;
        }
        .meteor-orders {
           border-radius: 45% 55% 40% 60% / 55% 45% 60% 40%;
           background: radial-gradient(circle at 40% 40%, #1e3a8a, #0f172a);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(147, 197, 253, 0.1),
              0 0 30px rgba(59, 130, 246, 0.1);
           animation: float 9s ease-in-out infinite reverse;
        }
        .meteor-channel {
           border-radius: 40% 60% 60% 40% / 60% 40% 50% 50%;
           background: radial-gradient(circle at 70% 30%, #b91c1c, #450a0a);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(252, 165, 165, 0.1),
              0 0 30px rgba(239, 68, 68, 0.1);
           animation: float 8s ease-in-out infinite;
        }

        /* Crater effect overlay */
        .crater {
           position: absolute;
           background: rgba(0,0,0,0.3);
           border-radius: 50%;
           box-shadow: inset 2px 2px 5px rgba(0,0,0,0.5), 1px 1px 0 rgba(255,255,255,0.05);
        }

        @keyframes float {
           0% { transform: translateY(0px) rotate(0deg); }
           50% { transform: translateY(-15px) rotate(1deg); }
           100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .transform-style-3d {
            transform-style: preserve-3d;
        }
        .perspective-1000 {
            perspective: 1000px;
        }
      `}</style>
    </div>
  );
}



// ============================================================================
//   METEOR COMPONENTS
// ============================================================================

function GroundingMeteor() {
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(GROUND_LS_LAST);
        if (raw) setInfo(JSON.parse(raw));
      } catch { }
    }
  }, []);
  useLSWatch(GROUND_LS_LAST, () => { const r = localStorage.getItem(GROUND_LS_LAST); return r ? JSON.parse(r) : null; }, setInfo);

  return (
    <div onClick={() => router.push("/grounding")} className="meteor-card meteor-wrex group p-8">
      {/* Craters for texture */}
      <div className="crater w-4 h-4 top-10 left-12 opacity-50" />
      <div className="crater w-8 h-6 bottom-16 right-10 opacity-40 rotate-12" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-3xl font-black text-white mb-2 tracking-tighter group-hover:text-purple-300 transition-colors">WREX</h3>
        <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mb-4 border ${info ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
          {info ? "COMPLETE" : "READY"}
        </span>
        <div className="text-purple-200/60 text-xs font-mono max-w-[140px]">
          Target your biological coordinates.
        </div>
      </div>
    </div>
  );
}

function PomodoroMeteor() {
  const router = useRouter();
  const [stats, setStats] = useState<{ sessions: number; today: number } | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(POMO_LS_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          setStats({ sessions: data.sessions?.length || 0, today: data.sessions?.filter((s: any) => new Date(s.startTime).toDateString() === new Date().toDateString()).length || 0 });
        }
      } catch { }
    }
  }, []);
  useLSWatch(POMO_LS_KEY, () => { const r = localStorage.getItem(POMO_LS_KEY); return r ? JSON.parse(r) : null; }, (v) => {
    if (v) setStats({ sessions: v.sessions?.length || 0, today: v.sessions?.filter((s: any) => new Date(s.startTime).toDateString() === new Date().toDateString()).length || 0 });
  });

  return (
    <div onClick={() => router.push("/pomodoro")} className="meteor-card meteor-pomo group p-8">
      <div className="crater w-6 h-6 top-8 right-16 opacity-30" />
      <div className="crater w-3 h-3 bottom-12 left-20 opacity-40" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-2xl font-black text-white mb-3 tracking-tighter group-hover:text-orange-300 transition-colors">FOCUS</h3>

        <div className="flex gap-4 mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-white leading-none">{stats?.today || 0}</div>
            <div className="text-[9px] uppercase text-orange-200/50 font-bold tracking-wider">Today</div>
          </div>
          <div className="w-[1px] bg-white/20" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white leading-none">{stats?.sessions || 0}</div>
            <div className="text-[9px] uppercase text-orange-200/50 font-bold tracking-wider">Total</div>
          </div>
        </div>

        <div className="text-orange-200/60 text-xs font-mono">
          Initiate sequence.
        </div>
      </div>
    </div>
  );
}

function StoreMeteor() {
  const router = useRouter();
  const [hasStore, setHasStore] = useState(false);
  useEffect(() => {
    Promise.all([fetch('/api/shop/brands?mine=true').then(r => r.json()), fetch('/api/shop/user-products').then(r => r.json())])
      .then(([b, p]) => { if ((b && b.length > 0) || (p && p.length > 0)) setHasStore(true); }).catch(() => { });
  }, []);

  return (
    <div onClick={() => router.push("/dashboard/store")} className="meteor-card meteor-store group p-8">
      <div className="crater w-10 h-10 top-1/2 left-4 opacity-20" />
      <div className="crater w-5 h-5 top-10 right-10 opacity-30" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-2xl font-black text-white mb-2 tracking-tighter group-hover:text-gray-300 transition-colors">STORE</h3>
        <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mb-3 border ${hasStore ? 'bg-white/20 text-white border-white/30' : 'bg-gray-700/50 text-gray-400 border-gray-600'}`}>
          {hasStore ? "ACTIVE" : "INACTIVE"}
        </span>
        <div className="text-gray-400 text-xs font-mono max-w-[120px]">
          Manage cargo & supply lines.
        </div>
      </div>
    </div>
  );
}


function OrdersMeteor() {
  const router = useRouter();
  return (
    <div onClick={() => router.push("/dashboard/orders")} className="meteor-card meteor-orders group p-8">
      <div className="crater w-8 h-8 top-8 left-10 opacity-30" />
      <div className="crater w-4 h-4 bottom-10 right-8 opacity-40" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-2xl font-black text-white mb-3 tracking-tighter group-hover:text-blue-300 transition-colors">ORDERS</h3>
        <div className="p-2 bg-blue-500/20 rounded-full mb-3 text-blue-300 border border-blue-500/30">
          <ShoppingBag size={20} />
        </div>
        <div className="text-blue-200/60 text-xs font-mono max-w-[140px]">
          Track shipments & previous acquisitions.
        </div>
      </div>
    </div>
  );
}

function ChannelMeteor() {
  const router = useRouter();
  return (
    <div onClick={() => router.push("/dashboard/channel")} className="meteor-card meteor-channel group p-8">
      <div className="crater w-6 h-6 top-10 right-10 opacity-30" />
      <div className="crater w-12 h-8 bottom-6 left-6 opacity-20 rotate-45" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-2xl font-black text-white mb-3 tracking-tighter group-hover:text-red-300 transition-colors">CHANNEL</h3>
        <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mb-3 border bg-red-500/20 text-red-300 border-red-500/30">
          BROADCAST
        </span>
        <div className="text-red-200/60 text-xs font-mono max-w-[140px]">
          Manage shows, episodes & live streams.
        </div>
      </div>
    </div>
  );
}

