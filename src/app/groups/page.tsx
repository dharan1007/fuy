"use client";

import { useEffect, useState } from "react";

export default function GroupsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  async function refresh() {
    const r = await fetch("/api/groups");
    if (r.ok) setRows(await r.json());
  }
  useEffect(()=>{ refresh(); }, []);

  async function create() {
    await fetch("/api/groups", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action: "create", name, description: desc })
    });
    setName(""); setDesc("");
    refresh();
  }

  async function join(id: string) {
    await fetch("/api/groups", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action: "join", groupId: id })
    });
    refresh();
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Groups</h1>

      <div className="c-card p-4 grid gap-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Group name" value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Description" value={desc} onChange={(e)=>setDesc(e.target.value)} />
        </div>
        <button className="c-btn-primary w-fit" onClick={create}>Create group</button>
      </div>

      <div className="c-card p-4 grid gap-2">
        {rows.map(g=>(
          <div key={g.id} className="flex items-center justify-between border-t py-3 first:border-t-0">
            <div>
              <div className="font-medium">{g.name}</div>
              <div className="text-sm text-stone-600">{g.description}</div>
            </div>
            <button className="c-btn-ghost" onClick={()=>join(g.id)}>Join</button>
          </div>
        ))}
      </div>
    </div>
  );
}
