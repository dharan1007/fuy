"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { RotateCcw, Trash2, ChevronLeft, ChevronRight, Share2, Activity, Save, History, Terminal, X } from "lucide-react";
import { toPng } from 'html-to-image';

/** ===== Storage + API ===== */
const LS_LAST = "fuy.stressmap.diagnostic.v1";

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
type BodyGender = "male" | "female";
type Quality = "tight" | "ache" | "sharp" | "numb" | "tingle" | "burn";

type Marker = {
    id: string;
    ts: number;
    side: Side;
    regionId: string; // "shoulders"
    regionLabel: string; // "Left Shoulder"
    x: number; // 0..1 normalized
    y: number; // 0..1 normalized
    intensity: number; // 1..10
    quality: Quality;
    note?: string;
};

/** ===== Geometry & Palette ===== */
const BOARD_W = 320;
const BOARD_H = 640;

type ShapeKind = "circle" | "rect";

interface BodyShape {
    id: string; // "shoulders"
    label: string; // "Left Shoulder"
    kind: ShapeKind;
    x?: number; y?: number; w?: number; h?: number; rx?: number; // Rect
    cx?: number; cy?: number; r?: number; // Circle
    rotation?: number;
}

// Strict Diagnostic Palette
const PALETTE = {
    bg: "#000000",
    fg: "#FFFFFF",
    alert: "#FF0000",
    dim: "#333333",
    grid: "#111111"
};

/** ===== Suggestions Database ===== */
interface Suggestion {
    name: string;
    desc: string;
}

const suggestions: Record<string, Suggestion[]> = {
    head: [
        { name: "CRANIAL DECOMPRESSION", desc: "Gentle temple massage. 30s circular motion." },
        { name: "OPTIC RESET", desc: "Close eyes. Palming technique for 60s." }
    ],
    neck: [
        { name: "CERVICAL REALIGNMENT", desc: "Chin tucks. Retract head horizontally. Hold 5s. Repeat x10." },
        { name: "TRAPEZIUS RELEASE", desc: "Ear to shoulder stretch. Apply manual overpressure gently." }
    ],
    shoulders: [
        { name: "SCAPULAR RETRACTION", desc: "Squeeze shoulder blades together. Hold 5s. Release. x15." },
        { name: "JOINT MOBILIZATION", desc: "Full range arm circles. 10 CW, 10 CCW." }
    ],
    chest: [
        { name: "PECTORAL OPENER", desc: "Doorway stretch. Arms at 90deg. Step through. Hold 30s." },
        { name: "THORACIC EXTENSION", desc: "Foam roll upper back or chair extension." }
    ],
    upperBack: [
        { name: "CAT-COW PROTOCOL", desc: "Spinal flexion/extension cycle. 20 reps." },
        { name: "T-SPINE ROTATION", desc: "Quadruped position. Rotate arm to ceiling. Follow with eyes." }
    ],
    lowerBack: [
        { name: "LUMBAR DECOMPRESSION", desc: "Child's pose. Knees wide. Reach forward. Breathe into back." },
        { name: "PELVIC TILTS", desc: "Supine. Flatten back to floor. Hold 3s. Release." }
    ],
    abdomen: [
        { name: "DIAPHRAGMATIC RESET", desc: "Deep belly breathing. 4s in, 4s hold, 4s out." },
        { name: "COBRA MANEUVER", desc: "Prone press-up. KEEP HIPS DOWN. Gentle extension." }
    ],
    hips: [
        { name: "HIP FLEXOR RELEASE", desc: "Half-kneeling lunch. Squeeze glute of trailing leg." },
        { name: "PIRIFORMIS STRETCH", desc: "Figure-4 stretch. Supine or seated." }
    ],
    thighs: [
        { name: "QUADRICEPS LENGTHENING", desc: "Standing heel to glute. Keep knees contiguous." },
        { name: "HAMSTRING FLOSSING", desc: "Supine leg raise with strap. Dynamic active stretch." }
    ],
    calves: [
        { name: "GASTROCNEMIUS STRETCH", desc: "Wall push. Back leg straight. Heel down." },
        { name: "SOLEUS ISOLATION", desc: "Wall push. Back leg bent. Heel down." }
    ],
    arms: [
        { name: "TRICEPS RELEASE", desc: "Overhead elbow pull. Keep neck neutral." },
        { name: "BICEPS EXTENSION", desc: "Wall arm extension. Palm flat against wall. Rotate away." }
    ],
    forearms: [
        { name: "WRIST EXTENSOR STRETCH", desc: "Elbow straight. Palm down. Pull fingers towards underside." },
        { name: "WRIST FLEXOR STRETCH", desc: "Elbow straight. Palm up. Pull fingers towards floor." }
    ],
    hands: [
        { name: "TENDON GLIDES", desc: "Open palm -> Hook fist -> Full fist -> Tabletop." },
        { name: "OPPOSITION DRILLS", desc: "Touch thumb to each fingertip rapidly." }
    ],
    feet: [
        { name: "PLANTAR FASCIA ROLL", desc: "Roll foot over ball/bottle for 60s." },
        { name: "TOE ARTICULATION", desc: "Splay toes wide. Hold. Curl toes allowed." }
    ]
};

/** ===== Shape Generation ===== */
const createHumanShapes = (gender: BodyGender, side: Side): BodyShape[] => {
    const isMale = gender === "male";
    const shoulderW = isMale ? 120 : 90;
    const hipW = isMale ? 75 : 100;
    const chestW = isMale ? 110 : 90;
    const waistW = isMale ? 85 : 70;
    const CX = BOARD_W / 2;

    const common: BodyShape[] = [
        { kind: "rect", id: "neck", label: "Neck", x: CX - 15, y: 75, w: 30, h: 40, rx: 0 },
        { kind: "circle", id: "head", label: "Head", cx: CX, cy: 50, r: 35 },
    ];

    const shoulders: BodyShape[] = [
        { kind: "rect", id: "shoulders", label: "L-Shoulder", x: CX - shoulderW / 2, y: 100, w: 40, h: 40, rx: 4 },
        { kind: "rect", id: "shoulders", label: "R-Shoulder", x: CX + shoulderW / 2 - 40, y: 100, w: 40, h: 40, rx: 4 },
    ];

    const startY = 140;
    const torso: BodyShape[] = side === "front" ? [
        { kind: "rect", id: "chest", label: "Chest", x: CX - chestW / 2, y: startY, w: chestW, h: 60, rx: 4 },
        { kind: "rect", id: "abdomen", label: "Abdomen", x: CX - waistW / 2, y: startY + 65, w: waistW, h: 65, rx: 4 },
        { kind: "rect", id: "hips", label: "Pelvis", x: CX - hipW / 2, y: startY + 135, w: hipW, h: 50, rx: 4 },
    ] : [
        { kind: "rect", id: "upperBack", label: "Upper Back", x: CX - chestW / 2, y: startY, w: chestW, h: 80, rx: 4 },
        { kind: "rect", id: "lowerBack", label: "Lower Back", x: CX - waistW / 2, y: startY + 85, w: waistW, h: 45, rx: 4 },
        { kind: "rect", id: "hips", label: "Hips", x: CX - hipW / 2, y: startY + 135, w: hipW, h: 50, rx: 4 },
    ];

    const armW = 32;
    const armXOffset = isMale ? 10 : 5;
    const armX_L = CX - shoulderW / 2 - armW + armXOffset;
    const armX_R = CX + shoulderW / 2 - armXOffset;

    const arms: BodyShape[] = [
        { kind: "rect", id: "arms", label: "L-Arm", x: armX_L - 10, y: 125, w: armW, h: 90, rx: 4, rotation: 5 },
        { kind: "rect", id: "arms", label: "R-Arm", x: armX_R + 10, y: 125, w: armW, h: 90, rx: 4, rotation: -5 },
        { kind: "rect", id: "forearms", label: "L-Forearm", x: armX_L - 25, y: 210, w: 30, h: 80, rx: 4, rotation: 8 },
        { kind: "rect", id: "forearms", label: "R-Forearm", x: armX_R + 25, y: 210, w: 30, h: 80, rx: 4, rotation: -8 },
        { kind: "circle", id: "hands", label: "L-Hand", cx: armX_L - 28, cy: 305, r: 16 },
        { kind: "circle", id: "hands", label: "R-Hand", cx: armX_R + 45, cy: 305, r: 16 },
    ];

    const legW = 38;
    const legX_L = CX - hipW / 2 - (isMale ? 10 : 0);
    const legX_R = CX + hipW / 2 - legW + (isMale ? 10 : 0);

    const legs: BodyShape[] = [
        { kind: "rect", id: "thighs", label: "L-Thigh", x: legX_L, y: 325, w: legW, h: 100, rx: 4, rotation: 3 },
        { kind: "rect", id: "thighs", label: "R-Thigh", x: legX_R, y: 325, w: legW, h: 100, rx: 4, rotation: -3 },
        { kind: "rect", id: "calves", label: "L-Calf", x: legX_L + 2, y: 420, w: 34, h: 90, rx: 4, rotation: 1 },
        { kind: "rect", id: "calves", label: "R-Calf", x: legX_R + 2, y: 420, w: 34, h: 90, rx: 4, rotation: -1 },
        { kind: "rect", id: "feet", label: "L-Foot", x: legX_L - 8, y: 505, w: 40, h: 20, rx: 2 },
        { kind: "rect", id: "feet", label: "R-Foot", x: legX_R + 5, y: 505, w: 40, h: 20, rx: 2 },
    ];

    return [...common, ...shoulders, ...torso, ...arms, ...legs];
};

/** ===== Component ===== */
export default function StressMapSection() {
    const [side, setSide] = useState<Side>("front");
    const [gender, setGender] = useState<BodyGender>("male");
    const [markers, setMarkers] = useState<Marker[]>([]);
    const [history, setHistory] = useState<any[]>([]); // API history
    const [selected, setSelected] = useState<Marker | null>(null);
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
    const [showLogbook, setShowLogbook] = useState(false);

    // For Sharing
    const reportRef = useRef<HTMLDivElement>(null);

    const shapes = useMemo(() => createHumanShapes(gender, side), [gender, side]);
    const boardRef = useRef<HTMLDivElement | null>(null);

    // Initial Load & Logbook Fetch
    const fetchHistory = useCallback(async () => {
        const res = await fetch("/api/grounding/stress-map");
        if (res.ok) {
            const data = await res.json();
            setHistory(data);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
        const saved = localStorage.getItem(LS_LAST);
        if (saved) {
            try { setMarkers(JSON.parse(saved)); } catch { }
        }
    }, [fetchHistory]);

    useEffect(() => {
        localStorage.setItem(LS_LAST, JSON.stringify(markers));
    }, [markers]);


    const getShapeAt = (x: number, y: number) => {
        for (let i = shapes.length - 1; i >= 0; i--) {
            const s = shapes[i];
            if (s.kind === "circle") {
                const dx = x - (s.cx || 0);
                const dy = y - (s.cy || 0);
                if (dx * dx + dy * dy <= (s.r || 0) ** 2) return s;
            } else {
                if (x >= (s.x || 0) && x <= (s.x || 0) + (s.w || 0) && y >= (s.y || 0) && y <= (s.y || 0) + (s.h || 0)) return s;
            }
        }
        return null;
    };

    const handleBoardClick = (e: React.MouseEvent) => {
        if (!boardRef.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        const scaleX = BOARD_W / rect.width;
        const scaleY = BOARD_H / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        const hit = getShapeAt(clickX, clickY);
        if (hit) {
            const newMarker: Marker = {
                id: crypto.randomUUID(),
                ts: Date.now(),
                side,
                regionId: hit.id,
                regionLabel: hit.label,
                x: clickX / BOARD_W,
                y: clickY / BOARD_H,
                intensity: 5,
                quality: "ache",
                note: ""
            };
            setMarkers(prev => [...prev, newMarker]);
            setSelected(newMarker);
        } else {
            setSelected(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!boardRef.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        const scaleX = BOARD_W / rect.width;
        const scaleY = BOARD_H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        const hit = getShapeAt(mx, my);
        setHoveredRegion(hit ? hit.label.toUpperCase() : null);
    };

    const updateSelected = (patch: Partial<Marker>) => {
        if (!selected) return;
        const updated = markers.map(m => m.id === selected.id ? { ...m, ...patch } : m);
        setMarkers(updated);
        setSelected(s => s ? { ...s, ...patch } : s);
    };

    const removeSelected = () => {
        if (!selected) return;
        setMarkers(markers.filter(m => m.id !== selected.id));
        setSelected(null);
    };

    const saveSession = async () => {
        // Flat list for API, but locally markers is our state
        const entries = markers.map(m => ({
            region: m.regionId, // API expects "shoulders" not "L-Shoulder" for grouping generally, or maybe we just send raw. 
            // Actually API schema is flexible string. Let's send ID to keep it clean.
            x: m.x, y: m.y, z: 0,
            intensity: m.intensity,
            quality: m.quality,
            side: m.side,
            note: m.note
        }));
        await postJSON("/api/grounding/stress-map", { entries });
        fetchHistory();
        alert("DIAGNOSTIC DATA UPLOADED.");
    };

    const generateReport = useCallback(() => {
        if (reportRef.current) {
            toPng(reportRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = `system-diagnostic-${Date.now()}.png`;
                    link.href = dataUrl;
                    link.click();
                })
                .catch((err) => {
                    console.error('oops, something went wrong!', err);
                });
        }
    }, [reportRef]);

    // Renders the specific marker visuals
    const renderMarkerVisual = (m: Marker, isSelected: boolean) => {
        const style = { left: `${m.x * 100}%`, top: `${m.y * 100}%` };
        const commonClass = cn(
            "absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center transition-all cursor-pointer",
            isSelected ? "z-30 scale-125" : "z-20 hover:scale-110"
        );
        const color = isSelected ? "#FFF" : "#F00";

        if (m.quality === 'sharp') {
            return (
                <div key={m.id} className={commonClass} style={style} onClick={(e) => { e.stopPropagation(); setSelected(m); }}>
                    {/* Spike */}
                    <svg viewBox="0 0 24 24" className="w-full h-full animate-pulse">
                        <path d="M12 0L15 9L24 12L15 15L12 24L9 15L0 12L9 9Z" fill={color} />
                    </svg>
                </div>
            );
        }
        if (m.quality === 'burn') {
            return (
                <div key={m.id} className={commonClass} style={style} onClick={(e) => { e.stopPropagation(); setSelected(m); }}>
                    {/* Jagged */}
                    <svg viewBox="0 0 24 24" className="w-full h-full animate-[pulse_0.5s_ease-in-out_infinite]">
                        <path d="M12 2L14 8L20 6L16 12L22 18L12 16L8 22L6 12L2 8L10 8Z" fill="none" stroke={color} strokeWidth="2" />
                    </svg>
                </div>
            );
        }
        if (m.quality === 'numb') {
            return (
                <div key={m.id} className={commonClass} style={style} onClick={(e) => { e.stopPropagation(); setSelected(m); }}>
                    {/* Blur Cloud */}
                    <div className="w-4 h-4 rounded-full bg-white/20 blur-sm" style={{ backgroundColor: color }} />
                </div>
            );
        }
        if (m.quality === 'tingle') {
            return (
                <div key={m.id} className={commonClass} style={style} onClick={(e) => { e.stopPropagation(); setSelected(m); }}>
                    {/* Dotted */}
                    <div className="w-full h-full rounded-full border-2 border-dashed animate-[spin_3s_linear_infinite]" style={{ borderColor: color }} />
                </div>
            );
        }
        // Default Ache (Solid Block)
        return (
            <div key={m.id} className={commonClass} style={style} onClick={(e) => { e.stopPropagation(); setSelected(m); }}>
                <div className="w-3 h-3 rotate-45" style={{ backgroundColor: color }} />
            </div>
        );
    };

    return (
        <div className="font-mono bg-black min-h-[800px] text-white p-4">

            {/* Header / Toolbar */}
            <div className="flex justify-between items-end border-b border-white/20 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tighter">SYSTEM DIAGNOSTIC</h1>
                    <div className="text-xs text-red-500 uppercase tracking-[0.2em] animate-pulse">
                        Integral Structure Analysis
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowLogbook(!showLogbook)}
                        className={cn("flex items-center gap-2 px-4 py-3 text-xs md:text-sm border transition-all hover:bg-white hover:text-black", showLogbook ? "bg-white text-black border-transparent" : "border-white/20 text-white/50")}
                    >
                        <History size={16} /> VIEW HISTORY
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[400px_1fr_300px] gap-8 relative items-start">

                {/* LEFT: Analysis Panel */}
                <div className="space-y-6 order-2 lg:order-1 h-full flex flex-col">
                    {selected ? (
                        <div className="border border-white/20 p-6 bg-black h-full flex flex-col animate-in fade-in slide-in-from-left-4">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="text-xs text-white/40 uppercase">Target Sector</div>
                                    <div className="text-3xl font-bold text-red-500 mt-2">{selected.regionLabel}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-white/40 uppercase">ID RECOGNITION</div>
                                    <div className="font-mono text-sm">{selected.id.slice(0, 8)}</div>
                                </div>
                            </div>

                            <div className="space-y-8 flex-1">
                                {/* Quality Selector */}
                                <div>
                                    <div className="text-xs text-white/40 uppercase mb-3">Signal Signature</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["ache", "sharp", "burn", "numb", "tingle", "tight"] as Quality[]).map(q => (
                                            <button
                                                key={q}
                                                onClick={() => updateSelected({ quality: q })}
                                                className={cn(
                                                    "border text-xs py-3 px-1 uppercase tracking-wider hover:bg-white hover:text-black transition-all",
                                                    selected.quality === q ? "bg-white text-black border-white" : "border-white/20 text-white/50"
                                                )}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Intensity */}
                                <div>
                                    <div className="text-xs text-white/40 uppercase mb-3 flex justify-between">
                                        <span>Signal Amplitude</span>
                                        <span className="text-red-500 font-bold">{selected.intensity * 10}%</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="10"
                                        value={selected.intensity}
                                        onChange={(e) => updateSelected({ intensity: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-white/10 rounded-none appearance-none cursor-pointer accent-red-500"
                                    />
                                </div>

                                {/* Note Input */}
                                <div>
                                    <div className="text-xs text-white/40 uppercase mb-2">Clinical Note</div>
                                    <textarea
                                        value={selected.note || ""}
                                        onChange={(e) => updateSelected({ note: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 text-sm p-3 text-white focus:border-red-500 focus:outline-none min-h-[80px] resize-none"
                                        placeholder="Add observations..."
                                    />
                                </div>

                                {/* Protocol (Suggestions) */}
                                <div className="border-t border-white/10 pt-6 mt-6">
                                    <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                        <Terminal size={14} />
                                        <span className="text-sm font-bold uppercase tracking-widest">Repair Protocol</span>
                                    </div>
                                    <div className="space-y-4">
                                        {(suggestions[selected.regionId] || []).map((s, i) => (
                                            <div key={i} className="group">
                                                <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                                    {`>> ${s.name}`}
                                                </div>
                                                <div className="text-xs text-white/60 pl-4 mt-1 leading-relaxed border-l border-white/10 ml-1">
                                                    {s.desc}
                                                </div>
                                            </div>
                                        ))}
                                        {!suggestions[selected.regionId] && (
                                            <div className="text-xs text-white/30 italic">No specific protocol found for this sector.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={removeSelected}
                                className="mt-8 border border-red-900/50 text-red-500/50 text-xs py-3 hover:bg-red-900/20 hover:text-red-500 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Trash2 size={12} /> Terminate Point
                            </button>
                        </div>
                    ) : (
                        <div className="border border-white/10 p-6 h-full flex flex-col justify-center items-center text-center opacity-50 border-dashed">
                            <Activity className="w-16 h-16 text-white/20 mb-6 animate-pulse" />
                            <div className="text-lg tracking-widest uppercase text-white/60">Waiting for Input</div>
                            <div className="text-sm text-white/30 mt-3">Select a sector on the chassis map</div>
                        </div>
                    )}
                </div>


                {/* CENTER: Body Map */}
                <div className="order-1 lg:order-2 flex flex-col items-center justify-start min-h-[600px]">
                    {/* Toggle Header */}
                    <div className="flex justify-between w-full max-w-[320px] mb-4">
                        <div className="flex gap-1">
                            <button onClick={() => setSide("front")} className={cn("text-[10px] uppercase px-3 py-1 border transition-all", side === "front" ? "bg-white text-black border-white" : "border-white/20 text-white/50")}>Front</button>
                            <button onClick={() => setSide("back")} className={cn("text-[10px] uppercase px-3 py-1 border transition-all", side === "back" ? "bg-white text-black border-white" : "border-white/20 text-white/50")}>Dorsal</button>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setGender("male")} className={cn("text-[10px] uppercase px-3 py-1 border transition-all", gender === "male" ? "bg-white/10 border-white/30" : "border-transparent text-white/30")}>XY</button>
                            <button onClick={() => setGender("female")} className={cn("text-[10px] uppercase px-3 py-1 border transition-all", gender === "female" ? "bg-white/10 border-white/30" : "border-transparent text-white/30")}>XX</button>
                        </div>
                    </div>

                    {/* The Map */}
                    <div className="relative border-x border-white/5 px-8 py-8" ref={boardRef}>
                        {/* Grid Lines Background */}
                        <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
                            style={{ backgroundImage: `linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
                        />

                        <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="w-[320px] h-[640px] relative z-10" onClick={handleBoardClick} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredRegion(null)}>
                            {shapes.map((s, i) => {
                                const isHovered = hoveredRegion === s.label.toUpperCase();
                                return s.kind === "circle" ? (
                                    <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={isHovered ? "#FFF" : "#333"} strokeWidth={isHovered ? 2 : 1} className="transition-all duration-200" />
                                ) : (
                                    <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx}
                                        transform={s.rotation ? `rotate(${s.rotation}, ${s.x ? s.x + s.w! / 2 : 0}, ${s.y ? s.y + s.h! / 2 : 0})` : undefined}
                                        fill="none" stroke={isHovered ? "#FFF" : "#333"} strokeWidth={isHovered ? 2 : 1} className="transition-all duration-200"
                                    />
                                );
                            })}
                        </svg>

                        {/* Markers Layer */}
                        {markers.filter(m => m.side === side).map(m => renderMarkerVisual(m, selected?.id === m.id))}
                    </div>

                    <div className="mt-4 text-center h-4">
                        <span className="text-xs font-mono text-red-500 uppercase tracking-widest">{hoveredRegion}</span>
                    </div>
                </div>


                {/* RIGHT: Actions / Logbook / Share Report */}
                <div className="order-3 lg:order-3 space-y-4">

                    {/* Actions */}
                    <div className="border border-white/10 p-4 bg-white/5 space-y-3">
                        <button onClick={saveSession} className="w-full border border-white/20 hover:bg-white hover:text-black hover:border-white text-white/70 py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                            <Save size={16} /> Commit Data
                        </button>
                        <button onClick={() => setShowLogbook(true)} className="w-full border border-white/20 hover:bg-white hover:text-black hover:border-white text-white/70 py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                            <History size={16} /> View History
                        </button>
                        <button onClick={generateReport} className="w-full border border-white/20 hover:bg-emerald-500/20 hover:text-emerald-500 hover:border-emerald-500/50 text-white/70 py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                            <Share2 size={16} /> Download Report
                        </button>
                        <button onClick={() => setMarkers([])} className="w-full border border-red-900/30 hover:bg-red-950/30 text-red-700 hover:text-red-500 py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                            <RotateCcw size={16} /> Purge System
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="border border-white/10 p-4">
                        <div className="text-[10px] uppercase text-white/30 tracking-widest mb-4">Metric Summary</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-3xl font-mono">{markers.length}</div>
                                <div className="text-xs text-white/50">ACTIVE POINTS</div>
                            </div>
                            <div>
                                <div className="text-3xl font-mono text-red-500">{markers.reduce((a, b) => a + b.intensity, 0)}</div>
                                <div className="text-xs text-white/50">TOTAL LOAD</div>
                            </div>
                        </div>
                    </div>

                    {/* Logbook Overlay (Conditional) */}
                    {showLogbook && (
                        <div className="absolute inset-x-0 -bottom-96 h-96 border border-white/10 bg-black/95 backdrop-blur z-50 overflow-y-auto p-6 animate-in slide-in-from-bottom-10">
                            <div className="flex justify-between items-center mb-6 sticky top-0 bg-black py-2 border-b border-white/10">
                                <h4 className="text-sm font-bold uppercase tracking-widest">System History</h4>
                                <button onClick={() => setShowLogbook(false)} className="text-white/50 hover:text-white"><X size={16} /></button>
                            </div>
                            <div className="space-y-2">
                                {history.map((h, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-mono p-3 hover:bg-white/5 cursor-pointer border-b border-white/5">
                                        <span className="text-white/60">{new Date(h.createdAt).toLocaleString()}</span>
                                        <span className="text-red-500 font-bold">{h.region} [LVL {h.intensity}]</span>
                                    </div>
                                ))}
                                {history.length === 0 && <div className="text-center text-white/20 py-8 text-sm">NO LOGS FOUND</div>}
                            </div>
                        </div>
                    )}

                </div>

                {/* HIDDEN REPORT TEMPLATE (For HTML to Image) */}
                <div className="fixed -left-[2000px] top-0 pointer-events-none">
                    <div ref={reportRef} className="bg-white text-black p-10 w-[800px] min-h-[600px] font-mono border-4 border-black">
                        <div className="border-b-4 border-black pb-6 mb-8 flex justify-between items-end">
                            <h1 className="text-5xl font-black tracking-tighter text-black">DIAGNOSTIC REPORT</h1>
                            <div className="text-right">
                                <div className="text-sm font-bold uppercase text-black/60">TIMESTAMP</div>
                                <div className="text-lg font-bold text-black" suppressHydrationWarning>{new Date().toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-12">
                            <div>
                                <div className="text-lg font-bold border-b-2 border-black pb-2 mb-6 uppercase tracking-widest text-black">Detected Anomalies</div>
                                <div className="space-y-4">
                                    {markers.map((m, i) => (
                                        <div key={i} className="flex flex-col border-l-4 border-red-600 pl-4 py-1">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-bold text-lg text-black">{m.regionLabel}</span>
                                                <span className="text-red-600 font-bold">{m.quality.toUpperCase()}</span>
                                            </div>
                                            <div className="text-sm text-black/70">Intensity: {m.intensity}/10</div>
                                            {m.note && <div className="text-sm italic mt-1 text-black bg-gray-100 p-2 border border-gray-300">"{m.note}"</div>}
                                        </div>
                                    ))}
                                    {markers.length === 0 && <div className="italic text-gray-500">No anomalies recorded.</div>}
                                </div>
                            </div>
                            <div>
                                <div className="text-lg font-bold border-b-2 border-black pb-2 mb-6 uppercase tracking-widest text-black">System Load</div>
                                <div className="text-8xl font-black mb-2 text-red-600">{markers.reduce((a, b) => a + b.intensity, 0)}</div>
                                <div className="text-sm font-bold uppercase text-black/60">Cumulative Stress Index</div>

                                <div className="mt-12 p-6 border-2 border-black bg-gray-50">
                                    <div className="text-sm font-bold uppercase mb-4 text-black">Recommended Protocol</div>
                                    {markers.slice(0, 3).map((m, i) => {
                                        const sugg = suggestions[m.regionId]?.[0];
                                        return sugg ? (
                                            <div key={i} className="mb-4 text-sm">
                                                <span className="text-red-700 font-bold block mb-1">&gt;&gt; {sugg.name}</span>
                                                <div className="text-black/80 leading-relaxed">{sugg.desc}</div>
                                            </div>
                                        ) : null;
                                    })}
                                    {markers.length === 0 && <div className="italic text-gray-500">System functional. No protocols required.</div>}
                                </div>
                                <div className="mt-8 flex justify-end items-center gap-4 border-t-2 border-black pt-4">
                                    <div className="text-right">
                                        <div className="text-xs font-bold uppercase text-black/50">Authorized By</div>
                                        <div className="font-black text-xl italic text-red-600">FUY</div>
                                    </div>
                                    <div className="w-12 h-12 border-2 border-black flex items-center justify-center p-1">
                                        <img src="/icon.png" alt="Logo" className="w-full h-full object-contain grayscale" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 pt-6 border-t-2 border-black text-xs text-center uppercase tracking-[0.5em] text-black/40">
                            End of Report
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
