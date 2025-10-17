
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const LSK_SELFCOMP = "fuy.selfcomp.logs.v1";
const LSK_DRAFT = "fuy.selfcomp.draft.v1";
const LSK_PRESETS = "fuy.selfcomp.presets.v1";
const LSK_REMIND = "fuy.selfcomp.reminders.v1";
const LSK_TAGS = "fuy.selfcomp.tags.v1";
const LSK_CHECKS = "fuy.selfcomp.checks.v1";
const LSK_THEMES = "fuy.ui.theme.v1";

async function postJSON(url: string, data: any) {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

function fmt(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dfmt(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function downloadFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function uploadText(): Promise<string> {
  return new Promise((resolve) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".txt,.json,text/plain,application/json";
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return resolve("");
      const text = await f.text();
      resolve(text);
    };
    inp.click();
  });
}

function useLocal<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setVal(JSON.parse(raw));
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

function useTheme() {
  const [theme, setTheme] = useLocal<string>(LSK_THEMES, "light");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.style.setProperty("--card-bg", "rgba(255,255,255,0.2)");
    if (theme === "dark") root.style.setProperty("--card-bg", "rgba(20,20,20,0.35)");
    if (theme === "color") root.style.setProperty("--card-bg", "rgba(240,248,255,0.35)");
  }, [theme]);
  return { theme, setTheme };
}

function BreathPlayer() {
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<"box"|"478"|"equal">("equal");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick((t)=>t+1), 1000);
    return () => clearInterval(id);
  }, [playing]);
  const phase = useMemo(() => {
    if (mode === "equal") {
      const s = tick % 6;
      return s < 3 ? "Inhale" : "Exhale";
    }
    if (mode === "478") {
      const s = tick % 15;
      if (s < 4) return "Inhale";
      if (s < 11) return "Hold";
      return "Exhale";
    }
    const s = tick % 16;
    if (s < 4) return "Inhale";
    if (s < 8) return "Hold";
    if (s < 12) return "Exhale";
    return "Hold";
  }, [tick, mode]);
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Breathing</h3>
        <div className="flex gap-2">
          <select className="rounded-xl border px-3 py-2 text-base" value={mode} onChange={(e)=>setMode(e.target.value as any)}>
            <option value="equal">3-3</option>
            <option value="478">4-7-8</option>
            <option value="box">4-4-4-4</option>
          </select>
          <button onClick={()=>setPlaying(s=>!s)} className="btn btn-primary rounded-full px-5 py-2 text-base">{playing?"Pause":"Start"}</button>
        </div>
      </div>
      <div className="mt-4 h-28 overflow-hidden rounded-xl bg-white/50 ring-1 ring-white/40">
        <div className={`h-full rounded-xl bg-black/60 transition-all duration-500`} style={{width: phase==="Inhale"?"92%":phase==="Exhale"?"14%":"50%"}}/>
      </div>
      <p className="mt-3 text-base text-neutral-800">{phase}</p>
    </div>
  );
}

function useHistory() {
  const [logs, setLogs] = useLocal<{ ts: number; soothe: number; tags: string[] }[]>(LSK_SELFCOMP, []);
  const clear = () => setLogs([]);
  const add = (soothe: number, tags: string[]) => setLogs(prev => [{ ts: Date.now(), soothe, tags }, ...prev].slice(0,100));
  return { logs, setLogs, clear, add };
}

function Stats({ logs }: { logs: { ts: number; soothe: number }[] }) {
  const width = 560;
  const height = 120;
  const pad = 20;
  const pts = logs.slice(0,20).reverse();
  const xs = pts.map((_,i)=> pad + (i*(width-2*pad))/Math.max(1,pts.length-1));
  const ys = pts.map(p=> {
    const v = p.soothe;
    const y = height - pad - (v/10)*(height-2*pad);
    return y;
  });
  const path = xs.map((x,i)=>`${i===0?"M":"L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const avg = pts.length? Math.round((pts.reduce((a,b)=>a+b.soothe,0)/pts.length)*10)/10 : 0;
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Trend</h3>
        <div className="text-base">Avg {avg}/10</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full">
        <rect x="0" y="0" width={width} height={height} fill="rgba(255,255,255,0.5)"/>
        <path d={path} fill="none" stroke="black" strokeWidth="2"/>
        {xs.map((x,i)=>(<circle key={i} cx={x} cy={ys[i]} r="3" fill="black" />))}
      </svg>
    </div>
  );
}

function TagInput({ tags, setTags }: { tags: string[]; setTags: (v: string[]) => void }) {
  const [val,setVal]=useState("");
  const add=()=>{const t=val.trim(); if(!t) return; if(tags.includes(t)) return; setTags([...tags,t]); setVal("");};
  const del=(t:string)=>setTags(tags.filter(x=>x!==t));
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Tags</div>
      <div className="mt-3 flex flex-wrap gap-2">{tags.map(t=>(<button key={t} className="rounded-full bg-black px-3 py-1 text-sm text-white" onClick={()=>del(t)}>{t} ✕</button>))}</div>
      <div className="mt-3 flex gap-2">
        <input className="input h-12 w-full rounded-xl border px-3 text-base" value={val} onChange={(e)=>setVal(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") add();}}/>
        <button className="btn btn-primary rounded-xl px-4 text-base" onClick={add}>Add</button>
      </div>
    </div>
  );
}

function CheckList() {
  const [items,setItems]=useLocal<{id:string;text:string;done:boolean}[]>(LSK_CHECKS,[]);
  const [text,setText]=useState("");
  const add=()=>{const t=text.trim(); if(!t) return; setItems([{id:crypto.randomUUID(),text:t,done:false},...items]); setText("");};
  const toggle=(id:string)=>setItems(items.map(i=>i.id===id?{...i,done:!i.done}:i));
  const del=(id:string)=>setItems(items.filter(i=>i.id!==id));
  const clear=()=>setItems([]);
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Kind actions</div>
        <button className="btn btn-ghost rounded-xl px-4 py-2 text-base" onClick={clear}>Clear</button>
      </div>
      <div className="mt-3 flex gap-2">
        <input className="input h-12 w-full rounded-xl border px-3 text-base" value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") add();}}/>
        <button className="btn btn-primary rounded-xl px-4 text-base" onClick={add}>Add</button>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map(i=>(
          <div key={i.id} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-white/40">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-black" checked={i.done} onChange={()=>toggle(i.id)}/>
              <span className={`text-base ${i.done?"line-through opacity-60":""}`}>{i.text}</span>
            </label>
            <button className="btn btn-ghost rounded-xl px-3 py-1 text-sm" onClick={()=>del(i.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReminderCenter() {
  const [items,setItems]=useLocal<{id:string; when:number; text:string; active:boolean}[]>(LSK_REMIND,[]);
  const [text,setText]=useState("");
  const [date,setDate]=useState<string>("");
  useEffect(()=>{
    const id=setInterval(()=>{
      const now=Date.now();
      items.forEach(it=>{
        if(it.active && it.when<=now){
          try{ new Notification("Reminder",{ body: it.text }); }catch{}
          alert("Reminder: "+it.text);
          setItems(prev=>prev.map(p=>p.id===it.id?{...p,active:false}:p));
        }
      });
    },5000);
    return ()=>clearInterval(id);
  },[items,setItems]);
  const add=()=>{
    if(!text.trim()||!date) return;
    const when=new Date(date).getTime();
    if(Number.isNaN(when)) return;
    setItems([{id:crypto.randomUUID(), when, text, active:true}, ...items]);
    setText(""); setDate("");
  };
  const toggle=(id:string)=>setItems(items.map(i=>i.id===id?{...i,active:!i.active}:i));
  const del=(id:string)=>setItems(items.filter(i=>i.id!==id));
  const clear=()=>setItems([]);
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Reminders</div>
        <button className="btn btn-ghost rounded-xl px-4 py-2 text-base" onClick={clear}>Clear</button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <input className="input h-12 w-full rounded-xl border px-3 text-base md:col-span-2" placeholder="Reminder text" value={text} onChange={(e)=>setText(e.target.value)}/>
        <input className="input h-12 w-full rounded-xl border px-3 text-base" type="datetime-local" value={date} onChange={(e)=>setDate(e.target.value)}/>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary rounded-xl px-4 text-base" onClick={add}>Add</button>
        <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={()=>{ Notification.requestPermission?.(); }}>Enable notifications</button>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map(i=>(
          <div key={i.id} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-white/40">
            <div className="flex flex-col">
              <span className="text-base">{i.text}</span>
              <span className="text-xs text-neutral-600">{dfmt(i.when)} {new Date(i.when).toLocaleTimeString()}</span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost rounded-xl px-3 py-1 text-sm" onClick={()=>toggle(i.id)}>{i.active?"Pause":"Resume"}</button>
              <button className="btn btn-ghost rounded-xl px-3 py-1 text-sm" onClick={()=>del(i.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PresetManager({ apply }: { apply: (p: {mind:string;human:string;kind:string})=>void }) {
  const [list,setList]=useLocal<{id:string;name:string;mind:string;human:string;kind:string}[]>(LSK_PRESETS,[]);
  const [name,setName]=useState(""); const [mind,setMind]=useState(""); const [human,setHuman]=useState(""); const [kind,setKind]=useState("");
  const add=()=>{ if(!name.trim()) return; setList([{id:crypto.randomUUID(),name,mind,human,kind},...list]); setName(""); setMind(""); setHuman(""); setKind(""); };
  const del=(id:string)=>setList(list.filter(x=>x.id!==id));
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Custom presets</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <input className="input h-12 rounded-xl border px-3 text-base" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)}/>
        <input className="input h-12 rounded-xl border px-3 text-base" placeholder="Mindfulness" value={mind} onChange={(e)=>setMind(e.target.value)}/>
        <input className="input h-12 rounded-xl border px-3 text-base" placeholder="Common humanity" value={human} onChange={(e)=>setHuman(e.target.value)}/>
        <input className="input h-12 rounded-xl border px-3 text-base" placeholder="Kindness" value={kind} onChange={(e)=>setKind(e.target.value)}/>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary rounded-xl px-4 text-base" onClick={add}>Save preset</button>
        <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={async()=>{
          const text=await uploadText(); if(!text) return;
          try{ const arr=JSON.parse(text); if(Array.isArray(arr)) setList(arr); }catch{}
        }}>Import</button>
        <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={()=>downloadFile("presets.json", JSON.stringify(list,null,2))}>Export</button>
      </div>
      <div className="mt-3 grid gap-2">
        {list.map(p=>(
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-white/40">
            <div className="flex flex-col">
              <span className="text-base font-semibold">{p.name}</span>
              <span className="text-xs text-neutral-600">M: {p.mind}</span>
              <span className="text-xs text-neutral-600">H: {p.human}</span>
              <span className="text-xs text-neutral-600">K: {p.kind}</span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary rounded-xl px-3 py-1 text-sm" onClick={()=>apply({mind:p.mind,human:p.human,kind:p.kind})}>Use</button>
              <button className="btn btn-ghost rounded-xl px-3 py-1 text-sm" onClick={()=>del(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportImport({ compose, onImport }: { compose: string; onImport: (v: any)=>void }) {
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Export & Import</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-primary rounded-xl px-4 text-base" onClick={()=>downloadFile(`self-compassion-${Date.now()}.txt`, compose)}>Export .txt</button>
        <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={async()=>{
          const text=await uploadText(); if(!text) return;
          try{ const obj=JSON.parse(text); onImport(obj); }catch{ alert("Invalid JSON"); }
        }}>Import JSON</button>
        <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={()=>downloadFile("self-compassion.json", JSON.stringify({ version:1, data: compose }, null, 2))}>Export JSON</button>
      </div>
    </div>
  );
}

function MoodPicker({ mood, setMood }: { mood: string; setMood: (v:string)=>void }) {
  const emojis=["🙂","😊","😟","😢","😠","😴","🤒","🤗","😌","🤩"];
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Mood</div>
      <div className="mt-3 grid grid-cols-10 gap-2">
        {emojis.map(e=>(
          <button key={e} className={`rounded-xl px-2 py-2 text-xl ${mood===e?"bg-black text-white":"bg-white/70"}`} onClick={()=>setMood(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}

function ShareBox({ text }: { text: string }) {
  const [to,setTo]=useState("");
  const [sent,setSent]=useState(false);
  const share=async()=>{
    try{
      await navigator.clipboard.writeText(text);
      setSent(true);
      setTimeout(()=>setSent(false),1500);
    }catch{
      alert("Clipboard permission denied");
    }
  };
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Share</div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <input className="input h-12 rounded-xl border px-3 text-base md:col-span-2" placeholder="Recipient name or email (for your notes)" value={to} onChange={(e)=>setTo(e.target.value)}/>
        <button className="btn btn-primary rounded-xl px-4 text-base" onClick={share}>{sent?"Copied":"Copy to clipboard"}</button>
      </div>
      <div className="mt-2 text-xs text-neutral-600">Paste into your email or chat.</div>
    </div>
  );
}

function CounterBox({ text }: { text: string }) {
  const words=useMemo(()=>text.trim().split(/\s+/).filter(Boolean).length,[text]);
  const chars=text.length;
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Counts</div>
      <div className="mt-3 flex gap-6 text-base">
        <div>Words {words}</div>
        <div>Chars {chars}</div>
      </div>
    </div>
  );
}

export function SelfCompassionPro() {
  const { theme, setTheme } = useTheme();
  const { logs, add, clear } = useHistory();
  const [mind, setMind] = useState("This is a moment of difficulty.");
  const [human, setHuman] = useState("Struggle is part of being human.");
  const [kind, setKind] = useState("May I be kind to myself right now.");
  const [friend, setFriend] = useState("If a friend felt this way, I’d say…");
  const [soothe, setSoothe] = useState(6);
  const [action, setAction] = useState("One kind thing I can do next is …");
  const [saving, setSaving] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [restored, setRestored] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tags, setTags] = useLocal<string[]>(LSK_TAGS, []);
  const [mood, setMood] = useState("🙂");
  const [previewText, setPreviewText] = useState("");
  const compose = useMemo(() => {
    return `Self-Compassion Break
Mood: ${mood}
Mindfulness: ${mind}
Common humanity: ${human}
Kindness: ${kind}
To a friend: ${friend}
Soothing rating: ${soothe}/10
Kind action: ${action}
Tags: ${tags.join(", ")}`;
  }, [mind, human, kind, friend, soothe, action, tags, mood]);
  useEffect(()=>setPreviewText(compose),[compose]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LSK_DRAFT);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.mind) setMind(d.mind);
        if (d.human) setHuman(d.human);
        if (d.kind) setKind(d.kind);
        if (d.friend) setFriend(d.friend);
        if (typeof d.soothe === "number") setSoothe(d.soothe);
        if (d.action) setAction(d.action);
        if (Array.isArray(d.tags)) setTags(d.tags);
        if (d.mood) setMood(d.mood);
        setRestored(true);
        setTimeout(() => setRestored(false), 1800);
      }
    } catch {}
  }, [setTags]);
  const draftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!autosave) return;
    if (draftRef.current) clearTimeout(draftRef.current);
    draftRef.current = setTimeout(() => {
      localStorage.setItem(LSK_DRAFT, JSON.stringify({ mind, human, kind, friend, soothe, action, tags, mood }));
    }, 600);
    return () => {
      if (draftRef.current) clearTimeout(draftRef.current);
    };
  }, [mind, human, kind, friend, soothe, action, tags, mood, autosave]);
  const PRESETS = [
    { name: "Gentle", mind: "This hurts. I’m having a tough time.", human: "Others feel this way too.", kind: "May I give myself the compassion I need." },
    { name: "Performance", mind: "Pressure is here right now.", human: "Struggle is normal for learners.", kind: "May I be steady and patient." },
    { name: "Burnout care", mind: "I’m depleted and that’s hard.", human: "Many people feel overwhelmed.", kind: "May I soften my expectations today." }
  ] as const;
  const randomize = () => {
    const p = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    setMind(p.mind);
    setHuman(p.human);
    setKind(p.kind);
  };
  const applyPreview = () => {
    const get = (label: string) => {
      const m = previewText.match(new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)(?:\\n[A-Z][^:]*:|$)`,"i"));
      return m ? m[1].trim() : null;
    };
    const mMind = get("Mindfulness");
    const mHuman = get("Common humanity");
    const mKind = get("Kindness");
    const mFriend = get("To a friend");
    const mSoothe = get("Soothing rating");
    const mAction = get("Kind action");
    const mTags = get("Tags");
    const mMood = get("Mood");
    if (mMind !== null) setMind(mMind);
    if (mHuman !== null) setHuman(mHuman);
    if (mKind !== null) setKind(mKind);
    if (mFriend !== null) setFriend(mFriend);
    if (mSoothe !== null) {
      const n = parseInt(mSoothe, 10);
      if (!Number.isNaN(n)) setSoothe(Math.max(0, Math.min(10, n)));
    }
    if (mAction !== null) setAction(mAction);
    if (mTags !== null) setTags(mTags.split(",").map(s=>s.trim()).filter(Boolean));
    if (mMood !== null) setMood(mMood);
  };
  const save = async () => {
    setSaving(true);
    await postJSON("/api/posts", { feature: "CALM", visibility: "PRIVATE", content: compose, joyScore: 1, connectionScore: 0, creativityScore: 0 });
    add(soothe, tags);
    setSoothe(6);
    setSaving(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(compose);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  const reset = () => {
    setMind("This is a moment of difficulty.");
    setHuman("Struggle is part of being human.");
    setKind("May I be kind to myself right now.");
    setFriend("If a friend felt this way, I’d say…");
    setSoothe(6);
    setAction("One kind thing I can do next is …");
    setTags([]);
    setMood("🙂");
  };
  return (
    <div className="grid gap-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl p-8 shadow-xl ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
          <div className="flex items-start justify-between gap-8">
            <div>
              <h2 className="text-4xl font-extrabold">Self-compassion break</h2>
              <p className="mt-2 text-lg text-neutral-700">Small, guided steps to soothe and support yourself.</p>
              {restored && <div className="mt-3 inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm text-green-800">Draft restored</div>}
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-black/80 px-3 py-1 text-base font-semibold text-white">{soothe}/10</span>
              <select className="rounded-xl border px-3 py-2 text-base" value={theme} onChange={(e)=>setTheme(e.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="color">Soft</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-lg">
              <input id="autosave" type="checkbox" className="h-5 w-5 accent-black" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} />
              Autosave
            </label>
            <select className="rounded-xl border px-3 py-2 text-lg" onChange={(e)=>{
              const v=e.target.value; const p=Array.from(PRESETS).find(x=>x.name===v); if(p){ setMind(p.mind); setHuman(p.human); setKind(p.kind); }
            }}>
              <option value="">Choose preset…</option>
              {Array.from(PRESETS).map(p=>(<option key={p.name} value={p.name}>{p.name}</option>))}
            </select>
            <button className="btn btn-ghost rounded-xl px-5 py-2 text-lg" onClick={randomize}>Surprise me</button>
            <button className="btn btn-ghost rounded-xl px-5 py-2 text-lg" onClick={reset}>Reset</button>
          </div>
        </div>
        <div className="grid gap-6">
          <Stats logs={logs}/>
          <BreathPlayer/>
        </div>
      </div>
      <div className="grid gap-7 md:grid-cols-2">
        <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
          <label className="block text-lg font-semibold">Mindfulness</label>
          <input className="mt-3 h-14 w-full rounded-xl border px-4 py-3 text-lg" value={mind} onChange={(e)=>setMind(e.target.value)}/>
        </div>
        <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
          <label className="block text-lg font-semibold">Common humanity</label>
          <input className="mt-3 h-14 w-full rounded-xl border px-4 py-3 text-lg" value={human} onChange={(e)=>setHuman(e.target.value)}/>
        </div>
        <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
          <label className="block text-lg font-semibold">Kindness</label>
          <input className="mt-3 h-14 w-full rounded-xl border px-4 py-3 text-lg" value={kind} onChange={(e)=>setKind(e.target.value)}/>
        </div>
        <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
          <label className="block text-lg font-semibold">If a friend felt this way, I’d say…</label>
          <textarea className="mt-3 h-28 w-full resize-none rounded-xl border px-4 py-3 text-lg" value={friend} onChange={(e)=>setFriend(e.target.value)}/>
        </div>
      </div>
      <div className="rounded-3xl p-6 shadow-xl ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold">Soothing level</span>
          <span className="rounded-full bg-black px-4 py-1 text-white">{soothe}/10</span>
        </div>
        <input type="range" min={0} max={10} value={soothe} onChange={(e)=>setSoothe(Number(e.target.value))} className="mt-4 w-full accent-black"/>
      </div>
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
          <label className="block text-lg font-semibold">One kind thing I can do next is…</label>
          <input className="mt-3 h-14 w-full rounded-xl border px-4 py-3 text-lg" value={action} onChange={(e)=>setAction(e.target.value)}/>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="btn btn-ghost rounded-full px-4 py-2 text-base" onClick={async()=>{ await navigator.clipboard.writeText(compose); setCopied(true); setTimeout(()=>setCopied(false),1200); }}>{copied?"Copied!":"Copy"}</button>
            <button className="btn btn-ghost rounded-full px-4 py-2 text-base" onClick={()=>downloadFile(`self-compassion-${Date.now()}.txt`, compose)}>Export .txt</button>
            <button className="btn btn-ghost rounded-full px-4 py-2 text-base" onClick={()=>setPreviewText(compose)}>Refresh preview</button>
          </div>
        </div>
        <div className="flex flex-col items-end justify-end gap-3">
          <button className="btn btn-primary w-full rounded-2xl py-4 text-xl md:w-auto" onClick={save} disabled={saving}>{saving?"Saving…":"Save practice"}</button>
          <button className="btn btn-ghost rounded-2xl py-3 text-base md:w-auto" onClick={reset}>Reset All</button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <TagInput tags={tags} setTags={setTags}/>
        <MoodPicker mood={mood} setMood={setMood}/>
      </div>
      <CheckList/>
      <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
        <h3 className="mb-3 text-xl font-semibold">Preview</h3>
        <textarea className="h-56 w-full resize-none rounded-xl border px-4 py-3 text-lg" value={previewText} onChange={(e)=>setPreviewText(e.target.value)}/>
        <div className="mt-3 flex gap-3">
          <button className="btn btn-ghost rounded-xl px-5 py-2 text-lg" onClick={()=>setPreviewText(compose)}>Reset preview</button>
          <button className="btn btn-primary rounded-xl px-5 py-2 text-lg" onClick={applyPreview}>Apply to fields</button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ExportImport compose={compose} onImport={(obj:any)=>{
          if(!obj) return;
          if(typeof obj==="string"){ setPreviewText(obj); return; }
          if(obj.mind) setMind(obj.mind);
          if(obj.human) setHuman(obj.human);
          if(obj.kind) setKind(obj.kind);
          if(obj.friend) setFriend(obj.friend);
          if(typeof obj.soothe==="number") setSoothe(obj.soothe);
          if(obj.action) setAction(obj.action);
          if(Array.isArray(obj.tags)) setTags(obj.tags);
          if(obj.mood) setMood(obj.mood);
        }}/>
        <ShareBox text={compose}/>
      </div>
      <ReminderCenter/>
      <CounterBox text={compose}/>
      <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
        <PresetManager apply={(p)=>{ setMind(p.mind); setHuman(p.human); setKind(p.kind); }}/>
      </div>
      <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
        <div className="text-lg font-semibold">History</div>
        <div className="mt-3 flex gap-2">
          <button className="btn btn-ghost rounded-xl px-4 py-2 text-base" onClick={clear}>Clear</button>
          <button className="btn btn-ghost rounded-xl px-4 py-2 text-base" onClick={()=>downloadFile("history.json", JSON.stringify(logs,null,2))}>Export</button>
        </div>
        <div className="mt-3 grid gap-2">
          {logs.map((l,i)=>(
            <div key={i} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-white/40">
              <div className="flex flex-col">
                <span className="text-base">{fmt(l.ts)} • {l.soothe}/10</span>
                <span className="text-xs text-neutral-600">{l.tags.join(", ")}</span>
              </div>
              <button className="btn btn-ghost rounded-xl px-3 py-1 text-sm" onClick={()=>setSoothe(l.soothe)}>Load</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FocusTimer() {
  const [min,setMin]=useState(5);
  const [left,setLeft]=useState(0);
  const [run,setRun]=useState(false);
  useEffect(()=>{
    if(!run) return;
    if(left<=0){ setRun(false); try{ new AudioContext(); }catch{} return; }
    const id=setTimeout(()=>setLeft(left-1),1000);
    return ()=>clearTimeout(id);
  },[run,left]);
  const start=()=>{ setLeft(min*60); setRun(true); };
  const stop=()=>setRun(false);
  const reset=()=>{ setRun(false); setLeft(0); };
  const mm=Math.floor(left/60).toString().padStart(2,"0");
  const ss=(left%60).toString().padStart(2,"0");
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Focus timer</div>
        <div className="flex gap-2">
          <input className="input h-12 w-24 rounded-xl border px-3 text-base" type="number" value={min} onChange={(e)=>setMin(Math.max(1,Number(e.target.value||1)))} />
          <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={start}>Start</button>
          <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={stop}>Pause</button>
          <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={reset}>Reset</button>
        </div>
      </div>
      <div className="mt-3 text-4xl font-bold">{mm}:{ss}</div>
    </div>
  );
}

function QuickPhrases({ setMind,setHuman,setKind }: { setMind:(v:string)=>void; setHuman:(v:string)=>void; setKind:(v:string)=>void }) {
  const opts=[
    ["I’m noticing stress without judgment.","Others know this feeling.","May I be gentle with myself."],
    ["This moment is heavy.","Being human includes hard days.","I will treat myself like I would a friend."],
    ["This is tough and I can cope.","Everyone learns through mistakes.","I deserve patience right now."]
  ];
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Quick phrases</div>
      <div className="mt-3 grid gap-2">
        {opts.map((row,i)=>(
          <div key={i} className="flex flex-wrap gap-2">
            <button className="btn btn-ghost rounded-xl px-3 py-2 text-sm" onClick={()=>setMind(row[0])}>Mind</button>
            <button className="btn btn-ghost rounded-xl px-3 py-2 text-sm" onClick={()=>setHuman(row[1])}>Human</button>
            <button className="btn btn-ghost rounded-xl px-3 py-2 text-sm" onClick={()=>setKind(row[2])}>Kind</button>
            <div className="text-sm opacity-80">“{row[0]}” • “{row[1]}” • “{row[2]}”</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Journal() {
  const [list,setList]=useLocal<{id:string;ts:number;text:string}[]>("fuy.journal.v1",[]);
  const [text,setText]=useState("");
  const add=()=>{ const t=text.trim(); if(!t) return; setList([{id:crypto.randomUUID(),ts:Date.now(),text:t},...list]); setText(""); };
  const del=(id:string)=>setList(list.filter(x=>x.id!==id));
  const exp=()=>downloadFile("journal.json", JSON.stringify(list,null,2));
  const imp=async()=>{ const s=await uploadText(); if(!s) return; try{ const arr=JSON.parse(s); if(Array.isArray(arr)) setList(arr);}catch{} };
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Journal</div>
        <div className="flex gap-2">
          <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={imp}>Import</button>
          <button className="btn btn-ghost rounded-xl px-4 text-base" onClick={exp}>Export</button>
        </div>
      </div>
      <textarea className="mt-3 h-24 w-full rounded-xl border px-3 py-2 text-base" value={text} onChange={(e)=>setText(e.target.value)} />
      <div className="mt-2">
        <button className="btn btn-primary rounded-xl px-4 text-base" onClick={add}>Add entry</button>
      </div>
      <div className="mt-3 grid gap-2">
        {list.map(item=>(
          <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-white/40">
            <div className="flex flex-col">
              <span className="text-base">{fmt(item.ts)}</span>
              <span className="text-sm">{item.text}</span>
            </div>
            <button className="btn btn-ghost rounded-xl px-3 py-1 text-sm" onClick={()=>del(item.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekGrid({ logs }: { logs:{ts:number;soothe:number}[] }) {
  const days=[0,1,2,3,4,5,6];
  const now=new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const slots=days.map(i=>{
    const d=new Date(base.getTime()- (6-i)*24*3600*1000);
    const dayLogs=logs.filter(l=>{
      const ld=new Date(l.ts);
      return ld.getFullYear()===d.getFullYear() && ld.getMonth()===d.getMonth() && ld.getDate()===d.getDate();
    });
    const score=dayLogs.length? Math.round(dayLogs.reduce((a,b)=>a+b.soothe,0)/dayLogs.length) : 0;
    return {date:d,score};
  });
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">This week</div>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {slots.map((s,i)=>(
          <div key={i} className="flex flex-col items-center justify-center rounded-xl bg-white/70 px-2 py-3 ring-1 ring-white/40">
            <div className="text-xs">{s.date.toLocaleDateString(undefined,{weekday:"short"})}</div>
            <div className="text-sm">{s.date.getDate()}</div>
            <div className="mt-1 h-2 w-10 rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-black" style={{width: `${(s.score/10)*100}%`}}/></div>
            <div className="text-xs mt-1">{s.score}/10</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintPanel({ text }: { text: string }) {
  const print = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<pre style="font-family:ui-monospace,monospace;font-size:16px;white-space:pre-wrap;padding:20px;">${text.replace(/</g,"&lt;")}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  };
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Print</div>
      <div className="mt-3">
        <button className="btn btn-primary rounded-xl px-4 text-base" onClick={print}>Print preview</button>
      </div>
    </div>
  );
}

function SearchBox({ source, onSelect }: { source: string; onSelect: (hit:string)=>void }) {
  const [q,setQ]=useState("");
  const hits=useMemo(()=>{
    const lines=source.split("\n");
    return lines.filter(l=>l.toLowerCase().includes(q.toLowerCase())).slice(0,10);
  },[q,source]);
  return (
    <div className="rounded-2xl p-6 shadow-md ring-1 ring-white/30 backdrop-blur-xl" style={{background:"var(--card-bg)"}}>
      <div className="text-lg font-semibold">Search in preview</div>
      <input className="mt-3 h-12 w-full rounded-xl border px-3 text-base" placeholder="Type to search" value={q} onChange={(e)=>setQ(e.target.value)}/>
      <div className="mt-3 grid gap-2">
        {hits.map((h,i)=>(<button key={i} className="rounded-xl bg-white/70 px-3 py-2 text-left ring-1 ring-white/40 hover:bg-white/90" onClick={()=>onSelect(h)}>{h}</button>))}
      </div>
    </div>
  );
}

