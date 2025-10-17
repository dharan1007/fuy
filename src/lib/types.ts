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
  blocks: Block[];
  summary: string;
};
