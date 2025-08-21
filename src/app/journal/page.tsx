"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* -------------------- inline UploadField -------------------- */
type UploadedType = "IMAGE" | "VIDEO" | "AUDIO";
type Uploaded = { type: UploadedType; url: string; file?: File };

function UploadField({
  onUploaded,
  accept = "image/*,video/*,audio/*",
}: {
  onUploaded: (f: Uploaded) => void;
  accept?: string;
}) {
  const inp = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !files.length) return;
      const f = files[0];
      const url = URL.createObjectURL(f);
      let type: UploadedType = "IMAGE";
      if (f.type.startsWith("video/")) type = "VIDEO";
      else if (f.type.startsWith("audio/")) type = "AUDIO";
      onUploaded({ type, url, file: f });
    },
    [onUploaded]
  );

  return (
    <div
      className={`rounded-2xl border border-dashed ${
        dragOver ? "border-stone-400 bg-stone-50" : "border-stone-300 bg-white"
      } p-3 text-sm text-stone-600`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span>Drop a file here, or</span>
        <button
          type="button"
          className="rounded-xl border border-stone-300 bg-white px-3 py-1 text-sm"
          onClick={() => inp.current?.click()}
        >
          Choose file
        </button>
      </div>
      <input
        ref={inp}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

/* -------------------- types -------------------- */
type BlockType =
  | "TEXT"
  | "CHECKLIST"
  | "IMAGE"
  | "VIDEO"
  | "AUDIO"
  | "DRAW"
  | "LINE"
  | "RECT"
  | "ELLIPSE";

type EditorKind = "MARKDOWN" | "RICH";

type Block = {
  id: string;
  type: BlockType;
  text?: string;
  url?: string;
  caption?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  editor?: EditorKind;
  checklist?: { id: string; text: string; done: boolean }[];
  drawing?: {
    paths: { points: [number, number][] }[];
    stroke: string;
    strokeWidth: number;
  };
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
};

type TemplateVisibility = "PRIVATE" | "PUBLIC";

type TemplateReview = {
  id: string;
  rating: number; // 1..5
  text?: string;
  at: string; // ISO date
  by?: string; // optional reviewer display name
};

type TemplateSummary = {
  id: string;
  name: string;
  description?: string | null;
  visibility: TemplateVisibility;
  author?: string | null;
  createdAt?: string | null;
  avgRating?: number | null;
  reviewsCount?: number | null;
};
type TemplateFull = TemplateSummary & {
  blocks: Omit<Block, "x" | "y" | "id">[];
  reviews?: TemplateReview[];
};

type Mood = "😍" | "😀" | "🙂" | "😐" | "😟" | "😢" | "😡";

/* -------------------- utils -------------------- */
const MIN_W_CARD = 220;
const MIN_H_CARD = 120;
const MIN_W_SHAPE = 120;
const MIN_H_SHAPE = 80;

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const pickSummary = (blocks: Block[]) => {
  const text = blocks
    .filter((b) => (b.type === "TEXT" || b.type === "CHECKLIST") && (b.text?.trim()?.length ?? 0) > 0)
    .map((b) => (b.text ?? "").trim())
    .join("\n\n")
    .slice(0, 2000);
  return text || "(canvas)";
};

const calcAvgRating = (tpl: TemplateFull) => {
  const r = tpl.reviews ?? [];
  if (!r.length) return null;
  const avg = r.reduce((s, x) => s + (x.rating || 0), 0) / r.length;
  return Math.round(avg * 10) / 10;
};

/* -------------------- insights -------------------- */
const KEYWORDS_TO_TAGS: Record<string, string> = {
  stress: "#stress",
  anxious: "#anxiety",
  anxiety: "#anxiety",
  worry: "#anxiety",
  focus: "#focus",
  grateful: "#gratitude",
  gratitude: "#gratitude",
  family: "#family",
  work: "#work",
  gym: "#health",
  exercise: "#health",
  sleep: "#sleep",
  dream: "#dreams",
  learn: "#growth",
  growth: "#growth",
};
const EMOTION_WORDS: Record<string, string[]> = {
  Joy: ["happy", "joy", "grateful", "excited", "content", "love"],
  Calm: ["calm", "peace", "relaxed", "easy"],
  Stress: ["stress", "tense", "overwhelm", "busy", "pressure"],
  Sadness: ["sad", "down", "tired", "lonely", "blue"],
  Anger: ["angry", "mad", "frustrated", "irritated"],
  Fear: ["scared", "afraid", "worried", "anxious", "anxiety"],
};
function analyzeEntry(text: string) {
  const lower = text.toLowerCase();
  const tagSet = new Set<string>();
  for (const [k, tag] of Object.entries(KEYWORDS_TO_TAGS)) if (lower.includes(k)) tagSet.add(tag);
  const emotions: string[] = [];
  for (const [label, words] of Object.entries(EMOTION_WORDS)) if (words.some((w) => lower.includes(w))) emotions.push(label);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  const summary = sentences.join(" ") || (text.trim().length > 120 ? text.trim().slice(0, 200) + "…" : text.trim());
  return { summary, tags: Array.from(tagSet), emotions };
}

/* -------------------- defaults (templates) -------------------- */
const DEFAULT_TEMPLATES: TemplateFull[] = [
  {
    id: "def-blank",
    name: "Blank Canvas",
    description: "Start from scratch.",
    visibility: "PUBLIC",
    author: "system",
    createdAt: new Date().toISOString(),
    blocks: [],
    reviews: [],
  },
  {
    id: "def-daily",
    name: "Daily Journal",
    description: "Morning focus, gratitude, and tasks.",
    visibility: "PUBLIC",
    author: "system",
    createdAt: new Date().toISOString(),
    blocks: [
      { type: "TEXT", text: "## Morning Focus\n- [ ] Top 1\n- [ ] Top 2", editor: "MARKDOWN", caption: "Priorities", w: 360, h: 200 },
      { type: "TEXT", text: "## Gratitude\n- I’m grateful for …", editor: "MARKDOWN", caption: "Gratitude", w: 360, h: 200 },
      {
        type: "CHECKLIST",
        text: "",
        checklist: [
          { id: uid(), text: "Task 1", done: false },
          { id: uid(), text: "Task 2", done: false },
        ],
        caption: "Tasks",
        w: 360,
        h: 200,
      },
    ],
    reviews: [],
  },
  {
    id: "def-retro",
    name: "Weekly Retro",
    description: "What went well, what to improve, next experiments.",
    visibility: "PUBLIC",
    author: "system",
    createdAt: new Date().toISOString(),
    blocks: [
      { type: "TEXT", text: "### Went well\n- …", editor: "MARKDOWN", w: 360, h: 200 },
      { type: "TEXT", text: "### Improve\n- …", editor: "MARKDOWN", w: 360, h: 200 },
      { type: "TEXT", text: "### Experiments\n- …", editor: "MARKDOWN", w: 360, h: 200 },
    ],
    reviews: [],
  },
  {
    id: "def-mood-board",
    name: "Mood Board",
    description: "Images, notes, and shapes.",
    visibility: "PUBLIC",
    author: "system",
    createdAt: new Date().toISOString(),
    blocks: [
      { type: "IMAGE", url: "", caption: "Drop an image", w: 480, h: 280 },
      { type: "TEXT", text: "Describe the vibe…", editor: "MARKDOWN", w: 360, h: 200 },
      { type: "ELLIPSE", stroke: "#0ea5e9", strokeWidth: 3, fill: "transparent", w: 300, h: 200 },
    ],
    reviews: [],
  },
];

/* -------------------- storage keys -------------------- */
const TPL_STORE_KEY = "journal-templates-v4";         // user templates (private+public)
const TPL_COMMUNITY_KEY = "journal-community-v1";     // all public templates (simulated shared)

/* -------------------- templates storage -------------------- */
function loadLocalTemplates(): TemplateFull[] {
  try {
    const raw = localStorage.getItem(TPL_STORE_KEY);
    const user = raw ? (JSON.parse(raw) as TemplateFull[]) : [];
    // enrich with live ratings
    for (const t of user) {
      t.avgRating = calcAvgRating(t);
      t.reviewsCount = t.reviews?.length ?? 0;
    }
    return user;
  } catch {
    return [];
  }
}
function saveLocalTemplates(templates: TemplateFull[]) {
  try {
    localStorage.setItem(TPL_STORE_KEY, JSON.stringify(templates));
  } catch {}
}

function loadCommunity(): TemplateFull[] {
  try {
    const raw = localStorage.getItem(TPL_COMMUNITY_KEY);
    const pub = raw ? (JSON.parse(raw) as TemplateFull[]) : [];
    // ensure defaults appear in community too
    const map = new Map<string, TemplateFull>();
    for (const t of DEFAULT_TEMPLATES) map.set(t.id, { ...t, avgRating: calcAvgRating(t), reviewsCount: t.reviews?.length ?? 0 });
    for (const t of pub) map.set(t.id, { ...t, avgRating: calcAvgRating(t), reviewsCount: t.reviews?.length ?? 0 });
    return Array.from(map.values());
  } catch {
    // fallback to defaults
    return DEFAULT_TEMPLATES.map((t) => ({ ...t, avgRating: calcAvgRating(t), reviewsCount: t.reviews?.length ?? 0 }));
  }
}
function saveCommunity(templates: TemplateFull[]) {
  try {
    // avoid storing defaults: only user-published/community items
    const userOnly = templates.filter((t) => !t.id.startsWith("def-"));
    localStorage.setItem(TPL_COMMUNITY_KEY, JSON.stringify(userOnly));
  } catch {}
}

function newTemplateId() {
  return "tpl-" + uid();
}

/* ----------------- page component ----------------- */
export default function JournalCanvas() {
  const TOP_OFFSET_CM = "2cm";
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [zoom, setZoom] = useState(1);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState("");
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>("🙂");
  const [tags, setTags] = useState<string[]>([]);
  const computedInsights = useMemo(() => analyzeEntry(pickSummary(blocks)), [blocks]);

  // user identity (simple)
  const [currentUser] = useState<string>(() => {
    // simple placeholder name; in real app, wire to auth user
    return "me";
  });

  // templates: local and community
  const [localTemplates, setLocalTemplates] = useState<TemplateFull[]>([]);
  const [communityTemplates, setCommunityTemplates] = useState<TemplateFull[]>([]);
  useEffect(() => {
    setLocalTemplates(loadLocalTemplates());
    setCommunityTemplates(loadCommunity());
  }, []);

  // search
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // sidebar resize
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const resizingRef = useRef<{ down: boolean; startX: number; startW: number }>({ down: false, startX: 0, startW: 320 });

  // viewport ref + pan/zoom
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panningRef = useRef<{ down: boolean; sx: number; sy: number; ox: number; oy: number }>({
    down: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      // start pan when clicking empty area
      const target = e.target as HTMLElement;
      if (target.closest("[data-block]") || target.closest("[data-resizer]")) return;
      panningRef.current.down = true;
      panningRef.current.sx = e.clientX;
      panningRef.current.sy = e.clientY;
      panningRef.current.ox = offsetX;
      panningRef.current.oy = offsetY;
      el.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!panningRef.current.down) return;
      const dx = e.clientX - panningRef.current.sx;
      const dy = e.clientY - panningRef.current.sy;
      setOffsetX(panningRef.current.ox + dx);
      setOffsetY(panningRef.current.oy + dy);
    };
    const onMouseUp = () => {
      panningRef.current.down = false;
      el.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const worldX = (cx - offsetX) / zoom;
      const worldY = (cy - offsetY) / zoom;

      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const next = Math.max(0.25, Math.min(3, zoom * factor));
      const nx = cx - worldX * next;
      const ny = cy - worldY * next;
      setZoom(next);
      setOffsetX(nx);
      setOffsetY(ny);
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("wheel", onWheel as any);
    };
  }, [offsetX, offsetY, zoom]);

  /* add blocks */
  const centerWorld = (w = 360, h = 200) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 500;
    const cy = rect ? rect.top + rect.height / 2 : 400;
    const wx = (cx - offsetX) / zoom - w / 2;
    const wy = (cy - offsetY) / zoom - h / 2;
    return { x: wx, y: wy, w, h };
  };

  const addCard = (type: Exclude<BlockType, "LINE" | "RECT" | "ELLIPSE">, initial?: Partial<Block>) => {
    const baseSize =
      type === "DRAW" ? { w: 480, h: 300 } : type === "IMAGE" || type === "VIDEO" ? { w: 480, h: 280 } : { w: 360, h: 200 };
    const pos = centerWorld(baseSize.w, baseSize.h);
    const b: Block = {
      id: uid(),
      type,
      x: pos.x,
      y: pos.y,
      w: Math.max(MIN_W_CARD, pos.w),
      h: Math.max(MIN_H_CARD, pos.h),
      editor: type === "TEXT" ? "MARKDOWN" : undefined,
      ...initial,
    };
    setBlocks((prev) => [...prev, b]);
    setActiveBlockId(b.id);
  };

  const addShape = (type: "LINE" | "RECT" | "ELLIPSE", initial?: Partial<Block>) => {
    const baseSize = type === "LINE" ? { w: 400, h: 8 } : type === "RECT" ? { w: 320, h: 200 } : { w: 300, h: 200 };
    const pos = centerWorld(baseSize.w, baseSize.h);
    const b: Block = {
      id: uid(),
      type,
      x: pos.x,
      y: pos.y,
      w: Math.max(MIN_W_SHAPE, pos.w),
      h: Math.max(MIN_H_SHAPE, pos.h),
      stroke: "#0ea5e9",
      strokeWidth: 3,
      fill: type === "ELLIPSE" || type === "RECT" ? "transparent" : undefined,
      ...initial,
    };
    setBlocks((prev) => [...prev, b]);
    setActiveBlockId(b.id);
  };

  const addText = () => addCard("TEXT", { text: "" });
  const addChecklist = () =>
    addCard("CHECKLIST", {
      text: "",
      checklist: [
        { id: uid(), text: "First item", done: false },
        { id: uid(), text: "Second item", done: false },
      ],
    });
  const addDraw = () => addCard("DRAW", { drawing: { paths: [], stroke: "#1f2937", strokeWidth: 4 } });
  const addLine = () => addShape("LINE");
  const addRect = () => addShape("RECT");
  const addEllipse = () => addShape("ELLIPSE");
  const addImage = () => addCard("IMAGE", { url: "" });
  const addVoice = () => addCard("AUDIO", { url: "" });
  const addVideo = () => addCard("VIDEO", { url: "" });

  /* templates CRUD + community publish */
  function createTemplateFromCanvas(
    name: string,
    description?: string,
    visibility: TemplateVisibility = "PRIVATE"
  ) {
    const tplBlocks: TemplateFull["blocks"] = blocks.map((b) => {
      const { id, x, y, ...rest } = b;
      return rest;
    });
    const tpl: TemplateFull = {
      id: newTemplateId(),
      name: name.trim() || "Untitled Template",
      description: description || "",
      visibility,
      author: currentUser,
      createdAt: new Date().toISOString(),
      blocks: tplBlocks,
      reviews: [],
      avgRating: null,
      reviewsCount: 0,
    };

    const nextLocal = [...localTemplates, tpl];
    setLocalTemplates(nextLocal);
    saveLocalTemplates(nextLocal);

    if (visibility === "PUBLIC") {
      const nextCommunity = upsertCommunity([...communityTemplates], tpl);
      setCommunityTemplates(nextCommunity);
      saveCommunity(nextCommunity);
      setStatus(`✅ Template “${tpl.name}” created and published`);
    } else {
      setStatus(`✅ Template “${tpl.name}” created`);
    }
  }

  function upsertCommunity(list: TemplateFull[], incoming: TemplateFull) {
    const idx = list.findIndex((x) => x.id === incoming.id);
    const withMeta: TemplateFull = {
      ...incoming,
      visibility: "PUBLIC",
      avgRating: calcAvgRating(incoming),
      reviewsCount: incoming.reviews?.length ?? 0,
    };
    if (idx >= 0) list[idx] = withMeta;
    else list.push(withMeta);
    return list;
  }

  function updateTemplateVisibility(id: string, visibility: TemplateVisibility) {
    const nextLocal = localTemplates.map((t) => (t.id === id ? { ...t, visibility } : t));
    setLocalTemplates(nextLocal);
    saveLocalTemplates(nextLocal);

    const tpl = nextLocal.find((t) => t.id === id);
    if (!tpl) return;

    if (visibility === "PUBLIC") {
      const nextCommunity = upsertCommunity([...communityTemplates], tpl);
      setCommunityTemplates(nextCommunity);
      saveCommunity(nextCommunity);
      setStatus("✅ Published");
    } else {
      const nextCommunity = communityTemplates.filter((t) => t.id !== id || t.id.startsWith("def-"));
      setCommunityTemplates(nextCommunity);
      saveCommunity(nextCommunity);
      setStatus("✅ Unpublished");
    }
  }

  function renameTemplate(id: string, name: string, description?: string) {
    const nextLocal = localTemplates.map((t) => (t.id === id ? { ...t, name, description: description ?? t.description } : t));
    setLocalTemplates(nextLocal);
    saveLocalTemplates(nextLocal);

    const tpl = nextLocal.find((t) => t.id === id);
    if (tpl?.visibility === "PUBLIC") {
      const nextCommunity = upsertCommunity([...communityTemplates], tpl);
      setCommunityTemplates(nextCommunity);
      saveCommunity(nextCommunity);
    }
    setStatus("✅ Template updated");
  }

  function deleteTemplate(id: string) {
    const nextLocal = localTemplates.filter((t) => t.id !== id);
    setLocalTemplates(nextLocal);
    saveLocalTemplates(nextLocal);

    const nextCommunity = communityTemplates.filter((t) => t.id !== id || t.id.startsWith("def-"));
    setCommunityTemplates(nextCommunity);
    saveCommunity(nextCommunity);
    setStatus("🗑️ Template deleted");
  }

  function reviewTemplate(id: string, rating: number, text?: string) {
    const apply = (t: TemplateFull) => {
      const r: TemplateReview = { id: uid(), rating, text, at: new Date().toISOString(), by: currentUser };
      const reviews = [...(t.reviews ?? []), r];
      return { ...t, reviews, avgRating: calcAvgRating({ ...t, reviews }), reviewsCount: reviews.length };
    };

    // update in community whenever exists
    let updatedCommunity = communityTemplates.map((t) => (t.id === id ? apply(t) : t));
    setCommunityTemplates(updatedCommunity);
    saveCommunity(updatedCommunity);

    // if user has local copy, update too
    const hasLocal = localTemplates.some((t) => t.id === id);
    if (hasLocal) {
      const updatedLocal = localTemplates.map((t) => (t.id === id ? apply(t) : t));
      setLocalTemplates(updatedLocal);
      saveLocalTemplates(updatedLocal);
    }
    setStatus("✅ Review submitted");
  }

  function instantiateTemplate(tpl: TemplateFull, screenX?: number, screenY?: number) {
    const gap = 20;
    let baseWorldX: number;
    let baseWorldY: number;
    if (typeof screenX === "number" && typeof screenY === "number") {
      baseWorldX = (screenX - offsetX) / zoom;
      baseWorldY = (screenY - offsetY) / zoom;
    } else {
      const rect = viewportRef.current?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : 500;
      const cy = rect ? rect.top + rect.height / 2 : 400;
      baseWorldX = (cx - offsetX) / zoom;
      baseWorldY = (cy - offsetY) / zoom;
    }
    let cy = baseWorldY;
    const newBlocks: Block[] = tpl.blocks.map((tb) => {
      const isCard = tb.type !== "LINE" && tb.type !== "RECT" && tb.type !== "ELLIPSE";
      const defaultH = tb.type === "DRAW" ? 300 : tb.type === "IMAGE" || tb.type === "VIDEO" ? 280 : isCard ? 200 : 120;
      const minW = isCard ? MIN_W_CARD : MIN_W_SHAPE;
      const minH = isCard ? MIN_H_CARD : MIN_H_SHAPE;
      const w = Math.max(minW, tb.w ?? 360);
      const h = Math.max(minH, tb.h ?? defaultH);
      const b: Block = {
        id: uid(),
        type: tb.type,
        text: tb.text,
        url: tb.url,
        caption: tb.caption,
        editor: tb.type === "TEXT" ? tb.editor ?? "MARKDOWN" : undefined,
        checklist: tb.checklist ? tb.checklist.map((c) => ({ ...c, id: uid() })) : undefined,
        drawing: tb.drawing
          ? { ...tb.drawing, paths: tb.drawing.paths.map((p) => ({ points: p.points.map((pt) => [...pt] as [number, number]) })) }
          : undefined,
        stroke: tb.stroke,
        strokeWidth: tb.strokeWidth,
        fill: tb.fill,
        x: baseWorldX - w / 2,
        y: cy,
        w,
        h,
      };
      cy += h + gap;
      return b;
    });
    setBlocks((prev) => [...prev, ...newBlocks]);
    if (newBlocks.length) setActiveBlockId(newBlocks.find((b) => b.type !== "LINE" && b.type !== "RECT" && b.type !== "ELLIPSE")?.id ?? newBlocks[0].id);
    setStatus(`✨ Added “${tpl.name}”`);
  }

  /* DnD: templates + files */
  function onLibDragStart(e: React.DragEvent, tplId: string) {
    e.dataTransfer.setData("application/x-template-id", tplId);
    e.dataTransfer.effectAllowed = "copy";
  }
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    const dropX = rect ? e.clientX - rect.left : e.clientX;
    const dropY = rect ? e.clientY - rect.top : e.clientY;

    const tplId = e.dataTransfer.getData("application/x-template-id");
    if (tplId) {
      const tpl = [...localTemplates, ...communityTemplates].find((d) => d.id === tplId);
      if (tpl) {
        instantiateTemplate(tpl, dropX, dropY);
        return;
      }
      setStatus("⚠️ Template not found");
      return;
    }

    const dropped = e.dataTransfer?.files;
    if (dropped && dropped.length) {
      const files: File[] = Array.from(dropped);
      const worldX = (dropX - offsetX) / zoom;
      const worldY = (dropY - offsetY) / zoom;

      let x = worldX;
      let y = worldY;
      const gap = 16;

      const toBlock = (file: File) => {
        const url = URL.createObjectURL(file);
        if (file.type.startsWith("image/")) return { type: "IMAGE" as const, url, w: 480, h: 280 };
        if (file.type.startsWith("video/")) return { type: "VIDEO" as const, url, w: 480, h: 280 };
        if (file.type.startsWith("audio/")) return { type: "AUDIO" as const, url, w: 360, h: 120 };
        return null;
      };

      const newBlocks: Block[] = [];
      for (const file of files) {
        const meta = toBlock(file);
        if (!meta) continue;
        newBlocks.push({ id: uid(), x, y, ...meta });
        y += (meta.h ?? 200) + gap;
      }
      if (newBlocks.length) {
        setBlocks((prev) => [...prev, ...newBlocks]);
        setStatus(`✅ Added ${newBlocks.length} file${newBlocks.length > 1 ? "s" : ""}`);
      } else {
        setStatus("Unsupported file type.");
      }
      return;
    }
  };

  /* block ops: move/resize/edit/remove */
  const startDragRef = useRef<{ id: string; sx: number; sy: number; bx: number; by: number } | null>(null);
  const startResizeRef = useRef<{ id: string; sx: number; sy: number; bw: number; bh: number } | null>(null);

  const onBlockMouseDown = (id: string, e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (["input", "textarea", "button", "video", "audio", "label", "select", "svg", "path"].includes(tag)) return;
    if (panningRef.current.down) return;
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    setActiveBlockId(id);
    startDragRef.current = { id, sx: e.clientX, sy: e.clientY, bx: b.x, by: b.y };
    window.addEventListener("mousemove", onDragMouseMove);
    window.addEventListener("mouseup", onDragMouseUp);
  };
  const onDragMouseMove = (e: MouseEvent) => {
    if (!startDragRef.current) return;
    const { id, sx, sy, bx, by } = startDragRef.current;
    const dx = (e.clientX - sx) / zoom;
    const dy = (e.clientY - sy) / zoom;
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, x: bx + dx, y: by + dy } : b)));
  };
  const onDragMouseUp = () => {
    startDragRef.current = null;
    window.removeEventListener("mousemove", onDragMouseMove);
    window.removeEventListener("mouseup", onDragMouseUp);
  };

  const onResizeHandleMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    startResizeRef.current = { id, sx: e.clientX, sy: e.clientY, bw: b.w, bh: b.h };
    window.addEventListener("mousemove", onResizeMouseMove);
    window.addEventListener("mouseup", onResizeMouseUp);
  };
  const onResizeMouseMove = (e: MouseEvent) => {
    if (!startResizeRef.current) return;
    const { id, sx, sy, bw, bh } = startResizeRef.current;
    const dw = (e.clientX - sx) / zoom;
    const dh = (e.clientY - sy) / zoom;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const isCard = b.type !== "LINE" && b.type !== "RECT" && b.type !== "ELLIPSE";
        const minW = isCard ? MIN_W_CARD : MIN_W_SHAPE;
        const minH = isCard ? MIN_H_CARD : MIN_H_SHAPE;
        return { ...b, w: Math.max(minW, bw + dw), h: Math.max(minH, bh + dh) };
      })
    );
  };
  const onResizeMouseUp = () => {
    startResizeRef.current = null;
    window.removeEventListener("mousemove", onResizeMouseMove);
    window.removeEventListener("mouseup", onResizeMouseUp);
  };

  const updateBlock = useCallback((id: string, patch: Partial<Block>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);
  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };
  const attachUploaded = (id: string, file: Uploaded) => {
    if (file.type === "IMAGE") updateBlock(id, { url: file.url, type: "IMAGE" });
    if (file.type === "VIDEO") updateBlock(id, { url: file.url, type: "VIDEO" });
    if (file.type === "AUDIO") updateBlock(id, { url: file.url, type: "AUDIO" });
  };

  const saveEntry = async () => {
    try {
      setStatus("Saving…");
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: pickSummary(blocks),
          blocks,
          mood,
          tags,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setStatus(`❌ Failed — ${t || ""}`);
        return;
      }
      setStatus("✅ Saved");
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? "Error"}`);
    }
  };

  /* helpers */
  const worldToScreen = (wx: number, wy: number) => ({ left: wx * zoom + offsetX, top: wy * zoom + offsetY });
  const sizeToScreen = (w: number, h: number) => ({ width: w * zoom, height: h * zoom });

  /* sidebar resizing handlers */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current.down) return;
      const dx = e.clientX - resizingRef.current.startX;
      const next = Math.max(220, Math.min(600, resizingRef.current.startW + dx));
      setSidebarWidth(next);
    };
    const onUp = () => {
      resizingRef.current.down = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  /* search filtering */
  const filteredCommunity = useMemo(() => {
    const src = communityTemplates;
    if (!normalizedQuery) return src;
    return src.filter((t) => {
      const n = (t.name || "").toLowerCase();
      const a = (t.author || "").toLowerCase();
      return n.includes(normalizedQuery) || a.includes(normalizedQuery);
    });
  }, [communityTemplates, normalizedQuery]);

  const filteredLocal = useMemo(() => {
    const src = localTemplates;
    if (!normalizedQuery) return src;
    return src.filter((t) => {
      const n = (t.name || "").toLowerCase();
      const a = (t.author || "").toLowerCase();
      return n.includes(normalizedQuery) || a.includes(normalizedQuery);
    });
  }, [localTemplates, normalizedQuery]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[linear-gradient(180deg,rgba(250,250,249,1),rgba(245,245,244,1))] text-stone-900">
      <div className="grid h-full" style={{ gridTemplateColumns: `minmax(260px, ${sidebarWidth}px) 1fr` }}>
        {/* Left: Templates (resizable) */}
        <aside className="h-full bg-white/10 backdrop-blur-sm overflow-hidden flex flex-col border-r border-stone-200/40 relative">
          <div style={{ height: `calc(env(safe-area-inset-top) + ${TOP_OFFSET_CM})` }} />
          <div className="px-3 sm:px-4 pb-2">
            <input
              className="w-full rounded-2xl border border-stone-200 bg-white/90 px-3 py-2 text-sm text-stone-800 outline-none focus:ring-4 ring-stone-200/60"
              placeholder="Search templates by name or author…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-6">
            <SectionHeader title="Community" />
            <div className="grid gap-2 mb-4">
              {filteredCommunity.map((t) => (
                <TemplateCard
                  key={t.id}
                  tpl={t}
                  onDragStart={(e, id) => {
                    e.dataTransfer.setData("application/x-template-id", id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onAdd={() => instantiateTemplate(t)}
                  extraActions={
                    currentUser === t.author ? (
                      <TemplateMenu
                        tpl={t}
                        onRename={(name, desc) => renameTemplate(t.id, name, desc)}
                        onVisibility={(vis) => updateTemplateVisibility(t.id, vis)}
                        onDelete={() => deleteTemplate(t.id)}
                        onReview={(rating, text) => reviewTemplate(t.id, rating, text)}
                      />
                    ) : (
                      <ReviewButton onReview={(rating, text) => reviewTemplate(t.id, rating, text)} />
                    )
                  }
                />
              ))}
              {filteredCommunity.length === 0 && (
                <EmptyHint text="No matching community templates." />
              )}
            </div>

            <SectionHeader title="My Templates" />
            <div className="grid gap-2">
              {filteredLocal.map((t) => (
                <TemplateCard
                  key={t.id}
                  tpl={t}
                  onDragStart={(e, id) => {
                    e.dataTransfer.setData("application/x-template-id", id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onAdd={() => instantiateTemplate(t)}
                  extraActions={
                    <TemplateMenu
                      tpl={t}
                      onRename={(name, desc) => renameTemplate(t.id, name, desc)}
                      onVisibility={(vis) => updateTemplateVisibility(t.id, vis)}
                      onDelete={() => deleteTemplate(t.id)}
                      onReview={(rating, text) => reviewTemplate(t.id, rating, text)}
                    />
                  }
                />
              ))}
              {filteredLocal.length === 0 && (
                <EmptyHint text="No matching personal templates." />
              )}
            </div>
          </div>

          {/* vertical resizer handle */}
          <div
            data-resizer
            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-stone-300/50"
            onMouseDown={(e) => {
              resizingRef.current.down = true;
              resizingRef.current.startX = e.clientX;
              resizingRef.current.startW = sidebarWidth;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
            title="Resize"
          />
        </aside>

        {/* Main column */}
        <main className="relative h-full overflow-hidden">
          {/* Top bar: tools + create/publish */}
          <div
            className="pointer-events-none absolute left-0 right-0 z-20 flex justify-center"
            style={{ top: `calc(env(safe-area-inset-top) + ${TOP_OFFSET_CM})` }}
          >
            <div className="pointer-events-auto mx-4 max-w-5xl w-full rounded-3xl border border-stone-200/70 bg-white/70 backdrop-blur shadow-sm">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 flex-wrap">
                <span className="text-[12px] font-medium tracking-wide text-stone-600">Tools:</span>
                <Btn subtle onClick={addText}>Text</Btn>
                <Btn subtle onClick={addChecklist}>Checklist</Btn>
                <Btn subtle onClick={addDraw}>Draw</Btn>
                <Btn subtle onClick={addLine}>Line</Btn>
                <Btn subtle onClick={addRect}>Rectangle</Btn>
                <Btn subtle onClick={addEllipse}>Ellipse</Btn>
                <Btn subtle onClick={addImage}>Image</Btn>
                <Btn subtle onClick={addVoice}>Voice</Btn>
                <Btn subtle onClick={addVideo}>Video</Btn>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-stone-500">Mood</span>
                  <MoodPicker value={mood} onChange={setMood} />
                  <Btn
                    subtle
                    onClick={() => {
                      const name = prompt("Template name?");
                      if (!name) return;
                      const desc = prompt("Description (optional)?") || "";
                      const vis = confirm("Publish now? OK=Public, Cancel=Private") ? "PUBLIC" : "PRIVATE";
                      createTemplateFromCanvas(name, desc, vis as TemplateVisibility);
                    }}
                  >
                    Save as Template
                  </Btn>
                  <Btn onClick={saveEntry} tone="accent">Save Entry</Btn>
                </div>
              </div>
            </div>
          </div>

          {/* Viewport */}
          <div ref={viewportRef} className="h-full overflow-hidden cursor-[grab]">
            <div
              className="relative h-full w-full"
              onDrop={handleCanvasDrop}
              onDragOver={(e) => e.preventDefault()}
              style={{
                backgroundImage: "radial-gradient(rgba(28,25,23,0.06) 1px, transparent 1px)",
                backgroundSize: `${16 * zoom}px ${16 * zoom}px`,
                backgroundPosition: `${offsetX % (16 * zoom)}px ${offsetY % (16 * zoom)}px`,
              }}
            >
              {/* blocks: shapes or cards */}
              {blocks.map((b) => {
                const pos = worldToScreen(b.x, b.y);
                const sz = sizeToScreen(b.w, b.h);
                const isShape = b.type === "LINE" || b.type === "RECT" || b.type === "ELLIPSE";

                if (isShape) {
                  return (
                    <div
                      key={b.id}
                      data-block
                      style={{ left: pos.left, top: pos.top, width: sz.width, height: sz.height }}
                      className="absolute"
                      onMouseDown={(e) => onBlockMouseDown(b.id, e)}
                      onClick={() => setActiveBlockId(b.id)}
                    >
                      <ShapeRender block={b} />
                      <div
                        onMouseDown={(e) => onResizeHandleMouseDown(b.id, e)}
                        className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded border border-stone-300 bg-white/80 shadow"
                        title="Resize"
                      />
                      {activeBlockId === b.id && (
                        <div className="absolute -top-8 left-0 flex items-center gap-2 bg-white/90 border border-stone-200 rounded-xl px-2 py-1 shadow text-[12px]">
                          <label className="text-stone-500">Stroke</label>
                          <input
                            type="color"
                            value={b.stroke ?? "#0ea5e9"}
                            onChange={(e) => updateBlock(b.id, { stroke: e.target.value })}
                          />
                          <label className="text-stone-500">Width</label>
                          <input
                            type="range"
                            min={1}
                            max={12}
                            value={b.strokeWidth ?? 3}
                            onChange={(e) => updateBlock(b.id, { strokeWidth: Number(e.target.value) })}
                          />
                          {(b.type === "RECT" || b.type === "ELLIPSE") && (
                            <>
                              <label className="text-stone-500">Fill</label>
                              <input
                                type="color"
                                value={b.fill ?? "transparent"}
                                onChange={(e) => updateBlock(b.id, { fill: e.target.value })}
                              />
                            </>
                          )}
                          <Btn subtle onClick={() => removeBlock(b.id)}>Remove</Btn>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={b.id}
                    data-block
                    style={{ left: pos.left, top: pos.top, width: sz.width, height: sz.height }}
                    className="absolute rounded-3xl border border-stone-200/70 bg-white/80 shadow-sm hover:shadow transition"
                    onMouseDown={(e) => onBlockMouseDown(b.id, e)}
                    onClick={() => setActiveBlockId(b.id)}
                  >
                    <BlockCard
                      block={b}
                      onChange={(patch) => updateBlock(b.id, patch)}
                      onRemove={() => removeBlock(b.id)}
                      onAttach={(u) => attachUploaded(b.id, u)}
                      isActive={activeBlockId === b.id}
                    />
                    <div
                      onMouseDown={(e) => onResizeHandleMouseDown(b.id, e)}
                      className="absolute bottom-2 right-2 h-4 w-4 cursor-se-resize rounded-md border border-stone-300 bg-white/80 shadow-sm"
                      title="Resize"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {status && (
            <div className="absolute right-4 bottom-4 text-sm text-stone-100 bg-stone-900/80 rounded-xl px-3 py-2 shadow">
              {status}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------- UI primitives ------------------- */

function Btn({
  children,
  onClick,
  title,
  tone = "neutral",
  subtle = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  tone?: "neutral" | "primary" | "accent";
  subtle?: boolean;
}) {
  const tones = {
    neutral: "bg-white text-stone-800 hover:bg-stone-50 border-stone-200/80 ring-stone-200/60",
    primary: "bg-stone-900 text-white hover:bg-stone-800 border-stone-900 ring-stone-900/20",
    accent: "bg-stone-800 text-white hover:bg-stone-700 border-stone-800 ring-stone-800/20",
  } as const;
  const minimal = "rounded-2xl border px-3 py-1.5 text-[13px] transition shadow-sm hover:shadow focus:outline-none focus:ring-4";
  const subtleCls = subtle ? "bg-white/70 hover:bg-white" : "";
  return (
    <button className={`${minimal} ${tones[tone]} ${subtleCls}`} onClick={onClick} title={title} type="button">
      {children}
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:ring-4 ring-stone-200/60 transition"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <div className="mb-2 text-stone-800 text-sm font-semibold tracking-wide">{title}</div>;
}
function EmptyHint({ text }: { text: string }) {
  return <div className="text-[12px] text-stone-600">{text}</div>;
}

/* ------------------- Template card + menu + review ------------------- */

function TemplateCard({
  tpl,
  onDragStart,
  onAdd,
  extraActions,
}: {
  tpl: TemplateSummary & { avgRating?: number | null; reviewsCount?: number | null };
  onDragStart: (e: React.DragEvent, id: string) => void;
  onAdd: () => void;
  extraActions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="group rounded-3xl border border-stone-200/70 bg-white/70 p-3 shadow-sm hover:shadow transition"
      draggable
      onDragStart={(e) => onDragStart(e, tpl.id)}
      title="Drag onto the canvas"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-none rounded-2xl bg-gradient-to-br from-stone-200 to-stone-100 shadow-inner" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] text-stone-900 font-medium">{tpl.name}</div>
          <div className="text-[11px] text-stone-500">
            {(tpl.visibility === "PUBLIC" ? "Public" : "Private")} · {tpl.author || "anonymous"}
            {typeof tpl.avgRating === "number" && (
              <> · ★ {tpl.avgRating}{tpl.reviewsCount ? ` (${tpl.reviewsCount})` : ""}</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn subtle onClick={onAdd} title="Use template">Use</Btn>
          <Btn subtle onClick={() => setOpen((v) => !v)} title="Details">{open ? "Hide" : "Info"}</Btn>
          {extraActions}
        </div>
      </div>
      {open && (
        <div className="mt-2 rounded-2xl border border-stone-200 bg-white/90 p-2 text-[12px] text-stone-700">
          {tpl.description ? <div>{tpl.description}</div> : <div className="text-stone-400">No description</div>}
        </div>
      )}
    </div>
  );
}

function ReviewButton({ onReview }: { onReview: (rating: number, text?: string) => void }) {
  return (
    <Btn
      subtle
      title="Leave a review"
      onClick={() => {
        const r = prompt("Rate 1-5:");
        if (!r) return;
        const rating = Math.max(1, Math.min(5, Number(r) || 0));
        const text = prompt("Optional suggestion/comment:");
        onReview(rating, text || undefined);
      }}
    >
      Review
    </Btn>
  );
}

function TemplateMenu({
  tpl,
  onRename,
  onVisibility,
  onDelete,
  onReview,
}: {
  tpl: TemplateSummary;
  onRename: (name: string, description?: string) => void;
  onVisibility: (vis: TemplateVisibility) => void;
  onDelete: () => void;
  onReview: (rating: number, text?: string) => void;
}) {
  return (
    <div className="inline-flex gap-1">
      <Btn
        subtle
        onClick={() => {
          const name = prompt("New template name:", tpl.name || "") ?? "";
          const desc = prompt("New description (optional):", tpl.description || "") ?? "";
          if (!name.trim()) return;
          onRename(name.trim(), desc);
        }}
        title="Rename"
      >
        Rename
      </Btn>
      {tpl.visibility === "PUBLIC" ? (
        <Btn subtle onClick={() => onVisibility("PRIVATE")} title="Make Private">Unpublish</Btn>
      ) : (
        <Btn subtle onClick={() => onVisibility("PUBLIC")} title="Make Public">Publish</Btn>
      )}
      <ReviewButton onReview={onReview} />
      <Btn
        subtle
        onClick={() => {
          if (confirm("Delete this template?")) onDelete();
        }}
        title="Delete"
      >
        Delete
      </Btn>
    </div>
  );
}

/* ------------------- Block editors (cards) ------------------- */

function BlockCard({
  block,
  onChange,
  onRemove,
  onAttach,
  isActive,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  onRemove: () => void;
  onAttach: (u: Uploaded) => void;
  isActive: boolean;
}) {
  return (
    <div className="grid h-full grid-rows-[auto,1fr,auto] gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-stone-500">
          {block.type.toLowerCase()}
        </span>
        <div className="flex items-center gap-2">
          {block.type === "TEXT" && (
            <Select
              value={block.editor ?? "MARKDOWN"}
              onChange={(v) => onChange({ editor: (v as EditorKind) || "MARKDOWN" })}
              options={["MARKDOWN", "RICH"]}
            />
          )}
          <Btn subtle onClick={onRemove} title="Remove block">Remove</Btn>
        </div>
      </div>

      <div className="min-h-0">
        {block.type === "TEXT" ? (
          <TextEditor block={block} onChange={onChange} />
        ) : block.type === "CHECKLIST" ? (
          <Checklist block={block} onChange={onChange} />
        ) : block.type === "IMAGE" ? (
          <MediaBlock kind="image" block={block} onChange={onChange} onAttach={onAttach} />
        ) : block.type === "VIDEO" ? (
          <MediaBlock kind="video" block={block} onChange={onChange} onAttach={onAttach} />
        ) : block.type === "AUDIO" ? (
          <MediaBlock kind="audio" block={block} onChange={onChange} onAttach={onAttach} />
        ) : block.type === "DRAW" ? (
          <DrawBlock block={block} onChange={onChange} />
        ) : null}
      </div>

      <div className="grid grid-cols-[1fr,auto] gap-2 items-center">
        <input
          className="w-full rounded-2xl border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 outline-none focus:ring-4 ring-stone-200/60 transition"
          placeholder="Optional caption…"
          value={block.caption ?? ""}
          onChange={(e) => onChange({ caption: e.target.value })}
        />
        {block.type === "TEXT" && (
          <span className="text-[11px] text-stone-500 px-2">
            Use **bold**, *italic*, `code` or list: <code>-</code> / checkbox: <code>- [ ]</code>
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Text editor ---------- */
function TextEditor({
  block,
  onChange,
}: {
  block: Block;
  onChange: (p: Partial<Block>) => void;
}) {
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  return block.editor === "RICH" ? (
    <RichEditor html={block.text ?? ""} onHtml={(h) => onChange({ text: h })} />
  ) : (
    <div className="grid gap-2">
      <MarkdownToolbar
        onCmd={(cmd) => {
          const t = textRef.current;
          if (!t) return;
          applyMdCommand(t, cmd);
          onChange({ text: t.value });
        }}
        extra={<Btn subtle onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Hide Preview" : "Preview"}</Btn>}
      />
      {!showPreview ? (
        <textarea
          ref={textRef}
          className="h-full w-full resize-none rounded-2xl border border-stone-200 bg-white text-stone-800 px-3 py-3 text-sm placeholder-stone-400 outline-none focus:ring-4 ring-stone-200/60 transition"
          placeholder="Write something honest…"
          value={block.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          style={{ minHeight: 120, lineHeight: "1.6" }}
        />
      ) : (
        <div
          className="rounded-2xl border border-stone-200 bg-white text-stone-800 px-4 py-3 text-sm prose prose-stone max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text ?? "") }}
        />
      )}
    </div>
  );
}

/* ---------- Checklist ---------- */
function Checklist({ block, onChange }: { block: Block; onChange: (p: Partial<Block>) => void }) {
  const list = block.checklist ?? [];
  const update = (idx: number, patch: Partial<{ text: string; done: boolean }>) => {
    const next = list.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ checklist: next, text: next.map((i) => `${i.done ? "[x]" : "[ ]"} ${i.text}`).join("\n") });
  };
  const add = () => onChange({ checklist: [...list, { id: uid(), text: "New item", done: false }] });
  const del = (idx: number) => onChange({ checklist: list.filter((_, i) => i !== idx) });
  return (
    <div className="grid gap-2">
      {list.length === 0 && <div className="text-sm text-stone-500">No items yet.</div>}
      <ul className="grid gap-2">
        {list.map((it, i) => (
          <li key={it.id} className="flex items-center gap-2">
            <input type="checkbox" checked={it.done} onChange={(e) => update(i, { done: e.target.checked })} />
            <input
              className="flex-1 rounded-xl border border-stone-200 bg-white px-2 py-1 text-sm"
              value={it.text}
              onChange={(e) => update(i, { text: e.target.value })}
            />
            <Btn subtle onClick={() => del(i)}>✕</Btn>
          </li>
        ))}
      </ul>
      <Btn subtle onClick={add}>＋ Add item</Btn>
    </div>
  );
}

/* ---------- Media ---------- */
function MediaBlock({
  kind,
  block,
  onChange,
  onAttach,
}: {
  kind: "image" | "video" | "audio";
  block: Block;
  onChange: (p: Partial<Block>) => void;
  onAttach: (u: Uploaded) => void;
}) {
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: kind === "video",
        audio: true,
      });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: kind === "video" ? "video/webm" : "audio/webm" });
        const url = URL.createObjectURL(blob);
        onChange({ url });
        stream.getTracks().forEach((t) => t.stop());
        setRecorder(null);
        setRecording(false);
      };
      setRecorder(rec);
      setRecording(true);
      rec.start();
      if (kind === "video" && videoRef.current) {
        (videoRef.current as any).srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  };
  const stopRecording = () => recorder?.stop();

  return (
    <div className="grid gap-2">
      <input
        className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 outline-none focus:ring-4 ring-stone-200/60 transition"
        placeholder={`Paste ${kind} URL or upload/record…`}
        value={block.url ?? ""}
        onChange={(e) => onChange({ url: e.target.value })}
      />
      <UploadField onUploaded={onAttach} />
      <div className="flex items-center gap-2">
        {!recording ? (
          <Btn subtle onClick={startRecording}>{kind === "video" ? "🎥 Record video" : "🎙️ Record audio"}</Btn>
        ) : (
          <Btn subtle onClick={stopRecording}>⏹ Stop</Btn>
        )}
      </div>

      {kind === "image" && block.url && (
        <img src={block.url} alt={block.caption ?? ""} className="max-h-64 w-full rounded-2xl object-cover shadow-sm" />
      )}
      {kind === "video" && (
        <>
          {recording && <video ref={videoRef} muted playsInline className="w-full rounded-2xl bg-black/20" />}
          {!recording && block.url && <video src={block.url} controls className="max-h-64 w-full rounded-2xl shadow-sm" />}
        </>
      )}
      {kind === "audio" && block.url && <audio src={block.url} controls className="w-full" />}
    </div>
  );
}

/* ---------- Draw ---------- */
function DrawBlock({ block, onChange }: { block: Block; onChange: (p: Partial<Block>) => void }) {
  const drawing = block.drawing ?? { paths: [], stroke: "#1f2937", strokeWidth: 4 };
  const [isDown, setIsDown] = useState(false);

  const start = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;
    const paths = [...drawing.paths, { points: [[x, y] as [number, number]] }];
    onChange({ drawing: { ...drawing, paths } });
    setIsDown(true);
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDown) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;
    const paths = drawing.paths.slice();
    const last = paths[paths.length - 1];
    last.points.push([x, y]);
    onChange({ drawing: { ...drawing, paths } });
  };
  const end = () => setIsDown(false);

  const clear = () => onChange({ drawing: { ...drawing, paths: [] } });
  const undo = () => onChange({ drawing: { ...drawing, paths: drawing.paths.slice(0, -1) } });

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <label className="text-[12px] text-stone-500">Stroke</label>
        <input type="color" value={drawing.stroke} onChange={(e) => onChange({ drawing: { ...drawing, stroke: e.target.value } })} />
        <label className="text-[12px] text-stone-500">Width</label>
        <input
          type="range"
          min={1}
          max={12}
          value={drawing.strokeWidth}
          onChange={(e) => onChange({ drawing: { ...drawing, strokeWidth: Number(e.target.value) } })}
        />
        <Btn subtle onClick={undo}>Undo</Btn>
        <Btn subtle onClick={clear}>Clear</Btn>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden" style={{ height: "calc(100% - 44px)" }}>
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="w-full"
          style={{ minHeight: 160, height: 300 }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        >
          {drawing.paths.map((p, i) => (
            <polyline
              key={i}
              fill="none"
              stroke={drawing.stroke}
              strokeWidth={drawing.strokeWidth}
              points={p.points.map(([x, y]) => `${x},${y}`).join(" ")}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ---------- Shapes (raw) ---------- */
function ShapeRender({ block }: { block: Block }) {
  const stroke = block.stroke ?? "#0ea5e9";
  const strokeWidth = block.strokeWidth ?? 3;
  const fill = block.fill ?? "transparent";
  return (
    <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
      {block.type === "LINE" && (
        <line x1="40" y1="80" x2="960" y2="920" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {block.type === "RECT" && (
        <rect x="80" y="120" width="840" height="760" stroke={stroke} strokeWidth={strokeWidth} fill={fill} rx="24" ry="24" />
      )}
      {block.type === "ELLIPSE" && (
        <ellipse cx="500" cy="500" rx="420" ry="300" stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
      )}
    </svg>
  );
}

/* ------------------- Markdown helpers ------------------- */
function renderMarkdown(src: string) {
  let html = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html
    .replace(/^###### (.*)$/gim, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gim, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gim, "<h4>$1</h4>")
    .replace(/^### (.*)$/gim, "<h3>$1</h3>")
    .replace(/^## (.*)$/gim, "<h2>$1</h2>")
    .replace(/^# (.*)$/gim, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/gim, "<em>$1</em>")
    .replace(/__(.+?)__/gim, "<u>$1</u>")
    .replace(/`([^`]+?)`/gim, "<code>$1</code>")
    .replace(/^- \[ \] (.*)$/gim, "<div>▢ $1</div>")
    .replace(/^- \[x\] (.*)$/gim, "<div>▣ $1</div>")
    .replace(/^- (.*)$/gim, "<li>$1</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return `<p>${html}</p>`;
}

type MdCmd = "bold" | "italic" | "h1" | "h2" | "ul" | "checkbox";
function applyMdCommand(el: HTMLTextAreaElement, cmd: MdCmd) {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const sel = value.slice(s, e);
  const before = value.slice(0, s);
  const after = value.slice(e);
  const wrap = (pre: string, post: string) => {
    const nv = before + pre + (sel || "text") + post + after;
    const pos = (before + pre).length + (sel || "text").length;
    el.value = nv;
    el.setSelectionRange(pos, pos);
    el.focus();
  };
  switch (cmd) {
    case "bold": wrap("**", "**"); break;
    case "italic": wrap("*", "*"); break;
    case "h1": el.value = before + "# " + (sel || "Heading") + after; break;
    case "h2": el.value = before + "## " + (sel || "Heading") + after; break;
    case "ul": el.value = before + "- " + (sel || "List item") + after; break;
    case "checkbox": el.value = before + "- [ ] " + (sel || "Todo") + after; break;
  }
}
function MarkdownToolbar({ onCmd, extra }: { onCmd: (c: MdCmd) => void; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Btn subtle onClick={() => onCmd("bold")}>B</Btn>
      <Btn subtle onClick={() => onCmd("italic")}><i>I</i></Btn>
      <Btn subtle onClick={() => onCmd("h1")}>H1</Btn>
      <Btn subtle onClick={() => onCmd("h2")}>H2</Btn>
      <Btn subtle onClick={() => onCmd("ul")}>• List</Btn>
      <Btn subtle onClick={() => onCmd("checkbox")}>☐ Todo</Btn>
      {extra}
    </div>
  );
}

/* ---------- Rich text ---------- */
function RichEditor({
  html,
  onHtml,
}: {
  html: string;
  onHtml: (h: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current!;
    if (!el) return;
    if (el.innerHTML !== html) el.innerHTML = html || "";
  }, [html]);
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    onHtml(ref.current?.innerHTML || "");
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Btn subtle onClick={() => exec("bold")}>B</Btn>
        <Btn subtle onClick={() => exec("italic")}><i>I</i></Btn>
        <Btn subtle onClick={() => exec("underline")}><u>U</u></Btn>
        <Btn subtle onClick={() => exec("insertUnorderedList")}>• List</Btn>
        <Btn subtle onClick={() => exec("formatBlock", "<h2>")}>H2</Btn>
        <Btn subtle onClick={() => exec("formatBlock", "<blockquote>")}>❝ Quote</Btn>
      </div>
      <div
        ref={ref}
        contentEditable
        className="min-h-[160px] w-full rounded-2xl border border-stone-200 bg-white text-stone-800 px-3 py-3 text-sm outline-none focus:ring-4 ring-stone-200/60 transition"
        onInput={() => onHtml(ref.current?.innerHTML || "")}
        style={{ lineHeight: "1.6" }}
      />
    </div>
  );
}

/* ------------------- Mood picker ------------------- */
function MoodPicker({ value, onChange }: { value: Mood; onChange: (m: Mood) => void }) {
  const opts: Mood[] = ["😍", "😀", "🙂", "😐", "😟", "😢", "😡"];
  return (
    <div className="inline-flex rounded-2xl border border-stone-200 bg-white/70 overflow-hidden">
      {opts.map((m) => (
        <button key={m} className={`px-2 py-1 text-sm ${m === value ? "bg-white" : ""}`} onClick={() => onChange(m)} type="button" title="Mood">
          {m}
        </button>
      ))}
    </div>
  );
}
