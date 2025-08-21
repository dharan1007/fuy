"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

// CONSTANTS & TYPE SAFE ENUMS
const CATEGORIES = ["Health", "Focus", "Social", "Home", "Emotion", "Learning", "Money"] as const;
const CUE_TYPES = ["Time", "Location", "Event", "Internal state"] as const;
const FREQUENCIES = ["Once", "Daily", "Weekdays", "Weekends"] as const;
const STAGES = ["Backlog", "Active", "Done"] as const;
const MEDIA_TYPES = ["none", "video", "document", "text", "image"] as const;
const VISIBILITIES = [
  { label: "Private (to me)", value: "PRIVATE" },
  { label: "Friends", value: "FRIENDS" },
  { label: "Team/Groups", value: "TEAM" },
  { label: "Public", value: "PUBLIC" },
];

type Category = (typeof CATEGORIES)[number];
type CueType = (typeof CUE_TYPES)[number];
type Frequency = (typeof FREQUENCIES)[number];
type Stage = (typeof STAGES)[number];
type MediaKind = (typeof MEDIA_TYPES)[number];
type VisibilityKind = "PRIVATE" | "FRIENDS" | "TEAM" | "PUBLIC";

export type ITPPlan = {
  id: string;
  title: string;
  category: Category;
  cueType: CueType;
  cue: string;
  action: string;
  obstacle?: string;
  backup?: string;
  reward?: string;
  confidence: number;
  priority: 1 | 2 | 3;
  frequency: Frequency;
  doneToday?: boolean;
  stage: Stage;
  pinned?: boolean;
  notes?: string;
  mediaType?: MediaKind;
  mediaUrl?: string;
  mediaFile?: string; // Base64-encoded or blob URL
  mediaFileName?: string;
  createdAt: number;
  streak?: number;
  lastDoneAt?: number;
  doneCount?: number;
  visibility: VisibilityKind;
  deadline?: string; // ISO string date
  remindAt?: string;  // ISO string date/time for reminder
};

const LS_KEY = "fuy.itp.plans.v4";

// HELPERS
function newDraft(): ITPPlan {
  return {
    id: String(Date.now()),
    title: "",
    category: "Health",
    cueType: "Time",
    cue: "",
    action: "",
    obstacle: "",
    backup: "",
    reward: "",
    confidence: 7,
    priority: 2,
    frequency: "Daily",
    doneToday: false,
    stage: "Backlog",
    pinned: false,
    notes: "",
    mediaType: "none",
    createdAt: Date.now(),
    streak: 0,
    doneCount: 0,
    lastDoneAt: undefined,
    visibility: "PRIVATE",
    deadline: undefined,
    remindAt: undefined,
  };
}

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

// GET TIME REMAINING UNTIL DEADLINE
function timeUntil(dateString?: string) {
  if (!dateString) return "No deadline";
  const diff = new Date(dateString).getTime() - Date.now();
  if (diff <= 0) return "Past due";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
}

export default function ITPPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<ITPPlan[]>([]);
  const [draft, setDraft] = useState<ITPPlan>(newDraft());
  const [filter, setFilter] = useState({
    query: "",
    category: "All" as Category | "All",
    frequency: "All" as Frequency | "All",
    stage: "All" as Stage | "All",
    pinnedOnly: false,
    sortBy: "created" as "created" | "priority" | "confidence" | "title" | "deadline",
    visibility: "All" as VisibilityKind | "All",
  });
  const [saving, setSaving] = useState(false);
  const [detailPlan, setDetailPlan] = useState<ITPPlan | null>(null);
  const liveInterval = useRef<NodeJS.Timeout | number | null>(null);

  // BACKGROUND STYLE
  useEffect(() => {
    document.body.classList.add("bg-white", "dark:bg-neutral-950");
    return () => { document.body.classList.remove("bg-white", "dark:bg-neutral-950"); };
  }, []);

  // LocalStorage load/save
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setPlans(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(plans)); } catch {}
  }, [plans]);

  // Live tracker update
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    liveInterval.current = window.setInterval(() => forceUpdate(x => x + 1), 1000);
    return () => {
      if (liveInterval.current) clearInterval(liveInterval.current as number);
    };
  }, []);

  // DERIVED
  const countsByCategory = useMemo(() => {
    const cats: Record<Category, number> = {
      Health: 0, Focus: 0, Social: 0, Home: 0, Emotion: 0, Learning: 0, Money: 0,
    };
    for (const p of plans) cats[p.category] += 1;
    return cats;
  }, [plans]);
  const todayDone = plans.filter((p) => p.doneToday).length;
  const total = plans.length;
  const pct = total ? Math.round((todayDone / total) * 100) : 0;

  // FILTERED PLANS
  const filtered = useMemo(() => {
    let list = [...plans];
    if (filter.query) {
      const q = filter.query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.cue.toLowerCase().includes(q) ||
          p.action.toLowerCase().includes(q) ||
          (p.notes || "").toLowerCase().includes(q)
      );
    }
    if (filter.category !== "All") list = list.filter((p) => p.category === filter.category);
    if (filter.frequency !== "All") list = list.filter((p) => p.frequency === filter.frequency);
    if (filter.stage !== "All") list = list.filter((p) => p.stage === filter.stage);
    if (filter.pinnedOnly) list = list.filter((p) => p.pinned);
    if (filter.visibility !== "All") list = list.filter((p) => p.visibility === filter.visibility);

    switch (filter.sortBy) {
      case "priority":
        list.sort((a, b) => a.priority - b.priority); break;
      case "confidence":
        list.sort((a, b) => b.confidence - a.confidence); break;
      case "title":
        list.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "deadline":
        list.sort((a, b) => {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }); break;
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [plans, filter]);

  // LOGIC FUNCTIONS
  function addPlan() {
    if (!draft.title.trim() || !draft.cue.trim() || !draft.action.trim()) return;
    setPlans((p) => [{ ...draft, id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}` }, ...p]);
    setDraft(newDraft());
  }
  function updatePlan(id: string, patch: Partial<ITPPlan>) {
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removePlan(id: string) {
    setPlans((list) => list.filter((x) => x.id !== id));
    if (detailPlan?.id === id) setDetailPlan(null);
  }
  function movePlan(id: string, toStage: Stage) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, stage: toStage } : p)));
  }
  async function toggleDoneToday(id: string) {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    const now = Date.now();
    const toggled = !plan.doneToday;
    const newStreak = toggled
      ? (Date.now() - (plan.lastDoneAt || 0) > 36 * 60 * 60 * 1000 ? 1 : (plan.streak || 0) + 1)
      : 0;
    const totalDone = toggled ? (plan.doneCount || 0) + 1 : Math.max((plan.doneCount || 0) - 1, 0);
    updatePlan(id, {
      doneToday: toggled,
      streak: newStreak,
      lastDoneAt: toggled ? now : undefined,
      doneCount: totalDone,
    });
    await postJSON("/api/stats", { type: "plan_check", category: plan.category, value: toggled ? 1 : -1 });
    await postJSON("/api/posts", {
      feature: "PROGRESS",
      visibility: plan.visibility,
      content: `Checked: ${plan.title} (${plan.category}) — cue: ${plan.cue}`,
      joyScore: 0,
      connectionScore: 0,
      creativityScore: 0,
    });
  }
  async function saveAllToPosts() {
    if (!plans.length) return;
    setSaving(true);
    const content = plans
      .map((p, i) =>
        `Plan ${i + 1}: ${p.title}
- Visibility: ${p.visibility}
- Category: ${p.category}
- If (${p.cueType}): ${p.cue}
- Then I will: ${p.action}
- Obstacle: ${p.obstacle || "—"}
- Backup: ${p.backup || "—"}
- Reward: ${p.reward || "—"}
- Confidence: ${p.confidence}/10
- Priority: ${p.priority}
- Frequency: ${p.frequency}
- Deadline: ${p.deadline || "none"}
- Reminder: ${p.remindAt || "none"}
- Media: ${p.mediaType || "none"}${p.mediaUrl ? `(${p.mediaUrl})` : ""}${p.mediaFileName ? `(${p.mediaFileName})` : ""}
- Pinned: ${p.pinned ? "Yes" : "No"}
- Stage: ${p.stage}
- Streak: ${p.streak || 0}
- Done Count: ${p.doneCount || 0}
- Last Done: ${p.lastDoneAt ? new Date(p.lastDoneAt).toLocaleString() : "Never"}
- Done today: ${p.doneToday ? "Yes" : "No"}`
      )
      .join("\n\n");
    await postJSON("/api/posts", {
      feature: "PROGRESS",
      visibility: "PRIVATE",
      content: `ITP (If–Then Plan) Set\n\n${content}`,
      joyScore: 0,
      connectionScore: 0,
      creativityScore: 0,
    });
    setSaving(false);
  }
  function onDraftMediaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setDraft((d) => ({
        ...d,
        mediaFile: reader.result as string,
        mediaFileName: file.name,
        mediaUrl: "",
      }));
    };
    reader.readAsDataURL(file);
  }
  function handleDrop(e: React.DragEvent, toStage: Stage) {
    const id = e.dataTransfer.getData("id");
    if (id) movePlan(id, toStage);
  }

  // UTILS
  function since(ts?: number) {
    if (!ts) return "never";
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 80) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  function ReactMarkdown({ children }: { children: string }) {
    return (
      <div style={{whiteSpace:"pre-wrap"}}>{children.replace(/</g,"&lt;")}</div>
    );
  }

  function ProgressRing({ value }: { value: number }) {
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    return (
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={radius} stroke="rgba(0,0,0,0.1)" strokeWidth="8" fill="transparent" />
        <circle cx="36" cy="36" r={radius} stroke="url(#grad)" strokeWidth="8" fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        <defs>
          <linearGradient id="grad" x1="0" x2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <text x="36" y="36" dominantBaseline="middle" textAnchor="middle" className="rotate-90 fill-neutral-700 dark:fill-neutral-200 text-sm font-medium">{value}%</text>
      </svg>
    );
  }

  // DETAIL DRAWER WITH FULL FEATURES
  function DetailDrawer({ plan, onClose, onChange, onToggleDone, onRemove }: {
    plan: ITPPlan;
    onClose: () => void;
    onChange: (patch: Partial<ITPPlan>) => void;
    onToggleDone: () => void;
    onRemove: () => void;
  }) {
    function mediaBlock() {
      if (!plan.mediaType || plan.mediaType === "none") return null;
      if (plan.mediaType === "image" && plan.mediaFile) {
        return <img src={plan.mediaFile} className="rounded max-w-full max-h-80 object-contain border" alt={plan.mediaFileName || "uploaded image"} />;
      }
      if (plan.mediaType === "video" && plan.mediaFile) {
        return <video className="w-full rounded-lg" controls src={plan.mediaFile} />;
      }
      if (plan.mediaType === "document" && plan.mediaFile) {
        return (
          <div className="rounded-lg overflow-hidden border">
            <iframe className="w-full h-[360px]" src={plan.mediaFile} title={plan.mediaFileName || "doc"} />
          </div>
        );
      }
      if (plan.mediaType === "text" && (plan.notes || plan.mediaUrl)) {
        return (
          <div className="rounded-lg border bg-white/70 dark:bg-neutral-900/60 p-3">
            <div className="text-xs text-neutral-500 mb-1">Reference text/link</div>
            <a href={plan.mediaUrl} className="text-xs underline break-words" target="_blank" rel="noopener noreferrer">{plan.mediaUrl}</a>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{plan.notes || "_No text provided._"}</ReactMarkdown>
            </div>
          </div>
        );
      }
      return null;
    }
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-full max-w-xl h-full bg-white dark:bg-neutral-900 shadow-xl p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{plan.title || "Plan details"}</h3>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={plan.category} onChange={(e)=>onChange({ category: e.target.value as any })}>
                {CATEGORIES.map(c=> <option key={c}>{c}</option>)}
              </select>
              <select className="input" value={plan.visibility} onChange={(e)=>onChange({ visibility: e.target.value as VisibilityKind })}>
                {VISIBILITIES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <input className="input" value={plan.title} onChange={(e)=>onChange({ title: e.target.value })} />
            <input className="input" placeholder="Cue (If …)" value={plan.cue} onChange={(e)=>onChange({ cue: e.target.value })} />
            <input className="input" placeholder="Action (Then I will …)" value={plan.action} onChange={(e)=>onChange({ action: e.target.value })} />
            <input className="input" placeholder="Obstacle" value={plan.obstacle || ""} onChange={(e)=>onChange({ obstacle: e.target.value })} />
            <input className="input" placeholder="Backup If–Then" value={plan.backup || ""} onChange={(e)=>onChange({ backup: e.target.value })} />
            <input className="input" placeholder="Reward" value={plan.reward || ""} onChange={(e)=>onChange({ reward: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm w-20">Confidence</span>
                <input className="w-full" type="range" min={0} max={10} value={plan.confidence} onChange={(e)=>onChange({ confidence: Number(e.target.value) })} />
                <span className="text-sm w-6">{plan.confidence}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm w-16">Priority</span>
                <select className="input" value={plan.priority} onChange={(e)=>onChange({ priority: Number(e.target.value) as any })}>
                  <option value={1}>High</option><option value={2}>Med</option><option value={3}>Low</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Deadline</label>
                <input type="date" className="input" value={plan.deadline?.slice(0,10) || ""} onChange={e=>onChange({ deadline: e.target.value || undefined })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex flex-col">
                <label className="text-sm">Reminder</label>
                <input type="datetime-local" className="input" value={plan.remindAt || ""} onChange={e=>onChange({ remindAt: e.target.value || undefined })} />
              </div>
              <div className="flex flex-col">
                <label className="text-sm">Frequency</label>
                <select className="input" value={plan.frequency} onChange={e=>onChange({ frequency: e.target.value as Frequency })}>
                  {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={plan.mediaType || "none"} onChange={(e)=>onChange({ mediaType: e.target.value as any, mediaFile: "", mediaFileName: "", mediaUrl: "" })}>
                {MEDIA_TYPES.map(m=> <option key={m}>{m}</option>)}
              </select>
              {(plan.mediaType === "video" || plan.mediaType === "image" || plan.mediaType === "document") ? (
                <input className="input" type="file"
                  accept={
                    plan.mediaType === "video" ? "video/*" :
                    plan.mediaType === "image" ? "image/*" :
                    plan.mediaType === "document" ? ".pdf" : "*/*"}
                  onChange={e=>{
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => onChange({ mediaFile: reader.result as string, mediaFileName: file.name });
                    reader.readAsDataURL(file);
                  }}
                />
              ) : plan.mediaType === "text" ?
                <input className="input" placeholder="Optionally a web link..." value={plan.mediaUrl || ""} onChange={e=>onChange({mediaUrl:e.target.value, mediaFile:"", mediaFileName:""})} />
                : <input className="input" disabled placeholder="No media" />
              }
            </div>
            <div>
              <label className="text-sm text-neutral-500">Notes (Markdown)</label>
              <textarea className="input min-h-[80px]" value={plan.notes || ""} onChange={(e)=>onChange({ notes: e.target.value })} />
              {!!plan.notes && (
                <div className="mt-2 p-3 rounded border bg-white/70 dark:bg-neutral-900/60">
                  <div className="text-xs text-neutral-500 mb-1">Preview</div>
                  <ReactMarkdown>{plan.notes!}</ReactMarkdown>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={plan.stage} onChange={(e)=>onChange({ stage: e.target.value as any })}>
                {STAGES.map(s=> <option key={s}>{s}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm px-2">
                <input type="checkbox" checked={!!plan.pinned} onChange={(e)=>onChange({ pinned: e.target.checked })} />
                pinned
              </label>
            </div>
            {mediaBlock()}
            <div className="flex items-center justify-between mt-2 gap-2">
              <div className="text-xs text-neutral-500 flex flex-col">
                <span>Created {new Date(plan.createdAt).toLocaleDateString()}</span>
                <span>Streak {plan.streak || 0} · Total {plan.doneCount || 0}</span>
                <span>Last done: {since(plan.lastDoneAt)}</span>
                <span>Deadline: {timeUntil(plan.deadline)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost" onClick={onToggleDone}>{plan.doneToday ? "Undo today" : "Mark done"}</button>
                <button className="btn btn-primary" onClick={onClose}>Save</button>
                <button className="btn btn-ghost text-rose-600" onClick={onRemove}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // BACKGROUND EFFECTS
  function BgBlur() {
    return (
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-indigo-400/20 via-fuchsia-400/20 to-emerald-400/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-180px] right-[-140px] h-[380px] w-[380px] rounded-full bg-gradient-to-br from-rose-400/20 via-amber-400/20 to-cyan-400/20 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(transparent_1px,rgba(0,0,0,0.012)_1px)] [background-size:12px_12px]" />
      </div>
    );
  }

  // LAYOUT RENDER
  return (
    <main className="min-h-screen relative max-w-[1440px] mx-auto overflow-x-hidden px-4 sm:px-6 lg:px-8">
      <BgBlur />
      <section className="relative z-10 py-6">
        <header className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">ITP — If–Then Planner</h1>
            <p className="text-neutral-500 mt-1">Design tiny If–Then plans, capture notes, attach media, and track your streaks live.</p>
          </div>
          <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>← Back to dashboard</button>
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-6">
          {/* LEFT PANEL - Creator + Filters + Summary */}
          <div className="grid gap-6">
            {/* Creation */}
            <div className="rounded-2xl border border-white/10 bg-white/60 dark:bg-neutral-900/50 backdrop-blur-xl p-5 shadow-sm sticky top-6 z-20">
              <h2 className="font-semibold mb-2">Create plan</h2>
              <div className="grid gap-2">
                <input className="input" placeholder="Title (e.g., After lunch walk)" value={draft.title} onChange={(e)=>setDraft({ ...draft, title: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="input" value={draft.category} onChange={(e)=>setDraft({ ...draft, category: e.target.value as Category })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select className="input" value={draft.cueType} onChange={(e)=>setDraft({ ...draft, cueType: e.target.value as CueType })}>
                    {CUE_TYPES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <input className="input" placeholder="Cue (If …)" value={draft.cue} onChange={(e)=>setDraft({ ...draft, cue: e.target.value })} />
                <input className="input" placeholder="Action (Then I will …)" value={draft.action} onChange={(e)=>setDraft({ ...draft, action: e.target.value })} />
                <input className="input" placeholder="Obstacle" value={draft.obstacle || ""} onChange={(e)=>setDraft({ ...draft, obstacle: e.target.value })} />
                <input className="input" placeholder="Backup If–Then" value={draft.backup || ""} onChange={(e)=>setDraft({ ...draft, backup: e.target.value })} />
                <input className="input" placeholder="Tiny reward (optional)" value={draft.reward || ""} onChange={(e)=>setDraft({ ...draft, reward: e.target.value })} />

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-20">Confidence</span>
                    <input type="range" min={0} max={10} value={draft.confidence} onChange={(e) => setDraft({ ...draft, confidence: Number(e.target.value) })} className="w-full" />
                    <span className="text-sm w-6">{draft.confidence}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-16">Priority</span>
                    <select className="input" value={draft.priority} onChange={e => setDraft({ ...draft, priority: Number(e.target.value) as 1|2|3 })}>
                      <option value={1}>High</option>
                      <option value={2}>Med</option>
                      <option value={3}>Low</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-20">Frequency</span>
                    <select className="input" value={draft.frequency} onChange={e => setDraft({ ...draft, frequency: e.target.value as Frequency })}>
                      {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select className="input" value={draft.visibility} onChange={e => setDraft({ ...draft, visibility: e.target.value as VisibilityKind })}>
                    {VISIBILITIES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                  <select className="input" value={draft.mediaType} onChange={(e) => setDraft({ ...draft, mediaType: e.target.value as MediaKind, mediaFile:"", mediaFileName:"", mediaUrl:"" })}>
                    {MEDIA_TYPES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>

                {draft.mediaType === "none" || !draft.mediaType ?
                  <input disabled placeholder="No media" className="input" />
                  : draft.mediaType === "text" ?
                    <input value={draft.mediaUrl || ""} onChange={e => setDraft(d => ({...d, mediaUrl: e.target.value, mediaFile: "", mediaFileName: ""}))} placeholder="Optionally add a web link..." className="input" />
                    : <input className="input" type="file"
                        accept={
                          draft.mediaType === "video" ? "video/*" :
                          draft.mediaType === "image" ? "image/*" :
                          draft.mediaType === "document" ? ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          : "*/*"
                        }
                        onChange={onDraftMediaFile} />
                }
                <textarea className="input min-h-[64px]" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes (Markdown ok)" />

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block mb-1 text-sm">Deadline</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={draft.deadline?.slice(0,10) || ""}
                      onChange={e => setDraft({ ...draft, deadline: e.target.value || undefined })}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">Reminder</label>
                    <input type="datetime-local" className="input w-full" value={draft.remindAt || ""} onChange={e => setDraft({ ...draft, remindAt: e.target.value || undefined })} />
                  </div>
                </div>

                <button
                  className="btn btn-primary w-full disabled:opacity-50"
                  disabled={!draft.title.trim() || !draft.cue.trim() || !draft.action.trim() || saving}
                  onClick={() => { addPlan(); saveAllToPosts(); }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>

              </div>
            </div>

            {/* FILTERS */}
            <div className="rounded-2xl border border-white/10 bg-white/60 dark:bg-neutral-900/50 backdrop-blur-md p-5 shadow-sm sticky top-[calc(4rem+1.5rem)] z-10">
              <h3 className="font-semibold mb-3">Find & focus</h3>
              <div className="grid gap-3">
                <input className="input" placeholder="Search..." value={filter.query} onChange={e => setFilter({ ...filter, query: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="input" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value as any })}>
                    {["All", ...CATEGORIES].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select className="input" value={filter.frequency} onChange={e => setFilter({ ...filter, frequency: e.target.value as any })}>
                    {["All", ...FREQUENCIES].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select className="input" value={filter.stage} onChange={e => setFilter({ ...filter, stage: e.target.value as any })}>
                    {["All", ...STAGES].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="input" value={filter.sortBy} onChange={e => setFilter({ ...filter, sortBy: e.target.value as any })}>
                    {["created", "priority", "confidence", "title", "deadline"].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="input" value={filter.visibility} onChange={e => setFilter({ ...filter, visibility: e.target.value as any })}>
                    {["All", ...VISIBILITIES.map(v => v.value)].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm px-2">
                  <input type="checkbox" checked={filter.pinnedOnly} onChange={e => setFilter({ ...filter, pinnedOnly: e.target.checked })} />
                  pinned only
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(countsByCategory).map(([c, n]) => (
                    <span key={c} className="badge badge-blue">{c} · {n}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* SUMMARY */}
            <div className="rounded-2xl border border-white/10 bg-white/60 dark:bg-neutral-900/50 backdrop-blur-md p-5 shadow-sm sticky top-[calc(20rem)] z-10">
              <h3 className="font-semibold mb-3">Today</h3>
              <div className="flex items-center justify-between">
                <div className="grid">
                  <span className="text-sm text-neutral-500">Done today</span>
                  <span className="text-lg font-semibold">{todayDone}/{total}</span>
                </div>
                <ProgressRing value={pct} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="btn btn-primary" onClick={saveAllToPosts} disabled={saving}>{saving ? "Saving…" : "Save All"}</button>
                <button className="btn btn-ghost" onClick={() => setPlans([])} disabled={!total}>Clear all (local)</button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Kanban board, List, Timeline */}
          <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-4">
              {STAGES.map(stage => (
                <div
                  key={stage}
                  className="rounded-2xl border border-white/10 bg-white/50 dark:bg-neutral-900/40 backdrop-blur-md p-3 min-h-[180px]"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, stage)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{stage}</h4>
                    <span className="text-xs text-neutral-500">{filtered.filter(p => p.stage === stage).length}</span>
                  </div>
                  <div className="grid gap-2 min-h-[120px]">
                    {filtered.filter(p => p.stage === stage).map(p =>
                      <div
                        key={p.id}
                        draggable
                        tabIndex={0}
                        onDragStart={e => e.dataTransfer.setData("id", p.id)}
                        onClick={() => setDetailPlan(p)}
                        className="rounded-xl border border-white/20 bg-white/70 dark:bg-neutral-900/60 p-3 hover:border-indigo-300/40 transition-shadow shadow-sm focus:outline focus:ring"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium truncate">{p.title}</div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">{p.category}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1 line-clamp-2">
                          If ({p.cueType}) {p.cue} then {p.action}
                        </div>
                        <div className="flex items-center justify-between mt-2 text-[11px] text-neutral-500">
                          <div>Pri {p.priority} · Conf {p.confidence}/10</div>
                          {p.pinned && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">pinned</span>}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">Deadline: {timeUntil(p.deadline)}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Full List */}
            <div className="rounded-2xl border border-white/10 bg-white/60 dark:bg-neutral-900/50 backdrop-blur-md p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">All plans</h3>
                <div className="text-sm text-neutral-500">{filtered.length} total</div>
              </div>
              <div className="grid gap-2">
                {filtered.length === 0 && <p className="text-sm text-neutral-500">No plans match the filters.</p>}
                {filtered.map(p =>
                  <div key={p.id} className="rounded-xl border border-white/20 bg-white/70 dark:bg-neutral-900/60 p-3 grid gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{p.title}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">{p.category} · {p.frequency}</span>
                        <button className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-600" onClick={() => updatePlan(p.id, { pinned: !p.pinned })}>{p.pinned ? "Unpin" : "Pin"}</button>
                        <button className="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-600" onClick={() => setDetailPlan(p)}>Open</button>
                      </div>
                    </div>
                    <div className="text-sm"><b>If</b> ({p.cueType}) {p.cue} <b>then</b> {p.action}</div>
                    {!!p.obstacle && <div className="text-xs text-neutral-600">Obstacle: {p.obstacle}</div>}
                    {!!p.backup && <div className="text-xs text-neutral-600">Backup: {p.backup}</div>}
                    {!!p.reward && <div className="text-xs text-neutral-600">Reward: {p.reward}</div>}
                    <div className="flex items-center justify-between text-xs text-neutral-600 mt-1">
                      <div>Conf: {p.confidence}/10 · Pri: {p.priority} · Streak: {p.streak || 0}</div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={p.doneToday || false} onChange={() => toggleDoneToday(p.id)} />
                          done today
                        </label>
                        <button className="text-neutral-500 hover:underline" onClick={() => removePlan(p.id)}>remove</button>
                      </div>
                    </div>
                    <div className="text-xs mt-1 text-neutral-500">Deadline: {timeUntil(p.deadline)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-white/10 bg-white/60 dark:bg-neutral-900/50 backdrop-blur-md p-5">
              <h3 className="font-semibold mb-3">Recent timeline</h3>
              <ol className="relative border-s border-neutral-200 dark:border-neutral-700 pl-4">
                {[...filtered].sort((a, b) => a.createdAt - b.createdAt).slice(-12).map(p => (
                  <li key={p.id} className="mb-4 ms-2">
                    <span className="absolute -start-1.5 mt-1 h-3 w-3 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500"></span>
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-neutral-500">
                      {new Date(p.createdAt).toLocaleDateString()} · {p.category} · {p.stage}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {detailPlan && (
          <DetailDrawer
            plan={detailPlan}
            onClose={() => setDetailPlan(null)}
            onChange={(patch) => updatePlan(detailPlan.id, patch)}
            onToggleDone={() => toggleDoneToday(detailPlan.id)}
            onRemove={() => removePlan(detailPlan.id)}
          />
        )}

      </section>
    </main>
  );
}
