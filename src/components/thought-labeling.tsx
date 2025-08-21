"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Storage keys
========================= */
const LS_TODAY = "fuy.thoughts.today.v1";
const LS_RECORDS = "fuy.thoughts.records.v1";
const LS_DRAFT = "fuy.thoughts.draft.v1";
const LS_PREFS = "fuy.thoughts.prefs.v1";

/* =========================
   Types
========================= */
type Distortion =
  | "Catastrophizing"
  | "All-or-nothing"
  | "Mind reading"
  | "Fortune telling"
  | "Overgeneralization"
  | "Shoulds/Musts"
  | "Personalization"
  | "Mental filter"
  | "Disqualifying positives";

type RecordItem = {
  id: string;
  ts: string;
  thought: string;
  distortion: Distortion;
  evidenceFor: string;
  evidenceAgainst: string;
  balanced: string;
  beliefBefore: number;
  beliefAfter: number;
  bodyIntensity: number; // 0-10
  bodyNote?: string;
  tags?: string[];
  experiment?: { test: string; step: string; due?: string };
  rewriteStyle?: "second-person" | "name";
  rewriteOutput?: string;
};

type Step = 1 | 2 | 3 | 4 | 5;
const MIN_STEP: Step = 1;
const MAX_STEP: Step = 5;
const nextStep = (s: Step): Step => (s === MAX_STEP ? MAX_STEP : ((s + 1) as Step));
const prevStep = (s: Step): Step => (s === MIN_STEP ? MIN_STEP : ((s - 1) as Step));

/* =========================
   Constants + utils
========================= */
const DISTORTIONS: Distortion[] = [
  "Catastrophizing",
  "All-or-nothing",
  "Mind reading",
  "Fortune telling",
  "Overgeneralization",
  "Shoulds/Musts",
  "Personalization",
  "Mental filter",
  "Disqualifying positives",
];

const THEMES = {
  chamomile: { name: "Chamomile", accent: "#8b6f47", soft: "#f6efe7", ring: "#e8dfd6" },
  lavender:  { name: "Lavender",  accent: "#6b63b5", soft: "#f0eff8", ring: "#e6e4f3" },
  mist:      { name: "Mist",      accent: "#5b6c7a", soft: "#eef3f6", ring: "#e2e9ee" },
};

function todayStr() { return new Date().toISOString().slice(0,10); }

async function postJSON(url: string, data: any) {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(data) });
    return { ok: res.ok };
  } catch { return { ok:false }; }
}

function hashString(str: string) {
  let h = 2166136261;
  for (let i=0;i<str.length;i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function clamp(n:number,a:number,b:number){ return Math.min(b, Math.max(a,n)); }

/* =========================
   UI Primitives (calm)
========================= */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={["rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm", className].join(" ")}>{children}</div>;
}
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="text-xs font-medium text-neutral-600">{children}</label>;
}
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className="", ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400",
        "focus:outline-none focus:ring-4",
        className,
      ].join(" ")}
    />
  );
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className="", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={[
        "min-h-[92px] w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400",
        "focus:outline-none focus:ring-4",
        className,
      ].join(" ")}
    />
  );
}
function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "soft" | "ghost"; accent?: string }
) {
  const { className="", children, tone="ghost", accent="#6b63b5", ...rest } = props;
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition focus:outline-none";
  const style =
    tone === "primary"
      ? { backgroundColor: accent, color: "#fff", boxShadow: "0 1px 0 rgba(0,0,0,0.02)" }
      : tone === "soft"
      ? { backgroundColor: "#f7f7fa", color: "#1f2937", border: "1px solid #ececf2" }
      : { backgroundColor: "#fff", color: "#111827", border: "1px solid #e5e7eb" };
  return (
    <button {...rest} style={style as any} className={[base, "focus:ring-4"].join(" ") + " " + className}>
      {children}
    </button>
  );
}

/* =========================
   Fancy visuals
========================= */
/** Constellation SVG generated from text */
function Constellation({ seed, accent }: { seed: number; accent: string }) {
  const rnd = useMemo(() => seededRandom(seed || 1), [seed]);
  const points = useMemo(() => {
    const n = 12;
    return Array.from({ length: n }, () => {
      const x = 10 + rnd()*80; // %
      const y = 10 + rnd()*60; // %
      const r = 1.2 + rnd()*1.8;
      return { x, y, r };
    });
  }, [rnd]);

  const path = useMemo(() => {
    if (points.length < 2) return "";
    return points.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");
  }, [points]);

  return (
    <svg viewBox="0 0 100 70" className="w-full h-36 rounded-2xl" aria-hidden>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8f8fb" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="70" fill="url(#g)" />
      <path d={path} stroke={accent} strokeOpacity="0.4" strokeWidth="0.5" fill="none" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={accent} fillOpacity="0.8" />
      ))}
    </svg>
  );
}

/** Confidence Arc (belief delta) */
function ConfidenceArc({ before, after, accent }: { before: number; after: number; accent: string }) {
  const delta = clamp(before - after, 0, 100);
  const pct = delta / 100;
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = pct * c;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 80 80" className="h-16 w-16">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={accent}
          strokeWidth="8"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div>
        <div className="text-xs text-neutral-500">Belief change</div>
        <div className="text-xl font-semibold text-neutral-900">-{delta} pts</div>
      </div>
    </div>
  );
}

/* =========================
   Novel micro-features
========================= */
/** Make a tiny “mantra” from text (very simple heuristic) */
function makeMantra(text: string) {
  if (!text.trim()) return "";
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const stop = new Set(["the","a","an","and","or","but","so","to","of","in","on","for","with","that","this","is","are","it","be","as","at","my","me","i","you","your","we","our"]);
  const keep = Array.from(new Set(words.filter(w => w.length > 3 && !stop.has(w))));
  const top = keep.slice(0,3).map(w => w[0].toUpperCase() + w.slice(1));
  if (top.length === 0) return "Softly, proceed.";
  if (top.length === 1) return `${top[0]}. Gently, forward.`;
  if (top.length === 2) return `${top[0]} & ${top[1]}. Small steps.`;
  return `${top[0]} • ${top[1]} • ${top[2]}`;
}

/** Draw a PNG “Charm Card” and download */
function downloadCharmCard(text: string, accent: string) {
  const mantra = makeMantra(text);
  const canvas = document.createElement("canvas");
  canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // background
  const g = ctx.createLinearGradient(0,0,1200,630);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#f7f7fb");
  ctx.fillStyle = g; ctx.fillRect(0,0,1200,630);

  // frame
  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 8; ctx.strokeRect(24,24,1152,582);

  // accent dots
  for (let i=0;i<20;i++){
    const rnd = Math.random();
    ctx.beginPath();
    ctx.arc(80 + Math.random()*1040, 80 + Math.random()*470, 2 + rnd*3, 0, Math.PI*2);
    ctx.fillStyle = accent + "cc";
    ctx.fill();
  }

  // title
  ctx.fillStyle = "#111827";
  ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("Charm Card", 60, 90);

  // mantra text
  ctx.fillStyle = "#1f2937";
  ctx.font = "600 72px system-ui, -apple-system, Segoe UI, Roboto";
  wrapText(ctx, mantra, 60, 210, 1080, 76);

  // footer
  ctx.fillStyle = "#6b7280";
  ctx.font = "400 28px ui-sans-serif, system-ui";
  ctx.fillText("Cognitive Studio", 60, 560);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = `charm-card-${todayStr()}.png`; a.click();
  URL.revokeObjectURL(url);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) { ctx.fillText(line, x, y); line = words[n] + " "; y += lineHeight; }
    else line = testLine;
  }
  ctx.fillText(line, x, y);
}

/** Oracle — deterministic one-liner */
function futureOracle(thought: string) {
  const bank = [
    "Future-you cares that you tried, not that it was perfect.",
    "Proof arrives after the first small step.",
    "Kindness to yourself is the shortcut to clarity.",
    "You’re allowed to learn out loud.",
    "Ask: what would make this 10% easier?",
    "Half a page today beats a chapter tomorrow.",
    "Nerves mean you care. Breathe and proceed.",
    "Trade prediction for curiosity.",
  ];
  const idx = hashString(thought || "seed") % bank.length;
  return bank[idx];
}

/** Tiny Dares mapped to distortions */
const DARES: Record<Distortion, string[]> = {
  "Catastrophizing": ["Write the most boring outcome.", "Ask a friend to rate your 'disaster' 1–10."],
  "All-or-nothing": ["Do 1 imperfect draft on purpose.", "Ship a 70% version to yourself."],
  "Mind reading": ["Ask one clarifying question.", "Replace a guess with a quote."],
  "Fortune telling": ["List 3 alternatives to the 'inevitable'.", "Run a 5-minute test and observe."],
  "Overgeneralization": ["Find 2 exceptions this week.", "Rename: 'always' → 'sometimes'."],
  "Shoulds/Musts": ["Swap 'should' for 'could' in a sentence.", "Ask: what would 'want' say?"],
  "Personalization": ["List 3 other possible causes.", "Name the system, not the self."],
  "Mental filter": ["Write 3 positives you’d admit for a friend.", "Keep one contrary data point."],
  "Disqualifying positives": ["Accept one compliment with 'thank you.'", "Pin one small win from today."],
};

/** Soft chime via WebAudio */
function playChime(delta: number) {
  if (typeof window === "undefined" || !(window as any).AudioContext) return;
  const ctx = new (window as any).AudioContext();
  const now = ctx.currentTime;
  const vol = clamp(delta/80, 0.15, 0.35);
  const freqs = [440, 660, 880].slice(0, 2 + (delta > 25 ? 1 : 0));
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8 + i*0.05);
    o.connect(g).connect(ctx.destination);
    o.start(now + i*0.03);
    o.stop(now + 0.9 + i*0.05);
  });
}

/* =========================
   Component
========================= */
export function ThoughtLab() {
  // prefs
  const [themeKey, setThemeKey] = useState<keyof typeof THEMES>("lavender");
  const theme = THEMES[themeKey];

  // records
  const [items, setItems] = useState<RecordItem[]>([]);
  const [lastSnapshot, setLastSnapshot] = useState<RecordItem[] | null>(null);

  // load
  useEffect(() => {
    try {
      const r = localStorage.getItem(LS_RECORDS); if (r) setItems(JSON.parse(r));
      const p = localStorage.getItem(LS_PREFS); if (p) {
        const prefs = JSON.parse(p) as { theme?: keyof typeof THEMES };
        if (prefs.theme && THEMES[prefs.theme]) setThemeKey(prefs.theme);
      }
      const d = localStorage.getItem(LS_DRAFT); if (d) hydrateDraft(JSON.parse(d));
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(LS_RECORDS, JSON.stringify(items.slice(-400))); } catch {} }, [items]);
  useEffect(() => { try { localStorage.setItem(LS_PREFS, JSON.stringify({ theme: themeKey })); } catch {} }, [themeKey]);

  // wizard state
  const [step, setStep] = useState<Step>(1);
  const [thought, setThought] = useState("");
  const [distortion, setDistortion] = useState<Distortion>("Catastrophizing");
  const [evidenceFor, setEvidenceFor] = useState("");
  const [evidenceAgainst, setEvidenceAgainst] = useState("");
  const [balanced, setBalanced] = useState("");
  const [beliefBefore, setBeliefBefore] = useState(60);
  const [beliefAfter, setBeliefAfter] = useState(35);
  const [bodyIntensity, setBodyIntensity] = useState(4);
  const [bodyNote, setBodyNote] = useState("");

  // derived
  const rewriteStyle: "second-person" | "name" = "second-person";
  const rewriteOutput = useMemo(() => {
    const base = balanced || thought;
    if (!base) return "";
    return base.replace(/\bI\b/g, "you").replace(/\bmy\b/gi, "your");
  }, [balanced, thought]);

  // autosave draft
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LS_DRAFT, JSON.stringify({
          step, thought, distortion, evidenceFor, evidenceAgainst, balanced,
          beliefBefore, beliefAfter, bodyIntensity, bodyNote
        }));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [step, thought, distortion, evidenceFor, evidenceAgainst, balanced, beliefBefore, beliefAfter, bodyIntensity, bodyNote]);

  function hydrateDraft(d:any) {
    setStep(d.step ?? 1);
    setThought(d.thought ?? "");
    setDistortion(d.distortion ?? "Catastrophizing");
    setEvidenceFor(d.evidenceFor ?? "");
    setEvidenceAgainst(d.evidenceAgainst ?? "");
    setBalanced(d.balanced ?? "");
    setBeliefBefore(d.beliefBefore ?? 60);
    setBeliefAfter(d.beliefAfter ?? 35);
    setBodyIntensity(d.bodyIntensity ?? 4);
    setBodyNote(d.bodyNote ?? "");
  }

  // analytics
  const weekMs = 7*24*3600*1000;
  const analytics = useMemo(() => {
    const now = Date.now();
    const lastWeek = items.filter(i => now - new Date(i.ts).getTime() < weekMs);
    const avgDelta = lastWeek.length ? Math.round(lastWeek.reduce((a,b)=>a + (b.beliefBefore - b.beliefAfter),0)/lastWeek.length) : 0;
    return { avgDelta };
  }, [items]);

  // whisper chips from evidence
  const whisperChips = useMemo(() => {
    const text = `${evidenceFor} ${evidenceAgainst}`.toLowerCase();
    const words = text.replace(/[^a-z0-9\s']/g," ").split(/\s+/).filter(w=>w.length>4);
    const stop = new Set(["about","there","their","which","because","would","could","should","these","those","might","right","wrong","before","after","again","never","always"]);
    const uniq = Array.from(new Set(words.filter(w=>!stop.has(w)))).slice(0,6);
    return uniq.map(w=>w[0].toUpperCase()+w.slice(1));
  }, [evidenceFor, evidenceAgainst]);

  // constellation seed
  const seed = useMemo(()=> hashString(`${thought}|${evidenceFor}|${evidenceAgainst}|${balanced}`), [thought,evidenceFor,evidenceAgainst,balanced]);

  // actions
  function bumpToday() {
    try {
      const raw = localStorage.getItem(LS_TODAY);
      const d = raw ? JSON.parse(raw) as { date:string; count:number } : { date: todayStr(), count: 0 };
      if (d.date !== todayStr()) { d.date = todayStr(); d.count = 0; }
      d.count += 1; localStorage.setItem(LS_TODAY, JSON.stringify(d));
    } catch {}
  }

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(()=>setToast(null), 1800); return ()=>clearTimeout(t); }, [toast]);

  function resetWizard() {
    setStep(1); setThought(""); setEvidenceFor(""); setEvidenceAgainst(""); setBalanced("");
    setBeliefBefore(60); setBeliefAfter(35); setBodyIntensity(4); setBodyNote("");
    try { localStorage.removeItem(LS_DRAFT); } catch {}
  }

  async function save() {
    const rec: RecordItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      ts: new Date().toISOString(),
      thought, distortion, evidenceFor, evidenceAgainst, balanced,
      beliefBefore, beliefAfter, bodyIntensity, bodyNote,
      experiment: undefined,
      rewriteStyle, rewriteOutput
    };
    setLastSnapshot(items);                  // for undo
    const next = [...items, rec];
    setItems(next);
    bumpToday();

    const payload = {
      feature: "CALM", visibility: "PRIVATE",
      content:
`Thought — ${distortion}
• Thought: ${thought}
• Evidence For: ${evidenceFor || "—"}
• Evidence Against: ${evidenceAgainst || "—"}
• Balanced: ${balanced || "—"}
• Believability: ${beliefBefore}% → ${beliefAfter}%
• Body: ${bodyIntensity}/10 ${bodyNote ? `(${bodyNote})` : ""}
• Voice: ${rewriteStyle}${rewriteOutput ? ` | ${rewriteOutput}` : ""}`,
      joyScore: 1, connectionScore: 0, creativityScore: 0,
    };

    const res = await postJSON("/api/posts", payload);
    const delta = clamp(beliefBefore - beliefAfter, 0, 100);
    playChime(delta);

    setToast(res.ok ? "Saved ✦" : "Saved locally (offline) 💾");
    resetWizard();
  }

  function undoLastSave() {
    if (!lastSnapshot) return;
    setItems(lastSnapshot);
    setLastSnapshot(null);
    setToast("Undid last save");
  }

  // keyboard: Enter to next, Cmd/Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==="s") { e.preventDefault(); if (thought.trim()) save(); }
      else if (e.key==="Enter" && !e.shiftKey) {
        const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag==="textarea" || tag==="input") return;
        if (step<MAX_STEP) setStep(nextStep(step));
      }
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  }, [step, thought, beliefBefore, beliefAfter, evidenceFor, evidenceAgainst, balanced]);

  // tiny dare suggestion
  const dare = useMemo(() => {
    const list = DARES[distortion]; if (!list?.length) return "";
    return list[hashString(thought) % list.length];
  }, [distortion, thought]);

  // theme ring color on inputs (inline style)
  const ringStyle = { boxShadow: `0 0 0 4px ${theme.ring}` };

  // helper to insert chip word
  function insertChip(word: string) { setBalanced(prev => (prev ? prev + " " : "") + word); }

  return (
    <div className="grid gap-6" style={{ ["--accent" as any]: theme.accent }}>
      {/* Constellation Header */}
      <Card className="overflow-hidden">
        <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-center">
          <Constellation seed={seed} accent={theme.accent} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">Theme:</span>
              <div className="flex gap-2">
                {Object.entries(THEMES).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setThemeKey(k as keyof typeof THEMES)}
                    className="rounded-full border border-neutral-200 px-3 py-1 text-xs"
                    style={{ backgroundColor: themeKey===k ? v.soft : "#fff", color: themeKey===k ? v.accent : "#111827" }}
                    aria-pressed={themeKey===k}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
            <ConfidenceArc before={beliefBefore} after={beliefAfter} accent={theme.accent} />
            <div className="text-xs text-neutral-500 max-w-xs">{futureOracle(thought)}</div>
          </div>
        </div>
      </Card>

      {/* Wizard */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-neutral-600">Step {step} of {MAX_STEP}</div>
          <div className="h-2 w-40 rounded-full bg-neutral-100">
            <div className="h-2 rounded-full" style={{ width: `${(step/MAX_STEP)*100}%`, backgroundColor: theme.accent, opacity: 0.8 }} />
          </div>
        </div>

        {step===1 && (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="thought">Sticky thought</Label>
              <TextInput id="thought" placeholder="e.g., “I’ll mess this up.”"
                value={thought} onChange={(e)=>setThought(e.target.value)}
                onFocus={(e)=>{ (e.target as HTMLInputElement).style.outline="none"; (e.target as any).style.boxShadow=`0 0 0 4px ${theme.ring}`; }}
                onBlur={(e)=>{ (e.target as any).style.boxShadow="none"; }}
              />
              <div className="flex flex-wrap gap-1.5 text-xs">
                {DISTORTIONS.map((t)=>(
                  <button key={t} onClick={()=>setDistortion(t)} className="rounded-full border border-neutral-200 px-2.5 py-1"
                    style={{ backgroundColor: distortion===t ? theme.soft : "#fff", color: distortion===t ? theme.accent : "#111827" }}
                    aria-pressed={distortion===t}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid items-center gap-2 sm:grid-cols-[120px,1fr,48px]">
              <Label htmlFor="beliefBefore">Belief now</Label>
              <input id="beliefBefore" type="range" min={0} max={100} value={beliefBefore}
                onChange={(e)=>setBeliefBefore(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: theme.accent }}
              />
              <span className="text-sm">{beliefBefore}%</span>
            </div>

            <div className="mt-2 flex gap-2">
              <Button onClick={()=>setStep(nextStep(step))} tone="soft" accent={theme.accent} disabled={!thought.trim()}>Next</Button>
            </div>
          </div>
        )}

        {step===2 && (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="eFor">Evidence — supports it</Label>
              <TextArea id="eFor" placeholder="Facts observed (no guesses)" value={evidenceFor}
                onChange={(e)=>setEvidenceFor(e.target.value)}
                onFocus={(e)=>{ (e.target as any).style.boxShadow=`0 0 0 4px ${theme.ring}`; }}
                onBlur={(e)=>{ (e.target as any).style.boxShadow="none"; }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="eAgainst">Evidence — pushes back</Label>
              <TextArea id="eAgainst" placeholder="Data that weakens the thought" value={evidenceAgainst}
                onChange={(e)=>setEvidenceAgainst(e.target.value)}
                onFocus={(e)=>{ (e.target as any).style.boxShadow=`0 0 0 4px ${theme.ring}`; }}
                onBlur={(e)=>{ (e.target as any).style.boxShadow="none"; }}
              />
            </div>

            {whisperChips.length>0 && (
              <div>
                <div className="mb-1 text-xs text-neutral-500">Whispers from your evidence</div>
                <div className="flex flex-wrap gap-1.5">
                  {whisperChips.map(w=>(
                    <button key={w} onClick={()=>insertChip(w)} className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs" style={{ color: theme.accent }}>
                      + {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button onClick={()=>setStep(prevStep(step))}>Back</Button>
              <Button onClick={()=>setStep(nextStep(step))} tone="soft" accent={theme.accent}>Next</Button>
            </div>
          </div>
        )}

        {step===3 && (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="balanced">Balanced thought</Label>
              <TextArea id="balanced" placeholder="Fair, specific, testable."
                value={balanced} onChange={(e)=>setBalanced(e.target.value)}
                onFocus={(e)=>{ (e.target as any).style.boxShadow=`0 0 0 4px ${theme.ring}`; }}
                onBlur={(e)=>{ (e.target as any).style.boxShadow="none"; }}
              />
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-sm">
              <span className="text-neutral-500">Charm preview:</span>{" "}
              <span className="font-medium text-neutral-900">{makeMantra(balanced || thought)}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid items-center gap-2 sm:grid-cols-[120px,1fr,48px]">
                <Label htmlFor="beliefAfter">Belief after</Label>
                <input id="beliefAfter" type="range" min={0} max={100} value={beliefAfter}
                  onChange={(e)=>setBeliefAfter(Number(e.target.value))}
                  className="w-full" style={{ accentColor: theme.accent }}
                />
                <span className="text-sm">{beliefAfter}%</span>
              </div>
              <div className="grid items-center gap-2 sm:grid-cols-[120px,1fr,24px]">
                <Label htmlFor="bodyIntensity">Body intensity</Label>
                <input id="bodyIntensity" type="range" min={0} max={10} value={bodyIntensity}
                  onChange={(e)=>setBodyIntensity(Number(e.target.value))}
                  className="w-full" style={{ accentColor: theme.accent }}
                />
                <span className="text-sm">{bodyIntensity}</span>
              </div>
            </div>

            <TextInput id="bodyNote" placeholder="Body note (optional)" value={bodyNote} onChange={(e)=>setBodyNote(e.target.value)} />

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button onClick={()=>setStep(prevStep(step))}>Back</Button>
              <Button onClick={()=>setStep(nextStep(step))} tone="soft" accent={theme.accent}>Next</Button>
            </div>
          </div>
        )}

        {step===4 && (
          <div className="grid gap-3">
            <div className="text-xs text-neutral-500">Future-me oracle</div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
              {futureOracle(thought)}
            </div>

            <div>
              <div className="mb-1 text-xs text-neutral-500">Tiny dare for {distortion}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs">{dare}</span>
                <Button tone="ghost" onClick={()=>setStep(nextStep(step))} style={{ color: theme.accent }}>Looks good</Button>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button onClick={()=>setStep(prevStep(step))}>Back</Button>
              <Button onClick={()=>setStep(nextStep(step))} tone="soft" accent={theme.accent}>Next</Button>
            </div>
          </div>
        )}

        {step===5 && (
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-[1fr,auto,auto] sm:items-end">
              <div className="grid gap-1.5">
                <Label htmlFor="download">Charm Card</Label>
                <div className="text-sm text-neutral-600">Auto-crafted from your balanced thought.</div>
              </div>
              <Button tone="soft" accent={theme.accent} onClick={()=>downloadCharmCard(balanced || thought, theme.accent)}>Download PNG</Button>
              <Button tone="primary" accent={theme.accent} onClick={save} disabled={!thought.trim()}>Save</Button>
            </div>

            <div className="mt-1 text-xs text-neutral-500">Tip: ⌘/Ctrl+S also saves.</div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <Button onClick={()=>setStep(prevStep(step))}>Back</Button>
              <Button onClick={resetWizard}>Reset</Button>
              <Button onClick={undoLastSave} style={{ color: theme.accent }}>Undo last save</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Recent capsules */}
      {items.length>0 && (
        <Card>
          <div className="mb-2 text-sm font-semibold text-neutral-900">Recent</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.slice(-6).reverse().map(i=>(
              <div key={i.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                  <span>{new Date(i.ts).toLocaleString()}</span>
                  <span style={{ color: theme.accent }}>-{clamp(i.beliefBefore - i.beliefAfter,0,100)} pts</span>
                </div>
                <div className="line-clamp-2 text-sm text-neutral-900">{i.balanced || i.thought}</div>
                <div className="mt-1 text-xs text-neutral-500">{i.distortion}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Footer Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-neutral-900">This week</div>
          <div className="mt-1 text-sm text-neutral-700">Avg believability Δ: <b className="tabular-nums">{analytics.avgDelta}</b> pts</div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-neutral-900">Shareable charm</div>
          <div className="mt-1 text-xs text-neutral-500">Preview:</div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 text-sm">
            {makeMantra(balanced || thought)}
          </div>
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-neutral-200 bg-white/95 px-4 py-2 text-sm text-neutral-800 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
