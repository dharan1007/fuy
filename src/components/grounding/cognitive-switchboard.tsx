"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Themes (soft, no neon)
========================= */
const THEMES = {
  oat:   { name: "Oat",   accent: "#6f5d49", soft: "#f6f1ea", line: "#eae2d9" },
  blush: { name: "Blush", accent: "#a86979", soft: "#f7eff2", line: "#f0e3e8" },
  slate: { name: "Slate", accent: "#5a6773", soft: "#eef2f5", line: "#e2e8ee" },
};
type ThemeKey = keyof typeof THEMES;

/* =========================
   Task types (and tuple for typing)
========================= */
const TASKS = ["match", "rotate", "sound"] as const;
type TaskType = typeof TASKS[number];

/* =========================
   Utils
========================= */
function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }
function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }
function todayStr() { return new Date().toISOString().slice(0,10); }
const LS_BEST = "fuy.switchboard.best.v1";

/* =========================
   UI atoms
========================= */
function Card({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return <div className={["rounded-2xl border p-5 shadow-sm bg-white", className].join(" ")}>{children}</div>;
}
function PillButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "soft" | "ghost"; accent?: string }
) {
  const { className="", children, tone="ghost", accent="#6f5d49", ...rest } = props;
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm transition focus:outline-none";
  const style =
    tone === "primary" ? { backgroundColor: accent, color: "#fff", border: "1px solid rgba(0,0,0,0.04)" } :
    tone === "soft"    ? { backgroundColor: "#fafafa", color: "#1f2937", border: "1px dashed #dfdfdf" } :
                         { backgroundColor: "#fff", color: "#111827", border: "1px solid #e5e7eb" };
  return <button {...rest} style={style as React.CSSProperties} className={[base, className].join(" ")}>{children}</button>;
}

/* =========================
   Petal Bloom (score)
========================= */
function PetalBloom({ petals, accent }: { petals: number; accent: string }) {
  const total = 5;
  const r = 20;
  const petalsArr = Array.from({ length: total }, (_, i) => i < petals);
  return (
    <svg viewBox="0 0 120 120" className="h-16 w-16">
      <circle cx="60" cy="60" r="10" fill={accent} opacity="0.9" />
      {petalsArr.map((on, i) => {
        const angle = (i / total) * Math.PI * 2;
        const cx = 60 + Math.cos(angle) * 26;
        const cy = 60 + Math.sin(angle) * 26;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={on ? r : r - 8}
            ry={on ? r - 8 : r - 12}
            fill={accent}
            opacity={on ? 0.35 : 0.12}
            transform={`rotate(${(angle*180/Math.PI)+90} ${cx} ${cy})`}
          />
        );
      })}
    </svg>
  );
}

/* =========================
   Kinetic Sand timer
========================= */
function SandTimer({ total, remaining, tint, line }: { total: number; remaining: number; tint: string; line: string }) {
  const pct = clamp(remaining / total, 0, 1);
  return (
    <div className="h-20 w-6 rounded-xl border" style={{ borderColor: line, background: "#fff" }}>
      <div
        className="w-full rounded-b-xl transition-[height] duration-300"
        style={{
          height: `${pct * 100}%`,
          background: `linear-gradient(to top, ${tint}80, ${tint}40)`,
          borderTop: `1px solid ${line}`,
        }}
        aria-label={`Time remaining ${Math.round(pct*100)}%`}
      />
    </div>
  );
}

/* =========================
   Main Component
========================= */
export default function CognitiveSwitchboard() {
  const [themeKey, setThemeKey] = useState<ThemeKey>("oat");
  const theme = THEMES[themeKey];

  const [task, setTask] = useState<TaskType>("match");
  const [focusMode, setFocusMode] = useState(false);
  const [score, setScore] = useState(0);
  const [petals, setPetals] = useState(0); // 0..5
  const [timer, setTimer] = useState(90);
  const [running, setRunning] = useState(true);
  const [todayBest, setTodayBest] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(LS_BEST);
      if (!raw) return 0;
      const { date, best } = JSON.parse(raw) as { date: string; best: number };
      return date === todayStr() ? best : 0;
    } catch { return 0; }
  });

  const switchRef = useRef<number | null>(null);

  // randomized task switching window (6–12s)
  useEffect(() => {
    if (!running || focusMode) return;
    const schedule = () => {
      if (switchRef.current) clearTimeout(switchRef.current);
      switchRef.current = window.setTimeout(() => {
        setTask(prev => {
          // FIX: keep TaskType through filter using a type predicate
          const pool = TASKS.filter((t): t is TaskType => t !== prev);
          const next = pool[randInt(0, pool.length - 1)];
          return next;
        });
        schedule();
      }, randInt(6000, 12000));
    };
    schedule();
    return () => { if (switchRef.current) clearTimeout(switchRef.current); };
  }, [running, focusMode]);

  // countdown
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimer(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // stop at zero; store best
  useEffect(() => {
    if (timer === 0) {
      setRunning(false);
      try {
        const best = Math.max(score, todayBest);
        localStorage.setItem(LS_BEST, JSON.stringify({ date: todayStr(), best }));
        setTodayBest(best);
      } catch {}
    }
  }, [timer, score, todayBest]);

  function award(points = 1) {
    setScore(s => s + points);
    setPetals(p => {
      const n = p + 1;
      if (n >= 5) {
        setScore(s => s + 5); // bloom bonus
        return 0;
      }
      return n;
    });
  }

  function resetAll() {
    setScore(0); setPetals(0); setTimer(90); setRunning(true); setFocusMode(false);
    try {
      const raw = localStorage.getItem(LS_BEST);
      if (raw) setTodayBest((JSON.parse(raw) as any).best ?? 0);
    } catch {}
  }

  return (
    <Card className="grid gap-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PetalBloom petals={petals} accent={theme.accent} />
          <div>
            <div className="text-sm font-semibold text-neutral-900">Cognitive Switchboard</div>
            <div className="text-xs text-neutral-500">New mechanics. Stay curious.</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Theme:</span>
          {Object.entries(THEMES).map(([k,v])=>(
            <button
              key={k}
              onClick={()=>setThemeKey(k as ThemeKey)}
              className="rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: theme.line, backgroundColor: themeKey===k ? v.soft : "#fff", color: themeKey===k ? v.accent : "#111827" }}
              aria-pressed={themeKey===k}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-end gap-3">
          <SandTimer total={90} remaining={timer} tint={theme.accent} line={theme.line} />
          <div className="text-sm">
            <div className="rounded-full border px-3 py-1" style={{ borderColor: theme.line }}>
              Score: <b className="tabular-nums">{score}</b>
            </div>
            <div className="mt-1 text-xs text-neutral-500">Best today: {todayBest}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PillButton tone="soft" accent={theme.accent} onClick={()=>setFocusMode(v=>!v)}>
            {focusMode ? "Focus On" : "Focus Off"}
          </PillButton>
          <PillButton tone="soft" accent={theme.accent} onClick={()=>setRunning(r=>!r)}>
            {running ? "Pause" : "Resume"}
          </PillButton>
          <PillButton onClick={resetAll}>Reset</PillButton>
        </div>
      </div>

      {/* Stage */}
      <div className="rounded-2xl border p-4 text-center" style={{ borderColor: theme.line, backgroundColor: theme.soft }}>
        {task === "match" && (
          <PatternWeave key={`match-${timer}-${petals}`} accent={theme.accent} line={theme.line} onSuccess={()=>award(1)} />
        )}
        {task === "rotate" && (
          <HueAlign key={`rot-${timer}-${petals}`} accent={theme.accent} line={theme.line} onSuccess={()=>award(1)} />
        )}
        {task === "sound" && (
          <SilenceSentinel key={`sound-${timer}-${petals}`} accent={theme.accent} line={theme.line} onSuccess={()=>award(1)} />
        )}
      </div>

      {/* Haiku footer */}
      <div className="text-xs text-neutral-500">
        {haiku(score, timer)}
      </div>
    </Card>
  );
}

/* =========================
   Haiku score footer
========================= */
function haiku(score: number, t: number) {
  const lines = [
    `${score} steps gathered`,
    `${t} grains of quiet time left`,
    `petals lean toward light`,
  ];
  return lines.join(" · ");
}

/* =======================================================================
   TASKS
======================================================================= */

/** MATCH → Pattern Weave (3×3 grid, remember + tap in order) */
function PatternWeave({ onSuccess, accent, line }: { onSuccess: () => void; accent: string; line: string }) {
  const CELLS = 9;
  const [seq, setSeq] = useState<number[]>([]);
  const [showIdx, setShowIdx] = useState<number>(-1);
  const [inputIdx, setInputIdx] = useState(0);
  const [phase, setPhase] = useState<"show" | "input">("show");
  const [level, setLevel] = useState(3);

  useEffect(() => {
    const s = Array.from({ length: level }, () => randInt(0, CELLS - 1));
    setSeq(s);
    setPhase("show");
    setInputIdx(0);
    setShowIdx(-1);

    let i = -1;
    const id = setInterval(() => {
      i++;
      setShowIdx(i);
      if (i >= s.length) {
        clearInterval(id);
        setPhase("input");
        setShowIdx(-1);
      }
    }, 550);
    return () => clearInterval(id);
  }, [level]);

  function tapCell(idx: number) {
    if (phase !== "input") return;
    const expected = seq[inputIdx];
    if (idx !== expected) {
      setPhase("show");
      setInputIdx(0);
      setShowIdx(-1);
      let i = -1;
      const id = setInterval(() => {
        i++;
        setShowIdx(i);
        if (i >= seq.length) {
          clearInterval(id);
          setPhase("input");
          setShowIdx(-1);
        }
      }, 450);
      return () => clearInterval(id);
    }
    const next = inputIdx + 1;
    if (next >= seq.length) {
      onSuccess();
      setLevel(l => clamp(l + 1, 3, 7));
      setPhase("show");
      setInputIdx(0);
      setShowIdx(-1);
    } else {
      setInputIdx(next);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="text-sm text-neutral-700">Pattern Weave — tap the cells in order</div>
      <div className="mx-auto grid w-56 grid-cols-3 gap-2">
        {Array.from({ length: CELLS }, (_, i) => {
          const lit = phase === "show" && i === seq[showIdx];
          const pressed = phase === "input" && i < seq[inputIdx];
          return (
            <button
              key={i}
              onClick={() => tapCell(i)}
              className="h-16 rounded-xl border bg-white transition active:scale-[0.98]"
              style={{
                borderColor: line,
                boxShadow: lit ? `0 0 0 4px ${accent}33 inset` : undefined,
                opacity: pressed ? 0.7 : 1,
              }}
              aria-label={`Cell ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/** ROTATE → Hue Align (dial target hue within tolerance, hold briefly) */
function HueAlign({ onSuccess, accent, line }: { onSuccess: () => void; accent: string; line: string }) {
  const [target, setTarget] = useState<number>(() => randInt(0, 359));
  const [hue, setHue] = useState<number>(0);
  const [holdOK, setHoldOK] = useState(false);
  const holdRef = useRef<number | null>(null);
  const tol = 8;

  useEffect(() => {
    const diff = Math.min(Math.abs(hue - target), 360 - Math.abs(hue - target));
    if (diff <= tol) {
      if (!holdOK) {
        setHoldOK(true);
        holdRef.current = window.setTimeout(() => {
          onSuccess();
          setTarget(randInt(0, 359));
          setHoldOK(false);
        }, 500);
      }
    } else {
      setHoldOK(false);
      if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
    }
    return () => { if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; } };
  }, [hue, target, holdOK, onSuccess]);

  return (
    <div className="grid gap-3">
      <div className="text-sm text-neutral-700">Hue Align — match the color</div>
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        <div className="rounded-2xl border p-3" style={{ borderColor: line, backgroundColor: "#fff" }}>
          <div className="text-xs text-neutral-500">Target</div>
          <div className="mt-1 h-16 w-full rounded-xl" style={{ backgroundColor: `hsl(${target} 70% 60%)`, border: `1px solid ${line}` }} />
          <div className="mt-1 text-xs text-neutral-500">≈ hue {target}°</div>
        </div>
        <div className="rounded-2xl border p-3" style={{ borderColor: line, backgroundColor: "#fff" }}>
          <div className="text-xs text-neutral-500">Your dial</div>
          <div className="mt-1 h-16 w-full rounded-xl" style={{ backgroundColor: `hsl(${hue} 70% 60%)`, border: `1px solid ${line}` }} />
          <input
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e)=>setHue(Number(e.target.value))}
            className="mt-2 w-full"
            style={{ accentColor: accent }}
            aria-label="Hue dial"
          />
          <div className="mt-1 text-xs">
            {holdOK ? <span style={{ color: accent }}>Hold…</span> : <span className="text-neutral-500">Adjust to match (±{tol}°)</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** SOUND → Silence Sentinel (random noise burst; tap Mute inside window) */
function SilenceSentinel({ onSuccess, accent, line }: { onSuccess: () => void; accent: string; line: string }) {
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("Press Listen, then Mute when noise appears.");
  const [windowOpen, setWindowOpen] = useState(false);
  const fireTO = useRef<number | null>(null);
  const closeTO = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => () => {
    if (fireTO.current) clearTimeout(fireTO.current);
    if (closeTO.current) clearTimeout(closeTO.current);
    if (ctxRef.current) ctxRef.current.close().catch(()=>{});
  }, []);

  function makeNoise(ctx: AudioContext, ms = 250) {
    const bufferSize = ctx.sampleRate * (ms/1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<bufferSize;i++) data[i] = (Math.random() * 2 - 1) * 0.25; // soft noise
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  function listen() {
    if (listening) return;
    setListening(true);
    setHint("Listening…");
    if (typeof window !== "undefined" && (window as any).AudioContext) {
      ctxRef.current = new (window as any).AudioContext();
    }
    const delay = randInt(900, 2500);
    fireTO.current = window.setTimeout(() => {
      if (ctxRef.current) makeNoise(ctxRef.current, 260);
      setWindowOpen(true);
      setHint("Noise! Tap Mute.");
      closeTO.current = window.setTimeout(() => {
        setWindowOpen(false);
        setHint("Too late — listen again.");
        setListening(false);
      }, 420);
    }, delay);
  }

  function mute() {
    if (!windowOpen) return;
    onSuccess();
    setWindowOpen(false);
    setHint("Nice catch. Listening…");
    setListening(false);
  }

  return (
    <div className="grid gap-3">
      <div className="text-sm text-neutral-700">Silence Sentinel — react to the noise</div>
      <div className="mx-auto grid max-w-sm gap-2 rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: line }}>
        <div className="text-neutral-700">{hint}</div>
        <div className="flex items-center justify-center gap-2">
          <PillButton tone="soft" accent={accent} onClick={listen} disabled={listening}>Listen</PillButton>
          <PillButton tone="primary" accent={accent} onClick={mute} disabled={!listening}>Mute</PillButton>
        </div>
      </div>
    </div>
  );
}
