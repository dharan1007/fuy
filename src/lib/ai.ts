// src/lib/ai.ts
import { Mood, analyzeEntryForTags } from "@/lib/templates";

/** Options are optional; the generator mainly relies on user free text. */
export type AIOptions = {
  boostCreativity?: boolean;
  style?: "concise" | "reflective" | "playful" | "therapeutic" | "coach";
  include?: {
    text?: boolean;
    checklist?: boolean;
    draw?: boolean;
    image?: boolean;
    audio?: boolean;
    video?: boolean;
  };
  timeboxMinutes?: number;
  mood?: Mood | null;
};

export type AIBlockPlan =
  | { kind: "TEXT"; caption?: string; text: string }
  | { kind: "CHECKLIST"; caption?: string; items: string[] }
  | { kind: "DRAW"; caption?: string }
  | { kind: "IMAGE"; caption?: string }
  | { kind: "AUDIO"; caption?: string }
  | { kind: "VIDEO"; caption?: string };

export type AIPlan = {
  title: string;
  summary: string;
  mood?: Mood;
  tags: string[];
  blocks: AIBlockPlan[];
};

/* ---------------- helpers: theme + mood ---------------- */

const THEME_HINTS = [
  ["morning", "routine", "start", "wake"],
  ["gratitude", "grateful", "appreciate"],
  ["focus", "deep work", "study", "learn"],
  ["health", "gym", "walk", "run", "yoga", "workout", "sleep"],
  ["anxiety", "stress", "worry", "overwhelm"],
  ["family", "friends", "relationship", "partner"],
  ["work", "project", "deadline", "write", "code", "design"],
  ["grocery", "groceries", "shopping", "supermarket", "buy"],
  ["dog", "pet", "walk", "feed", "vet"],
  ["homework", "assignment", "school", "class", "lecture", "exam"],
  ["remind", "reminder", "remember", "due", "at", "pm", "am"],
];

function detectThemes(text: string) {
  const t = text.toLowerCase();
  const themes = new Set<string>();
  for (const group of THEME_HINTS) {
    if (group.some((k) => t.includes(k))) themes.add(group[0]);
  }
  return Array.from(themes);
}

function smartTitle(text: string): string {
  const first = (text.split(/\r?\n/).find(Boolean) || "").trim();
  if (first.length >= 8 && first.length <= 80) {
    return first.replace(/^[-*#\d.\s]+/, "").replace(/[:.]\s*$/, "");
  }
  const now = new Date();
  const part = now.getHours() < 12 ? "Morning" : now.getHours() < 18 ? "Afternoon" : "Evening";
  const themes = detectThemes(text);
  const tag = themes[0] ? themes[0][0].toUpperCase() + themes[0].slice(1) : "Plan";
  return `${part} ${tag}`;
}

function pickMood(text: string, explicit?: Mood | null): Mood | undefined {
  if (explicit) return explicit;
  const t = text.toLowerCase();
  if (/\b(grateful|love|romantic|joy|bliss|awesome)\b/.test(t)) return "😍";
  if (/\b(good|great|win|excited|happy|progress)\b/.test(t)) return "😀";
  if (/\b(calm|neutral|okay|fine|content)\b/.test(t)) return "🙂";
  if (/\b(worried|anxious|stress|uncertain|overwhelm)\b/.test(t)) return "😟";
  if (/\b(sad|down|tired|exhausted|drained)\b/.test(t)) return "😢";
  if (/\b(angry|mad|frustrated|annoyed|irritated)\b/.test(t)) return "😡";
  return undefined;
}

/* ---------------- routines ---------------- */

function buildMorningRoutine(desc: string): string[] {
  const hasWorkout = /\b(workout|gym|run|yoga|exercise|walk)\b/i.test(desc);
  const hasMindful = /\b(meditate|breath|breathe|journ(al|aling)|gratitude|reflect)\b/i.test(desc);
  const hasSunlight = /\b(sun|light|outside)\b/i.test(desc);
  const wantsDeepWork = /\b(deep work|focus|write|code|study)\b/i.test(desc);

  const out: string[] = [];
  out.push("Wake up + hydrate (300ml)");
  if (hasSunlight) out.push("Get 5–10 min sunlight / open window");
  else out.push("Stretch by a window (3–5 min)");

  if (hasMindful) out.push("2–5 min breathing or quick gratitude");
  if (hasWorkout) out.push("Movement: light mobility or short workout (10–20m)");

  out.push("Plan day: 3 MITs + 1 tiny win");
  if (wantsDeepWork) out.push("1st deep-work block (25–45m): phone outside room");
  out.push("Protein-forward breakfast");
  return out;
}

/* ---------------- text styling ---------------- */

function styledText(text: string, style?: AIOptions["style"], boost?: boolean): string {
  const base =
    text.trim() ||
    "Write about your day, highlights, and one thing you learned.";
  const creative = boost ? "\n\n— Add one tiny experiment to try today." : "";
  switch (style) {
    case "concise":
      return `## Summary\n${base}\n\n- Key point\n- Risk / concern\n- Next micro-step${creative}`;
    case "playful":
      return `## Playful Check-in\n${base}\n\n> If today were a comic panel, what happens?\n- Tiny win\n- Funny moment\n- One curiosity${creative}`;
    case "therapeutic":
      return `## Grounding\n${base}\n\n- Sensations (body)\n- Thought loop\n- Self-compassion line${creative}`;
    case "coach":
      return `## Intent & Leverage\n${base}\n\n- Outcome (clear)\n- Constraint (one)\n- Leverage point (one)\n- 1st step${creative}`;
    default:
      return `## Reflection\n${base}\n\n- What mattered?\n- What surprised me?\n- What will I try next?${creative}`;
  }
}

/* ---------------- grocery parsing ---------------- */

const GROCERY_MAP: Record<string, string> = {
  apple: "Produce",
  banana: "Produce",
  orange: "Produce",
  lettuce: "Produce",
  spinach: "Produce",
  tomato: "Produce",
  onion: "Produce",
  potato: "Produce",
  carrot: "Produce",
  cucumber: "Produce",

  milk: "Dairy",
  yogurt: "Dairy",
  butter: "Dairy",
  cheese: "Dairy",
  "oat milk": "Dairy",
  "almond milk": "Dairy",

  chicken: "Meat",
  beef: "Meat",
  pork: "Meat",
  salmon: "Meat",
  tuna: "Meat",
  egg: "Meat",

  rice: "Pantry",
  pasta: "Pantry",
  flour: "Pantry",
  sugar: "Pantry",
  salt: "Pantry",
  oil: "Pantry",
  "olive oil": "Pantry",
  cereal: "Pantry",
  coffee: "Pantry",
  tea: "Pantry",
  bread: "Bakery",

  "ice cream": "Frozen",
  "frozen berries": "Frozen",
  "frozen peas": "Frozen",

  "dog food": "Pet",
  "cat food": "Pet",
  treats: "Pet",

  "toilet paper": "Household",
  detergent: "Household",
  soap: "Household",
  shampoo: "Personal Care",
  toothpaste: "Personal Care",
  water: "Beverages",
  juice: "Beverages",
  soda: "Beverages",
};

function normalizeQty(s: string) {
  const m = s.match(/\b(\d+)\s*(x|pcs|kg|g|l|ml)?\b/i);
  return m ? ` (${m[1]}${m[2] ? m[2].toLowerCase() : "x"})` : "";
}

function parseGroceries(text: string): Record<string, string[]> {
  const t = text.toLowerCase();
  if (!/\b(grocery|groceries|shopping|supermarket|buy|store)\b/.test(t)) return {};
  const candidates = t
    .split(/[:\-–]\s*/).slice(1).join(" ")
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: Record<string, string[]> = {};
  const push = (cat: string, label: string) => {
    if (!out[cat]) out[cat] = [];
    if (!out[cat].includes(label)) out[cat].push(label);
  };

  for (let raw of candidates) {
    raw = raw.replace(/\b(and|also|please)\b/g, "").trim();
    if (!raw) continue;

    const multi = Object.keys(GROCERY_MAP).filter((k) => k.includes(" "));
    let matched = multi.find((k) => raw.includes(k));
    if (!matched) {
      const token = raw.split(/\s+/)[0];
      matched = Object.keys(GROCERY_MAP).find((k) => k === token);
    }
    if (matched) {
      push(GROCERY_MAP[matched], `${capitalize(matched)}${normalizeQty(raw)}`);
      continue;
    }
    const label = raw.replace(/\s*\b(x|pcs|kg|g|l|ml)\b.*/i, "").trim();
    push("Pantry", `${capitalize(label)}${normalizeQty(raw)}`);
  }

  return out;
}

/* ---------------- reminders / time parsing ---------------- */

const DOW = ["sun","mon","tue","wed","thu","fri","sat"];

function parseTimeTokens(s: string) {
  const m = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = m[2] ? m[2] : "00";
  let ap = m[3]?.toLowerCase() as "am" | "pm" | undefined;

  if (!ap) {
    if (/\bmorning\b/.test(s)) ap = "am";
    else if (/\bevening|night|pm\b/.test(s)) ap = "pm";
  }
  if (!ap && hh <= 7) ap = "am";
  if (!ap && hh >= 8) ap = "pm";

  if (ap === "pm" && hh < 12) hh += 12;
  if (ap === "am" && hh === 12) hh = 0;

  const disp_h = ((hh + 11) % 12) + 1;
  const disp_ap = ap || (hh < 12 ? "am" : "pm");
  return `${disp_h}:${mm} ${disp_ap}`;
}

function parseReminders(text: string): string[] {
  if (!/\b(remind|remember|at\s+\d|tomorrow|today|tonight|mon|tue|wed|thu|fri|sat|sun)\b/i.test(text)) return [];
  const lines = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);

  const out: string[] = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    const time = parseTimeTokens(low);
    const onDOW = DOW.find((d) => low.includes(d));
    const hasToday = /\btoday|tonight\b/.test(low);
    const hasTomorrow = /\btomorrow\b/.test(low);

    if (/\b(remind|remember|call|pay|send|submit|meeting|doctor|dentist)\b/.test(low) || time || onDOW || hasToday || hasTomorrow) {
      const label = line.replace(/\s*\bat\s+\d.*$/i, "").trim();
      const when =
        (hasToday && "today") ||
        (hasTomorrow && "tomorrow") ||
        (onDOW && onDOW) ||
        "";
      const clock = time ? ` at ${time}` : "";
      out.push(`⏰ ${capitalize(label)}${when ? " — " + when : ""}${clock}`);
    }
  }
  return Array.from(new Set(out));
}

/* ---------------- tasks / homework / pets ---------------- */

function pullBullets(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const bullets = lines
    .filter((l) => /^[-*]\s+/.test(l) || /^\d+[.)]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, ""));
  return bullets;
}

function verbsFromText(text: string): string[] {
  const lines = text.split(/[\n.]+/).map((l) => l.trim()).filter(Boolean);
  return lines
    .filter((l) =>
      /\b(send|call|email|write|draft|edit|publish|review|study|exercise|walk|cook|clean|organize|plan|focus|pay|submit|book|buy)\b/i.test(l)
    )
    .slice(0, 20);
}

function smartChecklist(text: string, minutes?: number): string[] {
  const raw = Array.from(new Set([...pullBullets(text), ...verbsFromText(text)]));
  const sanitized = raw.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 12);
  const end = minutes ? ` (${minutes}m)` : "";
  return sanitized.map((s) => s + end);
}

function parseHomework(text: string): string[] {
  if (!/\b(homework|assignment|study|class|math|science|english|history|essay|exam|quiz)\b/i.test(text)) return [];
  const out = new Set<string>();
  const lines = text.split(/[\n,;]+/).map((s) => s.trim());
  for (const l of lines) {
    if (/\b(math|algebra|calculus)\b/i.test(l)) out.add("📘 Math: problem set");
    if (/\b(science|physics|chemistry|bio)\b/i.test(l)) out.add("🧪 Science: review notes");
    if (/\b(english|essay|write|reading)\b/i.test(l)) out.add("📚 English: reading/writing");
    if (/\b(history|geo|civics)\b/i.test(l)) out.add("🏛️ History: outline");
    if (/\b(exam|quiz|test)\b/i.test(l)) out.add("📝 Exam prep: flashcards");
  }
  const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dow = DOW.find((d) => new RegExp(d, "i").test(text));
  if (dow) out.add(`Due: ${dow}`);
  return Array.from(out);
}

function parsePets(text: string): string[] {
  if (!/\b(dog|puppy|cat|pet)\b/i.test(text)) return [];
  const out: string[] = [];
  if (/\b(walk)\b/i.test(text)) {
    const t1 = parseTimeTokens(text.toLowerCase().includes("am") ? text : "7 am") || "7:00 am";
    const t2 = parseTimeTokens(text.toLowerCase().includes("pm") ? text : "8 pm") || "8:00 pm";
    out.push(`🐶 Walk dog — ${t1}`);
    out.push(`🐶 Walk dog — ${t2}`);
  }
  if (/\b(feed|food)\b/i.test(text)) {
    out.push("🍖 Feed pet — morning");
    out.push("🍖 Feed pet — evening");
  }
  if (/\b(vet|groom)\b/i.test(text)) out.push("🐾 Book vet/grooming");
  return Array.from(new Set(out));
}

/* ---------------- captions for optional media ---------------- */

function mediaCaptions(desc: string) {
  const t = desc.toLowerCase();
  const caps: { image?: string; draw?: string; audio?: string; video?: string } = {};
  if (/\b(mood|aesthetic|vibe|board|vision)\b/.test(t)) caps.image = "Capture the vibe";
  if (/\b(map|architecture|diagram|layout|plan)\b/.test(t)) caps.draw = "Sketch structure";
  if (/\b(brainstorm|rant|journal|voice)\b/.test(t)) caps.audio = "Speak it out";
  if (/\b(demo|practice|routine|form)\b/.test(t)) caps.video = "Quick demo clip";
  return caps;
}

/* ---------------- main: generatePlan ---------------- */

export async function generatePlan(description: string, options: AIOptions = {}): Promise<AIPlan> {
  const desc = (description || "").trim();

  const { summary, tags } = analyzeEntryForTags(desc || "journal");
  const themes = detectThemes(desc);
  const mood = pickMood(desc, options.mood ?? null);
  const title = smartTitle(desc);

  const blocks: AIBlockPlan[] = [];

  // Narrative (always helpful)
  blocks.push({
    kind: "TEXT",
    caption: "Narrative",
    text: styledText(desc, options.style ?? "reflective", options.boostCreativity ?? true),
  });

  // Morning routine
  if (/\b(morning|routine|start my day|wake up|sunrise)\b/i.test(desc)) {
    const routine = buildMorningRoutine(desc);
    blocks.push({ kind: "CHECKLIST", caption: "Morning Routine", items: routine });
  }

  // General MITs / Tasks
  const mitHints = /\b(MIT|most important|focus|top\s*\d|today)\b/i.test(desc);
  const tasks = smartChecklist(desc, options.timeboxMinutes ?? (mitHints ? 30 : undefined));
  if (tasks.length) {
    blocks.push({
      kind: "CHECKLIST",
      caption: mitHints ? "Today — MITs" : "Tasks",
      items: Array.from(new Set(tasks)).slice(0, 10),
    });
  }

  // Groceries (auto-categorized)
  const groceries = parseGroceries(desc);
  const groceryCats = Object.keys(groceries);
  if (groceryCats.length) {
    const flat = groceryCats.flatMap((cat) => groceries[cat].map((it) => `${cat} — ${it}`));
    blocks.push({ kind: "CHECKLIST", caption: "Groceries", items: flat });
  }

  // Reminders / time-sensitive
  const reminders = parseReminders(desc);
  if (reminders.length) {
    blocks.push({ kind: "CHECKLIST", caption: "Reminders", items: reminders });
  }

  // Homework / study
  const homework = parseHomework(desc);
  if (homework.length) {
    blocks.push({ kind: "CHECKLIST", caption: "Homework / Study", items: homework });
  }

  // Pets / dog care
  const pets = parsePets(desc);
  if (pets.length) {
    blocks.push({ kind: "CHECKLIST", caption: "Home & Pets", items: pets });
  }

  // Optional media prompts (only if hinted)
  const caps = mediaCaptions(desc);
  if (caps.image) blocks.push({ kind: "IMAGE", caption: caps.image });
  if (caps.draw) blocks.push({ kind: "DRAW", caption: caps.draw });
  if (caps.audio) blocks.push({ kind: "AUDIO", caption: caps.audio });
  if (caps.video) blocks.push({ kind: "VIDEO", caption: caps.video });

  // Follow-up questions (now clearly actionable via ⌘/Ctrl+Enter)
  const followups: string[] = [];
  if (/\bmorning|routine\b/i.test(desc)) {
    followups.push("What time do you prefer to wake and start deep work?");
  }
  if (Object.keys(groceries).length) followups.push("Any brand preferences or budget for groceries?");
  if (reminders.length) followups.push("Do you want specific dates added for those reminders?");
  if (pets.length) followups.push("Dog breed/energy? Adjust walk duration?");
  if (homework.length) followups.push("Exact due dates for assignments?");
  if (!followups.length) followups.push("Anything to add or change? (Reply in plain text.)");

  blocks.push({
    kind: "TEXT",
    caption: "Questions",
    text:
      "### Quick questions\n" +
      followups.map((q) => `- ${q}`).join("\n") +
      "\n\n_Reply directly in this block **then press ⌘/Ctrl+Enter** to regenerate your plan._",
  });

  const tagPlus = Array.from(new Set([...(tags ?? []), ...themes.map((t) => `#${t}`)]));

  return { title, summary, mood, tags: tagPlus, blocks };
}

/* ---------------- utils ---------------- */

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default generatePlan;
