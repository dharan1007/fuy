"use client";
import { useState } from "react";

type Checkin = { aliveness:number; connected:number; useful:number; wonder:number; notes?:string };

export default function WeeklyReview() {
  const [data, setData] = useState<Checkin>({ aliveness:3, connected:3, useful:3, wonder:3, notes:"" });
  const [status, setStatus] = useState("");

  function setVal(key: keyof Checkin, v: any) { setData({...data, [key]: v}); }

  async function save() {
    const res = await fetch("/api/checkin", { method:"POST", body: JSON.stringify(data) });
    setStatus(res.ok ? "Saved" : "Failed");
  }

  return (
    <section className="grid gap-5 max-w-xl">
      <h1 className="text-2xl font-semibold">Weekly Review</h1>
      <p className="text-sm text-stone-600">Rate this week (1–7). Monday is the start of the week.</p>
      {(["aliveness","connected","useful","wonder"] as const).map(k=>(
        <label key={k} className="grid gap-2">
          <span className="capitalize">{k}</span>
          <input type="range" min={1} max={7} value={data[k]} onChange={e=>setVal(k, Number(e.target.value))}/>
          <div className="text-sm">Score: {data[k]}</div>
        </label>
      ))}
      <label className="grid gap-1">
        <span className="text-sm">Notes (what moved / stalled / surprised?)</span>
        <textarea className="border rounded p-2" value={data.notes} onChange={e=>setVal("notes", e.target.value)} />
      </label>
      <button className="bg-black text-white rounded px-4 py-2 w-fit" onClick={save}>Save this week</button>
      {status && <p className="text-sm">{status}</p>}
    </section>
  );
}
