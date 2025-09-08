"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ITPPlan } from "@/app/itp/page";

/* ========================================================================================
   UTIL
======================================================================================== */

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

/* ========================================================================================
   CONSTANTS (localStorage keys)
======================================================================================== */

const ITP_LS_KEY = "fuy.itp.plans.v1";
const POMO_LS_KEY = "fuy.pomo.v1";
const BREATH_LS_LAST = "fuy.breath.last.v1";
const THOUGHTS_TODAY = "fuy.thoughts.today.v1";
const GROUND_LS_LAST = "fuy.grounding.last.v1";
const SC_LS_LAST = "fuy.sc.last.v1";
const ONBOARD_LS = "fuy.onboarding.v1";
const THEME_LS = "fuy.theme.v1";

/* ========================================================================================
   TYPES mirrored from ITP
======================================================================================== */

type Category = "Health" | "Focus" | "Social" | "Home" | "Emotion" | "Learning" | "Money";
type CueType = "Time" | "Location" | "Event" | "Internal state";

/* ========================================================================================
   PROFILE
======================================================================================== */

type ProfilePayload = {
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  tags?: string[] | null;
};
type ProfileResp = { ok: true; profile: ProfilePayload | null } | { ok: false; error: string };

/* ========================================================================================
   HOOKS
======================================================================================== */

/**
 * Watch a localStorage key and push parsed value(s) into React state.
 * - Avoids infinite render loops by:
 *   1) not depending on inline `read`/`set` identities
 *   2) deep-equality guard (JSON.stringify for objects/arrays; === for primitives)
 */
function useLSWatch<T>(
  key: string,
  read: () => T | null,
  set: (v: T | null) => void
) {
  const readRef = useRef(read);
  const setRef = useRef(set);
  const prevRef = useRef<T | null>(null);

  // keep refs current without retriggering the effect
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
        // Only update if changed
        if (!deepEqual(prevRef.current, next)) {
          prevRef.current = next;
          setRef.current(next);
        }
      } catch {
        // ignore
      }
    };

    // initial sync
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
  }, [key]); // only depends on the key
}

/* ========================================================================================
   THEME
======================================================================================== */

type ThemeMode = "light" | "dark";

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const cached = localStorage.getItem(THEME_LS);
  if (cached === "light" || cached === "dark") return cached as ThemeMode;
  return getSystemTheme();
}

function useTheme(): [ThemeMode, (t: ThemeMode) => void] {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme());
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_LS, theme);
    } catch {}
  }, [theme]);

  // React to OS changes when user hasn’t manually set
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const handler = () => {
      const saved = localStorage.getItem(THEME_LS);
      if (saved !== "light" && saved !== "dark") {
        setTheme(media.matches ? "dark" : "light");
      }
    };
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, []);
  return [theme, setTheme];
}

/* ========================================================================================
   DASHBOARD
======================================================================================== */

export default function Dashboard() {
  const router = useRouter();
  const [theme, setTheme] = useTheme();

  // Header profile info
  const [headerName, setHeaderName] = useState<string>("");
  const [headerLocation, setHeaderLocation] = useState<string>("");
  const [headerTags, setHeaderTags] = useState<string[]>([]);
  const fetchedOnce = useRef(false);

  // Prefill from onboarding cache
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = JSON.parse(localStorage.getItem(ONBOARD_LS) || "{}");
      if (cached?.displayName && !headerName) setHeaderName(cached.displayName);
      if (cached?.location && !headerLocation) setHeaderLocation(cached.location);
      if (Array.isArray(cached?.tags) && headerTags.length === 0) setHeaderTags(cached.tags);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLSWatch(
    ONBOARD_LS,
    () => {
      const raw = localStorage.getItem(ONBOARD_LS);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return {
        displayName: o?.displayName as string | undefined,
        location: o?.location as string | undefined,
        tags: Array.isArray(o?.tags) ? (o.tags as string[]) : undefined,
      };
    },
    (v) => {
      if (!v) return;
      if (v.displayName) setHeaderName(v.displayName);
      if (typeof v.location === "string") setHeaderLocation(v.location);
      if (Array.isArray(v.tags)) setHeaderTags(v.tags);
    }
  );

  // Server truth
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
        if (p.displayName?.trim()) setHeaderName(p.displayName);
        if (p.location?.trim()) setHeaderLocation(p.location);
        if (Array.isArray(p.tags) && p.tags.length) setHeaderTags(p.tags);
      } catch {}
    })();
  }, []);

  // Micro-goal (same behavior, reinvented UI)
  const [goal, setGoal] = useState("");
  const [goalPublic, setGoalPublic] = useState(true);
  const [goalSaving, setGoalSaving] = useState(false);
  const [value, setValue] = useState<
    "Health" | "Growth" | "Kindness" | "Courage" | "Creativity" | "Connection"
  >("Growth");

  const saveGoal = async () => {
    if (!goal.trim()) return;
    setGoalSaving(true);
    await postJSON("/api/posts", {
      feature: "PROGRESS",
      visibility: goalPublic ? "PUBLIC" : "PRIVATE",
      content: `Today’s micro-goal (${value}): ${goal}`,
      joyScore: 0,
      connectionScore: goalPublic ? 1 : 0,
      creativityScore: 0,
    });
    setGoal("");
    setGoalSaving(false);
  };

  return (
    <section className="bw-shell">
      <div className="bw-bg" aria-hidden />
      {/* Header */}
      <div className="bw-header glass bw-card-xl">
        <div className="bw-header-left">
          <h1 className="bw-title">
            Dashboard{headerName ? <span className="bw-muted"> — hi, {headerName}</span> : null}
          </h1>
          <p className="bw-subtle">Your b/w control room for tiny compounding wins.</p>
          {(headerLocation || headerTags.length > 0) && (
            <div className="bw-chips">
              {headerLocation ? <span className="bw-chip" title="Location">{headerLocation}</span> : null}
              {headerTags.map((t, i) => (
                <span key={`${t}-${i}`} className="bw-chip" title="Tag">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <div className="bw-header-right">
          <button
            aria-label="Toggle theme"
            className="bw-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <span className="bw-toggle-dot" />
          </button>
        </div>
      </div>

      {/* Micro-Goal — Out-of-the-box b/w, dynamic sculpted capsule */}
      <MicroGoalCard
        value={value}
        setValue={setValue}
        goal={goal}
        setGoal={setGoal}
        goalPublic={goalPublic}
        setGoalPublic={setGoalPublic}
        goalSaving={goalSaving}
        onSave={saveGoal}
      />

      {/* Row 2 */}
      <div className="bw-grid3">
        <ITPPreview />
        <PomodoroPreview />
        <BreathingPreview />
      </div>

      {/* Row 3 */}
      <div className="bw-grid3">
        <ThoughtsPreview />
        <GroundingPreview />
        <SelfCompassionPreview />
      </div>

      <BWStyles />
    </section>
  );
}

/* ========================================================================================
   MICRO GOAL — NEW CONCEPT CARD (BLACK/WHITE ONLY)
   — sculpted capsule, inline meta rail, “pulse line”, command bar
======================================================================================== */

function MicroGoalCard({
  value, setValue,
  goal, setGoal,
  goalPublic, setGoalPublic,
  goalSaving, onSave,
}: {
  value: "Health" | "Growth" | "Kindness" | "Courage" | "Creativity" | "Connection";
  setValue: (v: any) => void;
  goal: string; setGoal: (v: string) => void;
  goalPublic: boolean; setGoalPublic: (v: boolean) => void;
  goalSaving: boolean; onSave: () => void;
}) {

  // minimalist value options (unchanged semantics; new UI)
  const values: Array<typeof value> = ["Growth","Health","Kindness","Courage","Creativity","Connection"];

  return (
    <div className="glass bw-hero">
      <div className="bw-hero-head">
        <div className="bw-hero-title">
          <span className="bw-pulse" aria-hidden />
          <h2>Micro-goal for today</h2>
        </div>
        <div className="bw-hero-sub">Focus capsule — define one outcome, commit once.</div>
      </div>

      <div className="bw-hero-body">
        {/* Sculpted input rail */}
        <div className="bw-rail">
          <div className="bw-rail-left" aria-hidden>
            <div className="bw-rail-knot" />
            <div className="bw-rail-line" />
          </div>

          <input
            className="bw-field"
            placeholder="Describe the precise outcome you can finish today…"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />

          <div className="bw-rail-right" aria-hidden>
            <div className="bw-rail-line" />
            <div className="bw-rail-knot" />
          </div>
        </div>

        {/* Value chips — monochrome */}
        <div className="bw-values">
          <span className="bw-hint">Value</span>
          {values.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={value === v}
              className={`bw-vpill ${value === v ? "is-active" : ""}`}
              onClick={() => setValue(v)}
              title={`Set value: ${v}`}
            >
              {v}
            </button>
          ))}
          <label className="bw-checkline">
            <input
              type="checkbox"
              checked={goalPublic}
              onChange={(e) => setGoalPublic(e.target.checked)}
            />
            <span>Public (accountability)</span>
          </label>
        </div>

        {/* Command Bar */}
        <div className="bw-cmd">
          <div className="bw-cmd-left">
            <kbd className="bw-kbd">↵</kbd>
            <span>Commit</span>
          </div>
          <button className="bw-commit" disabled={goalSaving || !goal.trim()} onClick={onSave}>
            {goalSaving ? "Saving…" : "Commit"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================
   ITP PREVIEW — BLACK/WHITE TRACKER
   - No category chips
   - Shows tags (if present), pending/done counts, progress ring/bar
   - Each plan item is an interactive card (hover/click/quick toggle)
======================================================================================== */

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

  const doneCount = useMemo(() => plans.filter(p => p.doneToday).length, [plans]);
  const total = plans.length || 1;
  const percent = Math.round((doneCount / total) * 100);

  // derive pending/done
  const pendingCount = Math.max(0, plans.length - doneCount);

  const toggleDone = (id: string) =>
    setPlans((list) => {
      const updated = list.map(p => p.id === id ? { ...p, doneToday: !p.doneToday } : p);
      try { localStorage.setItem(ITP_LS_KEY, JSON.stringify(updated)); } catch {}
      const justToggled = list.find(p => p.id === id);
      if (justToggled) {
        postJSON("/api/stats", {
          type: "itp_done_toggle",
          category: (justToggled as any)?.category,
          value: justToggled.doneToday ? -1 : 1,
        });
      }
      return updated;
    });

  const openITP = (id?: string) => {
    router.push(id ? `/itp?select=${encodeURIComponent(id)}` : "/itp");
  };

  return (
    <div className="glass bw-widget">
      <div className="bw-w-head">
        <h2 className="bw-w-title">ITP — plan tracker</h2>
        <button className="bw-ghost" onClick={() => openITP()}>Open →</button>
      </div>

      {/* Overview row: ring + counters + bar */}
      <div className="bw-w-overview">
        <RingBW percent={percent} label={`${doneCount}/${plans.length || 0}`} />
        <div className="bw-w-overview-meta">
          <div className="bw-meta-line">
            <span className="bw-meta-key">Done</span>
            <span className="bw-meta-val">{doneCount}</span>
          </div>
          <div className="bw-meta-line">
            <span className="bw-meta-key">Pending</span>
            <span className="bw-meta-val">{pendingCount}</span>
          </div>
          <div className="bw-bar" aria-label="ITP progress bar">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      {/* Plans list — detailed interactive cards */}
      <div className="bw-list">
        {plans
          .slice()
          .sort((a, b) => (a.priority - b.priority) || (b.confidence - a.confidence))
          .slice(0, 6)
          .map((p) => {
            const anyTags: string[] | undefined = (p as any)?.tags;
            const tags = Array.isArray(anyTags) && anyTags.length
              ? anyTags
              : deriveFallbackTags(p);
            return (
              <button
                key={p.id}
                className={`bw-plan ${p.doneToday ? "is-done" : ""}`}
                onClick={() => openITP(p.id)}
                title="Open this plan in ITP"
              >
                <div className="bw-plan-main">
                  <div className="bw-plan-title">{p.title}</div>
                  <div className="bw-plan-sub">
                    <span className="bw-plan-if">if</span>
                    <span className="bw-plan-cond">({p.cueType}) {p.cue}</span>
                    <span className="bw-plan-then">then</span>
                    <span className="bw-plan-act">{p.action}</span>
                  </div>
                </div>
                <div className="bw-plan-side">
                  <div className="bw-tags">
                    {tags.slice(0, 3).map((t, i) => (
                      <span key={`${t}-${i}`} className="bw-tag">{t}</span>
                    ))}
                  </div>
                  <label className="bw-tgl">
                    <input
                      type="checkbox"
                      checked={p.doneToday || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleDone(p.id);
                      }}
                    />
                    <span>{p.doneToday ? "done" : "mark"}</span>
                  </label>
                </div>
              </button>
            );
          })}
        {plans.length === 0 && <p className="bw-meta-empty">No plans yet. Open ITP to add one.</p>}
      </div>
    </div>
  );
}

function deriveFallbackTags(p: ITPPlan): string[] {
  const tags: string[] = [];
  if ((p as any)?.category) tags.push(String((p as any).category)); // backward compatibility
  // derive from cueType/cue keywords
  if (p.cueType) tags.push(p.cueType);
  if (typeof p.cue === "string" && p.cue.trim()) {
    const short = p.cue.trim().slice(0, 14);
    tags.push(short.length < p.cue.trim().length ? `${short}…` : short);
  }
  // confidence/priority hints (monochrome)
  if (typeof (p as any)?.confidence === "number") tags.push(`conf:${(p as any).confidence}`);
  if (typeof (p as any)?.priority === "number") tags.push(`prio:${(p as any).priority}`);
  return Array.from(new Set(tags)).slice(0, 3);
}

/* ========================================================================================
   POMODORO (b/w progress)
======================================================================================== */

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

  const done = state?.completedToday ?? 0;
  const target = state?.targetPerDay ?? 4;
  const pct = Math.max(0, Math.min(100, Math.round((done / Math.max(1, target)) * 100)));

  return (
    <div className="glass bw-widget">
      <div className="bw-w-head">
        <h2 className="bw-w-title">Pomodoro</h2>
        <button className="bw-ghost" onClick={() => router.push("/pomodoro")}>Open →</button>
      </div>
      <div className="bw-w-overview">
        <RingBW percent={pct} label={`${done}/${target}`} />
        <div className="bw-w-overview-meta">
          <div className="bw-meta-line"><span className="bw-meta-key">Sessions</span><span className="bw-meta-val">{done}</span></div>
          <div className="bw-meta-line"><span className="bw-meta-key">Target</span><span className="bw-meta-val">{target}</span></div>
          <div className="bw-bar"><span style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================
   BREATHING (b/w preview)
======================================================================================== */

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

  const cycles = info?.cycles ?? 0;
  const pct = Math.min(100, Math.round((Math.min(12, cycles) / 12) * 100));

  return (
    <div className="glass bw-widget">
      <div className="bw-w-head">
        <h2 className="bw-w-title">Breathing</h2>
        <button className="bw-ghost" onClick={() => router.push("/breathing")}>Open →</button>
      </div>
      <div className="bw-w-overview">
        <RingBW percent={pct} label={cycles ? String(cycles) : "—"} />
        <div className="bw-w-overview-meta">
          <div className="bw-meta-line"><span className="bw-meta-key">Preset</span><span className="bw-meta-val">{info?.preset || "—"}</span></div>
          <div className="bw-meta-line"><span className="bw-meta-key">Cycles</span><span className="bw-meta-val">{cycles || "—"}</span></div>
          <div className="bw-bar"><span style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================
   THOUGHTS (b/w preview)
======================================================================================== */

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

  const cap = Math.max(5, Math.min(12, count + 4));
  const pct = Math.round((count / cap) * 100);

  return (
    <div className="glass bw-widget">
      <div className="bw-w-head">
        <h2 className="bw-w-title">Thought labeling</h2>
        <button className="bw-ghost" onClick={() => router.push("/thoughts")}>Open →</button>
      </div>
      <div className="bw-w-overview">
        <RingBW percent={pct} label={`${count}`} />
        <div className="bw-w-overview-meta">
          <div className="bw-meta-line"><span className="bw-meta-key">Entries</span><span className="bw-meta-val">{count}</span></div>
          <div className="bw-bar"><span style={{ width: `${pct}%` }} /></div>
          <div className="bw-meta-hint">Saved today</div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================
   GROUNDING (b/w preview)
======================================================================================== */

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

  const display = delta === null ? "—" : delta > 0 ? `-${delta}` : `${delta}`;
  const mag = delta === null ? 0 : Math.min(10, Math.abs(delta));
  const pct = Math.round((mag / 10) * 100);

  return (
    <div className="glass bw-widget">
      <div className="bw-w-head">
        <h2 className="bw-w-title">Grounding</h2>
        <button className="bw-ghost" onClick={() => router.push("/grounding")}>Open →</button>
      </div>
      <div className="bw-w-overview">
        <RingBW percent={pct} label={display} />
        <div className="bw-w-overview-meta">
          <div className="bw-meta-line"><span className="bw-meta-key">Change</span><span className="bw-meta-val">{display}</span></div>
          <div className="bw-bar"><span style={{ width: `${pct}%` }} /></div>
          <div className="bw-meta-hint">SUDS delta (after - before)</div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================
   SELF-COMPASSION (b/w preview)
======================================================================================== */

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

  const val = soothe ?? 0;
  const pct = Math.round((Math.min(10, Math.max(0, val)) / 10) * 100);

  return (
    <div className="glass bw-widget">
      <div className="bw-w-head">
        <h2 className="bw-w-title">Self-compassion</h2>
        <button className="bw-ghost" onClick={() => router.push("/self-compassion")}>Open →</button>
      </div>
      <div className="bw-w-overview">
        <RingBW percent={pct} label={soothe === null ? "—" : `${val}`} />
        <div className="bw-w-overview-meta">
          <div className="bw-meta-line"><span className="bw-meta-key">Soothe</span><span className="bw-meta-val">{soothe === null ? "—" : val}</span></div>
          <div className="bw-bar"><span style={{ width: `${pct}%` }} /></div>
          <div className="bw-meta-hint">Higher = more soothed</div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================
   SHARED UI
======================================================================================== */

function RingBW({ percent, label }: { percent: number; label: string }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = (p / 100) * c;
  return (
    <div className="bw-ring">
      <svg width="88" height="88" viewBox="0 0 88 88" className="bw-ring-svg">
        <circle cx="44" cy="44" r={r} className="bw-ring-bg" />
        <circle
          cx="44"
          cy="44"
          r={r}
          className="bw-ring-fg"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div className="bw-ring-label">{label}</div>
    </div>
  );
}

/* Value pill — monochrome */
function ValuePill({
  label, current, setValue,
}: {
  label: "Health" | "Growth" | "Kindness" | "Courage" | "Creativity" | "Connection";
  current: string;
  setValue: (v: any) => void;
}) {
  const active = current === label;
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`bw-vpill ${active ? "is-active" : ""}`}
      onClick={() => setValue(label)}
    >
      {label}
    </button>
  );
}

/* ========================================================================================
   STYLES — PURE BLACK/WHITE THEME + DARK/LIGHT TOGGLE
======================================================================================== */

function BWStyles() {
  return (
    <style jsx global>{`
      /* Root: light/dark via data-theme. Only black/white/gray (no hue). */
      :root {
        --bg: #ffffff;
        --bg-elev: rgba(255,255,255,0.6);
        --fg: #0a0a0a;
        --muted: #4a4a4a;
        --line: rgba(0,0,0,0.12);
        --line-strong: rgba(0,0,0,0.22);
        --shadow: 0 10px 30px rgba(0,0,0,0.08);
        --shadow-strong: 0 20px 60px rgba(0,0,0,0.14);
        --ring: 0 0 0 3px rgba(0,0,0,0.12);
        --soft: rgba(0,0,0,0.05);
        --soft-2: rgba(0,0,0,0.08);
        --soft-3: rgba(0,0,0,0.12);
      }
      [data-theme="dark"] {
        --bg: #0a0a0a;
        --bg-elev: rgba(255,255,255,0.05);
        --fg: #f5f5f5;
        --muted: #c9c9c9;
        --line: rgba(255,255,255,0.18);
        --line-strong: rgba(255,255,255,0.28);
        --shadow: 0 10px 30px rgba(0,0,0,0.5);
        --shadow-strong: 0 20px 60px rgba(0,0,0,0.7);
        --ring: 0 0 0 3px rgba(255,255,255,0.18);
        --soft: rgba(255,255,255,0.06);
        --soft-2: rgba(255,255,255,0.1);
        --soft-3: rgba(255,255,255,0.16);
      }

      /* Shell */
      .bw-shell {
        position: relative;
        min-height: 100vh;
        padding: 24px;
        display: grid;
        gap: 28px;
        background: var(--bg);
        color: var(--fg);
      }
      .bw-bg::before, .bw-bg::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .bw-bg::before {
        background:
          radial-gradient(420px 160px at 10% -10%, var(--soft), transparent 60%),
          radial-gradient(420px 160px at 110% -10%, var(--soft), transparent 60%);
        opacity: 1;
      }
      .bw-bg::after {
        background: linear-gradient(180deg, transparent 0, var(--soft) 40%, transparent 80%);
        opacity: 0.4;
      }

      /* Glass card */
      .glass {
        border-radius: 22px;
        background: var(--bg-elev);
        -webkit-backdrop-filter: blur(12px);
        backdrop-filter: blur(12px);
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
        transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease;
      }
      .glass:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-strong);
        border-color: var(--line-strong);
      }

      /* Header */
      .bw-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        padding: 22px;
      }
      .bw-title {
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.01em;
        color: var(--fg);
      }
      .bw-muted { color: var(--muted); font-weight: 600; }
      .bw-subtle { color: var(--muted); margin-top: 4px; }
      .bw-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      .bw-chip {
        font-size: 12px; padding: 6px 10px; border-radius: 999px;
        border: 1px solid var(--line); background: var(--bg);
        box-shadow: 0 4px 10px var(--soft);
      }

      .bw-header-right { display: flex; align-items: center; gap: 12px; }
      .bw-toggle {
        position: relative;
        width: 54px; height: 32px; border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--bg);
        box-shadow: var(--shadow);
        display: inline-flex; align-items: center;
        padding: 0 4px;
      }
      .bw-toggle-dot {
        width: 22px; height: 22px; border-radius: 999px;
        background: var(--fg);
        transform: translateX(0);
        transition: transform 180ms ease;
      }
      [data-theme="dark"] .bw-toggle-dot { transform: translateX(22px); }

      /* Hero micro-goal */
      .bw-hero { padding: 20px; position: relative; overflow: hidden; }
      .bw-hero-head { display: grid; gap: 4px; margin-bottom: 12px; }
      .bw-hero-title { display: flex; align-items: center; gap: 10px; }
      .bw-hero-title h2 { font-size: 18px; font-weight: 800; }
      .bw-hero-sub { color: var(--muted); font-size: 13px; }
      .bw-pulse {
        width: 10px; height: 10px; border-radius: 999px; background: var(--fg);
        box-shadow: 0 0 0 0 rgba(0,0,0,0.25);
        animation: beat 1.6s ease-in-out infinite;
      }
      @keyframes beat {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,0,0,0.25); }
        50% { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(0,0,0,0.05); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,0,0,0.25); }
      }

      .bw-hero-body { display: grid; gap: 12px; }
      .bw-rail {
        display: grid; grid-template-columns: 24px 1fr 24px; align-items: center; gap: 10px;
      }
      .bw-rail-left, .bw-rail-right { display: grid; gap: 4px; justify-items: center; }
      .bw-rail-knot { width: 8px; height: 8px; border-radius: 999px; background: var(--fg); }
      .bw-rail-line { width: 2px; height: 22px; background: var(--fg); opacity: 0.2; }
      .bw-field {
        background: var(--bg); color: var(--fg);
        border: 1px solid var(--line);
        border-radius: 16px; padding: 12px 14px; outline: none;
      }
      .bw-field:focus { box-shadow: var(--ring); border-color: var(--line-strong); }

      .bw-values { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: var(--muted); }
      .bw-hint { font-size: 13px; margin-right: 2px; }
      .bw-vpill {
        padding: 6px 10px; border-radius: 999px; font-size: 12px;
        border: 1px solid var(--line); background: var(--bg); color: var(--fg);
        transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
      }
      .bw-vpill:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
      .bw-vpill.is-active { box-shadow: var(--ring); }
      .bw-checkline { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }

      .bw-cmd {
        display: flex; align-items: center; justify-content: space-between;
        border: 1px dashed var(--line); border-radius: 14px; padding: 10px 12px;
        background: var(--bg);
      }
      .bw-cmd-left { display: flex; align-items: center; gap: 8px; color: var(--muted); }
      .bw-kbd {
        display: inline-block;
        font-size: 12px; padding: 2px 6px; border: 1px solid var(--line);
        border-radius: 6px; background: var(--bg); color: var(--fg);
        box-shadow: inset 0 -2px 0 var(--soft);
      }
      .bw-commit {
        border-radius: 12px; padding: 8px 14px; background: var(--fg); color: var(--bg);
        border: 1px solid var(--line);
        transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
      }
      .bw-commit:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
      .bw-commit:disabled { opacity: 0.5; cursor: not-allowed; }

      /* Grid */
      .bw-grid3 { display: grid; gap: 20px; grid-template-columns: 1fr; }
      @media (min-width: 900px) { .bw-grid3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

      /* Widget */
      .bw-widget { padding: 18px; }
      .bw-w-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .bw-w-title { font-weight: 800; }
      .bw-ghost {
        padding: 6px 10px; border-radius: 999px; background: var(--bg);
        border: 1px solid var(--line);
      }
      .bw-w-overview { display: flex; align-items: center; gap: 18px; }
      .bw-w-overview-meta { flex: 1; display: grid; gap: 8px; }
      .bw-meta-line { display: flex; align-items: center; justify-content: space-between; }
      .bw-meta-key { color: var(--muted); font-size: 13px; }
      .bw-meta-val { font-weight: 800; }
      .bw-meta-hint { font-size: 12px; color: var(--muted); }

      .bw-bar {
        position: relative; height: 10px; border-radius: 999px; background: var(--soft);
        border: 1px solid var(--line);
        overflow: hidden;
      }
      .bw-bar > span {
        display: block; height: 100%;
        background: var(--fg);
        opacity: 0.2;
        animation: bwslide 700ms ease-out;
      }
      @keyframes bwslide { from { width: 0 } }

      /* Ring */
      .bw-ring { position: relative; width: 88px; height: 88px; }
      .bw-ring-svg { display: block; }
      .bw-ring-bg { fill: none; stroke: var(--line); stroke-width: 8; }
      .bw-ring-fg { fill: none; stroke: var(--fg); stroke-width: 8; stroke-linecap: round; opacity: 0.85; }
      .bw-ring-label {
        position: absolute; inset: 0; display: grid; place-items: center; font-weight: 800;
      }

      /* Plan list */
      .bw-list { display: grid; gap: 10px; margin-top: 12px; }
      .bw-plan {
        display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
        border: 1px solid var(--line); border-radius: 16px; padding: 10px 12px;
        background: var(--bg); color: var(--fg); text-align: left;
        transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
      }
      .bw-plan:hover {
        transform: translateY(-1px); box-shadow: var(--shadow); border-color: var(--line-strong);
      }
      .bw-plan.is-done { opacity: 0.72; }
      .bw-plan-main { display: grid; gap: 2px; }
      .bw-plan-title { font-weight: 700; }
      .bw-plan-sub { color: var(--muted); font-size: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
      .bw-plan-if, .bw-plan-then { font-style: italic; opacity: 0.8; }
      .bw-plan-act { font-weight: 600; }
      .bw-plan-side { display: grid; gap: 8px; justify-items: end; }
      .bw-tags { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .bw-tag {
        font-size: 11px; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--line);
        background: var(--bg);
      }
      .bw-tgl { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }

      /* Cards sizing */
      .bw-card-xl { padding: 22px; }
    `}</style>
  );
}
