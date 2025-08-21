"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ITPPlan } from "@/app/itp/page";

// --- shared helper ---
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

// --- localStorage keys ---
const ITP_LS_KEY = "fuy.itp.plans.v1";
const POMO_LS_KEY = "fuy.pomo.v1";
const BREATH_LS_LAST = "fuy.breath.last.v1";
const THOUGHTS_TODAY = "fuy.thoughts.today.v1";
const GROUND_LS_LAST = "fuy.grounding.last.v1";
const SC_LS_LAST = "fuy.sc.last.v1";
const ONBOARD_LS = "fuy.onboarding.v1";

// --- types mirrored from ITP ---
type Category = "Health" | "Focus" | "Social" | "Home" | "Emotion" | "Learning" | "Money";
type CueType = "Time" | "Location" | "Event" | "Internal state";
type Frequency = "Once" | "Daily" | "Weekdays" | "Weekends";

// --- profile types ---
type ProfilePayload = {
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  // In our API we return tags as array (even though stored CSV)
  tags?: string[] | null;
};
type ProfileResp =
  | { ok: true; profile: ProfilePayload | null }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Tiny LS watcher to keep tiles/header in sync across tabs and returns */
function useLSWatch<T>(
  key: string,
  read: () => T | null,
  set: (v: T | null) => void
) {
  useEffect(() => {
    const refresh = () => {
      if (typeof window === "undefined") return;
      try {
        set(read());
      } catch {
        // ignore parse errors
      }
    };

    // initial pull (covers soft-nav back from feature page)
    refresh();

    // cross-tab updates
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) refresh();
    };

    // when returning to this tab/route
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [key, read, set]);
}
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const router = useRouter();

  // Header (new): profile bits
  const [headerName, setHeaderName] = useState<string>("");
  const [headerLocation, setHeaderLocation] = useState<string>("");
  const [headerTags, setHeaderTags] = useState<string[]>([]);
  const fetchedOnce = useRef(false); // avoid double-fetch in dev strict mode

  // Prefill from onboarding cache for instant paint
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = JSON.parse(localStorage.getItem(ONBOARD_LS) || "{}");
      if (cached?.displayName && !headerName) setHeaderName(cached.displayName);
      // If you later mirror location/tags into onboarding, they’ll populate here too
      if (cached?.location && !headerLocation) setHeaderLocation(cached.location);
      if (Array.isArray(cached?.tags) && headerTags.length === 0) setHeaderTags(cached.tags);
    } catch {}
  }, []); // eslint-disable-line

  // Live sync from onboarding localStorage (profile page updates)
  useLSWatch(
    ONBOARD_LS,
    () => {
      const raw = localStorage.getItem(ONBOARD_LS);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return {
        displayName: obj?.displayName as string | undefined,
        location: obj?.location as string | undefined,
        tags: Array.isArray(obj?.tags) ? (obj.tags as string[]) : undefined,
      };
    },
    (v) => {
      if (!v) return;
      if (v.displayName) setHeaderName(v.displayName);
      if (typeof v.location === "string") setHeaderLocation(v.location);
      if (Array.isArray(v.tags)) setHeaderTags(v.tags);
    }
  );

  // Server truth: fetch /api/profile (no-store)
  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    (async () => {
      try {
        const r = await fetch("/api/profile", { cache: "no-store" });
        if (!r.ok) return;
        const data: ProfileResp | any = await r.json();
        const p: ProfilePayload | undefined = (data && "ok" in data) ? data.profile : data;
        if (!p) return;
        if (typeof p.displayName === "string" && p.displayName.trim()) setHeaderName(p.displayName);
        if (typeof p.location === "string" && p.location.trim()) setHeaderLocation(p.location);
        if (Array.isArray(p.tags) && p.tags.length) setHeaderTags(p.tags);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Daily mood
  const [mood, setMood] = useState(6);
  const [moodSaving, setMoodSaving] = useState(false);
  const moodLabel = useMemo(() => (mood <= 3 ? "Low" : mood <= 6 ? "Okay" : mood <= 8 ? "Good" : "Great"), [mood]);

  // Gratitude
  const [g1, setG1] = useState("");
  const [g2, setG2] = useState("");
  const [g3, setG3] = useState("");
  const gratitudeReady = (g1 + g2 + g3).trim().length > 0;
  const [gratSaving, setGratSaving] = useState(false);

  // Micro-goal
  const [goal, setGoal] = useState("");
  const [goalPublic, setGoalPublic] = useState(true);
  const [goalSaving, setGoalSaving] = useState(false);
  const [value, setValue] = useState<"Health" | "Growth" | "Kindness" | "Courage" | "Creativity" | "Connection">("Growth");

  const saveMood = async () => {
    setMoodSaving(true);
    await postJSON("/api/posts", { feature: "CHECKIN", visibility: "PRIVATE", content: `Mood: ${mood} (${moodLabel})`, joyScore: mood, connectionScore: 0, creativityScore: 0 });
    await postJSON("/api/stats", { type: "happiness", category: "JOY", value: mood });
    setMoodSaving(false);
  };

  const saveGratitude = async () => {
    if (!gratitudeReady) return;
    setGratSaving(true);
    const clean = (s: string) => s.trim().replace(/\.$/, "");
    const content = [g1, g2, g3].map(clean).filter(Boolean).map((x, i) => `${i + 1}. ${x} (because …)`).join("\n");
    await postJSON("/api/posts", { feature: "JOY", visibility: "FRIENDS", content: `3 Good Things Today:\n${content}`, joyScore: 2, connectionScore: 0, creativityScore: 0 });
    setG1(""); setG2(""); setG3(""); setGratSaving(false);
  };

  const saveGoal = async () => {
    if (!goal.trim()) return;
    setGoalSaving(true);
    await postJSON("/api/posts", { feature: "PROGRESS", visibility: goalPublic ? "PUBLIC" : "PRIVATE", content: `Today’s micro-goal (${value}): ${goal}`, joyScore: 0, connectionScore: goalPublic ? 1 : 0, creativityScore: 0 });
    setGoal(""); setGoalSaving(false);
  };

  // Kindness ideas — FIXED to avoid hydration mismatch
  const acts = [
    "Send a genuine thank-you text.",
    "Compliment a colleague’s effort, not just talent.",
    "Share a useful resource with a friend.",
    "Leave a kind review for a small business.",
    "Let someone go first today.",
  ];
  // Deterministic initial value on the server to match client on first paint
  const [act, setAct] = useState(acts[0]);
  // Randomize after mount (no hydration issues)
  useEffect(() => {
    const idx = Math.floor(Math.random() * acts.length);
    setAct(acts[idx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="grid gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Dashboard{headerName ? <span className="text-neutral-500"> — hi, {headerName}</span> : null}
          </h1>
          <p className="text-neutral-500 mt-1">Tiny actions that compound into happier days.</p>

          {/* NEW: subtle profile chips */}
          {(headerLocation || headerTags.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {headerLocation ? (
                <span className="badge badge-green" title="Location">{headerLocation}</span>
              ) : null}
              {headerTags.map((t, i) => (
                <span key={`${t}-${i}`} className="badge badge-blue" title="Tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="hidden sm:flex gap-2">
          <span className="badge badge-blue">joy</span>
          <span className="badge badge-green">connection</span>
          <span className="badge badge-yellow">creativity</span>
        </div>
      </div>

      {/* Row 1: mood + gratitude */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily check-in */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Daily check-in</h2>
            <span className="badge badge-blue">{moodLabel}</span>
          </div>
          <div className="grid gap-4">
            <input aria-label="Mood from 1 to 10" type="range" min={1} max={10} value={mood} onChange={(e)=>setMood(Number(e.target.value))} className="w-full accent-black" />
            <div className="flex items-center justify-between text-sm text-neutral-500"><span>1</span><span>5</span><span>10</span></div>
            <button className="btn btn-primary w-full" onClick={saveMood} disabled={moodSaving}>{moodSaving ? "Saving…" : "Save mood"}</button>
          </div>
        </div>

        {/* Gratitude */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">3 good things</h2>
            <span className="badge badge-orange">gratitude</span>
          </div>
          <div className="grid gap-3">
            <input className="input" placeholder="I appreciated… (what made it nice?)" value={g1} onChange={(e)=>setG1(e.target.value)} />
            <input className="input" placeholder="I enjoyed… (a tiny detail)" value={g2} onChange={(e)=>setG2(e.target.value)} />
            <input className="input" placeholder="I’m proud of… (a small effort)" value={g3} onChange={(e)=>setG3(e.target.value)} />
            <button className="btn btn-primary w-full disabled:opacity-50" onClick={saveGratitude} disabled={!gratitudeReady || gratSaving}>
              {gratSaving ? "Saving…" : "Save & share to friends"}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: ITP + Pomodoro + Breathing (previews) */}
      <div className="grid gap-6 md:grid-cols-3">
        <ITPPreview />
        <PomodoroPreview />
        <BreathingPreview />
      </div>

      {/* Row 3: Thoughts + Grounding + Self-Compassion (previews) */}
      <div className="grid gap-6 md:grid-cols-3">
        <ThoughtsPreview />
        <GroundingPreview />
        
      </div>

      {/* Row 4: Micro-goal */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Micro-goal for today</h2>
          <span className="badge badge-blue">progress</span>
        </div>
        <div className="grid gap-3">
          <input className="input" placeholder="What’s one small win you can finish today?" value={goal} onChange={(e)=>setGoal(e.target.value)} />
          <div className="flex flex-wrap gap-2 text-sm text-neutral-700">
            <span className="text-neutral-500">Value:</span>
            <ValuePill current={value} setValue={setValue} label="Growth" />
            <ValuePill current={value} setValue={setValue} label="Health" />
            <ValuePill current={value} setValue={setValue} label="Kindness" />
            <ValuePill current={value} setValue={setValue} label="Courage" />
            <ValuePill current={value} setValue={setValue} label="Creativity" />
            <ValuePill current={value} setValue={setValue} label="Connection" />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" checked={goalPublic} onChange={(e)=>setGoalPublic(e.target.checked)} />
            Share publicly (accountability)
          </label>
          <button className="btn btn-primary w-full disabled:opacity-50" onClick={saveGoal} disabled={goalSaving || !goal.trim()}>
            {goalSaving ? "Saving…" : "Commit"}
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Quick actions</h2>
          <span className="badge badge-red">connect</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button className="btn btn-ghost" onClick={()=>router.push("/friends")}>Invite a friend</button>
          <button className="btn btn-ghost" onClick={()=>router.push("/feed")}>Post photo / video</button>
          <button className="btn btn-ghost" onClick={()=> {
            const idx = Math.floor(Math.random() * acts.length);
            setAct(acts[idx]);
          }}>
            New act of kindness
          </button>
          <button className="btn btn-ghost" onClick={()=>{
            postJSON("/api/posts", { feature: "OTHER", visibility: "PUBLIC", content: `Today’s act of kindness: ${act}`, joyScore: 1, connectionScore: 2, creativityScore: 0 });
          }}>
            Share kindness idea
          </button>
        </div>
        <p className="mt-3 text-sm text-neutral-600">Idea: <b>{act}</b></p>
      </div>
    </section>
  );
}

/* ---------- Preview components ---------- */

function ITPPreview() {
  const router = useRouter();
  const [plans, setPlans] = useState<ITPPlan[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const raw = localStorage.getItem(ITP_LS_KEY); if (raw) setPlans(JSON.parse(raw)); } catch {}
  }, []);

  useLSWatch<ITPPlan[]>(
    ITP_LS_KEY,
    () => {
      const raw = localStorage.getItem(ITP_LS_KEY);
      return raw ? (JSON.parse(raw) as ITPPlan[]) : [];
    },
    (v) => setPlans(v ?? [])
  );

  const counts = useMemo(() => {
    const map: Record<Category, number> = { Health:0, Focus:0, Social:0, Home:0, Emotion:0, Learning:0, Money:0 };
    for (const p of plans) map[p.category] += 1;
    return map;
  }, [plans]);
  const todayDone = plans.filter(p => p.doneToday).length;

  const toggleDone = (id: string) => setPlans((list) => {
    const updated = list.map(p => p.id === id ? { ...p, doneToday: !p.doneToday } : p);
    try { localStorage.setItem(ITP_LS_KEY, JSON.stringify(updated)); } catch {}
    const justToggled = list.find(p => p.id === id);
    if (justToggled) {
      postJSON("/api/stats", {
        type: "itp_done_toggle",
        category: justToggled.category,
        value: justToggled.doneToday ? -1 : 1,
      });
    }
    return updated;
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">ITP — your plans</h2>
        <button className="btn btn-ghost" onClick={() => router.push("/itp")}>Open ITP →</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {(Object.keys(counts) as Category[]).map((c) => (
          <button key={c} className="badge badge-blue hover:opacity-90" onClick={() => router.push("/itp")}>{c} · {counts[c]}</button>
        ))}
      </div>
      <div className="grid gap-2">
        {plans
          .slice()
          .sort((a, b) => (a.priority - b.priority) || (b.confidence - a.confidence))
          .slice(0, 5)
          .map((p) => (
            <div key={p.id} className="rounded-lg border p-2 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-neutral-600">If ({p.cueType}) {p.cue} → {p.action}</div>
              </div>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={p.doneToday || false} onChange={() => toggleDone(p.id)} />
                done
              </label>
            </div>
          ))}
        {plans.length === 0 && <p className="text-sm text-neutral-500">No plans yet. Open ITP to add one.</p>}
      </div>
      <div className="mt-3 text-xs text-neutral-600">Done today: <b>{todayDone}</b> / {plans.length}</div>
    </div>
  );
}

function PomodoroPreview() {
  const router = useRouter();
  const [state, setState] = useState<{ completedToday: number; targetPerDay: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(POMO_LS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as any;
        const today = new Date().toISOString().slice(0,10);
        if (s.lastResetDate !== today) s.completedToday = 0;
        setState({ completedToday: s.completedToday ?? 0, targetPerDay: s.targetPerDay ?? 4 });
      }
    } catch {}
  }, []);

  useLSWatch(
    POMO_LS_KEY,
    () => {
      const raw = localStorage.getItem(POMO_LS_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as any;
      const today = new Date().toISOString().slice(0,10);
      if (s.lastResetDate !== today) s.completedToday = 0;
      return { completedToday: s.completedToday ?? 0, targetPerDay: s.targetPerDay ?? 4 };
    },
    (v) => setState(v)
  );

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Pomodoro</h2>
        <button className="btn btn-ghost" onClick={() => router.push("/pomodoro")}>Open →</button>
      </div>
      <p className="text-sm text-neutral-600 mb-2">Focused work sessions today</p>
      <div className="rounded-lg border p-3 text-center">
        <div className="text-2xl font-semibold">{state?.completedToday ?? 0} / {state?.targetPerDay ?? 4}</div>
        <div className="text-xs text-neutral-500 mt-1">Completed / Target</div>
      </div>
    </div>
  );
}

function BreathingPreview() {
  const router = useRouter();
  const [info, setInfo] = useState<{ preset?: string; cycles?: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const raw = localStorage.getItem(BREATH_LS_LAST); if (raw) setInfo(JSON.parse(raw)); } catch {}
  }, []);

  useLSWatch(
    BREATH_LS_LAST,
    () => {
      const raw = localStorage.getItem(BREATH_LS_LAST);
      return raw ? JSON.parse(raw) : null;
    },
    (v) => setInfo(v)
  );

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Breathing</h2>
        <button className="btn btn-ghost" onClick={() => router.push("/breathing")}>Open →</button>
      </div>
      <p className="text-sm text-neutral-600 mb-2">Last session</p>
      <div className="rounded-lg border p-3">
        <div className="text-sm">{info?.preset || "—"}</div>
        <div className="text-xs text-neutral-500">cycles: {info?.cycles ?? "—"}</div>
      </div>
    </div>
  );
}

function ThoughtsPreview() {
  const router = useRouter();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(THOUGHTS_TODAY);
      if (raw) {
        const d = JSON.parse(raw) as { date:string; count:number };
        const today = new Date().toISOString().slice(0,10);
        setCount(d.date === today ? d.count : 0);
      }
    } catch {}
  }, []);

  useLSWatch(
    THOUGHTS_TODAY,
    () => {
      const raw = localStorage.getItem(THOUGHTS_TODAY);
      if (!raw) return 0;
      const d = JSON.parse(raw) as { date:string; count:number };
      const today = new Date().toISOString().slice(0,10);
      return d.date === today ? d.count : 0;
    },
    (v) => setCount(v ?? 0)
  );

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Thought labeling</h2>
        <button className="btn btn-ghost" onClick={() => router.push("/thoughts")}>Open →</button>
      </div>
      <p className="text-sm text-neutral-600 mb-2">Entries today</p>
      <div className="rounded-lg border p-3 text-center">
        <div className="text-2xl font-semibold">{count}</div>
        <div className="text-xs text-neutral-500 mt-1">Saved</div>
      </div>
    </div>
  );
}

function GroundingPreview() {
  const router = useRouter();
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const raw = localStorage.getItem(GROUND_LS_LAST); if (raw) setDelta((JSON.parse(raw) as any).delta); } catch {}
  }, []);

  useLSWatch(
    GROUND_LS_LAST,
    () => {
      const raw = localStorage.getItem(GROUND_LS_LAST);
      if (!raw) return null;
      const obj = JSON.parse(raw) as any;
      return typeof obj?.delta === "number" ? obj.delta : null;
    },
    (v) => setDelta(v)
  );

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Grounding</h2>
        <button className="btn btn-ghost" onClick={() => router.push("/grounding")}>Open →</button>
      </div>
      <p className="text-sm text-neutral-600 mb-2">Last stress change</p>
      <div className="rounded-lg border p-3 text-center">
        <div className="text-2xl font-semibold">{delta === null ? "—" : delta > 0 ? `-${delta}` : `${delta}`}</div>
        <div className="text-xs text-neutral-500 mt-1">SUDS delta (after - before)</div>
      </div>
    </div>
  );
}

function SelfCompassionPreview() {
  const router = useRouter();
  const [soothe, setSoothe] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const raw = localStorage.getItem(SC_LS_LAST); if (raw) setSoothe((JSON.parse(raw) as any).soothe); } catch {}
  }, []);

  useLSWatch(
    SC_LS_LAST,
    () => {
      const raw = localStorage.getItem(SC_LS_LAST);
      if (!raw) return null;
      const obj = JSON.parse(raw) as any;
      return typeof obj?.soothe === "number" ? obj.soothe : null;
    },
    (v) => setSoothe(v)
  );


}

/* ---------- Small shared UI ---------- */
function ValuePill({
  label, current, setValue,
}: { label: "Health" | "Growth" | "Kindness" | "Courage" | "Creativity" | "Connection"; current: string; setValue: (v: any) => void; }) {
  const active = current === label;
  return (
    <button type="button" aria-pressed={active} className={`px-2 py-1 rounded-full border text-xs ${active ? "bg-black text-white" : "bg-white"}`} onClick={() => setValue(label)}>
      {label}
    </button>
  );
}
