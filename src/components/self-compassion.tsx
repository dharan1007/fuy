"use client";

import { useState } from "react";
const LSK_SELFCOMP = "fuy.selfcomp.logs.v1"; // [{ts, soothe}]

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

function pushSelfComp(entry: any) {
  try {
    const raw = localStorage.getItem(LSK_SELFCOMP);
    const arr = raw ? (JSON.parse(raw) as any[]) : [];
    arr.unshift(entry);
    localStorage.setItem(LSK_SELFCOMP, JSON.stringify(arr.slice(0, 50)));
  } catch {}
}

export function SelfCompassionPro() {
  const [mind, setMind] = useState("This is a moment of difficulty.");
  const [human, setHuman] = useState("Struggle is part of being human.");
  const [kind, setKind] = useState("May I be kind to myself right now.");
  const [friend, setFriend] = useState("If a friend felt this way, I’d say…");
  const [soothe, setSoothe] = useState(6);
  const [action, setAction] = useState("One kind thing I can do next is …");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await postJSON("/api/posts", {
      feature: "CALM",
      visibility: "PRIVATE",
      content:
`Self-Compassion Break
- Mindfulness: ${mind}
- Common humanity: ${human}
- Kindness: ${kind}
- To a friend: ${friend}
- Soothing rating: ${soothe}/10
- Kind action: ${action}`,
      joyScore: 1, connectionScore: 0, creativityScore: 0,
    });
    pushSelfComp({ ts: Date.now(), soothe });
    setSoothe(6);
    setSaving(false);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Self-compassion break</h2>
        <span className="badge badge-purple">soothe</span>
      </div>
      <div className="grid gap-2 text-sm">
        <input className="input" value={mind} onChange={(e)=>setMind(e.target.value)} />
        <input className="input" value={human} onChange={(e)=>setHuman(e.target.value)} />
        <input className="input" value={kind} onChange={(e)=>setKind(e.target.value)} />
        <textarea className="input min-h-[70px]" value={friend} onChange={(e)=>setFriend(e.target.value)} />
        <div className="flex items-center gap-2">
          <span className="w-28">Soothing</span>
          <input type="range" min={0} max={10} value={soothe} onChange={(e)=>setSoothe(Number(e.target.value))} className="w-full" />
          <span className="w-10">{soothe}</span>
        </div>
        <input className="input" value={action} onChange={(e)=>setAction(e.target.value)} />
        <button className="btn btn-primary mt-1 disabled:opacity-50" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save practice"}
        </button>
        <p className="text-xs text-neutral-500">Customize the phrases so they sound like you. Small kindnesses count.</p>
      </div>
    </div>
  );
}
