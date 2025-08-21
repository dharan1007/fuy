"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * PulseLab
 * A playful suite of micro-interactions designed to regulate stress, improve focus,
 * and make bonding fun. Includes:
 * - Pulse Chase (enhanced moving dot with difficulty + powerups)
 * - Focus Flow (lane-tracking slider with infinite-loop fix via tick latch)
 * - Breath Orbit (paced breathing circle + timing mini-score)
 * - Pattern Echo (short-term memory pattern tap)
 * - Emotion Mixer (blend two feelings into one action suggestion)
 * - Co-op Sync (two-player rhythm tap on one screen)
 *
 * No external deps. Mobile-friendly. Accessible. Polished UI.
 */

type Mode = "pulse" | "flow" | "orbit" | "echo" | "mixer" | "coop";

export default function PulseLab() {
  const [mode, setMode] = useState<Mode>("pulse");
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);

  function award(points: number) {
    setStreak((s) => s + 1);
    setCoins((c) => c + points);
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Header />
      <NavTabs mode={mode} setMode={setMode} />
      <div className="grid gap-6">
        {mode === "pulse" && <PulseChase onWin={() => award(3)} />}
        {mode === "flow" && <FocusFlow onWin={() => award(2)} />}
        {mode === "orbit" && <BreathOrbit onWin={() => award(2)} />}
        {mode === "echo" && <PatternEcho onWin={() => award(4)} />}
        {mode === "mixer" && <EmotionMixer onSuggest={() => award(1)} />}
        {mode === "coop" && <CoopSync onSync={() => award(5)} />}
        <FooterBar streak={streak} coins={coins} />
      </div>
    </div>
  );
}

/* ---------------- UI Primitives ---------------- */

function Header() {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg" />
        <h1 className="text-2xl font-semibold tracking-tight">Pulse Lab</h1>
      </div>
      <Pill>playful regulation</Pill>
    </div>
  );
}

function NavTabs({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  const tabs: { key: Mode; label: string; emoji: string }[] = [
    { key: "pulse", label: "Pulse Chase", emoji: "🔴" },
    { key: "flow", label: "Focus Flow", emoji: "🟦" },
    { key: "orbit", label: "Breath Orbit", emoji: "🫧" },
    { key: "echo", label: "Pattern Echo", emoji: "🎶" },
    { key: "mixer", label: "Emotion Mixer", emoji: "🎨" },
    { key: "coop", label: "Co-op Sync", emoji: "🤝" },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setMode(t.key)}
          className={`px-3 py-2 rounded-lg text-sm border transition-all ${
            mode === t.key
              ? "bg-black text-white border-black shadow-md"
              : "bg-white border-neutral-200 hover:border-neutral-300"
          }`}
        >
          <span className="mr-1">{t.emoji}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative border rounded-2xl p-5 bg-white shadow-[0_6px_30px_-12px_rgba(0,0,0,0.15)]">
      <div className="mb-3">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1 rounded-full bg-neutral-900 text-white text-xs">
      {children}
    </span>
  );
}

function GlowButton({
  children,
  onClick,
  disabled,
  tone = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "ghost";
}) {
  const base =
    "px-4 py-2 rounded-lg text-sm transition-all focus:outline-none active:scale-[0.98]";
  const styles =
    tone === "primary"
      ? "bg-black text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.55)]"
      : "bg-white text-black border border-neutral-200 hover:border-neutral-300";
  return (
    <button className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-700">{label}</span>
        <span className="text-xs text-neutral-500">{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className="h-2 bg-gradient-to-r from-pink-500 to-purple-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- Game 1: Pulse Chase (enhanced moving dot) ---------------- */

function PulseChase({ onWin }: { onWin: () => void }) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLButtonElement | null>(null);
  const [score, setScore] = useState(0);
  const [speedMs, setSpeedMs] = useState(1400);
  const [size, setSize] = useState(56); // larger hit target for mobile
  const [power, setPower] = useState<null | "freeze" | "double">(null);
  const [timeLeft, setTimeLeft] = useState(30);

  // Move dot
  useEffect(() => {
    const id = setInterval(() => {
      if (!areaRef.current || !dotRef.current) return;
      const area = areaRef.current.getBoundingClientRect();
      const btn = dotRef.current.getBoundingClientRect();
      const maxX = Math.max(0, area.width - btn.width);
      const maxY = Math.max(0, area.height - btn.height);
      const nx = Math.random() * maxX;
      const ny = Math.random() * maxY;
      dotRef.current.style.transform = `translate(${nx}px, ${ny}px)`;
    }, power === "freeze" ? speedMs * 4 : speedMs);
    return () => clearInterval(id);
  }, [speedMs, power]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) {
      if (score >= 12) onWin();
    }
  }, [timeLeft, score, onWin]);

  function tap() {
    const inc = power === "double" ? 2 : 1;
    setScore((s) => s + inc);
    setSpeedMs((s) => Math.max(500, s - 40));
    setSize((s) => Math.max(36, s - 1));
    // small haptic visual
    if (dotRef.current) {
      dotRef.current.style.scale = "0.95";
      setTimeout(() => {
        if (dotRef.current) dotRef.current.style.scale = "1";
      }, 80);
    }
  }

  function activate(p: "freeze" | "double") {
    setPower(p);
    setTimeout(() => setPower(null), 4000);
  }

  function reset() {
    setScore(0);
    setSpeedMs(1400);
    setSize(56);
    setPower(null);
    setTimeLeft(30);
  }

  return (
    <Card
      title="Pulse Chase"
      subtitle="Tap the orb as it warps around. Earn powerups. 30s challenge."
      footer={
        <div className="flex items-center justify-between">
          <GlowButton tone="ghost" onClick={reset}>Reset</GlowButton>
          <div className="flex items-center gap-2">
            <GlowButton tone="ghost" onClick={() => activate("freeze")}>🧊 Freeze</GlowButton>
            <GlowButton tone="ghost" onClick={() => activate("double")}>🌀 Double</GlowButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-3">
        <div className="grid sm:grid-cols-3 gap-2">
          <Meter value={score} max={20} label="Score" />
          <Meter value={30 - timeLeft} max={30} label="Time" />
          <Meter value={1400 - speedMs} max={900} label="Warp" />
        </div>
        <div
          ref={areaRef}
          className="relative h-[320px] rounded-xl bg-neutral-50 overflow-hidden border"
          aria-label="Pulse Chase play area"
        >
          <button
            ref={dotRef}
            onClick={tap}
            aria-label="moving orb"
            className="absolute rounded-full shadow-md transition-transform duration-150 ease-out focus:outline-none"
            style={{
              width: size,
              height: size,
              background:
                "radial-gradient(circle at 30% 30%, #ff6b6b, #b91c1c)",
              color: "white",
            }}
          />
          <div className="absolute bottom-3 left-3 text-xs text-neutral-600">
            Score: {score} • {timeLeft}s
          </div>
          {power && (
            <div className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-black text-white">
              {power === "freeze" ? "Freeze active" : "Double active"}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Game 2: Focus Flow (lane slider) ---------------- */
/* Fixes Maximum update depth by using a tick latch and separate timers */

function FocusFlow({ onWin }: { onWin: () => void }) {
  const [pos, setPos] = useState(0.5); // 0..1
  const [target, setTarget] = useState(0.5);
  const [score, setScore] = useState(0);

  // Latch to prevent repeated scoring within the same check window
  const scoredForThisTick = useRef(false);

  // Drift the target on a fixed timer and reset scoring latch
  useEffect(() => {
    const id = setInterval(() => {
      setTarget((t) => clamp(t + (Math.random() - 0.5) * 0.2, 0.05, 0.95));
      scoredForThisTick.current = false; // allow one score per drift tick
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Score check on its own cadence (4 checks per second)
  useEffect(() => {
    const id = setInterval(() => {
      const delta = Math.abs(pos - target);
      if (!scoredForThisTick.current && delta < 0.06) {
        scoredForThisTick.current = true; // lock this tick
        setScore((s) => {
          const ns = s + 1;
          if (ns >= 20) onWin();
          return ns;
        });
      }
    }, 250);
    return () => clearInterval(id);
  }, [pos, target, onWin]);

  function key(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") setPos((p) => clamp(p - 0.05, 0, 1));
    if (e.key === "ArrowRight") setPos((p) => clamp(p + 0.05, 0, 1));
  }

  return (
    <Card
      title="Focus Flow"
      subtitle="Keep your slider aligned with the drifting target. Arrows or drag."
      footer={<div className="text-xs text-neutral-600">Score: {score} / 20</div>}
    >
      <div
        className="relative h-40 rounded-xl bg-neutral-50 border"
        tabIndex={0}
        onKeyDown={key}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          setPos(clamp((e.clientX - rect.left) / rect.width, 0, 1));
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          setPos(clamp((touch.clientX - rect.left) / rect.width, 0, 1));
        }}
      >
        {/* track */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="w-[92%] h-2 bg-neutral-200 rounded-full" />
        </div>
        {/* target */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-8 bg-purple-500 rounded-full shadow"
          style={{ left: `calc(${target * 100}% - 4px)` }}
        />
        {/* knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black shadow-lg transition-all"
          style={{ left: `calc(${pos * 100}% - 12px)` }}
        />
      </div>
    </Card>
  );
}

/* ---------------- Game 3: Breath Orbit (paced breathing) ---------------- */

function BreathOrbit({ onWin }: { onWin: () => void }) {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [tick, setTick] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const radius = useMemo(() => {
    if (phase === "inhale") return 46 + tick * 2;
    if (phase === "hold") return 70;
    return 46 + (10 - tick) * 2;
  }, [phase, tick]);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => {
        if (phase === "inhale" && t >= 10) {
          setPhase("hold");
          return 0;
        }
        if (phase === "hold" && t >= 4) {
          setPhase("exhale");
          return 0;
        }
        if (phase === "exhale" && t >= 10) {
          setPhase("inhale");
          return 0;
        }
        return t + 1;
      });
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  function tap() {
    // award perfects when near phase change
    if (tick === 0 || tick === 1) {
      setPerfects((p) => {
        const np = p + 1;
        if (np >= 8) onWin();
        return np;
      });
    }
  }

  return (
    <Card
      title="Breath Orbit"
      subtitle='Follow "inhale-hold-exhale". Tap on phase changes for "perfects".'
      footer={<div className="text-xs text-neutral-600">Perfects: {perfects} / 8</div>}
    >
      <div className="grid place-items-center">
        <div className="relative h-64 w-64 grid place-items-center">
          <div
            className="rounded-full transition-all"
            style={{
              width: radius * 2,
              height: radius * 2,
              background:
                "radial-gradient(circle at 35% 35%, rgba(99,102,241,.25), rgba(59,130,246,.15))",
            }}
          />
          <div className="absolute bottom-4 text-sm capitalize">
            {phase}
          </div>
        </div>
        <GlowButton onClick={tap}>Mark Beat</GlowButton>
      </div>
    </Card>
  );
}

/* ---------------- Game 4: Pattern Echo (memory taps) ---------------- */

function PatternEcho({ onWin }: { onWin: () => void }) {
  const pads = ["A", "B", "C", "D"] as const;
  const [seq, setSeq] = useState<number[]>([rand(0, 3)]);
  const [input, setInput] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [stage, setStage] = useState<"show" | "input">("show");

  useEffect(() => {
    // show sequence
    let i = 0;
    setStage("show");
    const show = setInterval(() => {
      setFlash(seq[i]);
      setTimeout(() => setFlash(null), 280);
      i++;
      if (i >= seq.length) {
        clearInterval(show);
        setStage("input");
      }
    }, 520);
    return () => clearInterval(show);
  }, [seq]);

  function press(idx: number) {
    if (stage !== "input") return;
    const next = [...input, idx];
    setInput(next);
    if (seq[next.length - 1] !== idx) {
      // reset on mistake
      setSeq([rand(0, 3)]);
      setInput([]);
      return;
    }
    if (next.length === seq.length) {
      // success → extend
      if (seq.length + 1 >= 12) onWin();
      setSeq((s) => [...s, rand(0, 3)]);
      setInput([]);
    }
  }

  return (
    <Card
      title="Pattern Echo"
      subtitle="Watch the pulses, echo them back. Builds short-term memory."
      footer={<div className="text-xs text-neutral-600">Length: {seq.length} / 12</div>}
    >
      <div className="grid grid-cols-2 gap-3">
        {pads.map((p, i) => (
          <button
            key={p}
            onClick={() => press(i)}
            className={`h-24 rounded-xl border transition-all ${
              flash === i ? "bg-purple-200 border-purple-300" : "bg-white hover:bg-neutral-50"
            }`}
          >
            <span className="text-xl">{p}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Tool: Emotion Mixer (unique action suggestions) ---------------- */

function EmotionMixer({ onSuggest }: { onSuggest: () => void }) {
  const feels = ["anxious", "tender", "silly", "stuck", "hopeful", "spiky", "foggy", "lonely"];
  const [a, setA] = useState("anxious");
  const [b, setB] = useState("tender");
  const [result, setResult] = useState<string | null>(null);

  function blend() {
    const map = suggestion(a, b);
    setResult(map);
    onSuggest();
  }

  return (
    <Card
      title="Emotion Mixer"
      subtitle="Pick two vibes. Get a small action to try right now."
      footer={
        <div className="flex gap-2">
          <GlowButton onClick={blend}>Mix</GlowButton>
          <GlowButton tone="ghost" onClick={() => setResult(null)}>Clear</GlowButton>
        </div>
      }
    >
      <div className="grid sm:grid-cols-3 gap-3">
        <select className="border rounded-lg px-3 py-2" value={a} onChange={(e) => setA(e.target.value)}>
          {feels.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2" value={b} onChange={(e) => setB(e.target.value)}>
          {feels.map((f) => <option key={f}>{f}</option>)}
        </select>
        <div className="grid place-items-center">
          <span className="text-2xl">➜</span>
        </div>
      </div>
      {result && (
        <div className="mt-4 p-3 rounded-lg bg-neutral-50 border text-sm">
          {result}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Co-op Sync (two-player rhythm taps) ---------------- */

function CoopSync({ onSync }: { onSync: () => void }) {
  const [beat, setBeat] = useState(0);
  const [tempo, setTempo] = useState(80);
  const [p1, setP1] = useState<number[]>([]);
  const [p2, setP2] = useState<number[]>([]);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const id = setInterval(() => setBeat((b) => b + 1), (60_000 / tempo));
    return () => clearInterval(id);
  }, [tempo]);

  useEffect(() => {
    // evaluate every 8 beats
    if (beat > 0 && beat % 8 === 0) {
      const ok = isSynced(p1, p2);
      setMsg(ok ? "Synced! 🤝" : "Try again — breathe together.");
      if (ok) onSync();
      setP1([]);
      setP2([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  function tap(which: 1 | 2) {
    const now = performance.now();
    if (which === 1) setP1((a) => [...a, now]);
    else setP2((a) => [...a, now]);
  }

  return (
    <Card
      title="Co‑op Sync"
      subtitle="Two players tap to the same invisible metronome. Align timing."
      footer={
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-600">Tempo</span>
          <input
            type="range"
            min={60}
            max={120}
            value={tempo}
            onChange={(e) => setTempo(parseInt(e.target.value))}
          />
          <span className="text-xs text-neutral-600">{tempo} BPM</span>
        </div>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          onClick={() => tap(1)}
          className="h-28 rounded-xl border bg-white active:scale-[0.98] transition-all"
        >
          Player 1 tap
        </button>
        <button
          onClick={() => tap(2)}
          className="h-28 rounded-xl border bg-white active:scale-[0.98] transition-all"
        >
          Player 2 tap
        </button>
      </div>
      <div className="text-sm mt-3 text-center">{msg}</div>
    </Card>
  );
}

/* ---------------- Helpers ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function suggestion(a: string, b: string) {
  const pair = [a, b].sort().join("+");
  const map: Record<string, string> = {
    "anxious+hopeful":
      "Two breaths in, four out. Send one sentence: “I’m hopeful and a bit antsy — can we pick one tiny step?”",
    "silly+tender":
      "30‑second voice note: say one goofy thing and one soft truth.",
    "stuck+tender":
      "Mirror exercise: each says one stuck point, the other mirrors exactly. Then add one wish.",
    "foggy+hopeful":
      "10‑minute walk outside. No decisions, just noticing five beautiful things.",
    "lonely+tender":
      "Ask for a 7‑second hug and one ‘I remember when…’ story.",
    "spiky+anxious":
      "Write the spikiest sentence in Notes, then rewrite it as a need. Share the need only.",
  };
  return map[pair] ?? "Try a 2‑minute co‑breathing, then share one wish in 7 words.";
}
function isSynced(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0) return false;
  // Compare average offsets; if within 120ms, count as synced
  const avgA = averageDiffs(a);
  const avgB = averageDiffs(b);
  return Math.abs(avgA - avgB) < 120;
}
function averageDiffs(arr: number[]) {
  if (arr.length < 2) return 0;
  const diffs: number[] = [];
  for (let i = 1; i < arr.length; i++) diffs.push(arr[i] - arr[i - 1]);
  return diffs.reduce((s, v) => s + v, 0) / diffs.length;
}

/* ---------------- Footer ---------------- */

function FooterBar({ streak, coins }: { streak: number; coins: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-neutral-700">
        Streak: <strong>{streak}</strong>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Coins:</span>
        <span className="px-2 py-1 rounded-md bg-neutral-900 text-white text-xs">{coins}</span>
      </div>
    </div>
  );
}
