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
              <BondingMeteor />
              <StoreMeteor />
              <GroundingMeteor />
              <PomodoroMeteor />
              <OrdersMeteor />
              <CanvasMeteor />
              <HopinMeteor />
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
        /* Individual Meteor Shapes - WHITE THEME UPDATE */
        /* Individual Meteor Shapes */
        /* Individual Meteor Shapes - UPDATED THEME */
        .meteor-store {
           border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
           background: radial-gradient(circle at 30% 30%, #1a1a1a, #000000);
           border: 1px solid rgba(255,255,255,0.3);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(255,255,255,0.1),
              0 0 30px rgba(255, 255, 255, 0.05);
           animation: float 6s ease-in-out infinite;
        }
        .meteor-wrex {
           border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
           background: radial-gradient(circle at 70% 20%, #1a1a1a, #000000);
           border: 1px solid rgba(255,255,255,0.3);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(255,255,255,0.1),
              0 0 30px rgba(255, 255, 255, 0.05);
           animation: float 7s ease-in-out infinite reverse;
        }
        .meteor-pomo {
           border-radius: 50% 50% 60% 40% / 50% 60% 30% 60%;
           background: radial-gradient(circle at 20% 80%, #1a1a1a, #000000);
           border: 1px solid rgba(255,255,255,0.3);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(255,255,255,0.1),
              0 0 30px rgba(255, 255, 255, 0.05);
           animation: float 8s ease-in-out infinite;
        }
        .meteor-orders {
           border-radius: 45% 55% 40% 60% / 55% 45% 60% 40%;
           background: radial-gradient(circle at 40% 40%, #1a1a1a, #000000);
           border: 1px solid rgba(255,255,255,0.3);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(255,255,255,0.1),
              0 0 30px rgba(255, 255, 255, 0.05);
           animation: float 9s ease-in-out infinite reverse;
        }
        .meteor-channel {
           border-radius: 40% 60% 60% 40% / 60% 40% 50% 50%;
           background: radial-gradient(circle at 70% 30%, #ffffff, #e5e5e5);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.2),
              inset 10px 10px 20px rgba(255,255,255,1),
              0 0 30px rgba(255, 255, 255, 0.2);
           animation: float 8s ease-in-out infinite;
        }
        .meteor-bonding {
           border-radius: 50% 40% 60% 50% / 60% 50% 40% 60%;
           background: radial-gradient(circle at 30% 30%, #d90429, #8d021f);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(255, 100, 100, 0.2),
              0 0 30px rgba(217, 4, 41, 0.3);
           animation: float 7s ease-in-out infinite;
        }
        .meteor-canvas {
           border-radius: 60% 50% 40% 50% / 50% 60% 50% 40%;
           background: radial-gradient(circle at 30% 30%, #1a1a1a, #000000);
           border: 1px solid rgba(255,255,255,0.3);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(255,255,255,0.1),
              0 0 30px rgba(255, 255, 255, 0.05);
           animation: float 8s ease-in-out infinite reverse;
        }
        .meteor-hopin {
           border-radius: 40% 50% 60% 50% / 50% 40% 50% 60%;
           background: radial-gradient(circle at 30% 30%, #1a1a1a, #000000);
           border: 1px solid rgba(255,255,255,0.3);
           box-shadow: 
              inset -10px -10px 20px rgba(0,0,0,0.8),
              inset 10px 10px 20px rgba(255,255,255,0.1),
              0 0 30px rgba(255, 255, 255, 0.05);
           animation: float 6s ease-in-out infinite;
        }

        /* Crater effect overlay */
        .crater {
           position: absolute;
           border-radius: 50%;
        }
        .crater-dark {
           background: rgba(0,0,0,0.2);
           box-shadow: inset 2px 2px 5px rgba(0,0,0,0.4), 1px 1px 0 rgba(255,255,255,0.1);
        }
        .crater-light {
           background: rgba(255,255,255,0.1);
           box-shadow: inset 1px 1px 3px rgba(0,0,0,0.5), 1px 1px 0 rgba(255,255,255,0.1);
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
      {/* Craters - Light for Black Theme */}
      <div className="crater crater-light w-4 h-4 top-10 left-12 opacity-40" />
      <div className="crater crater-light w-8 h-6 bottom-16 right-10 opacity-30 rotate-12" />
      <div className="crater crater-light w-3 h-3 top-20 right-20 opacity-40" />
      <div className="crater crater-light w-6 h-6 bottom-8 left-14 opacity-20" />

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
      <div className="crater crater-light w-6 h-6 top-8 right-16 opacity-30" />
      <div className="crater crater-light w-3 h-3 bottom-12 left-20 opacity-40" />
      <div className="crater crater-light w-5 h-5 top-16 left-10 opacity-20" />
      <div className="crater crater-light w-4 h-4 bottom-20 right-12 opacity-30" />

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
      <div className="crater crater-light w-10 h-10 top-1/2 left-4 opacity-20" />
      <div className="crater crater-light w-5 h-5 top-10 right-10 opacity-30" />
      <div className="crater crater-light w-4 h-4 bottom-10 left-16 opacity-25" />
      <div className="crater crater-light w-6 h-6 top-20 right-24 opacity-15" />

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
      <div className="crater crater-light w-8 h-8 top-8 left-10 opacity-30" />
      <div className="crater crater-light w-4 h-4 bottom-10 right-8 opacity-40" />
      <div className="crater crater-light w-6 h-6 top-16 right-16 opacity-20" />
      <div className="crater crater-light w-3 h-3 bottom-20 left-12 opacity-30" />

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
      {/* Craters - Dark for White Theme */}
      <div className="crater crater-dark w-6 h-6 top-10 right-10 opacity-20" />
      <div className="crater crater-dark w-12 h-8 bottom-6 left-6 opacity-15 rotate-45" />
      <div className="crater crater-dark w-4 h-4 top-20 left-12 opacity-25" />
      <div className="crater crater-dark w-5 h-5 bottom-20 right-20 opacity-20" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-2xl font-black text-black mb-3 tracking-tighter group-hover:text-red-600 transition-colors">CHANNEL</h3>
        <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mb-3 border bg-red-100/50 text-red-600 border-red-200">
          BROADCAST
        </span>
        <div className="text-gray-600/80 text-xs font-mono max-w-[140px]">
          Manage shows, episodes & live streams.
        </div>
      </div>
    </div>
  );
}

function BondingMeteor() {
  const router = useRouter();
  return (
    <div onClick={() => router.push("/bonds")} className="meteor-card meteor-bonding group p-8">
      {/* Craters - Dark for Red Theme */}
      <div className="crater crater-dark w-5 h-5 top-12 left-10 opacity-30" />
      <div className="crater crater-dark w-8 h-8 bottom-14 right-8 opacity-20" />
      <div className="crater crater-dark w-4 h-4 top-8 right-16 opacity-25" />
      <div className="crater crater-dark w-6 h-6 bottom-8 left-20 opacity-15" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-2xl font-black text-white mb-3 tracking-tighter group-hover:text-red-300 transition-colors">BONDING</h3>
        <div className="p-2 bg-red-500/20 rounded-full mb-3 text-red-300 border border-red-500/30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.28 3.6-2.35 4.54-3.56C24.8 9.07 24.31 7.15 23.36 6c-1.26-1.52-3.23-2-5.36-1.53C16.33 4.8 14.86 6.06 14 7c-1.55 1.7-2.79 3.32-3.14 3.73-.55 1.05-.18 3.2.35 4.67.68 1.86 1.86 3.19 3.09 4.3 1.12.98 2.62 1.94 4.7 1.3z" />
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <div className="text-red-200/60 text-xs font-mono max-w-[140px]">
          Connection Metrics.
        </div>
      </div>
    </div>
  );
}

function CanvasMeteor() {
  const router = useRouter();
  return (
    <div onClick={() => router.push("/journal")} className="meteor-card meteor-canvas group p-8">
      <div className="crater crater-light w-5 h-5 top-12 left-10 opacity-30" />
      <div className="crater crater-light w-8 h-8 bottom-14 right-8 opacity-20" />
      <div className="crater crater-light w-4 h-4 top-20 right-12 opacity-25" />
      <div className="crater crater-light w-6 h-6 bottom-10 left-20 opacity-15" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-2xl font-black text-white mb-3 tracking-tighter group-hover:text-cyan-300 transition-colors">CANVAS</h3>
        <div className="p-2 bg-cyan-500/20 rounded-full mb-3 text-cyan-300 border border-cyan-500/30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </div>
        <div className="text-cyan-200/60 text-xs font-mono max-w-[140px]">
          Creative Studio.
        </div>
      </div>
    </div>
  );
}

function HopinMeteor() {
  const router = useRouter();
  return (
    <div onClick={() => router.push("/hopin")} className="meteor-card meteor-hopin group p-8">
      <div className="crater crater-light w-6 h-6 top-8 left-12 opacity-30" />
      <div className="crater crater-light w-4 h-4 bottom-10 right-10 opacity-20" />
      <div className="crater crater-light w-5 h-5 top-16 right-20 opacity-25" />
      <div className="crater crater-light w-3 h-3 bottom-16 left-8 opacity-30" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-2xl font-black text-white mb-3 tracking-tighter group-hover:text-yellow-300 transition-colors">HOPIN</h3>
        <div className="p-2 bg-yellow-500/20 rounded-full mb-3 text-yellow-300 border border-yellow-500/30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
        </div>
        <div className="text-yellow-200/60 text-xs font-mono max-w-[140px]">
          Social Plans.
        </div>
      </div>
    </div>
  );
}

