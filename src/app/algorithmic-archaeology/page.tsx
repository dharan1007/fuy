"use client";

import { useMemo, useState } from "react";

type SaveResp = { ok: boolean };
async function postJSON(url: string, data: any): Promise<SaveResp> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return { ok: res.ok };
  } catch { return { ok: false }; }
}

type Artifact = {
  label: string;
  type: "search" | "location" | "music" | "purchase" | "screentime" | "unknown";
  rows: any[];
};

export default function AlgorithmicArchaeologyPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [notes, setNotes] = useState("");

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const newArtifacts: Artifact[] = [];
    for (const f of Array.from(files)) {
      const text = await f.text();
      const isJSON = f.name.toLowerCase().endsWith(".json") || text.trim().startsWith("{") || text.trim().startsWith("[");
      let rows: any[] = [];
      try {
        if (isJSON) {
          const j = JSON.parse(text);
          rows = Array.isArray(j) ? j : flattenJSON(j);
        } else {
          rows = parseCSV(text);
        }
      } catch {
        rows = [];
      }
      const type = guessType(f.name, rows);
      newArtifacts.push({ label: f.name, type, rows });
    }
    setArtifacts(prev => [...prev, ...newArtifacts]);
  };

  const insights = useMemo(() => buildInsights(artifacts), [artifacts]);

  const save = async () => {
    const content = renderInsightsText(insights, notes);
    await postJSON("/api/posts", {
      feature: "OTHER",
      visibility: "PRIVATE",
      content,
      joyScore: 0, connectionScore: 0, creativityScore: 1
    });
    // Metrics
    if (insights.search?.topQueries.length) {
      await postJSON("/api/stats", { type: "aa_top_queries_count", category: "INSIGHT", value: insights.search.topQueries.length });
    }
    if (insights.location?.radiusKm != null) {
      await postJSON("/api/stats", { type: "aa_radius_km", category: "INSIGHT", value: insights.location.radiusKm });
    }
    if (insights.music?.energyAvg != null) {
      await postJSON("/api/stats", { type: "aa_music_energy", category: "INSIGHT", value: insights.music.energyAvg });
    }
    alert("Saved to feed & metrics.");
  };

  return (
    <section className="mx-auto max-w-5xl grid gap-6">
      <header className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Algorithmic Archaeology</h1>
          <span className="badge badge-blue">on-device</span>
        </div>
        <p className="mt-2 text-stone-700/90 text-sm md:text-base">
          Become an archaeologist of your own digital ghost. Import exports (Google searches, location, music, purchases, screen time).
          The analysis runs locally. Save only if you want.
        </p>

        <div className="mt-4 grid gap-3 sm:flex">
          <label className="btn btn-ghost cursor-pointer">
            <input type="file" className="hidden" multiple onChange={(e)=>addFiles(e.target.files)} />
            Import files (CSV/JSON)
          </label>
          <button className="btn btn-primary" onClick={save} disabled={!artifacts.length}>Save insight</button>
        </div>

        {artifacts.length > 0 && (
          <div className="mt-4 text-xs text-stone-600">
            Loaded: {artifacts.map(a => a.label).join(", ")}
          </div>
        )}
      </header>

      {/* Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Search story" tone="sky">
          {insights.search ? (
            <div className="text-sm">
              <div className="mb-2">Top queries (honest questions you asked):</div>
              <ul className="list-disc pl-5 space-y-1">{insights.search.topQueries.map((q,i)=><li key={i}>{q.q} <span className="text-stone-500">×{q.c}</span></li>)}</ul>
              <div className="mt-3 text-stone-600">Morning vs night bias: <b>{insights.search.dayNightBias}</b></div>
              <div className="text-stone-600">Themes: {insights.search.clusters.join(", ") || "—"}</div>
            </div>
          ) : <Empty />}
        </Panel>

        <Panel title="Music mood trace" tone="violet">
          {insights.music ? (
            <div className="text-sm">
              <div>Avg energy: <b>{insights.music.energyAvg?.toFixed(2)}</b> · Valence (happiness): <b>{insights.music.valenceAvg?.toFixed(2)}</b></div>
              <div className="mt-2">Morning vs night mood: <b>{insights.music.dayNightMood}</b></div>
              <div className="mt-2">Frequent artists: {insights.music.topArtists.slice(0,5).join(", ") || "—"}</div>
            </div>
          ) : <Empty />}
        </Panel>

        <Panel title="Radius of life" tone="emerald">
          {insights.location ? (
            <div className="text-sm">
              <div>Home centroid: <code className="text-[11px]">{insights.location.centroid?.join(", ")}</code></div>
              <div className="mt-1">Median daily radius: <b>{insights.location.radiusKm?.toFixed(1)} km</b></div>
              <div className="mt-1">Loop vs exploration: <b>{insights.location.loopScore}</b></div>
            </div>
          ) : <Empty />}
        </Panel>

        <Panel title="Purchase patterns" tone="amber">
          {insights.purchases ? (
            <div className="text-sm">
              <div>Top categories: {insights.purchases.topCats.join(", ") || "—"}</div>
              <div className="mt-1">Impulse ratio: <b>{(insights.purchases.impulseRatio*100).toFixed(0)}%</b></div>
              <div className="mt-1">Problem-solve vs comfort: <b>{insights.purchases.solveVsComfort}</b></div>
            </div>
          ) : <Empty />}
        </Panel>
      </div>

      <div className="card p-5">
        <div className="font-medium">Your reflection (optional)</div>
        <textarea className="input min-h-[120px]" placeholder="What surprised you? What story does the data tell?"
          value={notes} onChange={(e)=>setNotes(e.target.value)} />
      </div>
    </section>
  );
}

/* ---------------- helpers & UI ---------------- */

function Panel({ title, tone, children }:{ title:string; tone:"sky"|"emerald"|"amber"|"violet"; children: React.ReactNode }) {
  return (
    <div className={`feature-info rounded-3xl p-5 ring-1 ring-black/5 tone-${tone}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Empty(){ return <div className="text-sm text-stone-500">No data detected for this panel yet.</div>; }

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split(",") ?? [];
  return lines.map(l => {
    const cells = splitCSVRow(l);
    const row: any = {};
    header.forEach((h,i)=> row[h.trim()] = (cells[i] ?? "").trim());
    return row;
  });
}
function splitCSVRow(line: string) {
  const out:string[]=[]; let cur=""; let q=false;
  for (let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"' ){ if(q && line[i+1]==='"'){ cur+='"'; i++; } else { q=!q; } }
    else if(ch===',' && !q){ out.push(cur); cur=""; }
    else { cur+=ch; }
  }
  out.push(cur);
  return out;
}
function flattenJSON(obj:any, path:string[]=[]): any[] {
  const out:any[]=[];
  function walk(o:any, p:string[]){
    if (Array.isArray(o)) { o.forEach((v,i)=>walk(v,[...p,String(i)])); return; }
    if (o && typeof o === "object") { Object.entries(o).forEach(([k,v])=>walk(v,[...p,k])); return; }
    out.push({ path: p.join("."), value:o });
  }
  walk(obj, path);
  return out;
}
function guessType(name:string, rows:any[]): Artifact["type"] {
  const n = name.toLowerCase();
  if (n.includes("search") || hasKeys(rows, ["query","Query","searchTerm"])) return "search";
  if (n.includes("location") || hasKeys(rows, ["latitude","lat","Longitude","lon"])) return "location";
  if (n.includes("spotify") || n.includes("music") || hasKeys(rows, ["artist","Artist","track","Track Name"])) return "music";
  if (n.includes("order") || n.includes("purchase") || hasKeys(rows, ["price","subtotal","order"])) return "purchase";
  if (n.includes("screen") || hasKeys(rows, ["App","Usage","Screen Time"])) return "screentime";
  return "unknown";
}
function hasKeys(rows:any[], keys:string[]){ return rows.slice(0,10).some(r=>keys.some(k=>k in r)); }

function buildInsights(artifacts: Artifact[]) {
  const get = (t:Artifact["type"]) => artifacts.filter(a=>a.type===t).flatMap(a=>a.rows);

  // SEARCH
  const searchRows = get("search");
  const searchTop = tally(searchRows, ["query","Query","searchTerm"]);
  const searchHours = hourlyBias(searchRows, ["time","date","Timestamp"]);
  const searchClusters = clusterWords(searchRows, ["query","Query","searchTerm"]);

  // MUSIC
  const musicRows = get("music");
  const energyAvg = avg(musicRows, ["energy","Energy"]);
  const valenceAvg = avg(musicRows, ["valence","Valence"]);
  const artists = topList(musicRows, ["artist","Artist"]);
  const musicBias = hourlyBias(musicRows, ["played_at","time","Timestamp"]);

  // LOCATION
  const locRows = get("location");
  const centroid = centroidOf(locRows);
  const radiusKm = medianDailyRadius(locRows);
  const loopScore = loopiness(locRows);

  // PURCHASES
  const purRows = get("purchase");
  const cats = inferCats(purRows);
  const impulseRatio = estimateImpulse(purRows);
  const solveVsComfort = tiltSolveVsComfort(cats);

  return {
    search: searchRows.length ? { topQueries: searchTop, dayNightBias: searchBiasLabel(searchHours), clusters: catsFromWords(searchClusters) } : null,
    music: musicRows.length ? { energyAvg, valenceAvg, topArtists: artists, dayNightMood: biasLabel(musicBias) } : null,
    location: locRows.length ? { centroid, radiusKm, loopScore: loopLabel(loopScore) } : null,
    purchases: purRows.length ? { topCats: cats.slice(0,5), impulseRatio, solveVsComfort } : null,
  };
}

function renderInsightsText(ins:any, notes:string){
  return [
    "Algorithmic Archaeology — local analysis",
    ins.search ? `Search: top queries = ${ins.search.topQueries.slice(0,5).map((x:any)=>x.q).join(", ")}, bias=${ins.search.dayNightBias}` : "",
    ins.music  ? `Music: energy=${ins.music.energyAvg?.toFixed(2)}, valence=${ins.music.valenceAvg?.toFixed(2)}, bias=${ins.music.dayNightMood}` : "",
    ins.location ? `Location: median radius=${ins.location.radiusKm?.toFixed(1)}km, loop=${ins.location.loopScore}` : "",
    ins.purchases ? `Purchases: top categories=${ins.purchases.topCats.join(", ")}, impulse=${(ins.purchases.impulseRatio*100).toFixed(0)}%, tilt=${ins.purchases.solveVsComfort}` : "",
    notes ? `Notes: ${notes}` : ""
  ].filter(Boolean).join("\n");
}

/* ---------- tiny data helpers (for rough, privacy-friendly insight) ---------- */
function pick<T>(row:any, keys:string[]): T|undefined { for (const k of keys){ if (k in row) return row[k]; } }
function tally(rows:any[], keys:string[]){
  const m = new Map<string, number>();
  for (const r of rows){ const q = String(pick<string>(r, keys) ?? "").trim().toLowerCase(); if(!q) continue; m.set(q, (m.get(q)||0)+1); }
  return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([q,c])=>({q, c}));
}
function hourlyBias(rows:any[], timeKeys:string[]){
  let day=0, night=0;
  for (const r of rows){
    const t = String(pick<any>(r,timeKeys) ?? ""); const d = new Date(t);
    if (isNaN(d.getTime())) continue;
    const h = d.getHours(); if (h>=6 && h<18) day++; else night++;
  }
  return { day, night };
}
function searchBiasLabel(b:{day:number;night:number}){ if (b.day===0 && b.night===0) return "—"; return b.day>=b.night ? "day-leaning" : "night-leaning"; }
function biasLabel(b:{day:number;night:number}){ if (b.day===0 && b.night===0) return "—"; return b.day>=b.night ? "energizes day" : "soothes night"; }

function words(str:string){ return (str||"").toLowerCase().replace(/[^a-z0-9\s]/g,"").split(/\s+/).filter(w=>w.length>2); }
function clusterWords(rows:any[], keys:string[]){
  const m = new Map<string, number>();
  for (const r of rows){ const q = String(pick<string>(r, keys) ?? ""); for (const w of words(q)){ m.set(w,(m.get(w)||0)+1); } }
  return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,80);
}
function catsFromWords(top:[string,number][]){
  const themes = [
    ["health","pain","doctor","diet","sleep","exercise"],
    ["work","resume","meeting","jira","github","excel","notion"],
    ["money","budget","price","cost","tax","loan","rent"],
    ["travel","hotel","flight","train","map","nearby"],
    ["creative","music","poem","draw","design","photo","film"],
  ];
  const out = new Set<string>();
  for (const [w,_] of top){
    for (const t of themes){
      if (t.includes(w)) { out.add(t[0]); }
    }
  }
  return Array.from(out);
}
function avg(rows:any[], keys:string[]){
  const vals = rows.map(r => Number(pick<any>(r,keys))).filter(v => !Number.isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((a,b)=>a+b,0) / vals.length;
}
function topList(rows:any[], keys:string[]){
  const m = new Map<string, number>();
  for (const r of rows){ const v = String(pick<any>(r,keys) ?? "").trim(); if(!v) continue; m.set(v,(m.get(v)||0)+1); }
  return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
}
function centroidOf(rows:any[]){
  const pts = rows.map(r=>{
    const lat = Number(pick<any>(r, ["latitudeE7","latitude","lat"])) / (("latitudeE7" in r)? 1e7 : 1);
    const lon = Number(pick<any>(r, ["longitudeE7","longitude","lon","lng"])) / (("longitudeE7" in r)? 1e7 : 1);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat,lon] as [number,number];
    return null;
  }).filter(Boolean) as [number,number][];
  if (!pts.length) return null;
  const [sx,sy] = pts.reduce(([a,b],[x,y])=>[a+x,b+y],[0,0]);
  return [+(sx/pts.length).toFixed(4), +(sy/pts.length).toFixed(4)] as [number,number];
}
function haversine(a:[number,number], b:[number,number]){
  const R=6371; const dLat=(b[0]-a[0])*Math.PI/180; const dLon=(b[1]-a[1])*Math.PI/180;
  const s=Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}
function medianDailyRadius(rows:any[]){
  const byDay = new Map<string, [number,number][]>();
  for (const r of rows){
    const d = new Date(String(pick<any>(r, ["timestampMs","time","Timestamp","Date"])));
    if (isNaN(d.getTime())) continue;
    const k = d.toISOString().slice(0,10);
    const lat = Number(pick<any>(r, ["latitudeE7","latitude","lat"])) / (("latitudeE7" in r)? 1e7 : 1);
    const lon = Number(pick<any>(r, ["longitudeE7","longitude","lon","lng"])) / (("longitudeE7" in r)? 1e7 : 1);
    if (!Number.isFinite(lat)||!Number.isFinite(lon)) continue;
    const arr = byDay.get(k) ?? [];
    arr.push([lat,lon]); byDay.set(k,arr);
  }
  const radii:number[]=[];
  for (const arr of byDay.values()){
    if (arr.length<2) continue;
    const c = centroidOf(arr.map(([lat,lon])=>({latitude:lat, longitude:lon} as any)) as any) as [number,number];
    const dists = arr.map(p=>haversine(c,p)).sort((a,b)=>a-b);
    radii.push(dists[Math.floor(dists.length/2)]);
  }
  if (!radii.length) return null;
  return radii.sort((a,b)=>a-b)[Math.floor(radii.length/2)];
}
function loopiness(rows:any[]){
  // crude: fraction of visits within 1km of previous day's centroid → higher = loopier
  const byDay = new Map<string, [number,number][]>();
  for (const r of rows){
    const d = new Date(String(pick<any>(r, ["timestampMs","time","Timestamp","Date"])));
    if (isNaN(d.getTime())) continue;
    const k = d.toISOString().slice(0,10);
    const lat = Number(pick<any>(r, ["latitudeE7","latitude","lat"])) / (("latitudeE7" in r)? 1e7 : 1);
    const lon = Number(pick<any>(r, ["longitudeE7","longitude","lon","lng"])) / (("longitudeE7" in r)? 1e7 : 1);
    if (!Number.isFinite(lat)||!Number.isFinite(lon)) continue;
    const arr = byDay.get(k) ?? [];
    arr.push([lat,lon]); byDay.set(k,arr);
  }
  const days = Array.from(byDay.entries()).sort(([a],[b])=>a.localeCompare(b));
  let same=0,comp=0;
  for (let i=1;i<days.length;i++){
    const prevC = centroidOf(days[i-1][1].map(([lat,lon])=>({latitude:lat, longitude:lon} as any)) as any) as [number,number];
    const curC  = centroidOf(days[i][1].map(([lat,lon])=>({latitude:lat, longitude:lon} as any)) as any) as [number,number];
    if (!prevC||!curC) continue;
    comp++; if (haversine(prevC, curC) < 1) same++;
  }
  return comp? (same/comp) : 0;
}
function loopLabel(x:number){ if(x<=0.2) return "explorer"; if(x<=0.6) return "balanced"; return "loop-comfort"; }

function inferCats(rows:any[]){
  // naive based on description/title fields
  const m=new Map<string, number>();
  for (const r of rows){
    const line = Object.values(r).join(" ").toLowerCase();
    const pairs:[string,RegExp][] = [
      ["home", /(chair|desk|lamp|storage|shelf|sofa|bedding)/],
      ["health", /(supplement|vitamin|yoga|band|massage|ergonomic|shoe|insoles)/],
      ["tech", /(ssd|keyboard|mouse|monitor|headset|cable|adapter|phone|case|charger)/],
      ["apparel", /(shirt|hoodie|jeans|sneaker|jacket|dress|bag|cap)/],
      ["food", /(snack|coffee|tea|spice|grocery|protein|chocolate)/],
      ["media", /(book|novel|game|movie|music|vinyl)/],
    ];
    for (const [cat, rx] of pairs){ if (rx.test(line)) m.set(cat,(m.get(cat)||0)+1); }
  }
  return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
}
function estimateImpulse(rows:any[]){
  // purchases within 24h of being viewed (very rough — if we have a "Added" or "Viewed" column)
  let total=0, impulse=0;
  for (const r of rows){
    total++;
    const t = new Date(String(pick<any>(r,["Purchase Date","Date","Timestamp"]) || ""));
    const v = new Date(String(pick<any>(r,["Added","Viewed","First Seen"]) || ""));
    if (!isNaN(v.getTime()) && !isNaN(t.getTime())) {
      const diff = (+t - +v) / (1000*60*60);
      if (diff >=0 && diff <= 24) impulse++;
    }
  }
  return total? impulse/total : 0;
}
function tiltSolveVsComfort(cats:string[]){
  const solve = cats.filter(c=>["tech","home","health"].includes(c)).length;
  const comfort = cats.filter(c=>["food","media","apparel"].includes(c)).length;
  if (!solve && !comfort) return "—";
  if (solve >= comfort) return "problem-solving";
  return "comfort-seeking";
}
