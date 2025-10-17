"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

/** ---------------- Types ---------------- */
type PresetKey =
  | "Box Breathing"
  | "4-7-8 Breathing"
  | "Physiological Sigh"
  | "Diaphragmatic Breathing"
  | "Alternate Nostril Breathing"
  | "Pursed-Lip Breathing"
  | "Resonance Breathing"
  | "Breathing Orb Game";

type Preset = {
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  notes: string;
  type: "regular" | "alternate-nostril" | "pursed-lip" | "game";
};

type PhaseKey = "inhale" | "hold1" | "exhale" | "hold2";

/** ---------------- Data ---------------- */

const presets: Record<PresetKey, Preset> = {
  "Box Breathing": {
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
    notes: "A simple pattern to calm the nervous system and increase focus.",
    type: "regular",
  },
  "4-7-8 Breathing": {
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0,
    notes: "This technique helps you wind down and prepare for sleep.",
    type: "regular",
  },
  "Physiological Sigh": {
    inhale: 2,
    hold1: 0,
    exhale: 6,
    hold2: 0,
    notes:
      "Two quick inhales, followed by a long, slow exhale to quickly relieve stress.",
    type: "regular",
  },
  "Diaphragmatic Breathing": {
    inhale: 5,
    hold1: 0,
    exhale: 5,
    hold2: 0,
    notes: "Strengthens the diaphragm and reduces blood pressure.",
    type: "regular",
  },
  "Alternate Nostril Breathing": {
    inhale: 4,
    hold1: 0,
    exhale: 4,
    hold2: 0,
    notes: "A yogic technique to calm the mind and balance energy.",
    type: "alternate-nostril",
  },
  "Pursed-Lip Breathing": {
    inhale: 2,
    hold1: 0,
    exhale: 4,
    hold2: 0,
    notes: "Slows your breath and can help you feel in control.",
    type: "pursed-lip",
  },
  "Resonance Breathing": {
    inhale: 5,
    hold1: 0,
    exhale: 5,
    hold2: 0,
    notes: "Helps you achieve a state of calm and coherence.",
    type: "regular",
  },
  "Breathing Orb Game": {
    inhale: 3,
    hold1: 1,
    exhale: 3,
    hold2: 1,
    notes: "Sync your breath with the orb to earn a high score!",
    type: "game",
  },
};

const BREATHING_TIPS = [
  "Breathe from your belly, not your chest. Place a hand on your stomach to feel it rise and fall.",
  "Start with just a few minutes a day. Consistency is more important than duration.",
  "Inhale through your nose, and exhale through your mouth for the most calming effect.",
  "Find a quiet, comfortable space to practice without distractions.",
];

const QUOTES = [
  "Mindfulness is a way of befriending ourselves and our experience.",
  "The present moment is the only moment available to us to live.",
  "Your calm mind is the ultimate weapon against your challenges.",
  "Breathe. Let go. And remind yourself that this very moment is the only one you know you have for sure.",
];

const SOUNDSCAPES = {
  "Chirping Birds": "/sounds/chirping-birds.mp3",
  "Gentle Rain": "/sounds/gentle-rain.mp3",
  "Ocean Waves": "/sounds/ocean-waves.mp3",
} as const;

/** ---------------- Audio helpers (TS-safe) ---------------- */

// Safari type
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let audioContext: AudioContext | null = null;
let audioSource: AudioBufferSourceNode | null = null;

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

async function playSoundscape(audioUrl: string) {
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const res = await fetch(audioUrl);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);

    if (audioSource) {
      try {
        audioSource.stop();
      } catch {}
      try {
        audioSource.disconnect();
      } catch {}
      audioSource = null;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(ctx.destination);
    src.start(0);
    audioSource = src;
  } catch (e) {
    console.warn("Soundscape error:", e);
  }
}

function stopSoundscape() {
  try {
    audioSource?.stop();
  } catch {}
  try {
    audioSource?.disconnect();
  } catch {}
  audioSource = null;
  const ctx = audioContext;
  if (ctx && ctx.state !== "suspended") {
    ctx.suspend().catch(() => {});
  }
}

/** ---------------- Utils ---------------- */
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** deterministic randoms to avoid re-render jitter */
function useRandomPositions(count: number, seedKey: string) {
  return useMemo(() => {
    const rng = (i: number) => {
      let h = 2166136261 >>> 0;
      const s = `${seedKey}:${i}`;
      for (let c = 0; c < s.length; c++) {
        h ^= s.charCodeAt(c);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0) / 2 ** 32;
    };
    return Array.from({ length: count }).map((_, i) => ({
      topPct: Math.round(rng(i) * 100),
      leftPct: Math.round(rng(i + 17) * 100),
      scale: 1 + Math.round(rng(i + 33) * 10) / 10,
      delay: (i * 1.2 + rng(i + 99) * 1.2).toFixed(2) + "s",
    }));
  }, [seedKey, count]);
}

/** ---------------- Interactive Background ---------------- */
/** (from previous step) – reacts to mouse + phase to create a soft glow */
function LightGreenBackground({
  phase,
  progress,
}: {
  phase: PhaseKey;
  progress: number; // 0..1
}) {
  const blobs = useRandomPositions(12, "blobs");
  const sparkId = useRef(0);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [sparks, setSparks] = useState<
    { id: number; x: number; y: number; created: number }[]
  >([]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      setMouse({
        x: Math.round((e.clientX / innerWidth) * 100),
        y: Math.round((e.clientY / innerHeight) * 100),
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = Math.round((e.clientX / innerWidth) * 100);
      const y = Math.round((e.clientY / innerHeight) * 100);
      const id = ++sparkId.current;
      setSparks((s) => [...s, { id, x, y, created: Date.now() }]);
      setTimeout(() => {
        setSparks((s) => s.filter((p) => p.id !== id));
      }, 1200);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const intensity = (() => {
    if (phase === "inhale") return progress;
    if (phase === "exhale") return 1 - progress;
    if (phase === "hold1") return 1;
    return 0.6;
  })();

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={
        {
          background:
            "linear-gradient(135deg, #d1fae5 0%, #baf7de 35%, #a7f3d0 70%, #99f6e4 100%)",
          "--mx": `${mouse.x}%`,
          "--my": `${mouse.y}%`,
          "--breath": intensity.toString(),
        } as React.CSSProperties
      }
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(420px circle at var(--mx) var(--my), rgba(255,255,255,0.75), rgba(255,255,255,0) 55%)",
          mixBlendMode: "soft-light",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          background:
            "radial-gradient(calc(200px + 500px * var(--breath)) circle at 50% 60%, rgba(16,185,129,0.20), rgba(16,185,129,0.00) 60%)",
          filter: "blur(8px)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${(mouse.x - 50) * 0.2}px, ${
            (mouse.y - 50) * 0.2
          }px)`,
          transition: "transform 120ms linear",
        }}
      >
        {blobs.map((d, i) => (
          <div
            key={i}
            className="absolute rounded-[40%] blur-2xl opacity-50 animate-float-slow"
            style={{
              top: `${d.topPct}%`,
              left: `${d.leftPct}%`,
              width: `${110 + (i % 5) * 36}px`,
              height: `${110 + ((i + 2) % 5) * 36}px`,
              background:
                i % 2 === 0
                  ? "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(45,212,191,0.35))"
                  : "linear-gradient(135deg, rgba(34,197,94,0.28), rgba(56,189,248,0.25))",
              transform: `translate(-50%,-50%) scale(${d.scale})`,
              animationDelay: d.delay,
            }}
            aria-hidden
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%221%22 stitchTiles=%22stitch%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.035%22/></svg>')]" />
      {sparks.map((s) => (
        <div key={s.id} aria-hidden>
          <span
            className="pointer-events-none absolute rounded-full border border-emerald-400/40 animate-ripple"
            style={{
              top: `${s.y}%`,
              left: `${s.x}%`,
              width: 8,
              height: 8,
              transform: "translate(-50%,-50%)",
            }}
          />
          <span
            className="pointer-events-none absolute rounded-full bg-white/70 animate-sparkle"
            style={{
              top: `calc(${s.y}% - 10px)`,
              left: `calc(${s.x}% + 8px)`,
              width: 6,
              height: 6,
              transform: "translate(-50%,-50%)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** ---------------- Breathing Animations ---------------- */

/** Generic breathing orb + progress ring (for regular types) */
function BreathingOrb({
  phase,
  progress,
}: {
  phase: PhaseKey;
  progress: number; // 0..1 of current phase
}) {
  const scale =
    phase === "inhale"
      ? 0.9 + 0.3 * progress
      : phase === "exhale"
      ? 1.2 - 0.3 * progress
      : phase === "hold1"
      ? 1.25
      : 0.95;

  const pct = Math.max(0, Math.min(1, progress));
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;
  const gap = circumference - dash;

  return (
    <div className="relative w-64 h-64 grid place-items-center">
      {/* progress ring */}
      <svg width="260" height="260" viewBox="0 0 260 260" className="absolute">
        <circle
          cx="130"
          cy="130"
          r={radius}
          stroke="rgba(16,185,129,.15)"
          strokeWidth="14"
          fill="none"
        />
        <circle
          cx="130"
          cy="130"
          r={radius}
          stroke="rgba(16,185,129,.9)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          transform="rotate(-90 130 130)"
          strokeDasharray={`${dash} ${gap}`}
        />
      </svg>

      {/* orb */}
      <div
        className="rounded-full bg-emerald-500 shadow-xl transition-transform duration-150 ease-linear"
        style={{
          width: 130,
          height: 130,
          transform: `scale(${scale})`,
          boxShadow:
            phase === "hold1"
              ? "0 0 60px rgba(16,185,129,.6)"
              : "0 0 40px rgba(16,185,129,.45)",
      }}
      />
    </div>
  );
}

/** Alternate nostril animation (left/right airflow) */
function AlternateNostril({
  phase,
  progress,
}: {
  phase: PhaseKey;
  progress: number;
}) {
  // left active when inhaling, right active when exhaling
  const leftActive = phase === "inhale";
  const rightActive = phase === "exhale";
  // dot positions: move from nostril -> center on inhale, center -> nostril on exhale
  const trackLen = 120; // px
  const leftDotX = trackLen * (1 - progress); // from -trackLen -> 0 relative to center
  const rightDotX = trackLen * progress; // 0 -> +trackLen

  return (
    <div className="relative w-[360px] h-[160px]">
      {/* center "nose" */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-emerald-100 border border-emerald-200 shadow-inner" />
      {/* left nostril */}
      <div
        className={clsx(
          "absolute left-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border shadow-sm",
          leftActive
            ? "bg-emerald-200 border-emerald-400"
            : "bg-white/70 border-white/70"
        )}
      />
      {/* right nostril */}
      <div
        className={clsx(
          "absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border shadow-sm",
          rightActive
            ? "bg-emerald-200 border-emerald-400"
            : "bg-white/70 border-white/70"
        )}
      />

      {/* airflow dot from left → center on inhale */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
        style={{
          left: `calc(50% - ${leftDotX}px)`,
          background: leftActive ? "rgba(16,185,129,.95)" : "transparent",
          boxShadow: leftActive ? "0 0 18px rgba(16,185,129,.75)" : "none",
        }}
      />
      {/* airflow dot from center → right on exhale */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
        style={{
          left: `calc(50% + ${rightDotX}px)`,
          background: rightActive ? "rgba(16,185,129,.95)" : "transparent",
          boxShadow: rightActive ? "0 0 18px rgba(16,185,129,.75)" : "none",
        }}
      />
    </div>
  );
}

/** Pursed-lip animation (air stream during exhale) */
function PursedLip({
  phase,
  progress,
}: {
  phase: PhaseKey;
  progress: number;
}) {
  const streamW = 30 + 180 * progress; // width grows on exhale
  const showStream = phase === "exhale";
  return (
    <div className="relative w-[360px] h-[160px] grid place-items-center">
      {/* mouth */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-white/80 border border-emerald-200 shadow" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500/90 shadow-inner" />
        </div>
      </div>

      {/* air stream */}
      <div
        className="absolute left-1/2 top-1/2 -translate-y-1/2 h-8 rounded-r-full"
        style={{
          transform: "translateY(-50%) translateX(24px)",
          width: showStream ? streamW : 0,
          background:
            "linear-gradient(90deg, rgba(16,185,129,.25), rgba(16,185,129,.05) 70%, rgba(16,185,129,0) 100%)",
          filter: "blur(1px)",
          transition: "width 120ms linear",
        }}
      />
      {/* subtle stream lines */}
      {showStream &&
        [0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-y-1/2 h-[2px] bg-emerald-400/50"
            style={{
              transform: `translateY(${(i - 1) * 8}px) translateX(24px)`,
              width: streamW * (0.8 + i * 0.12),
              opacity: 0.6 - i * 0.15,
              transition: "width 120ms linear, opacity 120ms linear",
            }}
          />
        ))}
    </div>
  );
}

/** ---------------- Component ---------------- */

export function BreathingSession() {
  const [preset, setPreset] = useState<PresetKey>("Box Breathing");
  const [dur, setDur] = useState<Preset>(presets["Box Breathing"]);
  const [phase, setPhase] = useState<PhaseKey>("inhale");
  const [t, setT] = useState(dur.inhale); // internal timer (hidden in UI)
  const [running, setRunning] = useState(false);
  const [cyclesDone, setCyclesDone] = useState(0);
  const [soundscape, setSoundscape] = useState<keyof typeof SOUNDSCAPES>(
    "Chirping Birds"
  );
  const [tipsIndex, setTipsIndex] = useState(0);
  const [quote, setQuote] = useState(QUOTES[0]);

  // game
  const [score, setScore] = useState(0);
  const [orbSize, setOrbSize] = useState(64);
  const orbSizeRef = useRef(64);

  // timers
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(dur.inhale * 1000);

  // horizontal scroll
  const scrollRef = useRef<HTMLDivElement>(null);

  const isGame = presets[preset].type === "game";

  /** rotate tips and quotes */
  useEffect(() => {
    const a = setInterval(
      () => setTipsIndex((i) => (i + 1) % BREATHING_TIPS.length),
      8000
    );
    const b = setInterval(
      () => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]),
      14000
    );
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  /** preset change */
  useEffect(() => {
    const p = presets[preset];
    setDur(p);
    setPhase("inhale");
    setT(p.inhale);
    setCyclesDone(0);
    remainingTimeRef.current = p.inhale * 1000;
    if (p.type === "game") {
      setScore(0);
      setOrbSize(64);
      orbSizeRef.current = 64;
    }
  }, [preset]);

  /** main loop */
  useEffect(() => {
    if (!running) {
      stopSoundscape();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    playSoundscape(SOUNDSCAPES[soundscape]);

    const step = (time: number) => {
      if (lastTimeRef.current !== 0) {
        const dt = time - lastTimeRef.current;
        remainingTimeRef.current -= dt;

        // keep internal number for progress math (but don't show it)
        const newT = Math.max(0, Math.ceil(remainingTimeRef.current / 1000));
        if (newT !== t) setT(newT);

        if (isGame) {
          let delta = 0;
          if (phase === "inhale") delta = dt * 0.05;
          else if (phase === "exhale") delta = -dt * 0.05;
          orbSizeRef.current = clamp(orbSizeRef.current + delta, 24, 120);
          setOrbSize(orbSizeRef.current);
          if (orbSizeRef.current >= 60 && orbSizeRef.current <= 70) {
            setScore((s) => s + 1);
          }
        }

        if (remainingTimeRef.current <= 0) {
          setPhase((p) => {
            const list: PhaseKey[] = ["inhale", "hold1", "exhale", "hold2"];
            let next = (list.indexOf(p) + 1) % list.length;
            while ((dur as any)[list[next]] === 0) {
              next = (next + 1) % list.length;
            }
            const nextPhase = list[next];
            const nextDur = (dur as any)[nextPhase] as number;
            remainingTimeRef.current = nextDur * 1000;
            if (nextPhase === "inhale") setCyclesDone((c) => c + 1);
            return nextPhase;
          });
        }
      }
      lastTimeRef.current = time;
      animationFrameRef.current = requestAnimationFrame(step);
    };

    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, soundscape, dur, preset, isGame, phase, t]);

  /** cleanup on unmount */
  useEffect(() => {
    return () => stopSoundscape();
  }, []);

  const getPhaseText = (p: string) => {
    if (presets[preset].type === "alternate-nostril") {
      if (p === "inhale") return "Inhale Left, Exhale Right";
      return "Inhale Right, Exhale Left";
    }
    if (presets[preset].type === "pursed-lip") {
      if (p === "inhale") return "Inhale through nose…";
      return "Exhale through pursed lips…";
    }
    if (p === "inhale") return "Breathe In…";
    if (p === "exhale") return "Breathe Out…";
    return "Hold";
  };

  const getProgress = () => {
    const total = (dur as any)[phase] as number;
    if (!total) return 0;
    const elapsed = total * 1000 - remainingTimeRef.current;
    return clamp((elapsed / (total * 1000)) * 100, 0, 100);
  };

  const phaseProgress = (() => {
    const total = (dur as any)[phase] as number;
    if (!total) return 0;
    const elapsed = total * 1000 - remainingTimeRef.current;
    return clamp(elapsed / (total * 1000), 0, 1); // 0..1
  })();

  const scrollHorizontally = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amt = 320;
    scrollRef.current.scrollBy({
      left: dir === "right" ? amt : -amt,
      behavior: "smooth",
    });
  };

  /** ---------------- Render ---------------- */

  if (!running) {
    return (
      <div className="relative min-h-[100svh] w-full overflow-hidden bg-emerald-50 text-neutral-900">
        {/* ONE interactive background that already reacts to breath progress */}
        <LightGreenBackground phase={phase} progress={phaseProgress} />

        <div className="relative z-10 mx-auto max-w-6xl p-6 md:p-10">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Breathing Panel
            </h1>
            <div className="hidden md:block text-sm text-neutral-600 max-w-sm text-right">
              “{quote}”
            </div>
          </div>
          <p className="mt-2 text-neutral-600">
            Choose a technique and press start. Ambient sound + soft visuals help you focus.
          </p>

          {/* glass cards row */}
          <div className="mt-8 relative">
            <div
              ref={scrollRef}
              className="flex gap-4 p-2 -mx-2 overflow-x-auto custom-scrollbar snap-x snap-mandatory"
              role="listbox"
              aria-label="Breathing presets"
            >
              {(Object.keys(presets) as PresetKey[]).map((key) => {
                const active = preset === key;
                return (
                  <button
                    key={key}
                    role="option"
                    aria-selected={active}
                    onClick={() => setPreset(key)}
                    className={clsx(
                      "snap-center flex-shrink-0 w-[18rem] h-[13.5rem] rounded-2xl border",
                      "bg-white/60 backdrop-blur shadow-sm text-left p-5 transition-all",
                      active
                        ? "border-emerald-300 ring-2 ring-emerald-300/60"
                        : "border-white/70 hover:shadow-md"
                    )}
                  >
                    <div className="text-lg font-semibold text-emerald-900 pr-6">
                      {key}
                    </div>
                    <div className="mt-2 text-sm text-neutral-700">
                      {presets[key].notes}
                    </div>
                    <div className="mt-4 flex gap-2 text-xs text-emerald-900/90">
                      <span className="chip chip--glass">inhale {presets[key].inhale}s</span>
                      {presets[key].hold1 > 0 && (
                        <span className="chip chip--glass">hold {presets[key].hold1}s</span>
                      )}
                      <span className="chip chip--glass">exhale {presets[key].exhale}s</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* arrows */}
            <button
              aria-label="Scroll left"
              onClick={() => scrollHorizontally("left")}
              className="absolute left-1 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-white/70 backdrop-blur border border-white/50 shadow hover:bg-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  d="M15 19l-7-7 7-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              aria-label="Scroll right"
              onClick={() => scrollHorizontally("right")}
              className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-white/70 backdrop-blur border border-white/50 shadow hover:bg-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  d="M9 5l7 7-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* soundscape + tip */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 bg-white/60 backdrop-blur border border-white/70 rounded-2xl p-4 shadow-sm">
              <label className="text-sm font-medium text-emerald-900">
                Soundscape
              </label>
              <select
                value={soundscape}
                onChange={(e) =>
                  setSoundscape(e.target.value as keyof typeof SOUNDSCAPES)
                }
                className="mt-2 w-full p-3 rounded-xl border border-emerald-200 bg-white/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {Object.keys(SOUNDSCAPES).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 bg-white/60 backdrop-blur border border-white/70 rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-900 tracking-wide">
                Tip
              </h2>
              <p className="mt-2 text-neutral-800 animate-fade-in-out">
                {BREATHING_TIPS[tipsIndex]}
              </p>
            </div>
          </div>

          {/* start */}
          <div className="mt-8 mb-10 flex justify-center">
            <button
              className="w-28 h-28 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 active:scale-95 transition"
              onClick={() => setRunning(true)}
            >
              <span className="sr-only">Start session</span>
              <svg viewBox="0 0 24 24" className="w-12 h-12 m-auto">
                <path
                  fill="currentColor"
                  d="M4.5 5.653c0-1.083 1.125-1.782 2.06-1.29l12.72 6.847c.935.506.935 1.942 0 2.448l-12.72 6.847c-.935.492-2.06-.207-2.06-1.29V5.653z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE SESSION (no numeric countdown)
  const progressFraction =
    dur[phase] ? (dur[phase] - t) / dur[phase] : 0;

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-emerald-50 text-emerald-950">
      <LightGreenBackground phase={phase} progress={progressFraction} />

      <div className="relative z-10 mx-auto max-w-4xl p-6 md:p-10">
        <div className="flex items-center justify-between">
          <span className="text-emerald-900/80 font-semibold">{preset}</span>
          <button
            onClick={() => setRunning(false)}
            className="px-4 py-2 rounded-full border border-white/70 bg-white/70 backdrop-blur hover:bg-white shadow-sm"
            aria-label="Pause session"
          >
            Pause
          </button>
        </div>

        <div className="mt-6 bg-white/65 backdrop-blur border border-white/70 rounded-3xl p-8 shadow-lg">
          {isGame ? (
            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative w-56 h-56 grid place-items-center">
                <div className="absolute w-44 h-44 border-4 border-emerald-200 rounded-full animate-pulse-slow" />
                <div
                  className="bg-emerald-500 rounded-full transition-all duration-300 ease-linear"
                  style={{ width: `${orbSize}px`, height: `${orbSize}px` }}
                />
              </div>
              <h1 className="text-3xl font-semibold">{getPhaseText(phase)}</h1>
              <div className="text-lg text-neutral-700">Score: {score}</div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-5">
              {/* METHOD-SPECIFIC ANIMATION (no numeric timer) */}
              {presets[preset].type === "alternate-nostril" ? (
                <AlternateNostril phase={phase} progress={progressFraction} />
              ) : presets[preset].type === "pursed-lip" ? (
                <PursedLip phase={phase} progress={progressFraction} />
              ) : (
                <BreathingOrb phase={phase} progress={progressFraction} />
              )}

              <h1 className="text-2xl md:text-3xl font-semibold text-emerald-900">
                {getPhaseText(phase)}
              </h1>

              <p className="text-neutral-700">Cycles completed: {cyclesDone}</p>

              {/* progress bar (kept, but no numeric countdown) */}
              <div className="mt-2 w-full max-w-md h-2 rounded-full bg-emerald-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-[width] duration-200 ease-linear"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between text-neutral-700">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 0a1 1 0 0 1 1 1v7.293l4.586 4.586a1 1 0 0 1-1.414 1.414L10 10.414V14a1 1 0 0 1-2 0V5.707L3.414 10.293a1 1 0 0 1-1.414-1.414L6.5 4.586V1a1 1 0 0 1 1-1h1zm-1 2H7.5v.293L2.414 7.293l1.414 1.414L8 4.414l4.172 4.172 1.414-1.414L9.5 2.293V2z" />
            </svg>
            <span className="sr-only">Current soundscape:</span>
            <span>{soundscape}</span>
          </div>

          <button
            onClick={() => setRunning(false)}
            className="px-4 py-2 rounded-full border border-white/70 bg-white/70 backdrop-blur hover:bg-white shadow-sm"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
