"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ----------------------------------------------------------------
 * Utilities
 * ---------------------------------------------------------------- */
type SaveResp = { ok: boolean };

async function postJSON(url: string, data: any): Promise<SaveResp> {
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

const VIS = ["PUBLIC", "FRIENDS", "PRIVATE"] as const;
type Visibility = (typeof VIS)[number];

const FOCI = ["JOY", "CONNECTION", "CREATIVITY", "GROWTH", "HEALTH"] as const;
type Focus = (typeof FOCI)[number];

function generateAlias(seed?: number) {
  const adjs = [
    "Quiet", "Gentle", "Curious", "Sunlit", "Soft", "Hidden", "Calm",
    "Amber", "River", "Mossy", "Silver", "Plain", "Kind", "Sincere",
  ];
  const nouns = [
    "Harbor", "Meadow", "Atlas", "Comet", "Fern", "Beacon", "Drift",
    "Lumen", "Thicket", "Horizon", "Echo", "North", "Field", "Grove",
  ];
  const rand = (n: number) =>
    seed != null ? (seed + n * 9301 + 49297) % 233280 / 233280 : Math.random();
  const ai = Math.floor(rand(1) * adjs.length);
  const ni = Math.floor(rand(2) * nouns.length);
  return `${adjs[ai]} ${nouns[ni]}`;
}

// very small stopword set to keep it light in-client
const STOP = new Set(
  "i me my myself we our ours you your yours he him his she her hers it its they them their the a an and or but if then than to for with on in of from by at as is are be was were do does did not".split(
    " "
  )
);

function extractKeywords(text: string, extra: string[] = [], max = 6) {
  const base = (text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w) && w.length > 2);

  const focusBoost = extra.map((x) => x.toLowerCase());
  const counts = new Map<string, number>();
  for (const w of base) counts.set(w, (counts.get(w) || 0) + 1);
  for (const w of focusBoost) counts.set(w, (counts.get(w) || 0) + 2);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function debounce<F extends (...args: any[]) => void>(fn: F, ms = 400) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function since(ts?: string | null) {
  if (!ts) return Infinity;
  return Date.now() - new Date(ts).getTime();
}

/** ----------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------- */
export default function PrioritizeAndPersonalize() {
  const router = useRouter();

  // identity
  const [usePseudonym, setUsePseudonym] = useState(true);
  const [displayName, setDisplayName] = useState(generateAlias());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // goals + focus
  const [goals, setGoals] = useState("");
  const [focus, setFocus] = useState<Focus[]>(["JOY", "CONNECTION"]);
  const [defaultVis, setDefaultVis] = useState<Visibility>("FRIENDS");

  // prioritization (simple Eisenhower + weight)
  type Task = { id: string; text: string; importance: number; urgency: number };
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const addTask = (text: string) =>
    setRawTasks((t) => [
      ...t,
      { id: cryptoRandomId(), text, importance: 3, urgency: 2 },
    ]);
  const updateTask = (id: string, patch: Partial<Task>) =>
    setRawTasks((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const deleteTask = (id: string) =>
    setRawTasks((t) => t.filter((x) => x.id !== id));

  // recommendations
  type Book = {
    key: string;
    title: string;
    author: string;
    year?: number;
    cover?: string;
    openlibUrl?: string;
  };
  type ItunesItem = {
    trackId: number;
    trackName: string;
    artistName: string;
    collectionName?: string;
    previewUrl?: string;
    artworkUrl100?: string;
    trackViewUrl?: string;
    kind?: string;
  };

  const [books, setBooks] = useState<Book[]>([]);
  const [music, setMusic] = useState<ItunesItem[]>([]);
  const [podcasts, setPodcasts] = useState<ItunesItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const lastFetchRef = useRef<string | null>(null);

  const canContinue = useMemo(
    () => displayName.trim().length >= 2 && goals.trim().length >= 3,
    [displayName, goals]
  );

  const toggleFocus = (f: Focus) =>
    setFocus((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );

  const genAlias = () => setDisplayName(generateAlias());

  // derive priorities
  const prioritized = useMemo(() => {
    const wJoy = focus.includes("JOY") ? 0.3 : 0.15;
    const wConn = focus.includes("CONNECTION") ? 0.25 : 0.1;
    const wCr = focus.includes("CREATIVITY") ? 0.25 : 0.1;
    const wGrowth = focus.includes("GROWTH") ? 0.3 : 0.1;
    const wHealth = focus.includes("HEALTH") ? 0.3 : 0.1;

    return [...rawTasks]
      .map((t) => {
        const score =
          t.importance * 0.6 +
          t.urgency * 0.4 +
          (wJoy + wConn + wCr + wGrowth + wHealth);
        const quadrant =
          t.importance >= 3 && t.urgency >= 3
            ? "Do now"
            : t.importance >= 3 && t.urgency < 3
            ? "Schedule"
            : t.importance < 3 && t.urgency >= 3
            ? "Delegate"
            : "Maybe later";
        return { ...t, score, quadrant };
      })
      .sort((a, b) => b.score - a.score);
  }, [rawTasks, focus]);

  /** ------------------------ working recommendations ---------------------
   * Books: Open Library (no API key): https://openlibrary.org/search.json?q=...
   * Music: Apple iTunes Search (no API key): https://itunes.apple.com/search
   * Podcasts: Apple iTunes Search with media=podcast
   * These endpoints are public, CORS-friendly and constantly updated.
   * --------------------------------------------------------------------- */

  const refreshRecs = useCallback(
    async (force = false) => {
      const cacheKey = "fuy.recs.v1";
      const cached = safeLocalGet<{ ts: string; books: Book[]; music: ItunesItem[]; podcasts: ItunesItem[]; sig: string }>(
        cacheKey
      );
      const sig = JSON.stringify({
        k: extractKeywords(goals, focus),
        f: focus.sort(),
      });

      // reuse cache for 6 hours unless force or keywords changed
      if (
        !force &&
        cached &&
        since(cached.ts) < 6 * 60 * 60 * 1000 &&
        cached.sig === sig
      ) {
        setBooks(cached.books);
        setMusic(cached.music);
        setPodcasts(cached.podcasts);
        lastFetchRef.current = cached.ts;
        return;
      }

      if (!goals.trim()) {
        setBooks([]);
        setMusic([]);
        setPodcasts([]);
        return;
      }

      setLoadingRecs(true);
      setRecError(null);

      const keywords = extractKeywords(goals, focus);
      const q = encodeURIComponent(keywords.slice(0, 4).join(" "));

      try {
        // Books
        const bRes = await fetch(
          `https://openlibrary.org/search.json?q=${q}&limit=12`
        );
        const bJson = (await bRes.json()) as any;
        const bItems: Book[] = (bJson?.docs || []).slice(0, 12).map((d: any) => ({
          key: d.key,
          title: d.title,
          author: (d.author_name && d.author_name[0]) || "Unknown",
          year: d.first_publish_year,
          cover: d.cover_i
            ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
            : undefined,
          openlibUrl: d.key ? `https://openlibrary.org${d.key}` : undefined,
        }));

        // Music (tracks)
        const mRes = await fetch(
          `https://itunes.apple.com/search?term=${q}&media=music&limit=12`
        );
        const mJson = (await mRes.json()) as any;
        const mItems: ItunesItem[] = (mJson?.results || []).slice(0, 12);

        // Podcasts
        const pRes = await fetch(
          `https://itunes.apple.com/search?term=${q}&media=podcast&limit=12`
        );
        const pJson = (await pRes.json()) as any;
        const pItems: ItunesItem[] = (pJson?.results || []).slice(0, 12);

        setBooks(bItems);
        setMusic(mItems);
        setPodcasts(pItems);
        const payload = {
          ts: new Date().toISOString(),
          books: bItems,
          music: mItems,
          podcasts: pItems,
          sig,
        };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch {}
        lastFetchRef.current = payload.ts;
      } catch (e) {
        setRecError(
          "Couldn’t load live suggestions at the moment. Check your connection and try again."
        );
      } finally {
        setLoadingRecs(false);
      }
    },
    [goals, focus]
  );

  // auto-refresh recs when goals/focus change (debounced)
  const debouncedRefresh = useRef(debounce((force: boolean) => refreshRecs(force), 500)).current;
  useEffect(() => {
    debouncedRefresh(false);
  }, [goals, focus, debouncedRefresh]);

  // seed from localStorage if present (instant UX)
  useEffect(() => {
    const saved = safeLocalGet<any>("fuy.onboarding.v2");
    if (saved) {
      setUsePseudonym(saved.pseudonymous ?? true);
      setDisplayName(saved.displayName ?? generateAlias());
      setGoals(saved.goals ?? "");
      setFocus(saved.focus ?? ["JOY", "CONNECTION"]);
      setDefaultVis(saved.defaultVisibility ?? "FRIENDS");
      setRawTasks(saved.tasks ?? []);
    }
  }, []);

  // persist lightweight mirror on every meaningful change
  useEffect(() => {
    const payload = {
      displayName,
      pseudonymous: usePseudonym,
      goals,
      focus,
      defaultVisibility: defaultVis,
      tasks: rawTasks,
      ts: new Date().toISOString(),
    };
    try {
      localStorage.setItem("fuy.onboarding.v2", JSON.stringify(payload));
    } catch {}
  }, [displayName, usePseudonym, goals, focus, defaultVis, rawTasks]);

  const saveAll = useCallback(async () => {
    setSaving(true);
    setErr(null);

    const nameToSave = displayName.trim() || generateAlias();

    // 1) Update profile (displayName + short bio)
    const profileOk = (
      await postJSON("/api/profile", {
        displayName: nameToSave,
        bio: goals.trim().slice(0, 240),
      })
    ).ok;

    // 2) Create onboarding post snapshot (private)
    const content = [
      "Onboarding snapshot",
      `Name: ${nameToSave}${usePseudonym ? " (pseudonymous)" : ""}`,
      `Focus: ${focus.join(", ") || "—"}`,
      `Default visibility: ${defaultVis}`,
      "",
      "Goals:",
      goals.trim(),
      "",
      "Top priorities:",
      ...prioritized.slice(0, 5).map((t, i) => `${i + 1}. ${t.text}`),
    ].join("\n");

    const postOk = (
      await postJSON("/api/posts", {
        feature: "CHECKIN",
        visibility: "PRIVATE",
        content,
        joyScore: focus.includes("JOY") ? 1 : 0,
        connectionScore: focus.includes("CONNECTION") ? 1 : 0,
        creativityScore: focus.includes("CREATIVITY") ? 1 : 0,
      })
    ).ok;

    // 3) Seed a few metrics
    const m1 = await postJSON("/api/stats", {
      type: "onboarding_done",
      category: "SETUP",
      value: 1,
    });
    const m2 = await postJSON("/api/stats", {
      type: "default_visibility",
      category: "SETUP",
      value: VIS.indexOf(defaultVis),
    });
    const m3 = await postJSON("/api/stats", {
      type: "focus_flags",
      category: "SETUP",
      value:
        (focus.includes("JOY") ? 1 : 0) +
        (focus.includes("CONNECTION") ? 2 : 0) +
        (focus.includes("CREATIVITY") ? 4 : 0) +
        (focus.includes("GROWTH") ? 8 : 0) +
        (focus.includes("HEALTH") ? 16 : 0),
    });

    // 4) Mirror to localStorage for instant dashboard
    try {
      localStorage.setItem(
        "fuy.onboarding.v2",
        JSON.stringify({
          displayName: nameToSave,
          pseudonymous: usePseudonym,
          goals: goals.trim(),
          focus,
          defaultVisibility: defaultVis,
          tasks: rawTasks,
          ts: new Date().toISOString(),
        })
      );
    } catch {}

    if (!profileOk || !postOk || !m1.ok || !m2.ok || !m3.ok) {
      setErr("Couldn’t save everything. Your connection might be flaky—try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/dashboard");
  }, [displayName, goals, usePseudonym, focus, defaultVis, prioritized, rawTasks, router]);

  return (
    <section className="mx-auto max-w-5xl grid gap-6">
      {/* hero card */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Make this your compass
          </h1>
          <span className="badge badge-green">~3 mins</span>
        </div>
        <p className="mt-2 text-stone-700/90 text-sm md:text-base">
          Set what matters, then get live suggestions (books, music, podcasts) tuned to your goals.
          You can change these anytime.
        </p>
      </div>

      {/* identity */}
      <Card title="How should we address you?" subtitle="You can switch later in Profile.">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={usePseudonym}
              onChange={(e) => {
                setUsePseudonym(e.target.checked);
                if (e.target.checked && !displayName.trim()) setDisplayName(generateAlias());
              }}
            />
            Use a pseudonym
          </label>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={genAlias}
            disabled={!usePseudonym}
          >
            Generate
          </button>
        </div>
        <input
          className="input"
          placeholder={usePseudonym ? "e.g., Quiet Harbor" : "Your name"}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Card>

      {/* goals */}
      <Card
        title="What do you want to achieve?"
        subtitle="Two or three lines is perfect. We’ll save the full text privately."
      >
        <textarea
          className="input min-h-[120px]"
          placeholder="Write in your own words…"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
        <FocusSelector focus={focus} toggleFocus={toggleFocus} />
        <VisibilitySelector value={defaultVis} onChange={setDefaultVis} />
      </Card>

      {/* priorities */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Break it into steps" subtitle="Add tasks and drag the sliders. We’ll rank them for you.">
          <TaskComposer onAdd={addTask} />
          <div className="mt-3 grid gap-3">
            {rawTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onChange={(patch) => updateTask(t.id, patch)}
                onDelete={() => deleteTask(t.id)}
              />
            ))}
            {!rawTasks.length && <EmptyHint text="No tasks yet. Add your first step above." />}
          </div>
        </Card>

        <Card title="What to do first" subtitle="Based on importance, urgency, and your focus.">
          <div className="grid gap-2">
            {prioritized.slice(0, 6).map((t, i) => (
              <PriorityItem key={t.id} rank={i + 1} text={t.text} quadrant={t.quadrant} score={t.score} />
            ))}
            {!prioritized.length && <EmptyHint text="Your top actions will appear here." />}
          </div>
        </Card>
      </div>

      {/* recommendations */}
      <Card
        title="Personalized suggestions"
        subtitle="Live picks based on your goals. Music previews & podcasts play inline; books link to Open Library."
        toolbar={
          <div className="flex items-center gap-2">
            {lastFetchRef.current && (
              <span className="text-xs text-stone-500">
                Updated {new Date(lastFetchRef.current).toLocaleTimeString()}
              </span>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => refreshRecs(true)}
              disabled={loadingRecs}
            >
              {loadingRecs ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      >
        {recError && <ErrorBanner text={recError} />}

        <RecSection
          title="Books"
          items={books}
          renderItem={(b) => (
            <div className="grid grid-cols-[64px_1fr_auto] gap-3 items-center">
              <img
                src={b.cover || "/placeholder-book-cover.svg"}
                alt={b.title}
                className="w-16 h-16 object-cover rounded-md border"
              />
              <div className="min-w-0">
                <div className="font-medium truncate">{b.title}</div>
                <div className="text-sm text-stone-600 truncate">{b.author}{b.year ? ` • ${b.year}` : ""}</div>
              </div>
              <a
                className="btn btn-ghost"
                target="_blank"
                href={b.openlibUrl || "#"}
                rel="noreferrer"
              >
                Open
              </a>
            </div>
          )}
          emptyHint={!goals.trim() ? "Describe your goals above to get tailored books." : "No books found. Try refining your goals."}
        />

        <RecSection
          title="Music"
          items={music}
          renderItem={(m) => (
            <div className="grid grid-cols-[64px_1fr_auto] gap-3 items-center">
              <img
                src={m.artworkUrl100?.replace("100x100", "200x200") || "/placeholder-music.svg"}
                alt={m.trackName}
                className="w-16 h-16 object-cover rounded-md border"
              />
              <div className="min-w-0">
                <div className="font-medium truncate">{m.trackName}</div>
                <div className="text-sm text-stone-600 truncate">{m.artistName}</div>
                {m.previewUrl && (
                  <audio className="mt-1 w-full" controls preload="none" src={m.previewUrl} />
                )}
              </div>
              {m.trackViewUrl ? (
                <a className="btn btn-ghost" target="_blank" href={m.trackViewUrl} rel="noreferrer">
                  Open
                </a>
              ) : (
                <span className="text-xs text-stone-400">No link</span>
              )}
            </div>
          )}
          emptyHint={!goals.trim() ? "Describe your goals above to get music to match your vibe." : "No music found. Try tweaking focus tags."}
        />

        <RecSection
          title="Podcasts"
          items={podcasts}
          renderItem={(p) => (
            <div className="grid grid-cols-[64px_1fr_auto] gap-3 items-center">
              <img
                src={p.artworkUrl100?.replace("100x100", "200x200") || "/placeholder-podcast.svg"}
                alt={p.trackName}
                className="w-16 h-16 object-cover rounded-md border"
              />
              <div className="min-w-0">
                <div className="font-medium truncate">{p.trackName}</div>
                <div className="text-sm text-stone-600 truncate">{p.artistName}</div>
                {/* iTunes Search doesn't provide direct podcast audio in this endpoint; link to show page */}
              </div>
              {p.trackViewUrl ? (
                <a className="btn btn-ghost" target="_blank" href={p.trackViewUrl} rel="noreferrer">
                  Open
                </a>
              ) : (
                <span className="text-xs text-stone-400">No link</span>
              )}
            </div>
          )}
          emptyHint={!goals.trim() ? "Write goals above to surface relevant podcasts." : "No podcasts found for these keywords."}
        />
      </Card>

      {/* actions */}
      {err && <ErrorBanner text={err} />}
      <div className="flex items-center justify-between pb-8">
        <div className="text-xs text-stone-600">
          You can tweak any of this later in Profile.
        </div>
        <button
          className="btn-primary-soft disabled:opacity-50"
          disabled={!canContinue || saving}
          onClick={saveAll}
        >
          {saving ? "Saving…" : "Continue → Dashboard"}
        </button>
      </div>
    </section>
  );
}

/** ----------------------------------------------------------------
 * Small components
 * ---------------------------------------------------------------- */
function Card({
  title,
  subtitle,
  children,
  toolbar,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
}) {
  return (
    <div className="card p-5 md:p-6 grid gap-3 rounded-2xl ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base md:text-lg font-medium">{title}</div>
          {subtitle && <div className="text-xs text-stone-600">{subtitle}</div>}
        </div>
        {toolbar}
      </div>
      {children}
    </div>
  );
}

function FocusSelector({
  focus,
  toggleFocus,
}: {
  focus: Focus[];
  toggleFocus: (f: Focus) => void;
}) {
  return (
    <div className="feature-info tone-emerald rounded-2xl p-4 ring-1 ring-black/5 mt-2">
      <div className="text-sm font-medium mb-2">Focus areas</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {FOCI.map((f) => (
          <button
            key={f}
            type="button"
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm transition ${
              focus.includes(f)
                ? "bg-emerald-600 text-white border-emerald-700"
                : "bg-white text-stone-800 border-stone-200"
            }`}
            onClick={() => toggleFocus(f)}
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>
      <div className="mt-2 text-xs text-stone-600">
        We’ll highlight modules and suggestions that match these.
      </div>
    </div>
  );
}

function VisibilitySelector({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  return (
    <div className="feature-info tone-sky rounded-2xl p-4 ring-1 ring-black/5 mt-3">
      <div className="text-sm font-medium mb-2">Default sharing</div>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {VIS.map((v) => (
          <button
            key={v}
            type="button"
            className={`rounded-xl border px-3 py-2 text-sm ${
              v === value ? "bg-sky-600 text-white border-sky-700" : "bg-white border-stone-200"
            }`}
            onClick={() => onChange(v)}
          >
            {v.toLowerCase()}
          </button>
        ))}
      </div>
      <div className="mt-2 text-xs text-stone-600">
        You can change visibility for each post when you share.
      </div>
    </div>
  );
}

function TaskComposer({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="grid sm:grid-cols-[1fr_auto] gap-2">
      <input
        className="input"
        placeholder="Add a concrete step (e.g., '30-min portfolio cleanup')"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            onAdd(text.trim());
            setText("");
          }
        }}
      />
      <button
        className="btn btn-ghost"
        type="button"
        onClick={() => {
          if (!text.trim()) return;
          onAdd(text.trim());
          setText("");
        }}
      >
        Add
      </button>
    </div>
  );
}

function TaskRow({
  task,
  onChange,
  onDelete,
}: {
  task: { id: string; text: string; importance: number; urgency: number };
  onChange: (patch: Partial<{ text: string; importance: number; urgency: number }>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border p-3 grid gap-2">
      <div className="flex items-start gap-2">
        <input
          className="input flex-1"
          value={task.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
        <button className="btn btn-ghost" onClick={onDelete} aria-label="Delete task">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 items-center">
        <label className="text-sm">
          Importance
          <input
            type="range"
            min={1}
            max={5}
            value={task.importance}
            onChange={(e) => onChange({ importance: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="text-sm">
          Urgency
          <input
            type="range"
            min={1}
            max={5}
            value={task.urgency}
            onChange={(e) => onChange({ urgency: Number(e.target.value) })}
            className="w-full"
          />
        </label>
      </div>
    </div>
  );
}

function PriorityItem({
  rank,
  text,
  quadrant,
  score,
}: {
  rank: number;
  text: string;
  quadrant: string;
  score: number;
}) {
  return (
    <div className="rounded-xl border p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{text}</div>
        <div className="text-xs text-stone-600">{quadrant}</div>
      </div>
      <div className="text-xs text-stone-500">score {(score).toFixed(1)}</div>
    </div>
  );
}

function RecSection<T>({
  title,
  items,
  renderItem,
  emptyHint,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyHint: string;
}) {
  return (
    <div className="mt-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="grid gap-3">
        {items.length ? items.map((it, idx) => (
          <div key={idx} className="rounded-xl border p-3">
            {renderItem(it)}
          </div>
        )) : <EmptyHint text={emptyHint} />}
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-4 text-sm text-stone-600">
      {text}
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="rounded-2xl p-3 bg-rose-50 text-rose-800 ring-1 ring-rose-200 text-sm">
      {text}
    </div>
  );
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2);
}

function safeLocalGet<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
