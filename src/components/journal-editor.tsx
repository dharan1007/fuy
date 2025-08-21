"use client";
import { useState } from "react";

const AM_PROMPTS = [
  "What would make today meaningful (1 tiny thing)?",
  "What could go wrong? How will I respond with steadiness?"
];
const PM_PROMPTS = [
  "Where did I act in line with my values?",
  "Where did I fall short—and what repair will I attempt tomorrow?"
];
const SAVORING_PROMPTS = [
  "Name a tiny good moment. Revisit it with senses.",
  "How can Future-You re-savor this in 3 days?"
];

export default function JournalEditor() {
  const [kind, setKind] = useState<"stoic-am"|"stoic-pm"|"savoring">("stoic-am");
  const [content, setContent] = useState("");

  async function save() {
    await fetch("/api/journal", {
      method: "POST",
      body: JSON.stringify({ kind, content })
    });
    setContent("");
    alert("Saved");
  }

  const prompts = kind==="stoic-am" ? AM_PROMPTS : kind==="stoic-pm" ? PM_PROMPTS : SAVORING_PROMPTS;

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <button onClick={()=>setKind("stoic-am")} className="border rounded px-3 py-1">AM</button>
        <button onClick={()=>setKind("stoic-pm")} className="border rounded px-3 py-1">PM</button>
        <button onClick={()=>setKind("savoring")} className="border rounded px-3 py-1">Savoring</button>
      </div>
      <ul className="text-sm text-stone-700 list-disc pl-5">
        {prompts.map(p=> <li key={p}>{p}</li>)}
      </ul>
      <textarea className="border rounded p-2 min-h-[160px]" value={content} onChange={e=>setContent(e.target.value)} />
      <button className="bg-black text-white rounded px-4 py-2 w-fit" onClick={save}>Save entry</button>
    </div>
  );
}
