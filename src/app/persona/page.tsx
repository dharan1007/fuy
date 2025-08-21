"use client";

import { useMemo, useState } from "react";

type SaveResp = { ok: boolean };
async function postJSON(url: string, data: any): Promise<SaveResp> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return { ok: res.ok };
  } catch { return { ok: false }; }
}

type Mode = "Helper" | "Inquisitor" | "Appreciator" | "Custom";

export default function PersonaPage() {
  const [mode, setMode] = useState<Mode>("Helper");
  const [custom, setCustom] = useState("");
  const [counts, setCounts] = useState({ helped: 0, asked: 0, appreciated: 0 });
  const [log, setLog] = useState<string[]>([]);

  const motive = useMemo(() => {
    const { helped, asked, appreciated } = counts;
    const max = Math.max(helped, asked, appreciated);
    if (max===0) return "—";
    if (max === helped) return "competence (Helper)";
    if (max === asked) return "curiosity (Inquisitor)";
    return "uplift (Appreciator)";
  }, [counts]);

  const title = mode === "Custom" ? custom || "Custom persona" : `The ${mode}`;

  const bump = (k: keyof typeof counts, note: string) => {
    setCounts(prev => ({ ...prev, [k]: prev[k] + 1 }));
    setLog(prev => [`${k}: ${note}`, ...prev].slice(0,10));
  };

  const save = async () => {
    const content = `Anonymous Persona Protocol
Persona: ${title}
Counts: helped ${counts.helped} · asked ${counts.asked} · appreciated ${counts.appreciated}
Default motive: ${motive}
Recent: ${log.join(" | ") || "—"}`;
    await postJSON("/api/posts", {
      feature: "OTHER",
      visibility: "PRIVATE",
      content,
      joyScore: 0, connectionScore: 1, creativityScore: 0
    });
    await postJSON("/api/stats", { type: "persona_helper", category: "SOCIAL", value: counts.helped });
    await postJSON("/api/stats", { type: "persona_inquisitor", category: "SOCIAL", value: counts.asked });
    await postJSON("/api/stats", { type: "persona_appreciator", category: "SOCIAL", value: counts.appreciated });
    alert("Saved.");
  };

  return (
    <section className="mx-auto max-w-4xl grid gap-6">
      <header className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Anonymous Persona Protocol</h1>
          <span className="badge badge-yellow">identity-free</span>
        </div>
        <p className="mt-2 text-stone-700/90 text-sm md:text-base">
          Run a behavior experiment in a social vacuum. Choose a mission for your anonymous persona and log tiny actions.
          See which motive emerges when no one’s watching.
        </p>
      </header>

      <div className="card p-5 grid gap-3">
        <div className="grid md:grid-cols-3 gap-3">
          <select className="input" value={mode} onChange={(e)=>setMode(e.target.value as Mode)}>
            <option>Helper</option>
            <option>Inquisitor</option>
            <option>Appreciator</option>
            <option>Custom</option>
          </select>
          {mode === "Custom" && <input className="input" placeholder="Describe your mission…" value={custom} onChange={(e)=>setCustom(e.target.value)} />}
          <div className="text-sm text-stone-700/80 grid items-center">Default motive: <b>{motive}</b></div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2 mt-2">
          <ActionCard label="Helped" onAdd={(note)=>bump("helped", note)} />
          <ActionCard label="Asked" onAdd={(note)=>bump("asked", note)} />
          <ActionCard label="Appreciated" onAdd={(note)=>bump("appreciated", note)} />
        </div>

        <button className="btn btn-primary mt-2" onClick={save}>Save protocol snapshot</button>
      </div>
    </section>
  );
}

function ActionCard({ label, onAdd }:{ label:"Helped"|"Asked"|"Appreciated"; onAdd:(note:string)=>void }) {
  const [txt,setTxt]=useState("");
  return (
    <div className="feature-info tone-sky rounded-2xl p-4 ring-1 ring-black/5">
      <div className="font-medium">{label}</div>
      <input className="input mt-2" placeholder="Short note…" value={txt} onChange={(e)=>setTxt(e.target.value)} />
      <button className="btn btn-ghost mt-2 w-full" onClick={()=>{ onAdd(txt || "—"); setTxt(""); }}>Log</button>
    </div>
  );
}
