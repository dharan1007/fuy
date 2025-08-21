"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * QuietLab+ (Calm Builder replacement)
 * Minimal, peaceful, and useful toolkit:
 * - Somatic Scan with before/after and relief stats
 * - Micro‑Ritual Composer with inline runner
 * - Wordless Check‑in + Loop Breaker
 * - Pocket Journal with sparkline
 * - Quiet Timer (2–10 min)
 *
 * No external dependencies. Mobile-friendly. All types and helpers included.
 */

/* ===================== Types ===================== */

export type Intensity = 0|1|2|3|4|5|6|7|8|9|10;

type Zone = "head" | "neck" | "chest" | "upperBack" | "abdomen" | "lowerBack" | "hips" | "legs" | "arms";

type ScanMark = {
  zone: Zone;
  before: Intensity;
  after?: Intensity;
};

type CardKey = "breath" | "gaze" | "microMove" | "touch" | "sound";

type JournalEntry = { ts: number; note: string; score: number };

/* ===================== Constants ===================== */

const ZONES: Zone[] = ["head","neck","chest","upperBack","abdomen","lowerBack","hips","legs","arms"];
const ZONE_LABEL: Record<Zone,string> = {
  head:"Head", neck:"Neck", chest:"Chest", upperBack:"Upper Back",
  abdomen:"Abdomen", lowerBack:"Lower Back", hips:"Hips", legs:"Legs", arms:"Arms"
};

const CARDS: Record<CardKey, { title: string; options: string[]; hint: string }> = {
  breath: {
    title: "Breath",
    options: ["4‑2‑6 (in‑hold‑out)","Box 4‑4‑4‑4","2‑stage inhale (nose→ribs)","Sigh + long exhale"],
    hint: "Longer exhales tilt parasympathetic; keep it easy."
  },
  gaze: {
    title: "Gaze",
    options: ["Panoramic (soft wide)","Near‑far switching","Eyes closed + inner field","Follow a slow point"],
    hint: "Softening visual effort reduces arousal."
  },
  microMove: {
    title: "Micro‑move",
    options: ["Neck C‑trace ×5","Shoulder rolls ×6","Ankle pumps ×12","Cat‑cow mini ×6"],
    hint: "Tiny range, no pain. Slow and curious."
  },
  touch: {
    title: "Touch",
    options: ["Hand on heart","Palm over belly","Temple massage","Warm mug holding"],
    hint: "Warm pressure adds safety signals."
  },
  sound: {
    title: "Sound",
    options: ["Humming 30s","Low “mmm” ×5","Ocean breath sound","Whisper count 10→1"],
    hint: "Vocalization gently vibrates vagal pathways."
  }
};

const SHAPES = ["●","◆","■","▲","⬟"] as const;
const TEMPS = ["cool","neutral","warm"] as const;
const TEXTURES = ["smooth","grainy","heavy","floaty"] as const;

/* ===================== Component ===================== */

export default function CalmBuilder() {
  const [tab, setTab] = useState<"scan"|"compose"|"check"|"journal"|"timer">("scan");

  /* ----- Somatic Scan ----- */
  const [scan, setScan] = useState<ScanMark[]>([]);
  const [activeZone, setActiveZone] = useState<Zone | null>(null);
  const [scanSecs, setScanSecs] = useState(90);
  const [scanRunning, setScanRunning] = useState(false);

  useEffect(() => {
    if (!scanRunning) return;
    const id = setInterval(() => setScanSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [scanRunning]);

  const setBefore = (zone: Zone, val: Intensity) => {
    setScan(prev => {
      const idx = prev.findIndex(z => z.zone === zone);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], before: val };
        return next;
      }
      return [...prev, { zone, before: val }];
    });
  };
  const setAfter = (zone: Zone, val: Intensity) => {
    setScan(prev => prev.map(z => z.zone === zone ? { ...z, after: val } : z));
  };

  const relief = useMemo(() => {
    const deltas = scan.filter(s => s.after != null).map(s => s.before - (s.after ?? s.before));
    const avg = deltas.length ? deltas.reduce((a,b)=>a+b,0)/deltas.length : 0;
    return { count: scan.length, avg: +avg.toFixed(1) };
  }, [scan]);

  const exportScanJSON = () => {
    const blob = new Blob([JSON.stringify(scan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    tempDownload(url, "somatic-scan.json");
  };

  /* ----- Composer ----- */
  const [deck, setDeck] = useState<{key: CardKey; pick: string | null}[]>([
    { key: "breath", pick: null },
    { key: "gaze", pick: null },
    { key: "microMove", pick: null },
  ]);
  const [duration, setDuration] = useState(90);
  const [playing, setPlaying] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (playing && tick >= duration) setPlaying(false);
  }, [tick, duration, playing]);

  /* ----- Wordless Check-in ----- */
  const [shape, setShape] = useState<typeof SHAPES[number] | null>(null);
  const [temp, setTemp] = useState<typeof TEMPS[number] | null>(null);
  const [texture, setTexture] = useState<typeof TEXTURES[number] | null>(null);
  const suggestion = useMemo(() => suggestFromQualia(shape, temp, texture), [shape, temp, texture]);

  const lastQualia = useRef<{shape: string|null; temp: string|null; texture: string|null}>({shape:null,temp:null,texture:null});
  useEffect(()=>{ lastQualia.current = {shape, temp, texture}; }, [shape, temp, texture]);

  const breakLoop = () => {
    const act = loopBreaker(lastQualia.current);
    alert(act);
  };

  /* ----- Journal ----- */
  const [note, setNote] = useState("");
  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("quietlab.journal");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem("quietlab.journal", JSON.stringify(journal.slice(-100))); } catch {}
  }, [journal]);

  const addJournal = () => {
    if (!note.trim()) return;
    const score = scoreFromNote(note);
    setJournal(j => [...j, { ts: Date.now(), note: note.trim(), score }]);
    setNote("");
  };

  /* ----- Quiet Timer ----- */
  const [tSecs, setTSecs] = useState(120);
  const [tRun, setTRun] = useState(false);
  useEffect(() => {
    if (!tRun) return;
    const id = setInterval(() => setTSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [tRun]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Header />
      <Tabs tab={tab} setTab={setTab} />

      <div className="grid gap-5">
        {tab === "scan" && (
          <Card glass>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Somatic Scan (90s)</h2>
              <div className="flex items-center gap-2">
                <TimerBadge secs={scanSecs} />
                <Button tone="ghost" onClick={() => { setScanSecs(90); setScanRunning(false); }}>Reset</Button>
                <Button onClick={() => setScanRunning(r => !r)}>{scanRunning ? "Pause" : "Start"}</Button>
                <Button tone="ghost" onClick={exportScanJSON}>Export</Button>
              </div>
            </div>
            <div className="grid md:grid-cols-[1fr_320px] gap-4">
              <BodyBoard
                activeZone={activeZone}
                setActiveZone={setActiveZone}
                onSetBefore={setBefore}
                onSetAfter={setAfter}
                scan={scan}
              />
              <div className="grid gap-3">
                <ScanPanel
                  activeZone={activeZone}
                  scan={scan}
                  setBefore={setBefore}
                  setAfter={setAfter}
                />
                <div className="rounded-2xl border p-4 bg-white/70 backdrop-blur">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Marks" value={String(relief.count)} />
                    <Stat label="Avg relief" value={`${relief.avg}`} />
                  </div>
                  <p className="text-xs text-neutral-600 mt-2">Even tiny improvements matter. Keep it gentle.</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {tab === "compose" && (
          <Card glass>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Micro‑Ritual Composer</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600">{playing ? `${duration - tick}s left` : `${duration}s`}</span>
                <input type="range" min={60} max={180} step={15} value={duration} onChange={(e)=>setDuration(parseInt(e.target.value))} />
                <Button onClick={() => { setTick(0); setPlaying(p => !p); }}>{playing ? "Stop" : "Run"}</Button>
              </div>
            </div>
            <Composer deck={deck} setDeck={setDeck} />
            {playing && (
              <div className="mt-4 rounded-2xl border p-4 bg-white/70">
                <Runline deck={deck} tick={tick} duration={duration} />
              </div>
            )}
          </Card>
        )}

        {tab === "check" && (
          <Card glass>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Wordless Check‑in</h2>
              <Button tone="ghost" onClick={breakLoop}>Loop Breaker</Button>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <PickerGroup label="Shape" items={SHAPES} value={shape} setValue={setShape} />
              <PickerGroup label="Temperature" items={TEMPS} value={temp} setValue={setTemp} />
              <PickerGroup label="Texture" items={TEXTURES} value={texture} setValue={setTexture} />
            </div>
            <div className="mt-3 text-sm text-neutral-700">
              {suggestion || "Pick any combination to see a suggestion."}
            </div>
          </Card>
        )}

        {tab === "journal" && (
          <Card glass>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Pocket Journal</h2>
              <div className="flex items-center gap-2">
                <Button tone="ghost" onClick={() => setJournal([])}>Clear</Button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                className="border rounded-xl px-3 py-2 flex-1"
                placeholder="One sentence: what's the felt‑sense now?"
                value={note}
                onChange={(e)=>setNote(e.target.value)}
              />
              <Button onClick={addJournal}>Add</Button>
            </div>
            <div className="mt-3 grid gap-2">
              <Sparkline values={journal.slice(-30).map(j => j.score)} />
              <div className="grid gap-1">
                {journal.slice(-10).reverse().map(j => (
                  <div key={j.ts} className="text-xs text-neutral-700">
                    {new Date(j.ts).toLocaleTimeString()} — {j.note}
                  </div>
                ))}
                {journal.length===0 && <div className="text-xs text-neutral-500">No entries yet.</div>}
              </div>
            </div>
          </Card>
        )}

        {tab === "timer" && (
          <Card glass>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Quiet Timer</h2>
              <div className="flex items-center gap-2">
                <TimerBadge secs={tSecs} />
                <select
                  className="border rounded-xl px-2 py-1 text-sm"
                  value={tSecs}
                  onChange={(e)=>setTSecs(parseInt(e.target.value))}
                >
                  {[120,180,300,600].map(s => <option key={s} value={s}>{Math.round(s/60)} min</option>)}
                </select>
                <Button onClick={()=>setTRun(r=>!r)}>{tRun ? "Pause" : "Start"}</Button>
                <Button tone="ghost" onClick={()=>{ setTRun(false); setTSecs(120); }}>Reset</Button>
              </div>
            </div>
            <div className="rounded-2xl border p-6 bg-white/70 backdrop-blur grid place-items-center min-h-40">
              <div className="text-sm text-neutral-700">Sit quietly. Panoramic gaze. Soften jaw. Longer exhales.</div>
              <div className="mt-3 w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-2 bg-neutral-900" style={{ width: `${(1 - (tSecs / Math.max(1,tSecs))) * 100}%` }} />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ===================== Somatic Scan UI ===================== */

function BodyBoard({ activeZone, setActiveZone, onSetBefore, onSetAfter, scan }:{
  activeZone: Zone|null; setActiveZone:(z:Zone|null)=>void;
  onSetBefore:(z:Zone,v:Intensity)=>void; onSetAfter:(z:Zone,v:Intensity)=>void;
  scan: ScanMark[];
}) {
  const W = 240, H = 420;
  const zoneRect: Record<Zone,{x:number;y:number;w:number;h:number}> = {
    head:{x:100,y:20,w:40,h:40}, neck:{x:100,y:66,w:40,h:24},
    chest:{x:75,y:96,w:90,h:50}, upperBack:{x:75,y:96,w:90,h:50},
    abdomen:{x:82,y:150,w:76,h:44}, lowerBack:{x:82,y:150,w:76,h:44},
    hips:{x:80,y:200,w:80,h:40},
    legs:{x:80,y:244,w:80,h:120},
    arms:{x:30,y:110,w:180,h:44},
  };

  const fill = (z: Zone) => {
    const m = scan.find(s => s.zone === z);
    const val = m?.after ?? m?.before ?? 0;
    const a = Math.min(0.5, 0.08 + (val/10)*0.42);
    return `rgba(255, 99, 71, ${a})`; // soft coral overlay
  };

  return (
    <div className="rounded-2xl border p-3 bg-white/70 backdrop-blur">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <rect x="0" y="0" width={W} height={H} rx="24" fill="url(#g)" />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {ZONES.map(z => {
          const r = zoneRect[z];
          return (
            <g key={z}>
              <rect
                x={r.x} y={r.y} width={r.w} height={r.h} rx="10" ry="10"
                fill={fill(z)}
                stroke={activeZone===z ? "#111" : "#ddd"} strokeWidth={activeZone===z ? 2 : 1}
                onClick={()=>setActiveZone(activeZone===z ? null : z)}
              />
              <text x={r.x + r.w/2} y={r.y - 6} textAnchor="middle" fontSize="10" fill="#6b7280">{ZONE_LABEL[z]}</text>
            </g>
          );
        })}
      </svg>

      {activeZone && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <IntensityPicker label="Before" value={scan.find(s=>s.zone===activeZone)?.before ?? 0} onChange={(val: Intensity)=>onSetBefore(activeZone, val)} />
          <IntensityPicker label="After" value={scan.find(s=>s.zone===activeZone)?.after ?? 0} onChange={(val: Intensity)=>onSetAfter(activeZone, val)} />
        </div>
      )}
    </div>
  );
}

function ScanPanel({ activeZone, scan, setBefore, setAfter }:{
  activeZone: Zone|null; scan: ScanMark[];
  setBefore:(z:Zone,v:Intensity)=>void; setAfter:(z:Zone,v:Intensity)=>void;
}) {
  const entry = activeZone ? scan.find(s => s.zone === activeZone) : null;
  return (
    <div className="rounded-2xl border p-4 bg-white/70 backdrop-blur">
      <div className="text-sm text-neutral-700">
        {activeZone ? `Editing: ${ZONE_LABEL[activeZone]}` : "Select an area to set 'before' and 'after'."}
      </div>
      {activeZone && (
        <div className="mt-3 grid gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-24">Before</span>
            <input type="range" min={0} max={10} value={entry?.before ?? 0} onChange={(e)=>setBefore(activeZone, parseInt(e.target.value) as Intensity)} className="w-full" />
            <span className="w-10 text-right">{entry?.before ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24">After</span>
            <input type="range" min={0} max={10} value={entry?.after ?? 0} onChange={(e)=>setAfter(activeZone, parseInt(e.target.value) as Intensity)} className="w-full" />
            <span className="w-10 text-right">{entry?.after ?? 0}</span>
          </div>
        </div>
      )}
      <div className="mt-3 text-xs text-neutral-600">
        Tip: keep ranges tiny and comfortable. Even 0.5 relief counts.
      </div>
    </div>
  );
}

/* ===================== Composer UI ===================== */

function Composer({ deck, setDeck }:{ deck:{key:CardKey;pick:string|null}[]; setDeck:(v:any)=>void }) {
  const setPick = (k: CardKey, v: string) => {
    setDeck((d: any[]) => d.map((c) => c.key === k ? { ...c, pick: v } : c));
  };

  return (
    <div className="grid md:grid-cols-3 gap-3">
      {deck.map(c => (
        <div key={c.key} className="rounded-2xl border p-4 bg-white/70 backdrop-blur">
          <div className="font-medium mb-2">{CARDS[c.key].title}</div>
          <div className="grid gap-2">
            {CARDS[c.key].options.map(opt => (
              <button
                key={opt}
                className={`text-left px-3 py-2 rounded-xl border ${c.pick===opt ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}
                onClick={()=>setPick(c.key, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="text-xs text-neutral-600 mt-2">{CARDS[c.key].hint}</div>
        </div>
      ))}
    </div>
  );
}

function Runline({ deck, tick, duration }:{ deck:{key:CardKey;pick:string|null}[]; tick:number; duration:number }) {
  const steps = deck.filter(d => d.pick).map(d => d.pick as string);
  const stepDur = steps.length ? Math.floor(duration / steps.length) : duration;
  const current = steps.length ? Math.min(steps.length - 1, Math.floor(tick / stepDur)) : 0;

  return (
    <div>
      <div className="text-sm text-neutral-700 mb-2">Follow the prompt. Gentle pace.</div>
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className={`px-3 py-2 rounded-xl border text-sm ${i===current ? "bg-neutral-900 text-white" : "bg-white"}`}>
            {s}
          </div>
        ))}
        {steps.length===0 && <div className="text-xs text-neutral-500">Select prompts to start.</div>}
      </div>
      <div className="mt-3 w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-2 bg-neutral-900" style={{ width: `${(tick/duration)*100}%` }} />
      </div>
    </div>
  );
}

/* ===================== Check-in UI ===================== */

function PickerGroup<T extends string>({ label, items, value, setValue }:{ label:string; items: readonly T[]; value:T|null; setValue:(v:T)=>void }) {
  return (
    <div className="rounded-2xl border p-4 bg-white/70 backdrop-blur">
      <div className="text-sm text-neutral-700 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button key={String(it)} className={`px-3 py-2 rounded-xl border text-sm ${value===it?"bg-neutral-900 text-white":"hover:bg-neutral-50"}`} onClick={()=>setValue(it)}>
            {String(it)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===================== Journal UI ===================== */

function Sparkline({ values }: { values: number[] }) {
  const w = 280, h = 40, pad = 4;
  if (!values.length) return <div className="text-xs text-neutral-500">No entries yet.</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-6, max - min);
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
      <polyline points={pts} fill="none" stroke="#111" strokeWidth="2" />
    </svg>
  );
}

/* ===================== Reusable UI ===================== */

function Header() {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-200 to-sky-200 border border-white shadow-[0_10px_30px_-15px_rgba(0,0,0,0.3)]" />
        <h1 className="text-xl font-semibold tracking-tight">QuietLab+</h1>
      </div>
      <span className="px-3 py-1 rounded-full bg-neutral-900 text-white text-xs">calm tools</span>
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: "scan"|"compose"|"check"|"journal"|"timer"; setTab: (t:any)=>void }) {
  const TABS = [
    { k: "scan", label: "Somatic Scan" },
    { k: "compose", label: "Ritual Composer" },
    { k: "check", label: "Check‑in" },
    { k: "journal", label: "Journal" },
    { k: "timer", label: "Quiet Timer" },
  ] as const;
  return (
    <div className="flex flex-wrap gap-2 mb-1">
      {TABS.map(t=>(
        <button key={t.k} onClick={()=>setTab(t.k)} className={`px-3 py-2 rounded-xl text-sm border ${tab===t.k?"bg-neutral-900 text-white":"bg-white hover:bg-neutral-50"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Card({ children, glass }: { children: React.ReactNode; glass?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 ${glass ? "bg-white/70 backdrop-blur" : "bg-white"} shadow-[0_6px_30px_-12px_rgba(0,0,0,0.12)]`}>
      {children}
    </div>
  );
}

function Button({ children, onClick, tone="primary" }: { children: React.ReactNode; onClick?:()=>void; tone?: "primary"|"ghost" }) {
  const base = "px-4 py-2 rounded-xl text-sm transition-all active:scale-[0.98]";
  const cls = tone==="primary" ? "bg-neutral-900 text-white hover:shadow" : "bg-white border hover:border-neutral-300";
  return <button className={`${base} ${cls}`} onClick={onClick}>{children}</button>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-neutral-600">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function TimerBadge({ secs }: { secs: number }) {
  const m = Math.floor(secs/60);
  const s = secs%60;
  return (
    <span className="px-3 py-1 rounded-full bg-neutral-900 text-white text-xs">{m}:{s.toString().padStart(2,"0")}</span>
  );
}

/* IntensityPicker (typed, reusable) */
function IntensityPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Intensity;
  onChange: (v: Intensity) => void;
}) {
  const options: Intensity[] = [0,1,2,3,4,5,6,7,8,9,10];
  return (
    <div className="rounded-xl border p-3 bg-white/70">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-neutral-600">{label}</div>
        <div className="text-xs text-neutral-700">{value}/10</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`px-2 py-1 rounded-lg border text-sm ${
              value === n ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
            }`}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===================== Intelligence ===================== */

function suggestFromQualia(shape: string|null, temp: string|null, texture: string|null) {
  if (!shape && !temp && !texture) return "";
  const parts = [];
  if (temp === "cool") parts.push("Warm hands on belly, 4‑2‑6 breath for 60s.");
  if (temp === "warm") parts.push("Soften gaze, slow exhales, shoulder roll ×6.");
  if (texture === "heavy") parts.push("Ankle pumps ×12 + stand and stretch lightly.");
  if (texture === "floaty") parts.push("Add gentle weight: palms on thighs, feel contact.");
  if (shape === "▲") parts.push("Broaden vision (panoramic) for 60s.");
  if (shape === "●") parts.push("Hand on heart + 3 slow exhales.");
  return parts.join(" ");
}

function loopBreaker(q: {shape:string|null; temp:string|null; texture:string|null}) {
  if (q.texture === "heavy") return "Stand, near‑far eye switches ×5, one exhale sigh, then sip water.";
  if (q.temp === "cool") return "Warmth reset: hold a mug, hand on belly, 90s longer exhales.";
  if (q.shape === "■") return "Unclench: jaw wiggle, tongue rest on palate, 6 slow breaths.";
  return "Two‑minute reset: panoramic gaze, ankle pumps ×20, 4‑2‑6 breath.";
}

function scoreFromNote(note: string) {
  const len = Math.min(60, note.length);
  const harsh = (note.match(/(angry|panic|tight|stuck|spin|worry|tense)/gi)?.length ?? 0) * 5;
  return Math.max(0, Math.min(100, Math.round(len + harsh)));
}

/* ===================== Utils ===================== */

function tempDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a);
  a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 500);
}
