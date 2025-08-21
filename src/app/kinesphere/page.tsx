// src/app/kinesphere/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ========================================================================
 * Types
 * ===================================================================== */
type Point = { x: number; y: number; t: number };
type Stroke = { id: string; color: string; width: number; points: Point[] };
type Session = {
  id: string;
  room: string;
  strokes: Stroke[];
  tags: string[];
  bg: BGKind;
  bgColor: string;
  createdAt: number;
  updatedAt: number;
  view: ViewState;
};
type BGKind = "grid" | "dots" | "blank";
type Analysis = {
  distance: number;
  efficiency: number;
  expansion: number;
  meander: number;
  strokes: number;
  points: number;
};
type ViewState = { scale: number; tx: number; ty: number };
type Tool = "pen" | "pan" | "eraser";

/* ========================================================================
 * Constants & Utils
 * ===================================================================== */
const BASE_W = 1000;
const BASE_H = 600;

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const DEFAULT_VIEW: ViewState = { scale: 1, tx: 0, ty: 0 };
const DEFAULT_COLORS = ["#111827", "#0f766e", "#7c3aed", "#b45309", "#1d4ed8", "#dc2626"];
const DEFAULT_BG: BGKind = "grid";

/* ========================================================================
 * Download / Upload helpers
 * ===================================================================== */
function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsText(file);
  });
}

/* ========================================================================
 * Math helpers
 * ===================================================================== */
function dist(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function totalDistance(strokes: Stroke[]) {
  let total = 0;
  for (const s of strokes) for (let i = 1; i < s.points.length; i++) total += dist(s.points[i - 1], s.points[i]);
  return total;
}
function straightEfficiency(strokes: Stroke[]) {
  const all = strokes.flatMap(s => s.points);
  if (all.length < 2) return 0;
  const A = all[0], B = all[all.length - 1];
  const straight = Math.hypot(B.x - A.x, B.y - A.y);
  const total = totalDistance(strokes);
  return total > 0 ? straight / total : 0;
}
function averageMeander(strokes: Stroke[]) {
  const angs: number[] = [];
  for (const s of strokes) {
    for (let i = 2; i < s.points.length; i++) {
      const a = s.points[i - 2], b = s.points[i - 1], c = s.points[i];
      const ang = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
      angs.push(Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))));
    }
  }
  return angs.length ? angs.reduce((A, B) => A + B, 0) / angs.length : 0;
}
function convexHull(points: Point[]): Point[] {
  if (points.length <= 1) return points.slice();
  const P = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of P) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper: Point[] = [];
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  upper.pop(); lower.pop(); return lower.concat(upper);
}
function polygonArea(pts: Point[]) {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  return Math.abs(s / 2);
}
function smooth(points: Point[], minDist = 0.8) {
  if (points.length <= 2) return points.slice();
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) if (dist(out[out.length - 1], points[i]) >= minDist) out.push(points[i]);
  out.push(points[points.length - 1]);
  return out;
}

/* ========================================================================
 * Hooks
 * ===================================================================== */
function useDeviceScale(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = c.parentElement;
      const rectW = parent ? parent.clientWidth : BASE_W;
      const rectH = rectW * (BASE_H / BASE_W);
      c.style.width = rectW + "px";
      c.style.height = rectH + "px";
      c.width = Math.floor(rectW * dpr);
      c.height = Math.floor(rectH * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c.parentElement ?? c);
    return () => ro.disconnect();
  }, [canvasRef]);
}

/** Prevents hydration mismatch by letting us know when we're on the client. */
function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

function useAutosave(session: Session, setSession: (s: Session) => void) {
  const key = `kinesphere:${session.id}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const loaded = JSON.parse(raw) as Session;
        setSession({ ...loaded, view: loaded.view ?? DEFAULT_VIEW });
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(session)); } catch { /* ignore */ }
  }, [key, session]);
}

/* ========================================================================
 * Canvas Engine
 * ===================================================================== */
function worldToScreen(p: { x: number; y: number }, view: ViewState, dpi: number, cw: number, ch: number) {
  const cx = cw / dpi / 2, cy = ch / dpi / 2;
  return { x: (p.x - BASE_W / 2) * view.scale + cx + view.tx, y: (p.y - BASE_H / 2) * view.scale + cy + view.ty };
}
function screenToWorld(p: { x: number; y: number }, view: ViewState, dpi: number, cw: number, ch: number) {
  const cx = cw / dpi / 2, cy = ch / dpi / 2;
  return { x: ((p.x - view.tx - cx) / view.scale) + BASE_W / 2, y: ((p.y - view.ty - cy) / view.scale) + BASE_H / 2 };
}
function drawBackground(ctx: CanvasRenderingContext2D, view: ViewState, dpi: number, cw: number, ch: number, kind: BGKind, color: string) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = color; ctx.fillRect(0, 0, cw, ch); ctx.restore();
  const gap = 20 * view.scale * dpi;
  if (kind === "grid") {
    ctx.save(); ctx.beginPath(); ctx.lineWidth = 1; ctx.strokeStyle = "rgba(0,0,0,.06)";
    for (let x = (view.tx * dpi) % gap; x <= cw; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, ch); }
    for (let y = (view.ty * dpi) % gap; y <= ch; y += gap) { ctx.moveTo(0, y); ctx.lineTo(cw, y); }
    ctx.stroke(); ctx.restore();
  } else if (kind === "dots") {
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,.08)";
    const step = 18 * view.scale * dpi;
    for (let y = (view.ty * dpi) % step; y <= ch; y += step) {
      for (let x = (view.tx * dpi) % step; x <= cw; x += step) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
}
function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], view: ViewState, dpi: number, cw: number, ch: number) {
  ctx.save(); ctx.scale(dpi, dpi);
  for (const s of strokes) {
    if (!s.points.length) continue;
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width * view.scale; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    const p0 = worldToScreen(s.points[0], view, dpi, cw, ch); ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < s.points.length; i++) { const p = worldToScreen(s.points[i], view, dpi, cw, ch); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
  ctx.restore();
}

/* ========================================================================
 * UI Primitives
 * ===================================================================== */
function Card(props: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl p-5 ring-1 ring-black/5 bg-white/80 ${props.className ?? ""}`}>{props.children}</div>;
}
function Btn({
  children, onClick, tone = "neutral", title, type = "button", disabled
}: {
  children: React.ReactNode; onClick?: () => void; tone?: "neutral" | "primary" | "ghost" | "danger";
  title?: string; type?: "button" | "submit"; disabled?: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm",
    primary: "bg-stone-900 text-white hover:bg-stone-800 border border-stone-900 shadow-sm",
    ghost:   "bg-transparent hover:bg-stone-100 text-stone-800 border border-stone-200",
    danger:  "bg-red-600 text-white hover:bg-red-500 border border-red-700",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-2xl text-[13px] transition ${tones[tone]} disabled:opacity-50 disabled:pointer-events-none`}
    >{children}</button>
  );
}
function Input({ value, onChange, placeholder, className, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 outline-none focus:ring-4 ring-stone-200/60 transition ${className ?? ""}`}
    />
  );
}

/* ========================================================================
 * Toolbar
 * ===================================================================== */
type tool = "pen" | "pan" | "eraser";
function ToolToggle({ tool, setTool }: { tool: Tool; setTool: (t: Tool) => void }) {
  const Opt = ({ id, label }: { id: Tool; label: string }) => (
    <Btn tone={tool === id ? "primary" : "ghost"} onClick={() => setTool(id)} title={label}>{label}</Btn>
  );
  return (
    <div className="flex flex-wrap gap-2">
      <Opt id="pen" label="Pen (P)" />
      <Opt id="pan" label="Pan (Space)" />
      <Opt id="eraser" label="Eraser (E)" />
    </div>
  );
}
function ColorPicker({ color, setColor }: { color: string; setColor: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-stone-600">Color</span>
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 rounded-md border border-stone-200" />
    </div>
  );
}
function StrokeWidth({ width, setWidth }: { width: number; setWidth: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-stone-600">Width</span>
      <input type="range" min={1} max={14} step={1} value={width} onChange={(e) => setWidth(parseInt(e.target.value))} />
      <span className="text-sm text-stone-700 w-6 text-right">{width}</span>
    </div>
  );
}
function BGDesigner({ kind, setKind, color, setColor }: { kind: BGKind; setKind: (k: BGKind) => void; color: string; setColor: (c: string) => void; }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-stone-600 mr-1">Background</span>
      {(["grid", "dots", "blank"] as BGKind[]).map(k => (
        <Btn key={k} tone={kind === k ? "primary" : "ghost"} onClick={() => setKind(k)}>{k}</Btn>
      ))}
      <div className="ml-2">
        <ColorPicker color={color} setColor={setColor} />
      </div>
    </div>
  );
}

/* ========================================================================
 * Metrics
 * ===================================================================== */
function useAnalysis(strokes: Stroke[], canvasNorm = { w: BASE_W, h: BASE_H }): Analysis {
  return useMemo(() => {
    const distance = totalDistance(strokes);
    const efficiency = straightEfficiency(strokes);
    const meander = averageMeander(strokes);
    const pts = strokes.flatMap(s => s.points);
    const hull = convexHull(pts);
    const hullArea = polygonArea(hull);
    const expansion = (canvasNorm.w * canvasNorm.h) > 0 ? hullArea / (canvasNorm.w * canvasNorm.h) : 0;
    return { distance, efficiency, expansion, meander, strokes: strokes.length, points: pts.length };
  }, [strokes, canvasNorm.h, canvasNorm.w]);
}
function MetricsCard({ analysis }: { analysis: Analysis }) {
  const pct = (v: number) => (v * 100).toFixed(0) + "%";
  return (
    <Card className="grid gap-2">
      <div className="font-medium">Session metrics</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-stone-50 p-3"><div className="text-stone-500">Total distance</div><div className="font-medium">{analysis.distance.toFixed(1)} px</div></div>
        <div className="rounded-xl bg-stone-50 p-3"><div className="text-stone-500">Efficiency</div><div className="font-medium">{pct(analysis.efficiency)}</div></div>
        <div className="rounded-xl bg-stone-50 p-3"><div className="text-stone-500">Expansion</div><div className="font-medium">{pct(analysis.expansion)}</div></div>
        <div className="rounded-xl bg-stone-50 p-3"><div className="text-stone-500">Meander</div><div className="font-medium">{analysis.meander.toFixed(2)} rad</div></div>
        <div className="rounded-xl bg-stone-50 p-3"><div className="text-stone-500">Strokes</div><div className="font-medium">{analysis.strokes}</div></div>
        <div className="rounded-xl bg-stone-50 p-3"><div className="text-stone-500">Points</div><div className="font-medium">{analysis.points}</div></div>
      </div>
    </Card>
  );
}

/* ========================================================================
 * Right rail: tags + actions (with hydration-safe time)
 * ===================================================================== */
function TagInput({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => { const clean = draft.trim(); if (!clean || tags.includes(clean)) return; setTags([...tags, clean]); setDraft(""); };
  const remove = (t: string) => setTags(tags.filter(x => x !== t));
  return (
    <Card className="grid gap-3">
      <div className="font-medium">Tags</div>
      <div className="flex gap-2">
        <Input value={draft} onChange={setDraft} placeholder="Add a tag (Enter)" className="flex-1" />
        <Btn onClick={add}>Add</Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <span key={t} className="px-2 py-1 rounded-2xl text-[12px] bg-stone-100 text-stone-800 ring-1 ring-stone-200">
            {t} <button className="ml-1 text-stone-500 hover:text-stone-800" onClick={() => remove(t)}>×</button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-sm text-stone-500">No tags yet.</span>}
      </div>
    </Card>
  );
}

function Actions({
  canvasRef, session, setSession, getPNGBlob, resetCanvas,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  session: Session; setSession: (s: Session) => void;
  getPNGBlob: () => Promise<Blob | null>;
  resetCanvas: () => void;
}) {
  const mounted = useIsMounted();

  // hydration-safe timestamp text: server -> ISO; client -> localized (24h, 2-digit day/month)
  const updatedISO = useMemo(() => new Date(session.updatedAt).toISOString(), [session.updatedAt]);
  const updatedNice = useMemo(() => {
    if (!mounted) return updatedISO; // render stable text on the server
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      }).format(new Date(session.updatedAt));
    } catch {
      return updatedISO;
    }
  }, [mounted, session.updatedAt, updatedISO]);

  const exportPNG = async () => {
    const blob = await getPNGBlob();
    if (blob) downloadBlob(`kinesphere_${Date.now()}.png`, blob);
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    downloadBlob(`kinesphere_${Date.now()}.json`, blob);
  };
  const importJSON = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const s = JSON.parse(text) as Session;
      if (!s || !Array.isArray(s.strokes)) throw new Error("Invalid");
      setSession({ ...s, id: s.id || uid(), updatedAt: Date.now(), view: s.view ?? DEFAULT_VIEW });
    } catch { alert("Invalid file"); }
  };
  const sharePNG = async () => {
    try {
      const blob = await getPNGBlob();
      if (!blob) return;
      const files = [new File([blob], "kinesphere.png", { type: "image/png" })];
      // @ts-ignore
      if (navigator.share && navigator.canShare?.({ files })) {
        // @ts-ignore
        await navigator.share({ files, title: "Kinespheric Map", text: "My movement map" });
      } else downloadBlob(`kinesphere_${Date.now()}.png`, blob);
    } catch {}
  };

  return (
    <Card className="grid gap-2">
      <div className="font-medium">Session</div>
      <div className="grid grid-cols-2 gap-2">
        <Btn tone="primary" onClick={exportPNG}>Export PNG</Btn>
        <Btn onClick={sharePNG}>Share</Btn>
        <Btn onClick={exportJSON}>Export JSON</Btn>
        <label className="cursor-pointer">
          <span className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm inline-block">
            Import JSON
          </span>
          <input type="file" className="hidden" accept="application/json" onChange={(e) => {
            const f = e.target.files?.[0]; if (f) importJSON(f);
            e.currentTarget.value = "";
          }} />
        </label>
        <Btn tone="danger" onClick={resetCanvas}>Reset</Btn>
      </div>
      <div className="text-[12px] text-stone-500">
        <time suppressHydrationWarning dateTime={updatedISO}>{updatedNice}</time> • {session.room}
      </div>
    </Card>
  );
}

/* ========================================================================
 * Main Page
 * ===================================================================== */
export default function KinespherePage() {
  const [session, setSession] = useState<Session>({
    id: uid(),
    room: "Office",
    strokes: [],
    tags: [],
    bg: DEFAULT_BG,
    bgColor: "#ffffff",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    view: { ...DEFAULT_VIEW },
  });

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(DEFAULT_COLORS[0]);
  const [width, setWidth] = useState<number>(3);
  const [smoothing, setSmoothing] = useState(true);

  const [undoStack, setUndo] = useState<Stroke[][]>([]);
  const [redoStack, setRedo] = useState<Stroke[][]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);

  useDeviceScale(canvasRef);
  useAutosave(session, setSession);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (e.key.toLowerCase() === "p") setTool("pen");
      else if (e.key.toLowerCase() === "e") setTool("eraser");
      else if (e.code === "Space") setTool("pan");
      else if ((e.ctrlKey || e.metaKey) && e.key === "+") zoom(1.1);
      else if ((e.ctrlKey || e.metaKey) && e.key === "-") zoom(1/1.1);
      else if ((e.ctrlKey || e.metaKey) && e.key === "0") resetView();
      else if (e.key === "Delete") eraseLastStroke();
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space" && tool === "pan") setTool("pen"); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  }, [tool]); // eslint-disable-line

  // Undo/Redo
  const pushUndo = useCallback((prev: Stroke[]) => {
    setUndo(u => [...u.slice(-49), prev.map(s => ({ ...s, points: s.points.slice() }))]);
    setRedo([]);
  }, []);
  const undo = () => {
    setUndo(u => {
      if (!u.length) return u;
      setRedo(r => [session.strokes.map(s => ({ ...s, points: s.points.slice() })), ...r].slice(0, 50));
      const last = u[u.length - 1];
      setSession(s => ({ ...s, strokes: last, updatedAt: Date.now() }));
      return u.slice(0, -1);
    });
  };
  const redo = () => {
    setRedo(r => {
      if (!r.length) return r;
      setUndo(u => [...u, session.strokes.map(s => ({ ...s, points: s.points.slice() }))].slice(-50));
      const next = r[0];
      setSession(s => ({ ...s, strokes: next, updatedAt: Date.now() }));
      return r.slice(1);
    });
  };

  // Rendering
  const repaint = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpi = window.devicePixelRatio || 1;
    drawBackground(ctx, session.view, dpi, c.width, c.height, session.bg, session.bgColor);
    drawStrokes(ctx, session.strokes, session.view, dpi, c.width, c.height);
    if (activeStrokeRef.current && activeStrokeRef.current.points.length > 0) {
      drawStrokes(ctx, [activeStrokeRef.current], session.view, dpi, c.width, c.height);
    }
  }, [session.bg, session.bgColor, session.strokes, session.view]);

  useEffect(() => { repaint(); });
  useEffect(() => {
    let raf = 0;
    const loop = () => { repaint(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [repaint]);

  // Pointer handlers
  const handleDown = (clientX: number, clientY: number) => {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    const x = (clientX - rect.left) * dpi;
    const y = (clientY - rect.top) * dpi;
    if (tool === "pan") { panRef.current = { x, y }; return; }
    if (tool === "eraser") { eraseAt(clientX, clientY); return; }
    isDrawingRef.current = true;
    activeStrokeRef.current = { id: uid(), color, width, points: [] };
    addPoint(clientX, clientY);
  };
  const handleMove = (clientX: number, clientY: number) => {
    const c = canvasRef.current; if (!c) return;
    if (tool === "pan" && panRef.current) {
      const rect = c.getBoundingClientRect();
      const dpi = window.devicePixelRatio || 1;
      const x = (clientX - rect.left) * dpi;
      const y = (clientY - rect.top) * dpi;
      const dx = x - panRef.current.x;
      const dy = y - panRef.current.y;
      panRef.current = { x, y };
      setSession(s => ({ ...s, view: { ...s.view, tx: s.view.tx + dx / dpi, ty: s.view.ty + dy / dpi } }));
      return;
    }
    if (!isDrawingRef.current) return;
    addPoint(clientX, clientY);
  };
  const handleUp = () => {
    if (tool === "pan") { panRef.current = null; return; }
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const s = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (!s || s.points.length < 2) return;
    const finalStroke = { ...s, points: smoothing ? smooth(s.points) : s.points };
    pushUndo(session.strokes);
    setSession(sess => ({ ...sess, strokes: [...sess.strokes, finalStroke], updatedAt: Date.now() }));
  };

  function addPoint(clientX: number, clientY: number) {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    const sx = (clientX - rect.left) * dpi;
    const sy = (clientY - rect.top) * dpi;
    const world = screenToWorld({ x: sx / dpi, y: sy / dpi }, session.view, dpi, c.width, c.height);
    const p: Point = { x: world.x, y: world.y, t: performance.now() };
    activeStrokeRef.current?.points.push(p);
  }
  function eraseAt(clientX: number, clientY: number) {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    const sx = (clientX - rect.left) * dpi;
    const sy = (clientY - rect.top) * dpi;
    const world = screenToWorld({ x: sx / dpi, y: sy / dpi }, session.view, dpi, c.width, c.height);
    const radius = 10 / session.view.scale;
    const hit = session.strokes.findIndex(st => st.points.some(pt => Math.hypot(pt.x - world.x, pt.y - world.y) <= radius));
    if (hit >= 0) {
      pushUndo(session.strokes);
      setSession(s => { const next = s.strokes.slice(); next.splice(hit, 1); return { ...s, strokes: next, updatedAt: Date.now() }; });
    }
  }
  function eraseLastStroke() {
    if (!session.strokes.length) return;
    pushUndo(session.strokes);
    setSession(s => ({ ...s, strokes: s.strokes.slice(0, -1), updatedAt: Date.now() }));
  }

  // Wheel zoom/pan
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0015);
        zoomAt(factor, e.clientX, e.clientY);
      } else {
        setSession(s => ({ ...s, view: { ...s.view, tx: s.view.tx - e.deltaX, ty: s.view.ty - e.deltaY } }));
      }
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, []); // eslint-disable-line

  function zoom(factor: number) {
    setSession(s => ({ ...s, view: { ...s.view, scale: clamp(s.view.scale * factor, 0.25, 4) } }));
  }
  function zoomAt(factor: number, clientX: number, clientY: number) {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    const sx = (clientX - rect.left) * dpi;
    const sy = (clientY - rect.top) * dpi;
    const before = screenToWorld({ x: sx / dpi, y: sy / dpi }, session.view, dpi, c.width, c.height);
    const nextScale = clamp(session.view.scale * factor, 0.25, 4);
    const nextView = { ...session.view, scale: nextScale };
    const after = screenToWorld({ x: sx / dpi, y: sy / dpi }, nextView, dpi, c.width, c.height);
    const dx = (after.x - before.x) * nextScale;
    const dy = (after.y - before.y) * nextScale;
    setSession(s => ({ ...s, view: { ...nextView, tx: s.view.tx + dx, ty: s.view.ty + dy } }));
  }
  function resetView() { setSession(s => ({ ...s, view: { ...DEFAULT_VIEW } })); }

  const getPNGBlob = useCallback(async (): Promise<Blob | null> => {
    const c = canvasRef.current; if (!c) return null;
    return await new Promise((res) => c.toBlob(b => res(b), "image/png"));
  }, []);

  const analysis = useAnalysis(session.strokes, { w: BASE_W, h: BASE_H });

  const resetCanvas = () => {
    setUndo([]); setRedo([]);
    setSession(s => ({ ...s, strokes: [], updatedAt: Date.now(), view: { ...DEFAULT_VIEW } }));
  };

  // Pointer bindings
  const onMouseDown = (e: React.MouseEvent) => handleDown(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleUp();
  const onLeave = () => handleUp();
  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; handleDown(t.clientX, t.clientY); };
  const onTouchMove = (e: React.TouchEvent) => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); };
  const onTouchEnd = () => handleUp();

  return (
    <section className="mx-auto max-w-6xl grid gap-6">
      <header className="rounded-3xl p-6 md:p-8 bg-white/80 ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Kinesphere</h1>
            <p className="mt-1 text-stone-700/90 text-sm md:text-base">Draw your movement map. Keep it light, zoomable, undoable — and export whenever you’re done.</p>
          </div>
          <span className="px-2 py-1 rounded-full text-[12px] bg-stone-900/10 text-stone-900 ring-1 ring-stone-900/15">v2 minimal</span>
        </div>
      </header>

      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-stone-600">Room</label>
          <Input value={session.room} onChange={(v) => setSession(s => ({ ...s, room: v, updatedAt: Date.now() }))} className="w-48" />
          <div className="h-6 w-px bg-stone-200 mx-1" />
          <ToolToggle tool={tool} setTool={setTool} />
          <div className="h-6 w-px bg-stone-200 mx-1" />
          <ColorPicker color={color} setColor={setColor} />
          <StrokeWidth width={width} setWidth={setWidth} />
          <label className="ml-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={smoothing} onChange={(e) => setSmoothing(e.target.checked)} />
            Smoothing
          </label>
          <div className="h-6 w-px bg-stone-200 mx-1" />
          <BGDesigner
            kind={session.bg}
            setKind={(bg) => setSession(s => ({ ...s, bg, updatedAt: Date.now() }))}
            color={session.bgColor}
            setColor={(bgColor) => setSession(s => ({ ...s, bgColor, updatedAt: Date.now() }))}
          />
          <div className="h-6 w-px bg-stone-200 mx-1" />
          <div className="flex items-center gap-2">
            <Btn onClick={() => zoom(1.1)} title="Zoom in (Ctrl +)">＋</Btn>
            <Btn onClick={() => zoom(1/1.1)} title="Zoom out (Ctrl -)">−</Btn>
            <Btn onClick={resetView} title="Reset view (Ctrl 0)">Reset view</Btn>
          </div>
          <div className="h-6 w-px bg-stone-200 mx-1" />
          <div className="flex items-center gap-2">
            <Btn onClick={undo} disabled={!undoStack.length} title="Undo (Ctrl Z)">Undo</Btn>
            <Btn onClick={redo} disabled={!redoStack.length} title="Redo (Ctrl Shift Z)">Redo</Btn>
            <Btn tone="ghost" onClick={eraseLastStroke} title="Delete last (Del)">Delete last</Btn>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <Card className="grid gap-3">
          <div className="rounded-2xl overflow-hidden ring-1 ring-black/5 bg-white/70 select-none relative">
            <canvas
              ref={canvasRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onLeave}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="block w-full h-auto cursor-crosshair touch-none"
            />
            <div className="absolute left-2 bottom-2 text-[12px] px-2 py-1 rounded-xl bg-white/80 ring-1 ring-black/5 text-stone-600">
              {tool === "pen" ? "Pen (hold Space to Pan)" : tool === "pan" ? "Panning…" : "Eraser"}
            </div>
          </div>
          <div className="text-[12px] text-stone-500">
            Tip: Ctrl/⌘ + wheel to zoom at cursor • Hold <kbd>Space</kbd> to pan • <kbd>P</kbd> Pen, <kbd>E</kbd> Eraser, <kbd>Del</kbd> delete last.
          </div>
        </Card>

        <div className="grid gap-4">
          <MetricsCard analysis={useAnalysis(session.strokes, { w: BASE_W, h: BASE_H })} />
          <TagInput tags={session.tags} setTags={(tags) => setSession(s => ({ ...s, tags, updatedAt: Date.now() }))} />
          <Actions canvasRef={canvasRef} session={session} setSession={setSession} getPNGBlob={getPNGBlob} resetCanvas={resetCanvas} />
          <Card className="text-sm text-stone-600">
            <div className="font-medium mb-2">Shortcuts</div>
            <ul className="list-disc pl-5 grid gap-1">
              <li><b>Ctrl/⌘ + Z</b> Undo • <b>Ctrl/⌘ + Shift + Z</b> Redo</li>
              <li><b>Ctrl/⌘ + + / − / 0</b> Zoom in/out/reset</li>
              <li><b>P</b> Pen • <b>E</b> Eraser • <b>Space</b> Pan</li>
              <li>Wheel = pan • Ctrl/⌘ + wheel = zoom</li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
