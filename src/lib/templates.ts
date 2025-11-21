// Shared types, helpers, and localStorage-backed persistence (monochrome UI doesn’t affect logic)

export type UploadedType = "IMAGE" | "VIDEO" | "AUDIO";

export type BlockType = "TEXT" | "CHECKLIST" | "IMAGE" | "VIDEO" | "AUDIO" | "DRAW";
export type EditorKind = "MARKDOWN" | "RICH";

export type Block = {
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
  filters?: { brightness: number; contrast: number; saturate: number };
  overlay?: { paths: { points: [number, number][] }[]; stroke: string; strokeWidth: number };
};

export type Sheet = {
  id: string;
  name: string;
  blocks: Block[];
};

export type TemplateVisibility = "PRIVATE" | "PUBLIC";

export type TemplateReview = {
  id: string;
  rating: number;
  text?: string;
  at: string;
  by?: string;
};

export type TemplateSummary = {
  id: string;
  name: string;
  description?: string | null;
  visibility: TemplateVisibility;
  author?: string | null;
  createdAt?: string | null;
  avgRating?: number | null;
  reviewsCount?: number | null;
  sourceId?: string | null;
};

export type TemplateFull = TemplateSummary & {
  blocks: Omit<Block, "x" | "y" | "id">[];
  reviews?: TemplateReview[];
};

export type Mood = "😍" | "😀" | "🙂" | "😐" | "😟" | "😢" | "😡";

export type JournalEntry = {
  id: string;
  title: string;
  dateISO: string;
  coverUrl?: string;
  mood?: Mood;
  tags?: string[];
  sheets: Sheet[];
  blocks?: Block[]; // legacy support
  summary: string;
};

// -------------------- helpers --------------------
export const MIN_W_CARD = 220;
export const MIN_H_CARD = 120;

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const pickSummary = (blocks: Block[]) => {
  const text = blocks
    .filter(
      (b) =>
        (b.type === "TEXT" || b.type === "CHECKLIST") &&
        ((b.text?.trim()?.length ?? 0) > 0)
    )
    .map((b) => (b.text ?? "").trim())
    .join("\n\n")
    .slice(0, 2000);
  return text || "(canvas)";
};

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

export function analyzeEntryForTags(text: string) {
  const lower = text.toLowerCase();
  const tagSet = new Set<string>();
  for (const [k, tag] of Object.entries(KEYWORDS_TO_TAGS)) if (lower.includes(k)) tagSet.add(tag);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  const summary =
    sentences.join(" ") ||
    (text.trim().length > 120 ? text.trim().slice(0, 200) + "…" : text.trim());
  return { summary, tags: Array.from(tagSet) };
}

export const formatDay = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric" });

// -------------------- defaults --------------------
export const DEFAULT_TEMPLATES: TemplateFull[] = [
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
      {
        type: "TEXT",
        text: "## Morning Focus\n- [ ] Top 1\n- [ ] Top 2",
        editor: "MARKDOWN",
        caption: "Priorities",
        w: 360,
        h: 200,
      },
      {
        type: "TEXT",
        text: "## Gratitude\n- I’m grateful for …",
        editor: "MARKDOWN",
        caption: "Gratitude",
        w: 360,
        h: 200,
      },
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
    id: "def-mood-board",
    name: "Mood Board",
    description: "Image + notes starter.",
    visibility: "PUBLIC",
    author: "system",
    createdAt: new Date().toISOString(),
    blocks: [
      { type: "IMAGE", url: "", caption: "Drop an image", w: 480, h: 280 },
      { type: "TEXT", text: "Describe the vibe…", editor: "MARKDOWN", w: 360, h: 200 },
      { type: "DRAW", drawing: { stroke: "#000000", strokeWidth: 2, paths: [] }, w: 420, h: 280 },
    ],
    reviews: [],
  },
];

// -------------------- storage keys --------------------
const TPL_STORE_KEY = "journal-templates-v8";
const TPL_COMMUNITY_KEY = "journal-community-v5";
const ENT_STORE_KEY = "journal-entries-v6";

// -------------------- templates storage --------------------
const calcAvgRating = (tpl: TemplateFull) => {
  const r = tpl.reviews ?? [];
  if (!r.length) return null;
  const avg = r.reduce((s, x) => s + (x.rating || 0), 0) / r.length;
  return Math.round(avg * 10) / 10;
};

export function loadLocalTemplates(): TemplateFull[] {
  try {
    const raw = localStorage.getItem(TPL_STORE_KEY);
    const user = raw ? (JSON.parse(raw) as TemplateFull[]) : [];
    for (const t of user) {
      t.avgRating = calcAvgRating(t);
      t.reviewsCount = t.reviews?.length ?? 0;
    }
    return user;
  } catch {
    return [];
  }
}

export function saveLocalTemplates(templates: TemplateFull[]) {
  try {
    localStorage.setItem(TPL_STORE_KEY, JSON.stringify(templates));
  } catch {}
}

export function loadCommunity(): TemplateFull[] {
  try {
    const raw = localStorage.getItem(TPL_COMMUNITY_KEY);
    const pub = raw ? (JSON.parse(raw) as TemplateFull[]) : [];
    const map = new Map<string, TemplateFull>();
    for (const t of DEFAULT_TEMPLATES)
      map.set(t.id, {
        ...t,
        avgRating: calcAvgRating(t),
        reviewsCount: t.reviews?.length ?? 0,
      });
    for (const t of pub)
      map.set(t.id, {
        ...t,
        avgRating: calcAvgRating(t),
        reviewsCount: t.reviews?.length ?? 0,
      });
    return Array.from(map.values());
  } catch {
    return DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      avgRating: calcAvgRating(t),
      reviewsCount: t.reviews?.length ?? 0,
    }));
  }
}

export function saveCommunity(templates: TemplateFull[]) {
  try {
    const userOnly = templates.filter((t) => !t.id.startsWith("def-"));
    localStorage.setItem(TPL_COMMUNITY_KEY, JSON.stringify(userOnly));
  } catch {}
}

export function newTemplateId() {
  return "tpl-" + uid();
}

// -------------------- entries storage --------------------
export function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(ENT_STORE_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: JournalEntry[]) {
  try {
    localStorage.setItem(ENT_STORE_KEY, JSON.stringify(entries));
  } catch {}
}
