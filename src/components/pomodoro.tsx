"use client";

import { useEffect, useRef, useState } from "react";

type IntervalRef = ReturnType<typeof setInterval> | null;
type Phase = "work" | "short" | "long";

const STORE_KEY = "fuy.pomo.v1";
const HIST_KEY = "fuy.pomo.history.v1";

type Store = {
  work: number; // seconds
  short: number; // seconds
  long: number; // seconds
  cyclesUntilLong: number;
  targetPerDay: number;
  completedToday: number;
  lastResetDate: string; // YYYY-MM-DD
  lastSession?: { phase: Phase; endedAt: string };
};

type Session = {
  ts: string; // ISO
  intention: string;
  tag: "Deep" | "Light";
  category: "Study" | "Coding" | "Reading" | "Writing" | "Admin" | "Other";
  phase: "work";
  plannedSeconds: number;
  actualSeconds: number;
  awaySeconds: number;
  idleSeconds: number;
  interruptions: string[];
  energyBefore: number; // 0-10
  energyAfter: number; // 0-10
  quality: 1 | 2 | 3 | 4 | 5; // self-rated
  visibility?: "PRIVATE" | "FRIENDS" | "PUBLIC";
  videoUrl?: string | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function postJSON(url: string, data: any) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// Optional: upload a blob to your backend; expects { url: string }
async function uploadBlob(url: string, blob: Blob, filename: string) {
  try {
    const fd = new FormData();
    fd.append("file", blob, filename);
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) return { ok: false, url: null as string | null };
    const json = (await res.json()) as { url?: string };
    return { ok: true, url: json?.url ?? null };
  } catch {
    return { ok: false, url: null as string | null };
  }
}

function useStore() {
  const [s, setS] = useState<Store>({
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
    cyclesUntilLong: 4,
    targetPerDay: 4,
    completedToday: 0,
    lastResetDate: todayStr(),
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const v = JSON.parse(raw) as Store;
        if (v.lastResetDate !== todayStr()) {
          v.completedToday = 0;
          v.lastResetDate = todayStr();
        }
        setS(v);
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch {}
  }, [s]);
  return { s, setS };
}

function useHistory() {
  const [list, setList] = useState<Session[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(HIST_KEY);
      if (raw) setList(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(-50)));
    } catch {}
  }, [list]);
  return { list, setList };
}

/** ---------- Video Recorder (records only during WORK) ---------- */
type RecorderState = "idle" | "ready" | "recording" | "paused" | "error";
function useVideoRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [streamReady, setStreamReady] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const videoEl = useRef<HTMLVideoElement | null>(null);

  const ensureStream = async () => {
    if (mediaStreamRef.current) return mediaStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      setStreamReady(true);
      if (videoEl.current) {
        videoEl.current.srcObject = stream;
        // don't autoplay to avoid noise; we show a muted preview tile the user can play
      }
      setState("ready");
      return stream;
    } catch (e) {
      setError("Camera/mic permission denied or unavailable.");
      setState("error");
      throw e;
    }
  };

  const attachVideo = (el: HTMLVideoElement | null) => {
    videoEl.current = el;
    if (el && mediaStreamRef.current) {
      el.srcObject = mediaStreamRef.current;
    }
  };

  const start = async () => {
    const stream = await ensureStream();
    if (!stream) return;
    setBlob(null);
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    rec.onstop = () => {
      if (chunksRef.current.length) {
        const b = new Blob(chunksRef.current, { type: "video/webm" });
        setBlob(b);
      }
    };
    recorderRef.current = rec;
    rec.start();
    setState("recording");
  };

  const pause = () => {
    const r = recorderRef.current;
    if (r && r.state === "recording") {
      r.pause();
      setState("paused");
    }
  };

  const resume = () => {
    const r = recorderRef.current;
    if (r && r.state === "paused") {
      r.resume();
      setState("recording");
    }
  };

  const stop = () => {
    const r = recorderRef.current;
    if (r && (r.state === "recording" || r.state === "paused")) {
      r.stop();
      setState("ready");
    }
  };

  const cleanup = () => {
    recorderRef.current?.stop?.();
    mediaStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    recorderRef.current = null;
    setState("idle");
    setStreamReady(false);
  };

  return {
    state,
    error,
    blob,
    streamReady,
    attachVideo,
    ensureStream,
    start,
    pause,
    resume,
    stop,
    cleanup,
  };
}

/** ----------------------------- UI ----------------------------- */
export function PomodoroPro() {
  const { s, setS } = useStore();
  const { list, setList } = useHistory();

  const [phase, setPhase] = useState<Phase>("work");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(s.work);

  // Focus recipe
  const [intention, setIntention] = useState("");
  const [tag, setTag] = useState<"Deep" | "Light">("Deep");
  const [category, setCategory] = useState<Session["category"]>("Coding");
  const [energyBefore, setEnergyBefore] = useState(6);
  const [visibility, setVisibility] =
    useState<Session["visibility"]>("PRIVATE");

  // Drift + interruptions
  const [awaySeconds, setAwaySeconds] = useState(0);
  const awayStartRef = useRef<number | null>(null);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const idleTimer = useRef<IntervalRef>(null);
  const lastActivity = useRef<number>(Date.now());
  const [interruptNote, setInterruptNote] = useState("");
  const [interruptions, setInterruptions] = useState<string[]>([]);

  const [cycleCount, setCycleCount] = useState(0);
  const timer = useRef<IntervalRef>(null);

  // Video recorder instance
  const rec = useVideoRecorder();

  // Mini widget mode
  const [mini, setMini] = useState(false);

  // Hydrate seconds on phase change or store change
  useEffect(() => {
    setSeconds(phase === "work" ? s.work : phase === "short" ? s.short : s.long);
  }, [phase, s.work, s.short, s.long]);

  // Visibility drift
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        awayStartRef.current = Date.now();
      } else if (awayStartRef.current) {
        const dt = Math.round((Date.now() - awayStartRef.current) / 1000);
        setAwaySeconds((v) => v + dt);
        awayStartRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Idle drift (no mouse/keys for 25s → count idle)
  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("mousemove", mark);
    window.addEventListener("keydown", mark);
    if (idleTimer.current) clearInterval(idleTimer.current);
    idleTimer.current = setInterval(() => {
      const silence = Date.now() - lastActivity.current;
      if (silence > 25000) setIdleSeconds((v) => v + 5); // accrue in 5s chunks
    }, 5000);
    return () => {
      window.removeEventListener("mousemove", mark);
      window.removeEventListener("keydown", mark);
      if (idleTimer.current) clearInterval(idleTimer.current);
    };
  }, []);

  // Main countdown
  useEffect(() => {
    if (!running) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s > 1) return s - 1;
        onPhaseEnd();
        return 0;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  // Start/pause/stop recorder in sync with work/break states
  useEffect(() => {
    // When entering WORK and running, ensure recording
    const sync = async () => {
      if (phase === "work" && running) {
        if (rec.state === "idle" || rec.state === "ready") {
          try {
            await rec.start();
          } catch {}
        } else if (rec.state === "paused") {
          rec.resume();
        }
      } else {
        // Breaks or paused ⇒ stop (finalize a clip for this session block)
        if (rec.state === "recording" || rec.state === "paused") {
          rec.stop();
        }
      }
    };
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, running]);

  const onPhaseEnd = async () => {
    if (phase === "work") {
      setRunning(false);
      if (timer.current) clearInterval(timer.current);
      setS((prev) => ({
        ...prev,
        completedToday: prev.completedToday + 1,
        lastSession: { phase: "work", endedAt: new Date().toISOString() },
      }));
      // stop recorder and reveal review
      if (rec.state === "recording" || rec.state === "paused") {
        rec.stop();
      }
      setShowReview(true);
    } else {
      // break → back to work
      setPhase("work");
      setSeconds(s.work);
      setAwaySeconds(0);
      setIdleSeconds(0);
      setInterruptions([]);
    }
  };

  // Review modal/state
  const [showReview, setShowReview] = useState(false);
  const [energyAfter, setEnergyAfter] = useState(6);
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(4);

  const saveReview = async () => {
    const plannedSeconds = s.work;
    const actualSeconds = plannedSeconds; // ran to end; (manual reset would differ)

    // Try upload video if available and user visibility not PRIVATE
    let videoUrl: string | null = null;
    if (rec.blob && visibility !== "PRIVATE") {
      const up = await uploadBlob("/api/upload", rec.blob, `pomo-${Date.now()}.webm`);
      if (up.ok && up.url) videoUrl = up.url;
    }

    const recData: Session = {
      ts: new Date().toISOString(),
      intention,
      tag,
      category,
      phase: "work",
      plannedSeconds,
      actualSeconds,
      awaySeconds,
      idleSeconds,
      interruptions,
      energyBefore,
      energyAfter,
      quality,
      visibility,
      videoUrl: videoUrl ?? null,
    };
    setList((prev) => [...prev, recData]);

    const contentLines = [
      `Pomodoro — "${intention || "(no title)"}"`,
      `Tag: ${tag} · ${category}`,
      `Quality: ${quality}/5`,
      `Energy: ${energyBefore}→${energyAfter}`,
      `Drift: away ${awaySeconds}s · idle ${idleSeconds}s`,
      `Interruptions: ${interruptions.length}`,
      videoUrl ? `Video: ${videoUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await postJSON("/api/posts", {
      feature: "PROGRESS",
      visibility: visibility ?? "PRIVATE",
      content: contentLines,
      joyScore: 0,
      connectionScore: 0,
      creativityScore: 1,
    });
    await postJSON("/api/stats", { type: "pomodoro", category: "FOCUS", value: 1 });
    await postJSON("/api/stats", { type: "focus_quality", category: "FOCUS", value: quality });

    // Adaptive suggestion
    const driftPct = ((awaySeconds + idleSeconds) / plannedSeconds) * 100;
    if (driftPct > 25 || quality <= 2) {
      setS((prev) => ({ ...prev, work: Math.max(10 * 60, prev.work - 5 * 60) }));
    } else if (quality === 5 && driftPct < 5) {
      setS((prev) => ({ ...prev, work: Math.min(60 * 60, prev.work + 5 * 60) }));
    }

    // prepare next round
    const newCycle = cycleCount + 1;
    setCycleCount(newCycle);
    if (newCycle % s.cyclesUntilLong === 0) setPhase("long");
    else setPhase("short");
    setSeconds(newCycle % s.cyclesUntilLong === 0 ? s.long : s.short);

    // reset drift + notes for breaks
    setAwaySeconds(0);
    setIdleSeconds(0);
    setInterruptions([]);
    setShowReview(false);
  };

  const start = async () => {
    if (!intention.trim()) return;
    setRunning(true);
    // Pre-warm permissions so recording begins smoothly
    if (rec.state === "idle") {
      try {
        await rec.ensureStream();
      } catch {}
    }
  };
  const pause = () => {
    setRunning(false);
    if (timer.current) clearInterval(timer.current);
  };
  const reset = () => {
    pause();
    setPhase("work");
    setSeconds(s.work);
    setCycleCount(0);
    setAwaySeconds(0);
    setIdleSeconds(0);
    setInterruptions([]);
  };

  // UI helpers
  const fmt = (n: number) => `${Math.floor(n / 60)}:${`${n % 60}`.padStart(2, "0")}`;
  const pct = (seconds / (phase === "work" ? s.work : phase === "short" ? s.short : s.long || 1)) * 100;

  const addInterrupt = () => {
    const v = interruptNote.trim();
    if (!v) return;
    setInterruptions((prev) => [v, ...prev].slice(0, 10));
    setInterruptNote("");
  };

  return (
    <>
      {/* Top controls + mini toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            <b>Phase:</b>&nbsp;{phase === "work" ? "Work" : phase === "short" ? "Short break" : "Long break"}
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            <b>Cycle:</b>&nbsp;{cycleCount % s.cyclesUntilLong}/{s.cyclesUntilLong}
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            <b>Today:</b>&nbsp;{s.completedToday}/{s.targetPerDay}
          </span>
        </div>
        <button
          className="btn btn-ghost text-sm"
          onClick={() => setMini((m) => !m)}
          aria-label={mini ? "Exit mini mode" : "Enter mini mode"}
        >
          {mini ? "↙ Expand" : "↗ Mini mode"}
        </button>
      </div>

      {/* MAIN PANEL */}
      <div className={`grid gap-4 ${mini ? "opacity-80" : ""}`}>
        {/* Focus recipe */}
        <div className="rounded-xl border p-4 grid gap-3 bg-white/60">
          <div className="grid gap-2">
            <input
              className="input h-11 rounded-lg border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Intention (e.g., “Outline section 2”)"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
            />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-16">Tag</span>
                <Select value={tag} onChange={(v) => setTag(v as "Deep" | "Light")} items={["Deep", "Light"]} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20">Category</span>
                <Select
                  value={category}
                  onChange={(v) => setCategory(v as Session["category"])}
                  items={["Coding", "Reading", "Writing", "Study", "Admin", "Other"]}
                />
              </div>
              <div className="flex items-center gap-2 lg:col-span-2">
                <span className="w-24">Energy before</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={energyBefore}
                  onChange={(e) => setEnergyBefore(Number(e.target.value))}
                  className="w-full accent-neutral-800"
                />
                <span className="w-8">{energyBefore}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20">Post to</span>
                <Select
                  value={visibility ?? "PRIVATE"}
                  onChange={(v) => setVisibility(v as Session["visibility"])}
                  items={["PRIVATE", "FRIENDS", "PUBLIC"]}
                />
              </div>
            </div>
          </div>

          {/* Config line */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <Num label="Work (min)" value={Math.round(s.work / 60)} onChange={(v) => setS((p) => ({ ...p, work: v * 60 }))} min={5} max={120} />
            <Num label="Short (min)" value={Math.round(s.short / 60)} onChange={(v) => setS((p) => ({ ...p, short: v * 60 }))} min={3} max={60} />
            <Num label="Long (min)" value={Math.round(s.long / 60)} onChange={(v) => setS((p) => ({ ...p, long: v * 60 }))} min={5} max={60} />
            <Num
              label="Cycles ↦ long"
              value={s.cyclesUntilLong}
              onChange={(v) => setS((p) => ({ ...p, cyclesUntilLong: Math.max(1, v) }))}
              min={1}
              max={10}
            />
            <Num
              label="Target/day"
              value={s.targetPerDay}
              onChange={(v) => setS((p) => ({ ...p, targetPerDay: Math.max(1, v) }))}
              min={1}
              max={24}
            />
          </div>
        </div>

        {/* Timer block */}
        <div className="rounded-2xl border bg-white/70 p-5 grid gap-4">
          <div className="grid place-items-center gap-4">
            {/* Circular progress timer */}
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
                <circle cx="50" cy="50" r="45" stroke="rgba(0,0,0,.08)" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="rgba(0,0,0,.7)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={(2 * Math.PI * 45 * (100 - pct)) / 100}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-4xl font-semibold tabular-nums">{fmt(seconds)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              {!running ? (
                <button className="btn btn-primary" onClick={start} disabled={!intention.trim() || phase !== "work"}>
                  Start
                </button>
              ) : (
                <button className="btn" onClick={pause}>
                  Pause
                </button>
              )}
              <button className="btn btn-ghost" onClick={reset}>
                Reset
              </button>
            </div>

            {/* Recorder status pill */}
            <RecorderPill state={rec.state} />
          </div>

          {/* Drift + interruptions */}
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-1">Drift</div>
              <div className="text-neutral-600">
                Away: <b>{awaySeconds}s</b> · Idle: <b>{idleSeconds}s</b>
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Leaving the tab or going idle increments drift.
              </div>
            </div>
            <div className="md:col-span-2 rounded-lg border p-3">
              <div className="font-medium mb-2">Interruption ledger</div>
              <div className="flex gap-2">
                <input
                  className="input w-full"
                  placeholder="Jot the urge (e.g., “check email”)"
                  value={interruptNote}
                  onChange={(e) => setInterruptNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addInterrupt();
                  }}
                />
                <button className="btn" onClick={addInterrupt}>
                  Add
                </button>
              </div>
              <ul className="mt-2 grid gap-1 text-sm">
                {interruptions.map((txt, i) => (
                  <li key={i} className="rounded border px-2 py-1 bg-white">
                    {txt}
                  </li>
                ))}
                {interruptions.length === 0 && <li className="text-neutral-500">Nothing yet — good sign.</li>}
              </ul>
            </div>
          </div>

          {/* Live preview (muted) + save/download current clip if any */}
          <div className="rounded-lg border p-3 grid gap-2">
            <div className="font-medium">Recording (work blocks only)</div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-lg overflow-hidden border bg-black/3 grid place-items-center">
                <video
                  ref={rec.attachVideo}
                  muted
                  playsInline
                  className="w-full aspect-video bg-neutral-100 object-cover"
                  aria-label="Live camera preview"
                />
              </div>
              <div className="grid content-start gap-2 text-sm">
                <div className="text-neutral-600">
                  {rec.error ? (
                    <span className="text-red-600">{rec.error}</span>
                  ) : rec.streamReady ? (
                    <>Camera ready.</>
                  ) : (
                    <>Camera will ask permission on first start.</>
                  )}
                </div>
                {rec.blob && (
                  <div className="grid gap-2">
                    <div className="text-neutral-700">Last clip (auto-captured from the finished work block):</div>
                    <video
                      src={URL.createObjectURL(rec.blob)}
                      controls
                      className="w-full aspect-video bg-neutral-100"
                    />
                    <a
                      className="btn btn-ghost w-max"
                      href={URL.createObjectURL(rec.blob)}
                      download={`pomodoro-${Date.now()}.webm`}
                    >
                      Download video
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Review (appears after a WORK phase completes) */}
        {showReview && (
          <div className="rounded-xl border p-4 grid gap-3 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Session review</h3>
              <span className="text-xs text-neutral-500">{intention || "(no title)"}</span>
            </div>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-24">Energy after</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={energyAfter}
                  onChange={(e) => setEnergyAfter(Number(e.target.value))}
                  className="w-full accent-neutral-800"
                />
                <span className="w-8">{energyAfter}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24">Quality</span>
                <Select
                  value={String(quality)}
                  onChange={(v) => setQuality(Number(v) as Session["quality"])}
                  items={["1", "2", "3", "4", "5"]}
                />
              </div>
              <div className="text-neutral-600 grid content-center">
                Drift: away <b>{awaySeconds}s</b> · idle <b>{idleSeconds}s</b>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Post visibility</span>
                <Select
                  value={visibility ?? "PRIVATE"}
                  onChange={(v) => setVisibility(v as Session["visibility"])}
                  items={["PRIVATE", "FRIENDS", "PUBLIC"]}
                />
                <p className="text-xs text-neutral-500">
                  If not private and a video exists, I’ll attach it to your post.
                </p>
              </div>
              {rec.blob && (
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Recording preview</span>
                  <video src={URL.createObjectURL(rec.blob)} controls className="w-full aspect-video bg-neutral-100" />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <button className="btn btn-primary" onClick={saveReview}>
                Save review & continue
              </button>
              <p className="text-xs text-neutral-500">
                Tip: heavy drift or low quality will gently shorten your next block; excellent focus lengthens it.
              </p>
            </div>
          </div>
        )}

        {/* History */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent sessions</h3>
            <div className="text-xs text-neutral-500">{list.length} total</div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <SparkPanel
              title="Away % (lower is better)"
              data={list.slice(-7).map((x) => Math.round(((x.awaySeconds + x.idleSeconds) / Math.max(1, x.plannedSeconds)) * 100))}
              format={(v) => `${v}%`}
            />
            <SparkPanel title="Quality" data={list.slice(-7).map((x) => x.quality)} format={(v) => `${v}/5`} />
            <SparkPanel
              title="Energy Δ"
              data={list.slice(-7).map((x) => x.energyAfter - x.energyBefore)}
              format={(v) => (v >= 0 ? `+${v}` : `${v}`)}
            />
          </div>
        </div>
      </div>

      {/* MINI WIDGET */}
      {mini && (
        <MiniWidget
          running={running}
          time={fmt(seconds)}
          phase={phase}
          onStart={start}
          onPause={pause}
          onReset={reset}
          onClose={() => setMini(false)}
        />
      )}
    </>
  );
}

/** ---------- Small components ---------- */

function Num({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-32">{label}</span>
      <input
        className="input w-24 h-9 rounded-lg border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Custom-styled, minimal select (native under the hood) */
function Select({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none input w-full h-9 pr-9 rounded-lg border-neutral-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      >
        {items.map((it) => (
          <option key={it} value={it}>
            {it}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.094l3.71-3.864a.75.75 0 111.08 1.04l-4.24 4.41a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

function SparkPanel({
  title,
  data,
  format,
}: {
  title: string;
  data: number[];
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((n) => Math.abs(n)));
  return (
    <div className="rounded-lg border p-3 bg-white/60">
      <div className="text-sm font-medium mb-2">{title}</div>
      <div className="flex items-end gap-1 h-16">
        {data.map((v, i) => (
          <div key={i} title={format(v)} className="bg-black/20 w-6 rounded-sm" style={{ height: `${(Math.abs(v) / max) * 100}%` }} />
        ))}
      </div>
      <div className="text-xs text-neutral-600 mt-1">{data.map(format).join(" · ") || "—"}</div>
    </div>
  );
}

function RecorderPill({ state }: { state: RecorderState }) {
  const color =
    state === "recording" ? "bg-red-500" : state === "paused" ? "bg-amber-500" : state === "ready" ? "bg-emerald-500" : "bg-neutral-400";
  const label =
    state === "recording" ? "Recording" : state === "paused" ? "Paused" : state === "ready" ? "Ready" : state === "idle" ? "Idle" : "Error";
  return (
    <div className="inline-flex items-center gap-2 text-xs text-neutral-700">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
      <span className="font-medium">{label}</span>
    </div>
  );
}

/** Floating mini widget */
function MiniWidget({
  running,
  time,
  phase,
  onStart,
  onPause,
  onReset,
  onClose,
}: {
  running: boolean;
  time: string;
  phase: Phase;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-40 rounded-xl border bg-white/90 backdrop-blur shadow-lg w-[260px] p-3"
      role="dialog"
      aria-label="Pomodoro mini widget"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-neutral-600">
          <b>{phase === "work" ? "Work" : phase === "short" ? "Short break" : "Long break"}</b>
        </div>
        <button className="btn btn-ghost btn-xs" onClick={onClose} aria-label="Close mini widget">
          ✕
        </button>
      </div>
      <div className="grid place-items-center gap-2">
        <div className="text-3xl font-semibold tabular-nums">{time}</div>
        <div className="flex gap-2">
          {!running ? (
            <button className="btn btn-primary btn-sm" onClick={onStart}>
              Start
            </button>
          ) : (
            <button className="btn btn-sm" onClick={onPause}>
              Pause
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
