"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ===== Storage + API ===== */
const LS_LAST = "fuy.stressmap.last.v3";
const LS_HIST = "fuy.stressmap.hist.v3";

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

/** ===== Types ===== */
type Side = "front" | "back";
type Quality = "tight" | "ache" | "sharp" | "numb" | "tingle";
type RegionId =
  | "head"
  | "neck"
  | "shouldersL" | "shouldersR"
  | "chest" | "upperBack"
  | "armsL" | "armsR"
  | "forearmsL" | "forearmsR"
  | "abdomen" | "lowerBack"
  | "hipsL" | "hipsR"
  | "thighsL" | "thighsR"
  | "calvesL" | "calvesR";

type Marker = {
  id: string;
  ts: number;
  side: Side;
  region: RegionId;
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  intensity: number; // 1..10
  quality: Quality;
};

type Session = {
  ts: number;
  sideAtEnd: Side;
  markers: Marker[];
  insights: Insights;
  tags?: string[];
  note?: string;
};

type Insights = {
  count: number;
  avgIntensity: number;
  topRegions: { region: RegionId; count: number; avg: number }[];
  asymmetry: { left: number; right: number; bias: "left" | "right" | "balanced" };
  frontBack: { front: number; back: number; bias: Side | "balanced" };
  heatByRegion: Record<RegionId, { count: number; avg: number }>;
  histogram: number[]; // 10 bins (1..10)
};

/** ===== Geometry & palette ===== */
const BOARD_W = 320;
const BOARD_H = 640;

type Rect = { kind: "rect"; x: number; y: number; w: number; h: number; id: RegionId };
type Circle = { kind: "circle"; cx: number; cy: number; r: number; id: RegionId };
type Shape = Rect | Circle;

const regionColor: Record<RegionId, string> = {
  head: "#B3E5FC",
  neck: "#CFD8DC",
  shouldersL: "#FFCDD2",
  shouldersR: "#F8BBD0",
  chest: "#FFE0B2",
  upperBack: "#D1C4E9",
  armsL: "#C8E6C9",
  armsR: "#DCEDC8",
  forearmsL: "#E6EE9C",
  forearmsR: "#FFF59D",
  abdomen: "#FFECB3",
  lowerBack: "#B39DDB",
  hipsL: "#B2EBF2",
  hipsR: "#B2DFDB",
  thighsL: "#F0F4C3",
  thighsR: "#DCEDC8",
  calvesL: "#F8BBD0",
  calvesR: "#FFCCBC",
};

const regionLabel: Record<RegionId, string> = {
  head: "Head", neck: "Neck",
  shouldersL: "Left Shoulder", shouldersR: "Right Shoulder",
  chest: "Chest", upperBack: "Upper Back",
  armsL: "Left Arm", armsR: "Right Arm",
  forearmsL: "Left Forearm", forearmsR: "Right Forearm",
  abdomen: "Abdomen", lowerBack: "Lower Back",
  hipsL: "Left Hip", hipsR: "Right Hip",
  thighsL: "Left Thigh", thighsR: "Right Thigh",
  calvesL: "Left Calf", calvesR: "Right Calf",
};

const leftRegions = new Set<RegionId>(["shouldersL", "armsL", "forearmsL", "hipsL", "thighsL", "calvesL"]);
const rightRegions = new Set<RegionId>(["shouldersR", "armsR", "forearmsR", "hipsR", "thighsR", "calvesR"]);

const frontShapes: Shape[] = [
  { kind: "circle", cx: 160, cy: 62, r: 38, id: "head" },
  { kind: "rect", x: 125, y: 102, w: 70, h: 36, id: "neck" },
  { kind: "rect", x: 60, y: 138, w: 100, h: 32, id: "shouldersL" },
  { kind: "rect", x: 160, y: 138, w: 100, h: 32, id: "shouldersR" },
  { kind: "rect", x: 110, y: 176, w: 100, h: 82, id: "chest" },
  { kind: "rect", x: 50, y: 260, w: 60, h: 100, id: "armsL" },
  { kind: "rect", x: 210, y: 260, w: 60, h: 100, id: "armsR" },
  { kind: "rect", x: 50, y: 360, w: 60, h: 80, id: "forearmsL" },
  { kind: "rect", x: 210, y: 360, w: 60, h: 80, id: "forearmsR" },
  { kind: "rect", x: 110, y: 270, w: 100, h: 70, id: "abdomen" },
  { kind: "rect", x: 90, y: 340, w: 70, h: 60, id: "hipsL" },
  { kind: "rect", x: 160, y: 340, w: 70, h: 60, id: "hipsR" },
  { kind: "rect", x: 90, y: 400, w: 70, h: 110, id: "thighsL" },
  { kind: "rect", x: 160, y: 400, w: 70, h: 110, id: "thighsR" },
  { kind: "rect", x: 90, y: 510, w: 70, h: 100, id: "calvesL" },
  { kind: "rect", x: 160, y: 510, w: 70, h: 100, id: "calvesR" },
];

const backShapes: Shape[] = [
  { kind: "circle", cx: 160, cy: 62, r: 38, id: "head" },
  { kind: "rect", x: 125, y: 102, w: 70, h: 36, id: "neck" },
  { kind: "rect", x: 60, y: 138, w: 100, h: 32, id: "shouldersL" },
  { kind: "rect", x: 160, y: 138, w: 100, h: 32, id: "shouldersR" },
  { kind: "rect", x: 110, y: 176, w: 100, h: 82, id: "upperBack" },
  { kind: "rect", x: 50, y: 260, w: 60, h: 100, id: "armsL" },
  { kind: "rect", x: 210, y: 260, w: 60, h: 100, id: "armsR" },
  { kind: "rect", x: 50, y: 360, w: 60, h: 80, id: "forearmsL" },
  { kind: "rect", x: 210, y: 360, w: 60, h: 80, id: "forearmsR" },
  { kind: "rect", x: 110, y: 270, w: 100, h: 70, id: "lowerBack" },
  { kind: "rect", x: 90, y: 340, w: 70, h: 60, id: "hipsL" },
  { kind: "rect", x: 160, y: 340, w: 70, h: 60, id: "hipsR" },
  { kind: "rect", x: 90, y: 400, w: 70, h: 110, id: "thighsL" },
  { kind: "rect", x: 160, y: 400, w: 70, h: 110, id: "thighsR" },
  { kind: "rect", x: 90, y: 510, w: 70, h: 100, id: "calvesL" },
  { kind: "rect", x: 160, y: 510, w: 70, h: 100, id: "calvesR" },
];

/** ===== Component ===== */
export default function StressMapAdvanced() {
  const [side, setSide] = useState<Side>("front");
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selected, setSelected] = useState<Marker | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Session[]>([]);
  const [highlight, setHighlight] = useState<RegionId | null>(null);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Undo stack for marker arrays
  const undoStack = useRef<Marker[][]>([]);

  // load history once
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const raw = localStorage.getItem(LS_HIST); if (raw) setHistory(JSON.parse(raw)); } catch { }
  }, []);
  // save history
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(LS_HIST, JSON.stringify(history.slice(-60))); } catch { }
  }, [history]);

  // derived insights
  const insights = useMemo(() => computeInsights(markers), [markers]);
  const trend = useMemo(() => history.slice(-10).map(s => average(s.markers.map(m => m.intensity)) || 0), [history]);
  const lastSession = history[history.length - 1];
  const compareDelta = useMemo(() => {
    if (!lastSession) return null;
    const prev = lastSession.insights.avgIntensity || 0;
    const cur = insights.avgIntensity || 0;
    return +(cur - prev).toFixed(1);
  }, [lastSession, insights.avgIntensity]);

  const shapes = side === "front" ? frontShapes : backShapes;
  const boardRef = useRef<HTMLDivElement | null>(null);

  /** place marker by clicking region */
  const onBoardClick = (e: React.MouseEvent) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const xNorm = clamp(xPx / rect.width, 0, 1);
    const yNorm = clamp(yPx / rect.height, 0, 1);

    const region = hitTestRegion(side, xNorm, yNorm);
    if (!region) return;

    undoStack.current.push(markers);

    const newMarker: Marker = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      side, region, x: xNorm, y: yNorm,
      intensity: 6, quality: "tight"
    };
    setMarkers(prev => [...prev, newMarker]);
    setSelected(newMarker);
  };

  // Drag to reposition selected marker
  const dragging = useRef(false);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !selected || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const ny = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const region = hitTestRegion(selected.side, nx, ny);
    updateSelected({
      x: nx,
      y: ny,
      region: region ?? selected.region
    });
  }, [selected]);

  const startDrag = () => {
    if (!selected) return;
    undoStack.current.push(markers);
    dragging.current = true;
  };
  const endDrag = () => { dragging.current = false; };

  const updateSelected = (patch: Partial<Marker>) => {
    if (!selected) return;
    setMarkers(prev => prev.map(m => m.id === selected.id ? { ...m, ...patch } : m));
    setSelected(s => s ? { ...s, ...patch } : s);
  };

  const removeSelected = () => {
    if (!selected) return;
    setMarkers(prev => prev.filter(m => m.id !== selected.id));
    setSelected(null);
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setMarkers(prev);
    setSelected(null);
  };

  const addTag = () => {
    const t = newTag.trim();
    if (!t) return;
    setTags(a => Array.from(new Set([...a, t])));
    setNewTag("");
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ markers, insights, note, tags }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    tempDownload(url, "stress-session.json");
  };

  const exportPNG = async () => {
    // Simple SVG snapshot: take the region map with markers
    if (!boardRef.current) return;
    const svg = boardRef.current.querySelector("svg");
    if (!svg) return;
    const cloned = svg.cloneNode(true) as SVGSVGElement;

    // Add markers into cloned SVG
    markers.filter(m => m.side === side).forEach(m => {
      const cx = m.x * BOARD_W;
      const cy = m.y * BOARD_H;
      const r = 5 + m.intensity; // proportional radius
      const c = qualityColor(m.quality, 0.35);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const cir = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      cir.setAttribute("cx", String(cx));
      cir.setAttribute("cy", String(cy));
      cir.setAttribute("r", String(r));
      cir.setAttribute("fill", c);
      g.appendChild(cir);
      cloned.appendChild(g);
    });

    const serialized = new XMLSerializer().serializeToString(cloned);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = BOARD_W;
      canvas.height = BOARD_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        tempDownload(url, `stress-map-${side}.png`);
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };
    img.src = svgUrl;
  };

  const saveSession = async () => {
    if (!markers.length) return;
    setSaving(true);
    const session: Session = { ts: Date.now(), sideAtEnd: side, markers, insights, tags, note };

    try {
      localStorage.setItem(LS_LAST, JSON.stringify(session));
      setHistory(prev => [...prev, session]);
    } catch { }

    const human = sessionToText(session);
    await postJSON("/api/posts", {
      feature: "CALM",
      visibility: "PRIVATE",
      content: human,
      connectionScore: 0, creativityScore: 0,
    });
    await postJSON("/api/stats", {
      type: "stress_avg_intensity", category: "CALM", value: insights.avgIntensity,
    });

    setSaving(false);
    setMarkers([]); setSelected(null);
    setTags([]); setNote("");
  };

  // Gentle coach based on current state
  const coach = useMemo(() => {
    if (!markers.length) return "Tap a region to add a marker. Keep adjustments small and kind.";
    const parts: string[] = [];
    const biasLR = insights.asymmetry.bias;
    const biasFB = insights.frontBack.bias;
    if (biasLR !== "balanced") parts.push(`Notice ${biasLR}-side load; try 20s release there.`);
    if (biasFB !== "balanced") parts.push(`Front/back bias: support the ${biasFB}.`);
    if (insights.avgIntensity >= 7) parts.push("High intensity: go tiny range, slow tempo.");
    const top = insights.topRegions[0]?.region;
    if (top) parts.push(`Protocol suggestion: ${regionLabel[top]}.`);
    return parts.join(" ");
  }, [markers.length, insights]);

  // Autosave draft
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const draft: Session = { ts: Date.now(), sideAtEnd: side, markers, insights, tags, note };
        localStorage.setItem(LS_LAST, JSON.stringify(draft));
      } catch { }
    }, 15000);
    return () => clearInterval(id);
  }, [side, markers, insights, tags, note]);

  // Keyboard nudges for selected marker
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      const step = e.shiftKey ? 0.02 : 0.01;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete", "Backspace", "Escape"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowLeft") updateSelected({ x: clamp(selected.x - step, 0, 1) });
      if (e.key === "ArrowRight") updateSelected({ x: clamp(selected.x + step, 0, 1) });
      if (e.key === "ArrowUp") updateSelected({ y: clamp(selected.y - step, 0, 1) });
      if (e.key === "ArrowDown") updateSelected({ y: clamp(selected.y + step, 0, 1) });
      if (e.key === "Delete" || e.key === "Backspace") removeSelected();
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-200 to-rose-200 border border-white shadow-[0_10px_30px_-15px_rgba(0,0,0,0.3)]" />
          <h2 className="font-semibold text-lg">Stress Map</h2>
          <span className="px-2 py-1 rounded-full text-xs bg-neutral-900 text-white">calm</span>
        </div>
        <div className="flex items-center gap-2">
          <Segmented options={[{ key: "front", label: "Front" }, { key: "back", label: "Back" }]} value={side} onChange={(v) => setSide(v as Side)} />
          <Button onClick={saveSession} disabled={!markers.length || saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,560px)_minmax(300px,1fr)]">
        {/* Board card */}
        <Card minimal>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-neutral-600">{coach}</div>
            <div className="flex items-center gap-2">
              <IconButton title="Undo" onClick={undo}>?</IconButton>
              <IconButton title="Export PNG" onClick={exportPNG}>??</IconButton>
              <IconButton title="Export JSON" onClick={exportJSON}>??</IconButton>
            </div>
          </div>

          <div
            ref={boardRef}
            className="relative aspect-[1/2] w-full bg-white/80 backdrop-blur rounded-2xl border overflow-hidden"
            onClick={onBoardClick}
            onMouseMove={onMouseMove}
            onMouseDown={startDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            aria-label={`${side} body map`}
            style={{ backgroundImage: "radial-gradient(circle at 50% 0%, #f8fafc, #ffffff)" }}
          >
            {/* SVG region map with subtle fills */}
            <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="absolute inset-0 w-full h-full">
              <line x1={BOARD_W / 2} y1={20} x2={BOARD_W / 2} y2={BOARD_H - 20} stroke="#E5E7EB" strokeWidth="2" />
              <line x1={40} y1={340} x2={BOARD_W - 40} y2={340} stroke="#E5E7EB" strokeWidth="2" />
              {(side === "front" ? frontShapes : backShapes).map((s) => {
                const fill = regionColor[s.id];
                const isHL = highlight === s.id;
                const alpha = isHL ? 0.55 : 0.20;
                const stroke = isHL ? "#111" : "#C7C7C7";
                const strokeW = isHL ? 2 : 1.2;

                if (s.kind === "circle") {
                  return (
                    <g key={s.id}>
                      <circle cx={s.cx} cy={s.cy} r={s.r} fill={hexToRgba(fill, alpha)} stroke={stroke} strokeWidth={strokeW} />
                      <text x={s.cx} y={s.cy - s.r - 6} textAnchor="middle" fontSize="10" fill="#7A7A7A">{regionLabel[s.id]}</text>
                    </g>
                  );
                } else {
                  return (
                    <g key={s.id}>
                      <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={hexToRgba(fill, alpha)} stroke={stroke} strokeWidth={strokeW} rx={8} ry={8} />
                      <text x={s.x + s.w / 2} y={s.y - 5} textAnchor="middle" fontSize="10" fill="#7A7A7A">{regionLabel[s.id]}</text>
                    </g>
                  );
                }
              })}
            </svg>

            {/* Markers */}
            {markers.filter(m => m.side === side).map((m) => (
              <button
                key={m.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-black cursor-grab active:cursor-grabbing ${selected?.id === m.id ? "ring-2 ring-black scale-110" : "opacity-80 hover:opacity-100"}`}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(m); startDrag(); }}
                onMouseUp={endDrag}
                style={{
                  left: `${m.x * 100}%`,
                  top: `${m.y * 100}%`,
                  width: `${Math.max(10, 8 + m.intensity * 2)}px`,
                  height: `${Math.max(10, 8 + m.intensity * 2)}px`,
                  backgroundColor: qualityColor(m.quality, 0.3 + m.intensity * 0.04),
                  boxShadow: selected?.id === m.id ? "0 0 0 3px rgba(0,0,0,0.1)" : "none"
                }}
                aria-label={`${regionLabel[m.region]} ${m.quality} ${m.intensity}/10`}
                title={`${regionLabel[m.region]} • ${m.quality} • ${m.intensity}/10 - Drag to move`}
              />
            ))}

            {/* Floating micro-toolbar for selected */}
            {selected && selected.side === side && (
              <div
                className="absolute z-10 -translate-x-1/2 flex items-center gap-2 px-2 py-1 rounded-full bg-white/95 border shadow-lg backdrop-blur"
                style={{
                  left: `${selected.x * 100}%`,
                  top: `calc(${selected.y * 100}% + ${Math.max(16, 12 + selected.intensity)}px)`,
                  pointerEvents: "auto"
                }}
              >
                <IconButton title="Less intense" onClick={() => updateSelected({ intensity: clamp(selected.intensity - 1, 1, 10) })}>-</IconButton>
                <span className="text-xs text-neutral-700">{selected.intensity}/10</span>
                <IconButton title="More intense" onClick={() => updateSelected({ intensity: clamp(selected.intensity + 1, 1, 10) })}>+</IconButton>
                <IconButton title="Cycle quality" onClick={() => updateSelected({ quality: nextQuality(selected.quality) })}>??</IconButton>
                <IconButton title="Delete" onClick={removeSelected}>???</IconButton>
              </div>
            )}
          </div>
        </Card>

        {/* Right column */}
        <div className="grid gap-4">
          {/* Editor */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Marker editor</div>
              {selected && <button className="text-sm text-red-600 hover:underline" onClick={removeSelected}>remove</button>}
            </div>
            {!selected ? (
              <p className="text-sm text-neutral-600">
                Click a region to drop a marker. Drag to reposition. Use the floating toolbar or editor below to tweak intensity & quality.
              </p>
            ) : (
              <div className="grid gap-3 text-sm">
                <div className="text-neutral-700">{regionLabel[selected.region]}</div>
                <div className="flex items-center gap-2">
                  <span className="w-24">Intensity</span>
                  <input type="range" min={1} max={10} value={selected.intensity} onChange={(e) => updateSelected({ intensity: Number(e.target.value) })} className="w-full" />
                  <span className="w-10">{selected.intensity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24">Quality</span>
                  <div className="flex flex-wrap gap-2">
                    {(["tight", "ache", "sharp", "numb", "tingle"] as Quality[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => updateSelected({ quality: q })}
                        className={`px-2 py-1 rounded-full border ${selected.quality === q ? "bg-black text-white" : "bg-white"}`}
                        aria-pressed={selected.quality === q}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
                <RegionProtocol region={selected.region} quality={selected.quality} />
              </div>
            )}
          </Card>

          {/* Insights */}
          <Card>
            <div className="font-semibold mb-2">Insights</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Points" value={String(insights.count)} />
              <Stat label="Avg intensity" value={`${insights.avgIntensity.toFixed(1)}/10`} delta={compareDelta ?? undefined} />
            </div>

            {/* Symmetry + Bias dials */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Dial title="Left ? Right" left={insights.asymmetry.left} right={insights.asymmetry.right} bias={insights.asymmetry.bias} />
              <Dial title="Front ? Back" left={insights.frontBack.front} right={insights.frontBack.back} bias={insights.frontBack.bias} />
            </div>

            {/* Top regions */}
            <div className="mt-3 text-sm">
              Top regions:
              <div className="mt-1 flex flex-wrap gap-1">
                {insights.topRegions.slice(0, 4).map(t => (
                  <span key={t.region} className="px-2 py-1 rounded-full bg-neutral-100 text-neutral-800 border">
                    {regionLabel[t.region]} · {t.count} ({t.avg.toFixed(1)})
                  </span>
                ))}
                {insights.topRegions.length === 0 && <span className="text-neutral-500">—</span>}
              </div>
            </div>

            {/* Histogram */}
            <div className="mt-3">
              <div className="text-sm mb-1">Intensity distribution</div>
              <Histogram bins={insights.histogram} />
            </div>

            {/* Trend */}
            <div className="mt-3">
              <div className="text-sm mb-1">Avg intensity (last {Math.min(10, history.length)} sessions)</div>
              <Sparkline values={trend} />
            </div>
          </Card>

          {/* Notes & tags */}
          <Card>
            <div className="font-semibold mb-2">Notes & tags</div>
            <textarea
              className="w-full border rounded-xl px-3 py-2 h-20"
              placeholder="Optional note (context, triggers, wins)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <input
                className="border rounded-lg px-3 py-2 flex-1"
                placeholder="Add tag (e.g., morning, work-from-home)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
              <Button tone="ghost" onClick={addTag}>Add</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t} className="px-2 py-1 rounded-full bg-neutral-100 border text-xs">
                  {t}
                </span>
              ))}
              {tags.length === 0 && <span className="text-xs text-neutral-500">No tags yet</span>}
            </div>
          </Card>

          {/* Legend */}
          <Card>
            <div className="font-semibold mb-2">Legend</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {legendFor(side).map((id) => (
                <button
                  key={id}
                  onClick={() => setHighlight(h => h === id ? null : id)}
                  className={`flex items-center gap-2 px-2 py-1 rounded border ${highlight === id ? "bg-black text-white" : "bg-white"}`}
                  aria-pressed={highlight === id}
                  title={regionLabel[id]}
                >
                  <span className="inline-block w-4 h-4 rounded" style={{ background: regionColor[id] }} />
                  <span className="truncate">{regionLabel[id]}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">Tip: click to highlight a region on the map.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** ===== Region Protocols with timers ===== */
function RegionProtocol({ region, quality }: { region: RegionId; quality: Quality }) {
  const [phase, setPhase] = useState<"idle" | "hold" | "glide" | "move" | "done">("idle");
  const [t, setT] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const proto = useMemo(() => makeProtocol(region, quality), [region, quality]);
  const start = () => { setPhase("hold"); setT(proto.holdSec); };

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setT((s) => {
        if (s > 1) return s - 1;
        setPhase((p) => {
          if (p === "hold") { setT(proto.glideSec); return "glide"; }
          if (p === "glide") { setT(proto.moveSec); return "move"; }
          clearInterval(timer.current!); return "done";
        });
        return 0;
      });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [phase, proto.glideSec, proto.holdSec, proto.moveSec]);

  return (
    <div className="mt-2 rounded-xl border p-3 text-xs bg-white/70">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Quick release</div>
        {phase === "idle" ? <Button tone="ghost" onClick={start}>Start</Button>
          : phase === "done" ? <span className="text-green-700">Done ?</span>
            : <span className="text-neutral-600">{t}s</span>}
      </div>
      <ul className="list-disc ml-4 mt-2 space-y-1">
        <li><b>Isometric hold</b>: {proto.hold}</li>
        <li><b>Nerve/muscle glide</b>: {proto.glide}</li>
        <li><b>Range move</b>: {proto.move}</li>
      </ul>
      {phase !== "idle" && phase !== "done" && (
        <div className="mt-2 text-neutral-600">
          {phase === "hold" ? "Hold…" : phase === "glide" ? "Glide…" : "Move…"}
        </div>
      )}
    </div>
  );
}

function makeProtocol(region: RegionId, q: Quality) {
  const byRegion: Record<RegionId, { hold: string; glide: string; move: string }> = {
    head: { hold: "Jaw gentle clench 5s ×3", glide: "Eye saccades: left/right ×10", move: "Neck C-trace ×5" },
    neck: { hold: "Palm into forehead 10s", glide: "Chin glide in/out ×8", move: "Look L/R in slow arc ×6" },
    shouldersL: { hold: "Elbow to wall press 10s", glide: "Scap slide up/down ×8", move: "Arm circles small?big ×6" },
    shouldersR: { hold: "Elbow to wall press 10s", glide: "Scap slide up/down ×8", move: "Arm circles small?big ×6" },
    chest: { hold: "Hands push together 10s", glide: "Doorway pec micro-glide ×8", move: "Reach across body ×6" },
    upperBack: { hold: "Forearms press 10s", glide: "Scap glide L/R ×8", move: "Cat-camel small arc ×8" },
    armsL: { hold: "Squeeze fist 5s", glide: "Wrist flex-extend ×8", move: "Reach-and-open ×6" },
    armsR: { hold: "Squeeze fist 5s", glide: "Wrist flex-extend ×8", move: "Reach-and-open ×6" },
    forearmsL: { hold: "Palm vs palm 8s", glide: "Pronate/supinate ×10", move: "Shake loose ×8" },
    forearmsR: { hold: "Palm vs palm 8s", glide: "Pronate/supinate ×10", move: "Shake loose ×8" },
    abdomen: { hold: "Light brace 5s", glide: "Pelvic tilt small ×8", move: "Side reach arc ×6" },
    lowerBack: { hold: "Hip hinge set 8s", glide: "Pelvic tilts ×10", move: "Alt knee-to-chest ×8" },
    hipsL: { hold: "Glute squeeze 8s", glide: "Figure-4 micro-glide ×8", move: "Step-back reach ×6" },
    hipsR: { hold: "Glute squeeze 8s", glide: "Figure-4 micro-glide ×8", move: "Step-back reach ×6" },
    thighsL: { hold: "Quad set 8s", glide: "Heel slides ×8", move: "Mini squat ×8" },
    thighsR: { hold: "Quad set 8s", glide: "Heel slides ×8", move: "Mini squat ×8" },
    calvesL: { hold: "Toe press 8s", glide: "Ankle pumps ×12", move: "Calf roll-through ×8" },
    calvesR: { hold: "Toe press 8s", glide: "Ankle pumps ×12", move: "Calf roll-through ×8" },
  };
  const base = byRegion[region];
  const mod = (s: string) => {
    switch (q) {
      case "sharp": return s + " (tiny range)";
      case "numb": return s + " (slow tempo)";
      case "tingle": return s + " (short reps)";
      default: return s;
    }
  };
  return {
    hold: mod(base.hold),
    glide: mod(base.glide),
    move: mod(base.move),
    holdSec: 12, glideSec: 20, moveSec: 20,
  };
}

/** ===== Legend & charts ===== */
function legendFor(side: Side): RegionId[] {
  return side === "front"
    ? ["head", "neck", "shouldersL", "shouldersR", "chest", "armsL", "armsR", "forearmsL", "forearmsR", "abdomen", "hipsL", "hipsR", "thighsL", "thighsR", "calvesL", "calvesR"]
    : ["head", "neck", "shouldersL", "shouldersR", "upperBack", "armsL", "armsR", "forearmsL", "forearmsR", "lowerBack", "hipsL", "hipsR", "thighsL", "thighsR", "calvesL", "calvesR"];
}

function Sparkline({ values }: { values: number[] }) {
  const w = 220, h = 40, pad = 4;
  if (!values.length) return <div className="text-xs text-neutral-500">No history yet.</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-6, max - min);
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[240px] h-10">
      <polyline points={pts} fill="none" stroke="#111" strokeWidth="2" />
    </svg>
  );
}

function Histogram({ bins }: { bins: number[] }) {
  const max = Math.max(1, ...bins);
  return (
    <div className="flex items-end gap-1 h-16">
      {bins.map((v, i) => {
        const h = Math.round((v / max) * 100);
        return (
          <div key={i} className="w-3 bg-neutral-200 rounded-t" style={{ height: `${h}%` }} title={`Intensity ${i + 1}: ${v}`} />
        );
      })}
    </div>
  );
}

function Dial({ title, left, right, bias }: { title: string; left: number; right: number; bias: string }) {
  const total = Math.max(1, left + right);
  const pctLeft = Math.round((left / total) * 100);
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-neutral-600 mb-2">{title}</div>
      <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-100">
        <div className="h-2 bg-neutral-900" style={{ width: `${pctLeft}%` }} />
      </div>
      <div className="mt-1 text-xs text-neutral-600">{left} / {right} — bias: <span className="capitalize">{bias}</span></div>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  const color = delta === undefined ? "" : delta > 0 ? "text-rose-600" : delta < 0 ? "text-green-600" : "text-neutral-600";
  const arrow = delta === undefined ? "" : delta > 0 ? "?" : delta < 0 ? "?" : "•";
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-neutral-600">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {delta !== undefined && (
        <div className={`text-xs ${color}`}>{arrow} {Math.abs(delta)} vs last</div>
      )}
    </div>
  );
}

/** ===== UI primitives ===== */
function Card({ children, minimal }: { children: React.ReactNode; minimal?: boolean }) {
  return (
    <div className={`relative rounded-2xl border p-4 ${minimal ? "bg-white/70 backdrop-blur" : "bg-white"} shadow-[0_6px_30px_-12px_rgba(0,0,0,0.12)]`}>
      {children}
    </div>
  );
}
function Button({ children, onClick, disabled, tone = "primary" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "primary" | "ghost" }) {
  const base = "px-4 py-2 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50";
  const cls = tone === "primary"
    ? "bg-neutral-900 text-white hover:shadow"
    : "bg-white border text-neutral-900 hover:border-neutral-300";
  return <button className={`${base} ${cls}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button title={title} onClick={onClick} className="w-8 h-8 grid place-items-center rounded-full border bg-white hover:bg-neutral-50 text-sm">
      {children}
    </button>
  );
}
function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; }) {
  return (
    <div className="flex rounded-full overflow-hidden border">
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} className={`px-3 py-1 text-sm ${value === o.key ? "bg-neutral-900 text-white" : "bg-white"}`} aria-pressed={value === o.key}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** ===== Logic helpers ===== */
function LegendFor(side: Side): RegionId[] {
  return side === "front"
    ? ["head", "neck", "shouldersL", "shouldersR", "chest", "armsL", "armsR", "forearmsL", "forearmsR", "abdomen", "hipsL", "hipsR", "thighsL", "thighsR", "calvesL", "calvesR"]
    : ["head", "neck", "shouldersL", "shouldersR", "upperBack", "armsL", "armsR", "forearmsL", "forearmsR", "lowerBack", "hipsL", "hipsR", "thighsL", "thighsR", "calvesL", "calvesR"];
}
function hitTestRegion(side: Side, xNorm: number, yNorm: number): RegionId | null {
  // Clamp normalized coordinates to valid range
  const clampedX = Math.max(0, Math.min(1, xNorm));
  const clampedY = Math.max(0, Math.min(1, yNorm));

  const x = clampedX * BOARD_W;
  const y = clampedY * BOARD_H;
  const shapes = side === "front" ? frontShapes : backShapes;

  // Check in reverse order so topmost shapes are detected first
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (s.kind === "circle") {
      const dx = x - s.cx, dy = y - s.cy;
      if (dx * dx + dy * dy <= s.r * s.r) return s.id;
    } else {
      // Add small tolerance for rect boundaries (1px)
      const tolerance = 1;
      if (x >= s.x - tolerance && x <= s.x + s.w + tolerance &&
        y >= s.y - tolerance && y <= s.y + s.h + tolerance) {
        return s.id;
      }
    }
  }
  return null;
}

function computeInsights(markers: Marker[]): Insights {
  const count = markers.length;
  const avgIntensity = average(markers.map((m) => m.intensity)) || 0;
  const regionMap = new Map<RegionId, { count: number; sum: number }>();
  let left = 0, right = 0, front = 0, back = 0;
  const histogram = new Array(10).fill(0) as number[];

  for (const m of markers) {
    const r = regionMap.get(m.region) || { count: 0, sum: 0 };
    r.count += 1; r.sum += m.intensity;
    regionMap.set(m.region, r);

    if (leftRegions.has(m.region)) left += 1;
    if (rightRegions.has(m.region)) right += 1;
    if (m.side === "front") front += 1; else back += 1;

    const idx = Math.min(9, Math.max(0, Math.round(m.intensity - 1)));
    histogram[idx] += 1;
  }

  const topRegions = Array.from(regionMap.entries())
    .map(([region, { count, sum }]) => ({ region, count, avg: sum / count }))
    .sort((a, b) => b.count - a.count);

  const heatByRegion: Record<RegionId, { count: number; avg: number }> = {} as any;
  for (const [region, v] of regionMap.entries()) {
    heatByRegion[region] = { count: v.count, avg: v.sum / v.count };
  }

  const biasLR = left === right ? "balanced" : left > right ? "left" : "right";
  const biasFB = front === back ? "balanced" : front > back ? "front" : "back";

  return {
    count,
    avgIntensity,
    topRegions,
    asymmetry: { left, right, bias: biasLR as any },
    frontBack: { front, back, bias: biasFB as any },
    heatByRegion,
    histogram,
  };
}

function sessionToText(s: Session) {
  const i = s.insights;
  const lines = [
    `Stress Map GÇö ${new Date(s.ts).toLocaleString()}`,
    `Points: ${i.count} -+ Avg intensity: ${i.avgIntensity.toFixed(1)}/10`,
    `Left vs Right: ${i.asymmetry.left}L / ${i.asymmetry.right}R (${i.asymmetry.bias})`,
    `Front vs Back: ${i.frontBack.front}F / ${i.frontBack.back}B (${i.frontBack.bias})`,
    `Top regions: ${i.topRegions.slice(0, 5).map(t => `${regionLabel[t.region]}(${t.count})`).join(", ") || "GÇö"}`,
    s.tags?.length ? `Tags: ${s.tags.join(", ")}` : "",
    s.note ? `Note: ${s.note}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function qualityColor(q: Quality, alpha = 0.3) {
  const a = Math.max(0.1, Math.min(0.9, alpha));
  switch (q) {
    case "tight": return `rgba(33, 150, 243, ${a})`;
    case "ache": return `rgba(255, 152, 0, ${a})`;
    case "sharp": return `rgba(244, 67, 54, ${a})`;
    case "numb": return `rgba(156, 39, 176, ${a})`;
    case "tingle": return `rgba(76, 175, 80, ${a})`;
  }
}
function hexToRgba(hex: string, alpha = 0.3) {
  const v = hex.replace("#", "");
  const bigint = parseInt(v, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function nextQuality(q: Quality): Quality {
  const arr: Quality[] = ["tight", "ache", "sharp", "numb", "tingle"];
  const idx = arr.indexOf(q);
  return arr[(idx + 1) % arr.length];
}
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function average(arr: number[]) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function tempDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a);
  a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
}
