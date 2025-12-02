"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Image as ImageIcon, FileJson, Sliders, X, Plus, Minus } from "lucide-react";
import StarfieldBackground from "../LandingPage/StarfieldBackground";

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
    async function loadHistory() {
      try {
        const res = await fetch("/api/hopin/history");
        if (res.ok) {
          const data = await res.json();
          if (data.sessions) setHistory(data.sessions);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    loadHistory();
  }, []);

  // save history
  const saveSession = async () => {
    if (!markers.length) return;
    setSaving(true);
    const session: Session = { ts: Date.now(), sideAtEnd: side, markers, insights, tags, note };

    try {
      // Optimistic update
      setHistory(prev => [...prev, session]);

      // Save to API
      await postJSON("/api/hopin/save", session);
    } catch (e) {
      console.error("Failed to save session", e);
    }

    setSaving(false);
    setMarkers([]); setSelected(null);
    setTags([]); setNote("");
  };
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
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans selection:bg-white/20">
      <StarfieldBackground />

      {/* Main Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col md:flex-row p-4 gap-4">

        {/* Left Panel: Controls & Stats */}
        <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          <Card minimal>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-light tracking-tight">Hopin Map</h1>
              <div className="flex gap-1">
                <Segmented
                  options={[{ key: "front", label: "Front" }, { key: "back", label: "Back" }]}
                  value={side}
                  onChange={setSide}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Current Session</div>
                <div className="text-3xl font-light">{insights.count} <span className="text-sm text-neutral-500">points</span></div>
                <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${(insights.avgIntensity / 10) * 100}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-xs text-neutral-500">
                  <span>Intensity</span>
                  <span>{insights.avgIntensity.toFixed(1)}/10</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Stat label="Left/Right" value={`${insights.asymmetry.left}/${insights.asymmetry.right}`} />
                <Stat label="Front/Back" value={`${insights.frontBack.front}/${insights.frontBack.back}`} />
              </div>
            </div>
          </Card>

          {/* Selected Marker Detail */}
          {selected && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card minimal>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-neutral-400">Selected Region</div>
                    <div className="text-xl font-light">{regionLabel[selected.region]}</div>
                  </div>
                  <IconButton onClick={removeSelected}><X className="w-4 h-4" /></IconButton>
                </div>

                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1">
                    <div className="text-xs text-neutral-500 mb-1">Intensity</div>
                    <div className="flex items-center gap-2">
                      <IconButton onClick={() => updateSelected({ intensity: clamp(selected.intensity - 1, 1, 10) })}><Minus className="w-3 h-3" /></IconButton>
                      <span className="text-xl font-light w-8 text-center">{selected.intensity}</span>
                      <IconButton onClick={() => updateSelected({ intensity: clamp(selected.intensity + 1, 1, 10) })}><Plus className="w-3 h-3" /></IconButton>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-neutral-500 mb-1">Quality</div>
                    <button
                      onClick={() => updateSelected({ quality: nextQuality(selected.quality) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm capitalize text-left flex justify-between items-center"
                    >
                      {selected.quality}
                      <Sliders className="w-3 h-3 opacity-50" />
                    </button>
                  </div>
                </div>

                <RegionProtocol region={selected.region} quality={selected.quality} />
              </Card>
            </div>
          )}
        </div>

        {/* Center: The Map */}
        <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm shadow-2xl">
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <IconButton title="Undo" onClick={undo}><RotateCcw className="w-4 h-4" /></IconButton>
            <IconButton title="Export PNG" onClick={exportPNG}><ImageIcon className="w-4 h-4" /></IconButton>
            <IconButton title="Export JSON" onClick={exportJSON}><FileJson className="w-4 h-4" /></IconButton>
          </div>

          <div
            ref={boardRef}
            className="w-full h-full relative cursor-crosshair"
            onPointerDown={() => { }} // Handled by onClick for now, or add pointer events
            onClick={onBoardClick}
            onMouseMove={onMouseMove}
            onMouseDown={startDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="absolute inset-0 w-full h-full pointer-events-none">
              {(side === "front" ? frontShapes : backShapes).map((s) => {
                const isHL = highlight === s.id;
                return s.kind === "circle" ? (
                  <circle
                    key={s.id} cx={s.cx} cy={s.cy} r={s.r}
                    fill={isHL ? "rgba(255,255,255,0.1)" : "transparent"}
                    stroke={isHL ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)"}
                    strokeWidth={1}
                  />
                ) : (
                  <rect
                    key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} rx={20}
                    fill={isHL ? "rgba(255,255,255,0.1)" : "transparent"}
                    stroke={isHL ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)"}
                    strokeWidth={1}
                  />
                );
              })}
              {/* Labels */}
              {(side === "front" ? frontShapes : backShapes).map((s) => {
                const cx = s.kind === "circle" ? s.cx : s.x + s.w / 2;
                const cy = s.kind === "circle" ? s.cy : s.y + s.h / 2;
                return (
                  <text key={`l-${s.id}`} x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    className="text-[10px] fill-white/20 pointer-events-none select-none uppercase tracking-widest font-light"
                  >
                    {regionLabel[s.id]}
                  </text>
                );
              })}
            </svg>

            {/* Markers */}
            {markers.filter(m => m.side === side).map((m) => (
              <button
                key={m.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group outline-none cursor-grab active:cursor-grabbing`}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(m); startDrag(); }}
                onMouseUp={endDrag}
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
              >
                <div className={`relative rounded-full transition-all duration-300 ${selected?.id === m.id ? "scale-125" : "group-hover:scale-110"}`}
                  style={{
                    width: `${Math.max(16, 12 + m.intensity * 2)}px`,
                    height: `${Math.max(16, 12 + m.intensity * 2)}px`,
                  }}
                >
                  {selected?.id === m.id && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-white/30" />
                  )}
                  <div className="absolute inset-0 rounded-full border border-white/80 bg-black/50 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                  <div className="absolute inset-[25%] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ opacity: 0.5 + m.intensity * 0.05 }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Legend & History */}
        <div className="w-full md:w-64 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          <Card minimal>
            <div className="text-xs uppercase tracking-wider text-neutral-400 mb-3">Regions</div>
            <div className="flex flex-wrap gap-2">
              {LegendFor(side).map((id) => (
                <button
                  key={id}
                  onClick={() => setHighlight(h => h === id ? null : id)}
                  className={`px-2 py-1 rounded text-xs border transition-all ${highlight === id ? "bg-white text-black border-white" : "bg-transparent text-neutral-400 border-white/10 hover:border-white/30"}`}
                >
                  {regionLabel[id]}
                </button>
              ))}
            </div>
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
    <div className="mt-2 rounded-xl border border-white/10 p-3 text-xs bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Quick release</div>
        {phase === "idle" ? <Button tone="ghost" onClick={start}>Start</Button>
          : phase === "done" ? <span className="text-green-400">Done ✓</span>
            : <span className="text-neutral-400">{t}s</span>}
      </div>
      <ul className="list-disc ml-4 mt-2 space-y-1 text-neutral-300">
        <li><b>Isometric hold</b>: {proto.hold}</li>
        <li><b>Nerve/muscle glide</b>: {proto.glide}</li>
        <li><b>Range move</b>: {proto.move}</li>
      </ul>
      {phase !== "idle" && phase !== "done" && (
        <div className="mt-2 text-neutral-400">
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
    shouldersL: { hold: "Elbow to wall press 10s", glide: "Scap slide up/down ×8", move: "Arm circles small→big ×6" },
    shouldersR: { hold: "Elbow to wall press 10s", glide: "Scap slide up/down ×8", move: "Arm circles small→big ×6" },
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

function sessionToText(s: Session) {
  const i = s.insights;
  const lines = [
    `Stress Map — ${new Date(s.ts).toLocaleString()}`,
    `Points: ${i.count} · Avg intensity: ${i.avgIntensity.toFixed(1)}/10`,
    `Left vs Right: ${i.asymmetry.left}L / ${i.asymmetry.right}R (${i.asymmetry.bias})`,
    `Front vs Back: ${i.frontBack.front}F / ${i.frontBack.back}B (${i.frontBack.bias})`,
    `Top regions: ${i.topRegions.slice(0, 5).map(t => `${regionLabel[t.region]}(${t.count})`).join(", ") || "—"}`,
    s.tags?.length ? `Tags: ${s.tags.join(", ")}` : "",
    s.note ? `Note: ${s.note}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function qualityColor(q: Quality, alpha = 0.3) {
  // Monochrome: all white/gray
  return `rgba(255, 255, 255, ${alpha})`;
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

/** ===== UI primitives ===== */
function Card({ children, minimal }: { children: React.ReactNode; minimal?: boolean }) {
  return (
    <div className={`relative rounded-3xl border p-6 transition-all ${minimal
      ? "bg-black/40 backdrop-blur-xl border-white/10"
      : "bg-black/60 border-white/10"
      } shadow-2xl text-white`}>
      {children}
    </div>
  );
}
function Button({ children, onClick, disabled, tone = "primary" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "primary" | "ghost" }) {
  const base = "px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const cls = tone === "primary"
    ? "bg-white text-black hover:bg-neutral-200"
    : "bg-transparent border border-white/20 text-white hover:bg-white/10";
  return <button className={`${base} ${cls}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button title={title} onClick={onClick} className="w-8 h-8 grid place-items-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/20 transition-colors">
      {children}
    </button>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; }) {
  return (
    <div className="flex rounded-full overflow-hidden border border-white/20">
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} className={`px-3 py-1 text-sm transition-colors ${value === o.key ? "bg-white text-black" : "bg-transparent text-white hover:bg-white/10"}`} aria-pressed={value === o.key}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5 backdrop-blur-sm">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-lg font-light">{value}</div>
    </div>
  );
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
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 bg-neutral-50/50 dark:bg-neutral-800/50">
      <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">{title}</div>
      <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700">
        <div className="h-2 bg-neutral-900" style={{ width: `${pctLeft}%` }} />
      </div>
      <div className="mt-1 text-xs text-neutral-600">{left} / {right} — bias: <span className="capitalize">{bias}</span></div>
    </div>
  );
}
