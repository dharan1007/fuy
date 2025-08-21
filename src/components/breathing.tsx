"use client";

import { useEffect, useRef, useState } from "react";
type IntervalRef = ReturnType<typeof setInterval> | null;

const LSK_BREATH_SESSIONS = "fuy.breath.sessions.v1"; // [{ts, preset, cycles, pattern}]

async function postJSON(url: string, data: any) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

function pushBreathSession(entry: { ts: number; preset: string; cycles: number; pattern: string }) {
  try {
    const raw = localStorage.getItem(LSK_BREATH_SESSIONS);
    const arr = raw ? (JSON.parse(raw) as any[]) : [];
    arr.unshift(entry);
    localStorage.setItem(LSK_BREATH_SESSIONS, JSON.stringify(arr.slice(0, 50)));
  } catch {}
}

/** Full breathing pacer with presets + editable phases + cycle goals */
export function BreathBox() {
  type PresetKey = "Box 4-4-4-4" | "4-7-8" | "Physiological Sigh";
  const presets: Record<PresetKey, { inhale: number; hold1: number; exhale: number; hold2: number; note?: string }> = {
    "Box 4-4-4-4": { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
    "4-7-8": { inhale: 4, hold1: 7, exhale: 8, hold2: 0, note: "Good for winding down." },
    "Physiological Sigh": { inhale: 2, hold1: 0, exhale: 6, hold2: 0, note: "Two quick inhales then long exhale." },
  };

  const [preset, setPreset] = useState<PresetKey>("Box 4-4-4-4");
  const [dur, setDur] = useState(presets[preset]);
  const [phase, setPhase] = useState<"inhale"|"hold1"|"exhale"|"hold2">("inhale");
  const [t, setT] = useState(dur.inhale);
  const [running, setRunning] = useState(false);
  const [cyclesTarget, setCyclesTarget] = useState(6);
  const [cyclesDone, setCyclesDone] = useState(0);
  const timer = useRef<IntervalRef>(null);

  useEffect(() => { setDur(presets[preset]); setPhase("inhale"); setT(presets[preset].inhale); setCyclesDone(0); }, [preset]);
  useEffect(() => { setT(dur[phase]); }, [dur, phase]);

  useEffect(() => {
    if (!running) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setT((s) => {
        if (s > 1) return s - 1;
        setPhase((p) => (p === "inhale" ? "hold1" : p === "hold1" ? "exhale" : p === "exhale" ? "hold2" : "inhale"));
        return 0;
      });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  useEffect(() => {
    if (t !== 0) return;
    setPhase((p) => {
      const next = p === "inhale" ? "hold1" : p === "hold1" ? "exhale" : p === "exhale" ? "hold2" : "inhale";
      const nextDur = dur[next];
      const pattern = `${dur.inhale}-${dur.hold1}-${dur.exhale}-${dur.hold2}s`;
      const finish = (v: number) => {
        setRunning(false);
        if (timer.current) clearInterval(timer.current);
        pushBreathSession({ ts: Date.now(), preset, cycles: v, pattern });
        postJSON("/api/posts", {
          feature: "CALM",
          visibility: "PRIVATE",
          content: `Breathing session finished (${preset}) — ${v} cycles. Pattern ${pattern}.`,
          joyScore: 1, connectionScore: 0, creativityScore: 0,
        });
      };

      const move = (to: typeof next) => { setPhase(to); setT(dur[to] || dur.inhale); return to; };

      if (nextDur === 0) {
        const jump = next === "hold1" ? "exhale" : next === "hold2" ? "inhale" : next;
        if (jump === "inhale") {
          setCyclesDone((c) => {
            const v = c + 1;
            if (v >= cyclesTarget) finish(v);
            return v;
          });
        }
        return move(jump);
      } else {
        if (next === "inhale") {
          setCyclesDone((c) => {
            const v = c + 1;
            if (v >= cyclesTarget) finish(v);
            return v;
          });
        }
        setT(nextDur);
        return next;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const ratio = dur[phase] ? t / dur[phase] : 0;
  const size = 64 + Math.round((phase === "inhale" ? (1 - ratio) : phase === "exhale" ? ratio : 0.5) * 48);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <select className="input" value={preset} onChange={(e)=>setPreset(e.target.value as any)}>
          {Object.keys(presets).map((k)=> <option key={k}>{k}</option>)}
        </select>
        <input className="input w-24" type="number" min={1} max={99} value={cyclesTarget} onChange={(e)=>setCyclesTarget(Math.max(1, Number(e.target.value)))} />
        <span className="text-sm text-neutral-600 grid place-items-center">cycles</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        {(["inhale","hold1","exhale","hold2"] as const).map((p)=>(
          <div key={p} className="flex items-center gap-1">
            <span className="w-12 capitalize">{p.replace("hold","hold ")}</span>
            <input className="input" type="number" min={0} max={20} value={(dur as any)[p]} onChange={(e)=>setDur((d)=>({...d, [p]: Math.max(0, Number(e.target.value))}))} />
            <span>s</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-600">
        <div><b>Phase:</b> {phase === "hold1" || phase === "hold2" ? "Hold" : phase.charAt(0).toUpperCase()+phase.slice(1)}</div>
        <div><b>Time:</b> {t}s</div>
        <div><b>Cycles:</b> {cyclesDone}/{cyclesTarget}</div>
      </div>

      <div className="grid place-items-center">
        <div className="rounded-full bg-neutral-50 grid place-items-center transition-all duration-300" style={{ width: `${size}px`, height: `${size}px` }} aria-label="Breath pacer visual">
          <span className="text-lg font-semibold tabular-nums">{t}</span>
        </div>
        {presets[preset].note && <p className="text-xs text-neutral-500 mt-1">{presets[preset].note}</p>}
      </div>

      {!running ? (
        <button className="btn btn-ghost w-full" onClick={()=>{ setCyclesDone(0); setPhase("inhale"); setT(dur.inhale); setRunning(true); }}>
          Start session
        </button>
      ) : (
        <button className="btn w-full" onClick={()=>{ setRunning(false); if (timer.current) clearInterval(timer.current); }}>
          Pause
        </button>
      )}
    </div>
  );
}

/** Minimal 4–6 pacer (used by Grounding page) */
export function MiniPacer() {
  const [t, setT] = useState(4);
  const [phase, setPhase] = useState<"inhale"|"exhale">("inhale");
  const [running, setRunning] = useState(false);
  const timer = useRef<IntervalRef>(null);

  useEffect(()=> {
    if (!running) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(()=>{
      setT((s)=> (s>1 ? s-1 : 0));
    }, 1000);
    return ()=>{ if (timer.current) clearInterval(timer.current); };
  }, [running]);

  useEffect(()=>{
    if (t!==0) return;
    setPhase((p)=>{
      const next = p === "inhale" ? "exhale" : "inhale";
      setT(next === "inhale" ? 4 : 6);
      return next;
    });
  }, [t]);

  const size = phase === "inhale" ? 72 : 56;

  return (
    <div className="grid gap-2 place-items-center">
      <div className="rounded-full bg-neutral-50 grid place-items-center transition-all duration-300" style={{ width: size, height: size }}>
        <span className="font-semibold">{t}</span>
      </div>
      <div className="text-xs text-neutral-600">{phase === "inhale" ? "Inhale 4s" : "Exhale 6s"}</div>
      {!running ? (
        <button className="btn btn-ghost w-full" onClick={()=>{ setPhase("inhale"); setT(4); setRunning(true); }}>Start</button>
      ) : (
        <button className="btn w-full" onClick={()=>{ setRunning(false); if (timer.current) clearInterval(timer.current); }}>Pause</button>
      )}
    </div>
  );
}
