"use client";

/**
 * Feature set preserved.
 * NEW:
 * - Editable time (minutes + seconds) with “Apply” per current phase + presets.
 * - Inputs & dropdowns: high-contrast (visible).
 * - Auto-mini when tab/window is hidden, unless user manually toggled.
 * - Full-width friendly layout.
 */

import { useEffect, useRef, useState } from "react";

/* --------------- types + local storage keys --------------- */

type IntervalRef = ReturnType<typeof setInterval> | null;
type Phase = "work" | "short" | "long";

const STORE_KEY = "fuy.pomo.v1";
const HIST_KEY = "fuy.pomo.history.v1";
const TASK_KEY = "fuy.pomo.tasks.v1";

type Store = {
  work: number;
  short: number;
  long: number;
  cyclesUntilLong: number;
  targetPerDay: number;
  completedToday: number;
  lastResetDate: string;
  lastSession?: { phase: Phase; endedAt: string };
};

type Session = {
  ts: string;
  intention: string;
  tag: "Deep" | "Light";
  category: "Study" | "Coding" | "Reading" | "Writing" | "Admin" | "Other";
  phase: "work";
  plannedSeconds: number;
  actualSeconds: number;
  awaySeconds: number;
  idleSeconds: number;
  interruptions: string[];
  energyBefore: number;
  energyAfter: number;
  quality: 1 | 2 | 3 | 4 | 5;
  visibility?: "PRIVATE" | "FRIENDS" | "PUBLIC";
  videoUrl?: string | null;
};

type Task = { id: string; text: string; done: boolean; created: string };

/* ---------------- utilities ---------------- */

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

/* ---------------- store hooks ---------------- */

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

function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(TASK_KEY);
      if (raw) setTasks(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const addTask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setTasks((prev) =>
      [
        {
          id: crypto.randomUUID(),
          text: t,
          done: false,
          created: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 100)
    );
  };
  const toggleTask = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  const removeTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));
  const clearDone = () => setTasks((prev) => prev.filter((t) => !t.done));

  return { tasks, addTask, toggleTask, removeTask, clearDone };
}

/* ---------------- camera hook ---------------- */

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
      if (videoEl.current) videoEl.current.srcObject = stream;
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
    if (el && mediaStreamRef.current) el.srcObject = mediaStreamRef.current;
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
      if (chunksRef.current.length)
        setBlob(new Blob(chunksRef.current, { type: "video/webm" }));
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

/* ----------------------------- UI ----------------------------- */

export function PomodoroPro() {
  const { s, setS } = useStore();
  const { list, setList } = useHistory();
  const { tasks, addTask, toggleTask, removeTask, clearDone } = useTasks();

  const [phase, setPhase] = useState<Phase>("work");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(s.work);

  // planner meta
  const [intention, setIntention] = useState("");
  const [tag, setTag] = useState<"Deep" | "Light">("Deep");
  const [category, setCategory] = useState<Session["category"]>("Coding");
  const [energyBefore, setEnergyBefore] = useState(6);
  const [visibility, setVisibility] =
    useState<Session["visibility"]>("PRIVATE");

  // drift + interruptions
  const [awaySeconds, setAwaySeconds] = useState(0);
  const awayStartRef = useRef<number | null>(null);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const idleTimer = useRef<IntervalRef>(null);
  const lastActivity = useRef<number>(Date.now());
  const [interruptNote, setInterruptNote] = useState("");
  const [interruptions, setInterruptions] = useState<string[]>([]);

  const [cycleCount, setCycleCount] = useState(0);
  const timer = useRef<IntervalRef>(null);

  const rec = useVideoRecorder();

  // Mini widget
  const [mini, setMini] = useState(false);
  const userPinnedRef = useRef<null | boolean>(null);

  // seconds hydrate
  useEffect(() => {
    setSeconds(phase === "work" ? s.work : phase === "short" ? s.short : s.long);
  }, [phase, s.work, s.short, s.long]);

  // away drift + auto mini
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (running && phase === "work") awayStartRef.current = Date.now();
      } else if (awayStartRef.current) {
        const dt = Math.round((Date.now() - awayStartRef.current) / 1000);
        if (running && phase === "work") setAwaySeconds((v) => v + dt);
        awayStartRef.current = null;
      }
      if (userPinnedRef.current == null) setMini(document.hidden);
    };
    const onBlur = () => {
      if (userPinnedRef.current == null) setMini(true);
    };
    const onFocus = () => {
      if (userPinnedRef.current == null) setMini(false);
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [running, phase]);

  useEffect(() => {
    if (!running) awayStartRef.current = null;
  }, [running]);

  // idle drift
  useEffect(() => {
    const mark = () => (lastActivity.current = Date.now());
    window.addEventListener("mousemove", mark);
    window.addEventListener("keydown", mark);
    window.addEventListener("pointerdown", mark);
    window.addEventListener("scroll", mark, { passive: true });

    if (idleTimer.current) clearInterval(idleTimer.current);
    idleTimer.current = setInterval(() => {
      if (!(running && phase === "work")) return;
      const silence = Date.now() - lastActivity.current;
      if (silence >= 25000) setIdleSeconds((v) => v + 5);
    }, 5000);

    return () => {
      window.removeEventListener("mousemove", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("scroll", mark);
      if (idleTimer.current) clearInterval(idleTimer.current);
    };
  }, [running, phase]);

  // Workout rest timer integration
  useEffect(() => {
    const handleWorkoutRest = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { duration } = customEvent.detail;

      // Switch to short break phase with workout rest duration
      setPhase("short");
      setSeconds(duration);
      setRunning(true);
      lastActivity.current = Date.now();
    };

    window.addEventListener("workoutRestStarted", handleWorkoutRest);
    return () => {
      window.removeEventListener("workoutRestStarted", handleWorkoutRest);
    };
  }, []);

  // countdown
  useEffect(() => {
    if (!running) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSeconds((v) => {
        if (v > 1) return v - 1;
        onPhaseEnd();
        return 0;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, phase]);

  // recorder sync
  useEffect(() => {
    const sync = async () => {
      if (phase === "work" && running) {
        if (rec.state === "idle" || rec.state === "ready") {
          try {
            await rec.start();
          } catch {}
        } else if (rec.state === "paused") rec.resume();
      } else {
        if (rec.state === "recording" || rec.state === "paused") rec.stop();
      }
    };
    sync();
  }, [phase, running, rec]);

  const onPhaseEnd = () => {
    if (phase === "work") {
      setRunning(false);
      if (timer.current) clearInterval(timer.current);
      setS((p) => ({
        ...p,
        completedToday: p.completedToday + 1,
        lastSession: { phase: "work", endedAt: new Date().toISOString() },
      }));
      if (rec.state === "recording" || rec.state === "paused") rec.stop();
      setEnergyAfter(energyBefore);
      setShowReview(true);
    } else {
      setPhase("work");
      setSeconds(s.work);
      setAwaySeconds(0);
      setIdleSeconds(0);
      setInterruptions([]);
    }
  };

  // review
  const [showReview, setShowReview] = useState(false);
  const [energyAfter, setEnergyAfter] = useState(6);
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(4);

  const saveReview = async () => {
    const plannedSeconds = s.work;
    const actualSeconds = Math.max(0, plannedSeconds - seconds);

    let videoUrl: string | null = null;
    if (rec.blob && visibility !== "PRIVATE") {
      const up = await uploadBlob(
        "/api/upload",
        rec.blob,
        `pomo-${Date.now()}.webm`
      );
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
    await postJSON("/api/stats", {
      type: "focus_quality",
      category: "FOCUS",
      value: quality,
    });

    const driftPct =
      ((awaySeconds + idleSeconds) / Math.max(1, plannedSeconds)) * 100;
    if (driftPct > 25 || quality <= 2)
      setS((p) => ({ ...p, work: Math.max(10 * 60, p.work - 5 * 60) }));
    else if (quality === 5 && driftPct < 5)
      setS((p) => ({ ...p, work: Math.min(60 * 60, p.work + 5 * 60) }));

    const newCycle = cycleCount + 1;
    setCycleCount(newCycle);
    if (newCycle % s.cyclesUntilLong === 0) setPhase("long");
    else setPhase("short");
    setSeconds(newCycle % s.cyclesUntilLong === 0 ? s.long : s.short);

    setAwaySeconds(0);
    setIdleSeconds(0);
    setInterruptions([]);
    setShowReview(false);
  };

  // controls
  const start = () => {
    setRunning(true);
    lastActivity.current = Date.now();
    awayStartRef.current = null;
    if (rec.state === "idle") rec.ensureStream().catch(() => {});
  };
  const pause = () => {
    setRunning(false);
    awayStartRef.current = null;
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

  // helpers
  const fmt = (n: number) =>
    `${Math.floor(n / 60)}:${`${n % 60}`.padStart(2, "0")}`;
  const totalForPhase =
    phase === "work" ? s.work : phase === "short" ? s.short : s.long || 1;

  const addInterrupt = () => {
    const v = interruptNote.trim();
    if (!v) return;
    setInterruptions((prev) => [v, ...prev].slice(0, 10));
    setInterruptNote("");
  };

  const end = new Date(Date.now() + seconds * 1000);
  const endLabel = end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const nextTask = tasks.find((t) => !t.done);

  /* ---------------- layout ---------------- */

  // wheel neighbors
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const mmPrev = Math.max(0, mm - 1);
  const mmNext = mm + 1;
  const ssPrev = ss === 0 ? 59 : ss - 1;
  const ssNext = (ss + 1) % 60;

  // editable fields for custom duration
  const [editMin, setEditMin] = useState(Math.floor(totalForPhase / 60));
  const [editSec, setEditSec] = useState(totalForPhase % 60);
  useEffect(() => {
    setEditMin(Math.floor(totalForPhase / 60));
    setEditSec(totalForPhase % 60);
  }, [totalForPhase]);

  const applyCustom = (m: number, sVal: number) => {
    const total = Math.max(0, m) * 60 + Math.max(0, Math.min(59, sVal));
    setS((p) => {
      const next =
        phase === "work"
          ? { ...p, work: total }
          : phase === "short"
          ? { ...p, short: total }
          : { ...p, long: total };
      return next;
    });
    if (!running) setSeconds(total);
  };

  return (
    <>
      {/* Top row */}
      <div className="flex items-center justify-between text-sm text-neutral-300">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                phase === "work"
                  ? "bg-emerald-400"
                  : phase === "short"
                  ? "bg-sky-400"
                  : "bg-violet-400"
              }`}
            />
            <span className="font-medium">
              {phase === "work" ? "Work" : phase === "short" ? "Short break" : "Long break"}
            </span>
          </span>
          <span className="hidden sm:inline opacity-60">·</span>
          <span className="hidden sm:inline opacity-80">
            Cycle {cycleCount % s.cyclesUntilLong}/{s.cyclesUntilLong}
          </span>
          <span className="hidden sm:inline opacity-60">·</span>
          <span className="hidden sm:inline opacity-80">
            Today {s.completedToday}/{s.targetPerDay}
          </span>
        </div>
        <button
          className="btn-ghost text-sm"
          onClick={() => {
            const next = !mini;
            setMini(next);
            userPinnedRef.current = next; // remember user intent
          }}
          aria-label={mini ? "Exit mini mode" : "Enter mini mode"}
        >
          {mini ? "↙ Expand" : "↗ Mini"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.25fr]">
        {/* LEFT — Modern timer card with gradient */}
        <div className="grid gap-4">
          <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 p-6 shadow-2xl">
            <div className="text-white text-sm font-bold mb-4 uppercase tracking-wider">
              Set Your Timer
            </div>

            <div className="grid grid-cols-2 gap-4">
              <WheelCard
                big={mm}
                prev={mmPrev}
                next={mmNext}
                label="min"
                ariaLabel="minutes"
              />
              <WheelCard
                big={ss}
                prev={ssPrev}
                next={ssNext}
                label="sec"
                ariaLabel="seconds"
              />
            </div>

            {/* Controls */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!running ? (
                <button
                  className="rounded-xl bg-white text-rose-600 hover:bg-white/90 px-6 py-3 font-bold shadow-lg transition-all hover:scale-105"
                  onClick={start}
                  aria-label="Start"
                >
                  ▶ Start
                </button>
              ) : (
                <button
                  className="rounded-xl bg-white text-rose-600 hover:bg-white/90 px-6 py-3 font-bold shadow-lg transition-all"
                  onClick={pause}
                  aria-label="Pause"
                >
                  ❚❚ Pause
                </button>
              )}

              <button
                className="rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 px-4 py-3 font-semibold transition-all"
                onClick={reset}
                aria-label="Reset"
              >
                Reset ▢
              </button>

              <div className="ml-auto text-sm text-white font-semibold bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                Ends {endLabel}
              </div>
            </div>

            {/* Editable duration (current phase) */}
            <div className="mt-5 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <div className="text-white text-xs font-bold mb-3 uppercase tracking-wider">
                Set {phase === "work" ? "Work" : phase === "short" ? "Short" : "Long"} Duration
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  className="input h-12 w-20 bg-white text-rose-600 font-bold text-center text-lg border-2 border-white/30 rounded-lg"
                  value={editMin}
                  onChange={(e) => setEditMin(Math.max(0, Number(e.target.value)))}
                  aria-label="minutes input"
                />
                <span className="text-white text-2xl font-bold">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  className="input h-12 w-20 bg-white text-rose-600 font-bold text-center text-lg border-2 border-white/30 rounded-lg"
                  value={editSec}
                  onChange={(e) =>
                    setEditSec(Math.max(0, Math.min(59, Number(e.target.value))))
                  }
                  aria-label="seconds input"
                />
                <button
                  className="rounded-lg bg-white text-rose-600 hover:bg-white/90 px-4 py-3 text-sm font-bold transition-all ml-2"
                  onClick={() => applyCustom(editMin, editSec)}
                >
                  Apply
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  className="rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 px-3 py-2 text-xs font-semibold transition-all"
                  onClick={() => applyCustom(25, 0)}
                >
                  25:00
                </button>
                <button
                  className="rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 px-3 py-2 text-xs font-semibold transition-all"
                  onClick={() => applyCustom(5, 0)}
                >
                  05:00
                </button>
                <button
                  className="rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 px-3 py-2 text-xs font-semibold transition-all"
                  onClick={() => applyCustom(15, 0)}
                >
                  15:00
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming (glass) */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-white">
            <div className="text-xs opacity-70">UPCOMING</div>
            <div className="mt-1 text-lg font-semibold">
              {nextTask ? nextTask.text : intention || "No upcoming task"}
            </div>
            <div className="mt-1 text-sm opacity-80">
              {endLabel} · {category}
            </div>
          </div>

          {/* Planner controls (glass) */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 grid gap-3">
            {/* Intention input — high contrast */}
            <input
              className="input h-11 bg-white/90 text-black border-black/10 placeholder:text-black/50"
              placeholder='Intention (e.g., "Design review")'
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
              <Field label="Tag">
                <Select
                  value={tag}
                  onChange={(v) => setTag(v as "Deep" | "Light")}
                  items={["Deep", "Light"]}
                  light
                />
              </Field>
              <Field label="Category">
                <Select
                  value={category}
                  onChange={(v) => setCategory(v as Session["category"])}
                  items={["Coding", "Reading", "Writing", "Study", "Admin", "Other"]}
                  light
                />
              </Field>
              <Field label="Energy">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={energyBefore}
                    onChange={(e) => setEnergyBefore(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="w-6 text-right">{energyBefore}</span>
                </div>
              </Field>
              <Field label="Post to">
                <Select
                  value={visibility ?? "PRIVATE"}
                  onChange={(v) => setVisibility(v as Session["visibility"])}
                  items={["PRIVATE", "FRIENDS", "PUBLIC"]}
                  light
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <Num
                label="Focus (min)"
                value={Math.round(s.work / 60)}
                onChange={(v) => setS((p) => ({ ...p, work: v * 60 }))}
                min={5}
                max={120}
                light
              />
              <Num
                label="Break (min)"
                value={Math.round(s.short / 60)}
                onChange={(v) => setS((p) => ({ ...p, short: v * 60 }))}
                min={3}
                max={60}
                light
              />
              <Num
                label="Rest (min)"
                value={Math.round(s.long / 60)}
                onChange={(v) => setS((p) => ({ ...p, long: v * 60 }))}
                min={5}
                max={60}
                light
              />
              <Num
                label="Cycles ↦ long"
                value={s.cyclesUntilLong}
                onChange={(v) =>
                  setS((p) => ({ ...p, cyclesUntilLong: Math.max(1, v) }))
                }
                min={1}
                max={10}
                light
              />
              <Num
                label="Target/day"
                value={s.targetPerDay}
                onChange={(v) =>
                  setS((p) => ({ ...p, targetPerDay: Math.max(1, v) }))
                }
                min={1}
                max={24}
                light
              />
            </div>
          </div>

          {/* Tasks — glass */}
          <TaskPanel
            tasks={tasks}
            addTask={addTask}
            toggleTask={toggleTask}
            removeTask={removeTask}
            clearDone={clearDone}
          />

          {/* Interruption ledger — glass */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
            <div className="font-medium mb-2">Interruption ledger</div>
            <div className="flex gap-2">
              <input
                className="input w-full bg-white/90 text-black border-black/10 placeholder:text-black/50"
                placeholder='Jot the urge (e.g., "check email")'
                value={interruptNote}
                onChange={(e) => setInterruptNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addInterrupt();
                }}
              />
              <button className="btn-ghost" onClick={addInterrupt}>
                Add
              </button>
            </div>
            <ul className="mt-2 grid gap-1 text-sm">
              {interruptions.map((txt, i) => (
                <li
                  key={i}
                  className="rounded border border-white/10 px-2 py-1 bg-white/10 text-white/90"
                >
                  {txt}
                </li>
              ))}
              {interruptions.length === 0 && (
                <li className="text-neutral-400">Nothing yet — good sign.</li>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT — timeline, camera, review, stats */}
        <div className="grid gap-4">
          {/* Timeline */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold">Today</div>
              <div className="text-xs text-neutral-300">{list.length} recent</div>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute left-10 top-0 bottom-0 w-px bg-white/10" />
              <div className="grid gap-3">
                <TimelineCard
                  color="bg-white/10"
                  title={intention || (nextTask ? nextTask.text : "Focus block")}
                  time={`${new Date()
                    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    .replace(" ", "")}–${endLabel}`}
                  subtitle="Current"
                  icon="🧠"
                />
                <TimelineCard
                  color="bg-white/10"
                  title="Design meeting — check product"
                  time="in 1h"
                  subtitle="Collaboration"
                  icon="👥"
                />
                {list
                  .slice(-3)
                  .reverse()
                  .map((x, i) => (
                    <TimelineCard
                      key={i}
                      color="bg-white/10"
                      title={x.intention || "Completed block"}
                      time={new Date(x.ts).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      subtitle={`${x.category} · ${x.quality}/5`}
                      icon="✅"
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* Camera panel */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 grid md:grid-cols-2 gap-3">
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 grid place-items-center">
              <video
                ref={rec.attachVideo}
                muted
                playsInline
                className="w-full aspect-video object-cover"
                aria-label="Live camera preview"
              />
            </div>
            <div className="grid content-start gap-2 text-sm text-neutral-200">
              <div className="">
                {rec.error ? (
                  <span className="text-red-400">{rec.error}</span>
                ) : rec.streamReady ? (
                  <>Camera ready.</>
                ) : (
                  <>Camera will ask permission on first start.</>
                )}
              </div>
              {rec.blob && (
                <div className="grid gap-2">
                  <div className="text-neutral-100">Last clip from finished block:</div>
                  <video
                    src={URL.createObjectURL(rec.blob)}
                    controls
                    className="w-full aspect-video bg-black/50"
                  />
                  <a
                    className="btn-ghost w-max"
                    href={URL.createObjectURL(rec.blob)}
                    download={`pomodoro-${Date.now()}.webm`}
                  >
                    Download video
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Review */}
          {showReview && (
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 grid gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Session review</h3>
                <span className="text-xs text-neutral-300">
                  {intention || "(no title)"}
                </span>
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
                    className="w-full"
                  />
                  <span className="w-8">{energyAfter}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24">Quality</span>
                  <Select
                    value={String(quality)}
                    onChange={(v) => setQuality(Number(v) as Session["quality"])}
                    items={["1", "2", "3", "4", "5"]}
                    light
                  />
                </div>
                <div className="text-neutral-200 grid content-center">
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
                    light
                  />
                  <p className="text-xs text-neutral-300">
                    If not private and a video exists, it will be attached.
                  </p>
                </div>
                {rec.blob && (
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Recording</span>
                    <video
                      src={URL.createObjectURL(rec.blob)}
                      controls
                      className="w-full aspect-video bg-black/50"
                    />
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <button className="btn-gold" onClick={saveReview}>
                  Save review & continue
                </button>
                <p className="text-xs text-neutral-300">
                  Heavy drift shortens the next block; excellent focus lengthens it.
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
            <div className="grid md:grid-cols-3 gap-3">
              <SparkPanel
                title="Away % (lower is better)"
                data={list
                  .slice(-7)
                  .map((x) =>
                    Math.round(
                      ((x.awaySeconds + x.idleSeconds) /
                        Math.max(1, x.plannedSeconds)) *
                        100
                    )
                  )}
                format={(v) => `${v}%`}
              />
              <SparkPanel
                title="Quality"
                data={list.slice(-7).map((x) => x.quality)}
                format={(v) => `${v}/5`}
              />
              <SparkPanel
                title="Energy Δ"
                data={list
                  .slice(-7)
                  .map((x) => x.energyAfter - x.energyBefore)}
                format={(v) => (v >= 0 ? `+${v}` : `${v}`)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <BottomBar
        canStart={!running && phase === "work"}
        onStart={start}
        onPause={pause}
        running={running}
        onReset={reset}
      />

      {/* Mini Widget */}
      {mini && (
        <MiniWidget
          running={running}
          time={fmt(seconds)}
          phase={phase}
          onStart={start}
          onPause={pause}
          onReset={reset}
          onClose={() => {
            setMini(false);
            userPinnedRef.current = false;
          }}
        />
      )}
    </>
  );
}

/* ---------------- subcomponents ---------------- */

function WheelCard({
  big,
  prev,
  next,
  label,
  ariaLabel,
}: {
  big: number;
  prev: number;
  next: number;
  label: string;
  ariaLabel: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="bg-white/95 text-red-600 rounded-3xl px-6 py-4 grid place-items-center relative"
    >
      <div className="absolute inset-0 rounded-3xl ring-1 ring-black/10 pointer-events-none" />
      <div className="grid place-items-center select-none">
        <div className="text-3xl font-bold opacity-20 -mb-1 tabular-nums">
          {String(prev).padStart(2, "0")}
        </div>
        <div className="text-7xl leading-none font-extrabold tabular-nums">
          {String(big).padStart(2, "0")}
        </div>
        <div className="text-3xl font-bold opacity-20 -mt-1 tabular-nums">
          {String(next).padStart(2, "0")}
        </div>
      </div>
      <div className="mt-2 text-sm text-red-600/70 font-semibold">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-28 text-neutral-200">{label}</span>
      <div className="w-full">{children}</div>
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  min,
  max,
  light,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  light?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-32 text-neutral-200">{label}</span>
      <input
        className={`input w-24 h-9 ${
          light ? "bg-white/90 text-black border-black/10" : "bg-white/10 text-white border-white/10"
        }`}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Select({
  value,
  onChange,
  items,
  light,
}: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
  light?: boolean;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input h-9 pr-8 ${
          light ? "bg-white/90 text-black border-black/10" : "bg-white/10 text-white border-white/10"
        }`}
      >
        {items.map((it) => (
          <option key={it} value={it}>
            {it}
          </option>
        ))}
      </select>
      <svg
        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 ${
          light ? "text-black/80" : "text-neutral-200"
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
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
    <div className="rounded-2xl p-3 border border-white/10 bg-white/5">
      <div className="text-sm font-medium mb-2">{title}</div>
      <div className="flex items-end gap-1 h-16">
        {data.map((v, i) => (
          <div
            key={i}
            title={format(v)}
            className="bg-white/30 w-6 rounded-sm"
            style={{ height: `${(Math.abs(v) / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="text-xs text-neutral-300 mt-1">
        {data.map(format).join(" · ") || "—"}
      </div>
    </div>
  );
}

function TimelineCard({
  color,
  title,
  time,
  subtitle,
  icon,
}: {
  color: string;
  title: string;
  time: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-4 border border-white/10 relative ml-6`}>
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white/20 border border-white/20" />
      <div className="text-[28px] leading-none mb-1">{icon}</div>
      <div className="text-[15px] font-semibold">{title}</div>
      <div className="text-[13px] text-neutral-300 mt-1">{time}</div>
      <div className="text-[12px] text-neutral-400">{subtitle}</div>
    </div>
  );
}

function TaskPanel({
  tasks,
  addTask,
  toggleTask,
  removeTask,
  clearDone,
}: {
  tasks: Task[];
  addTask: (t: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  clearDone: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Tasks</div>
        <button className="btn-ghost btn-xs" onClick={clearDone}>
          Clear done
        </button>
      </div>
      <div className="flex gap-2">
        <input
          className="input w-full bg-white/90 text-black border-black/10 placeholder:text-black/50"
          placeholder='Add a task (e.g., "Outline section 2")'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTask(text);
              setText("");
            }
          }}
        />
        <button
          className="btn-ghost"
          onClick={() => {
            addTask(text);
            setText("");
          }}
        >
          Add
        </button>
      </div>
      <ul className="mt-3 grid gap-1 text-sm">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-white/10 px-3 py-2 bg-white/10 flex items-center gap-3"
          >
            <input
              checked={t.done}
              onChange={() => toggleTask(t.id)}
              type="checkbox"
              className="checkbox checkbox-sm"
            />
            <span className={t.done ? "line-through text-neutral-400" : ""}>
              {t.text}
            </span>
            <button
              className="btn-ghost btn-xs ml-auto"
              onClick={() => removeTask(t.id)}
              aria-label="Delete"
            >
              ✕
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="text-neutral-400">No tasks yet — add one above.</li>
        )}
      </ul>
    </div>
  );
}

function BottomBar({
  canStart,
  onStart,
  onPause,
  running,
  onReset,
}: {
  canStart: boolean;
  onStart: () => void;
  onPause: () => void;
  running: boolean;
  onReset: () => void;
}) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div className="w-full px-6 pb-5">
        <div className="pointer-events-auto rounded-[22px] px-4 py-3 flex items-center justify-between border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
          <button className="btn-ghost text-white/90" aria-label="Open tasks">
            Tasks
          </button>
          <div className="flex items-center gap-2">
            {!running ? (
              <button
                className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-500 text-white font-bold shadow"
                onClick={onStart}
                disabled={!canStart}
                aria-label="Start"
              >
                ▶
              </button>
            ) : (
              <button
                className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-500 text-white font-bold shadow"
                onClick={onPause}
                aria-label="Pause"
              >
                ❚❚
              </button>
            )}
          </div>
          <button className="btn-ghost text-white/90" onClick={onReset} aria-label="Reset">
            ▢
          </button>
        </div>
      </div>
    </div>
  );
}

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
      className="fixed bottom-4 right-4 z-[60] rounded-xl shadow-lg w-[260px] p-3 border border-white/10 bg-white/5 backdrop-blur-md text-white"
      role="dialog"
      aria-label="Pomodoro mini widget"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-neutral-200">
          <b>
            {phase === "work"
              ? "Work"
              : phase === "short"
              ? "Short break"
              : "Long break"}
          </b>
        </div>
        <button className="btn-ghost btn-xs" onClick={onClose} aria-label="Close mini widget">
          ✕
        </button>
      </div>
      <div className="grid place-items-center gap-2">
        <div className="text-3xl font-bold tabular-nums">{time}</div>
        <div className="flex items-center gap-2">
          {!running ? (
            <button className="btn-gold btn-sm" onClick={onStart}>
              Start
            </button>
          ) : (
            <button className="btn-ghost btn-sm" onClick={onPause}>
              Pause
            </button>
          )}
          <button className="btn-ghost btn-sm" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
