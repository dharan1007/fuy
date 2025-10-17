"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
  remindAt?: string; // ISO string date/time for reminder
  // New collaboration features
  collaborators?: string[];
  goal?: string;
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
    collaborators: [],
    goal: "",
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

  // FAKE USER DATA
  const user = { name: "David" };

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
        mediaType: file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "document",
      }));
    };
    reader.readAsDataURL(file);
  }
  function handleDrop(e: React.DragEvent, toStage: Stage) {
    e.preventDefault();
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

  // CALENDAR COMPONENT (simplified)
  function Calendar({ selectedDate }: { selectedDate: Date }) {
    const [viewDate, setViewDate] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDay = (year: number, month: number) => new Date(year, month, 1).getDay();

    const dates = useMemo(() => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const numDays = daysInMonth(year, month);
      const startDay = firstDay(year, month);
      const calendarDates: (number | null)[] = Array(startDay).fill(null);
      for (let i = 1; i <= numDays; i++) {
        calendarDates.push(i);
      }
      return calendarDates;
    }, [viewDate]);

    const changeMonth = (delta: number) => {
      setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const isToday = (date: number) => {
      const today = new Date();
      return date === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();
    };

    return (
      <div className="w-full h-full p-4 rounded-xl bg-white dark:bg-neutral-800 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => changeMonth(-1)} className="text-neutral-500 text-lg">{"<"}</button>
          <span className="text-sm font-semibold">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => changeMonth(1)} className="text-neutral-500 text-lg">{">"}</button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-neutral-500">
          {["S", "M", "T", "W", "T", "F", "S"].map(day => <span key={day}>{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm mt-2">
          {dates.map((date, i) => (
            <div
              key={i}
              className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer
                ${date ? 'text-black dark:text-white' : ''}
                ${date && isToday(date) ? 'bg-black text-white' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
            >
              {date}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Custom Card Component
  function PlanCard({ plan, onToggleDone, onOpenDetail }: { plan: ITPPlan, onToggleDone: (id: string) => void, onOpenDetail: (plan: ITPPlan) => void }) {
    return (
      <div
        draggable
        tabIndex={0}
        onDragStart={e => e.dataTransfer.setData("id", plan.id)}
        onClick={() => onOpenDetail(plan)}
        className={`rounded-2xl border border-white/20 bg-white/70 dark:bg-neutral-900/60 p-4 transition-all shadow-sm cursor-pointer
          ${plan.doneToday ? 'border-green-400/50' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-green-600 rounded-full"
              checked={plan.doneToday || false}
              onChange={(e) => {
                e.stopPropagation();
                onToggleDone(plan.id);
              }}
            />
            <div className="font-semibold text-neutral-800 dark:text-white truncate">{plan.title}</div>
          </div>
          {plan.pinned && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">📌</span>}
        </div>
        <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
          <b>If</b> ({plan.cueType}) {plan.cue} <b>then</b> {plan.action}
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500 mt-2">
          <span>{plan.category} · {plan.frequency}</span>
          <span>{timeUntil(plan.deadline)}</span>
        </div>
        {plan.mediaType !== "none" && (
          <div className="mt-2 text-xs text-neutral-400">
            📎 {plan.mediaFileName || plan.mediaUrl || plan.mediaType}
          </div>
        )}
      </div>
    );
  }

  // LAYOUT RENDER
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      {/* Top Header/Dashboard */}
      <header className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white p-8 md:p-12 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="bg-white/10 w-96 h-96 rounded-full -top-20 -left-20 animate-[pulse_10s_infinite]" />
          <div className="bg-white/10 w-80 h-80 rounded-full -bottom-10 -right-10 animate-[pulse_12s_infinite]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Have a Good day, {user.name}</h1>
          </div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
          <div className="bg-white/30 p-4 rounded-xl backdrop-blur-md">
            <h2 className="text-lg font-semibold mb-2">Upcoming Schedule</h2>
            <div className="bg-white/50 rounded-lg p-2">
              <Calendar selectedDate={new Date()} />
            </div>
          </div>
          <div className="bg-white/30 p-4 rounded-xl backdrop-blur-md col-span-2 lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Today's Progress</h2>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p>You've completed <b className="text-xl">{todayDone}</b> of <b className="text-xl">{total}</b> tasks.</p>
                <p>Keep up the great work!</p>
              </div>
              <ProgressRing value={pct} />
            </div>
          </div>
          <div className="bg-white/30 p-4 rounded-xl backdrop-blur-md md:col-span-2 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-2">Content Planner</h2>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                  <button key={day} className={`bg-white/40 px-3 py-1 rounded-full text-sm font-bold ${i === 2 ? 'bg-white/60' : ''}`}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div className="text-white text-sm">
                <span className="opacity-70">February 2024</span>
              </div>
            </div>
            <div className="bg-white/50 p-4 rounded-lg mt-4">
              <div className="flex flex-col space-y-2">
                <div className="bg-purple-300 p-2 rounded-lg text-sm text-purple-900 shadow">
                  <b>EcoHarmony Launch</b>
                  <p className="text-xs">If (event) then I will...</p>
                </div>
                <div className="bg-teal-300 p-2 rounded-lg text-sm text-teal-900 shadow">
                  <b>Marketing Review</b>
                  <p className="text-xs">If (time) then I will...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 max-w-7xl mx-auto w-full p-8 grid gap-8 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left Sidebar - Filters & Creation */}
        <aside className="space-y-6">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-xl sticky top-8 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Plan</h2>
              <button className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition" onClick={() => setDraft(newDraft())}>Reset</button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Plan Title" value={draft.title} onChange={(e)=>setDraft({ ...draft, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={draft.category} onChange={(e)=>setDraft({ ...draft, category: e.target.value as Category })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="input" value={draft.cueType} onChange={(e)=>setDraft({ ...draft, cueType: e.target.value as CueType })}>
                  {CUE_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <input className="input" placeholder="If..." value={draft.cue} onChange={(e)=>setDraft({ ...draft, cue: e.target.value })} />
              <input className="input" placeholder="Then I will..." value={draft.action} onChange={(e)=>setDraft({ ...draft, action: e.target.value })} />
              <textarea className="input min-h-[64px]" value={draft.goal || ""} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} placeholder="Goal of this plan" />
              <input className="input" placeholder="Add collaborators (comma-separated)" value={draft.collaborators?.join(', ') || ""} onChange={(e) => setDraft({ ...draft, collaborators: e.target.value.split(',').map(s => s.trim()) })} />
              <input type="file" onChange={onDraftMediaFile} className="input" />
              <button
                className="btn btn-primary w-full disabled:opacity-50 mt-4"
                disabled={!draft.title.trim() || !draft.cue.trim() || !draft.action.trim()}
                onClick={addPlan}
              >
                Create Post
              </button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Filters</h2>
            <div className="space-y-3">
              <input className="input" placeholder="Search plans..." value={filter.query} onChange={e => setFilter({ ...filter, query: e.target.value })} />
              <select className="input" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value as any })}>
                {["All", ...CATEGORIES].map(c => <option key={c}>{c}</option>)}
              </select>
              <select className="input" value={filter.stage} onChange={e => setFilter({ ...filter, stage: e.target.value as any })}>
                {["All", ...STAGES].map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="input" value={filter.sortBy} onChange={e => setFilter({ ...filter, sortBy: e.target.value as any })}>
                {["created", "priority", "confidence", "title", "deadline"].map(s => <option key={s}>{s}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={filter.pinnedOnly} onChange={e => setFilter({ ...filter, pinnedOnly: e.target.checked })} />
                Pinned Only
              </label>
            </div>
          </div>
        </aside>

        {/* Main Kanban/Timeline Area */}
        <section className="space-y-8">
          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STAGES.map(stage => (
              <div
                key={stage}
                className="rounded-3xl p-6 bg-white dark:bg-neutral-800 shadow-xl min-h-[300px]"
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, stage)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{stage}</h3>
                  <span className="text-sm text-neutral-500">{filtered.filter(p => p.stage === stage).length}</span>
                </div>
                <div className="grid gap-4">
                  {filtered.filter(p => p.stage === stage).map(p => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      onOpenDetail={setDetailPlan}
                      onToggleDone={toggleDoneToday}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Timeline View */}
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-xl">
            <h3 className="font-semibold text-lg mb-4">All Plans</h3>
            <div className="grid gap-4">
              {filtered.length === 0 && <p className="text-sm text-neutral-500">No plans match your filters. Try adjusting them!</p>}
              {filtered.map(p => (
                <div key={p.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{p.title}</div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      If ({p.cueType}) {p.cue} then {p.action}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-4">
                    <div className="text-sm text-neutral-500 flex flex-col items-end">
                      <span>{p.category}</span>
                      <span className="text-xs">{p.stage}</span>
                    </div>
                    <button
                      className={`btn px-4 py-2 rounded-full text-sm font-medium transition
                        ${p.doneToday ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'}`}
                      onClick={() => toggleDoneToday(p.id)}
                    >
                      {p.doneToday ? "Done" : "Mark Done"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {detailPlan && (
        <DetailDrawer
          plan={detailPlan}
          onClose={() => setDetailPlan(null)}
          onChange={(patch) => updatePlan(detailPlan.id, patch)}
          onToggleDone={() => toggleDoneToday(detailPlan.id)}
          onRemove={() => removePlan(detailPlan.id)}
        />
      )}
    </div>
  );
}