"use client";

/**
 * Feature set preserved.
 * NEW:
 * - Editable time (minutes + seconds) with “Apply” per current phase + presets.
 * - Inputs & dropdowns: high-contrast (visible).
 * - Auto-mini when tab/window is hidden, unless user manually toggled.
 * - Full-width friendly layout.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

/* --------------- types + local storage keys --------------- */

type IntervalRef = ReturnType<typeof setInterval> | null;
type Phase = "work" | "short" | "long";

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import ScrollStarfield from "./ScrollStarfield";

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
    } catch { }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch { }
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
    } catch { }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(-50)));
    } catch { }
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
    } catch { }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
    } catch { }
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

  const ensureStream = useCallback(async () => {
    if (mediaStreamRef.current) return mediaStreamRef.current;

    // 1. Check support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = "Camera API not supported in this context (HTTP? Browser?).";
      setError(msg);
      setState("error");
      return;
    }

    try {
      // 2. Try video + audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      handleStreamSuccess(stream);
      return stream;
    } catch (err1: any) {
      console.warn("Audio+Video failed, trying Video only...", err1);

      // 3. Fallback: Try video only (maybe mic is blocked/missing)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        handleStreamSuccess(stream);
        return stream;
      } catch (err2: any) {
        console.error("Video-only also failed", err2);

        // 4. Handle specific errors
        mediaStreamRef.current = null;
        setStreamReady(false);
        setState("error");

        let msg = "Camera access failed.";
        const name = err2.name || "";
        const message = err2.message || "";

        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          msg = "Permission blocked! Click the 🔒 lock icon in your address bar to reset camera permissions.";
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          msg = "No camera device found.";
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          msg = "Camera is in use by another app (Zoom/Meet?). Close it and retry.";
        } else if (message.includes("policy")) {
          msg = "Browser Security Policy is blocking camera. Check device/parent settings.";
        } else {
          msg = `Error: ${name} - ${message}`;
        }
        setError(msg);
      }
    }
  }, []);

  const handleStreamSuccess = useCallback((stream: MediaStream) => {
    mediaStreamRef.current = stream;
    setStreamReady(true);
    if (videoEl.current) videoEl.current.srcObject = stream;
    setError(null);
    setState("ready");
  }, []);

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoEl.current = el;
    if (el && mediaStreamRef.current) el.srcObject = mediaStreamRef.current;
  }, []);

  const start = useCallback(async () => {
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
  }, [ensureStream]);

  const pause = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state === "recording") {
      r.pause();
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state === "paused") {
      r.resume();
      setState("recording");
    }
  }, []);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && (r.state === "recording" || r.state === "paused")) {
      r.stop();
      setState("ready");
    }
  }, []);

  const cleanup = useCallback(() => {
    recorderRef.current?.stop?.();
    mediaStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    recorderRef.current = null;
    setState("idle");
    setStreamReady(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return useMemo(() => ({
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
    stream: mediaStreamRef.current, // Expose stream for analysis
  }), [state, error, blob, streamReady, attachVideo, ensureStream, start, pause, resume, stop, cleanup]);
}

/* ---------------- motion analysis hook ---------------- */

/* ---------------- face tracking hook ---------------- */

function useMotionAnalysis(stream: MediaStream | null, active: boolean) {
  const [energy, setEnergy] = useState(5);
  const [quality, setQuality] = useState(5);
  const [isAway, setIsAway] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const prevNoseRef = useRef<{ x: number, y: number } | null>(null);
  const motionHistoryRef = useRef<number[]>([]);

  // Load Model
  useEffect(() => {
    async function load() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });
        landmarkerRef.current = landmarker;
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to load FaceLandmarker", err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!stream || !active || !isLoaded || !landmarkerRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const vid = document.createElement('video');
    vid.srcObject = stream;
    vid.muted = true;
    vid.play().catch(() => { });
    videoRef.current = vid;

    const analyze = () => {
      if (!videoRef.current || !landmarkerRef.current) return;

      const vid = videoRef.current;
      if (vid.videoWidth === 0 || vid.videoHeight === 0) {
        rafRef.current = requestAnimationFrame(analyze);
        return;
      }

      if (vid.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = vid.currentTime;
        const result = landmarkerRef.current.detectForVideo(vid, performance.now());

        if (result.faceLandmarks.length > 0) {
          setIsAway(false);
          const landmarks = result.faceLandmarks[0];

          // 1. Focus Calculation (Head Pose)
          // Heuristic: Face centering and orientation (Yaw/Pitch)
          // Landmarks: 1=Nose, 33=LeftEye, 263=RightEye, 152=Chin, 10=TopHead

          // Yaw: Nose X relative to Eye Center X
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          const midEyeX = (leftEye.x + rightEye.x) / 2;
          const nose = landmarks[1];
          const yawDiff = nose.x - midEyeX;

          // Pitch: Nose Y relative to Eye Center Y vs Chin/TopHead? 
          // Simplification: Nose Y should be roughly between eyes and mouth.
          // If nose is too high (looking up) or too low (looking down/phone).
          // We can just use the aspect ratio of the face vertical vs horizontal to detect strict up/down but let's stick to simple "looking direction".

          const isLookingAway = Math.abs(yawDiff) > 0.12; // Threshold for looking sideways (~15 degrees)

          if (isLookingAway) {
            // Distracted (looking away) -> Count as "Away" for strict tracking
            setIsAway(true);
            setQuality(prev => Math.max(0, prev - 0.5)); // Drop fast
          } else {
            // Focused (looking at screen)
            setIsAway(false);
            setQuality(prev => Math.min(5, prev + 0.1)); // Recover slow
          }

          // Legacy Energy Removal (noop)
          setEnergy(0);

        } else {
          // No face = Away
          setIsAway(true);
          setQuality(prev => Math.max(0, prev - 0.2)); // decay quality when away
        }
      }

      rafRef.current = requestAnimationFrame(analyze);
    };

    rafRef.current = requestAnimationFrame(analyze);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      vid.pause();
      vid.srcObject = null;
    };
  }, [stream, active, isLoaded]);

  return { isAway, quality: Math.round(quality) };
}

/* ----------------------------- UI ----------------------------- */

export function PomodoroPro() {
  const { s, setS } = useStore();
  const { list, setList } = useHistory();
  const { tasks, addTask, removeTask, toggleTask, clearDone } = useTasks();

  const [phase, setPhase] = useState<Phase>("work");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(s.work);

  // planner meta
  const [intention, setIntention] = useState("");
  // Removed tag, category, energyBefore, visibility states as feature was removed.

  // drift + interruptions
  const [awaySeconds, setAwaySeconds] = useState(0);
  const awayStartRef = useRef<number | null>(null);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const idleTimer = useRef<IntervalRef>(null);
  const lastActivity = useRef<number>(Date.now());
  const [interruptNote, setInterruptNote] = useState("");
  const [interruptions, setInterruptions] = useState<string[]>([]);
  const [newTaskText, setNewTaskText] = useState(""); // For timeline tasks
  const [userStoppedCamera, setUserStoppedCamera] = useState(false);

  const [cycleCount, setCycleCount] = useState(0);
  const timer = useRef<IntervalRef>(null);

  const rec = useVideoRecorder();
  const videoSrc = useMemo(() => (rec.blob ? URL.createObjectURL(rec.blob) : undefined), [rec.blob]);

  // Video Analysis
  // Only analyze when working and camera is on
  // Video Analysis
  // Only analyze when working and camera is on
  const { isAway: videoAway, quality: videoQuality } = useMotionAnalysis(
    // @ts-ignore - explicitly accessing the exposed stream even if TS generic slightly off
    rec.stream,
    phase === "work" && running && rec.streamReady && !userStoppedCamera
  );

  // Sync Video Energy to State
  useEffect(() => {
    if (phase === "work" && running) {
      // Slowly blend video energy into visual energy state (optional visual feedback)
      // No-op after energy removal
    }
  }, [phase, running]);

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

  // Combined Away Logic (Tab Hidden OR Video Away)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running && phase === "work" && videoAway) {
      interval = setInterval(() => {
        setAwaySeconds(v => v + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [running, phase, videoAway]);

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
      if (phase === "work" && running && !userStoppedCamera) {
        if (rec.state === "idle" || rec.state === "ready") {
          try {
            await rec.start();
          } catch { }
        } else if (rec.state === "paused") rec.resume();
      } else {
        if (rec.state === "recording" || rec.state === "paused") rec.stop();
      }
    };
    sync();
  }, [phase, running, rec, userStoppedCamera]);

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
      setEnergyAfter(6); // Default
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
    if (rec.blob) {
      // Always upload if blob exists, visibility check removed
      const up = await uploadBlob(
        "/api/upload",
        rec.blob,
        `pomo-${Date.now()}.webm`
      );
      if (up.ok && up.url) videoUrl = up.url;
    }

    const recData: Session = {
      ts: new Date().toISOString(),
      intention: intention || "(no title)",
      tag: "Deep",
      category: "Coding",
      phase: "work",
      plannedSeconds,
      actualSeconds,
      awaySeconds,
      idleSeconds,
      interruptions,
      energyBefore: 6,
      energyAfter: energyAfter, // Still allow user to set this in review
      quality: quality,         // Still allow user to set this in review
      visibility: "PRIVATE",   // Still allow user to set this in review
      videoUrl: videoUrl ?? null,
    };
    setList((prev) => [...prev, recData]);

    const contentLines = [
      `Pomodoro — "${intention || "(no title)"}"`,
      `Tag: Deep · Coding`,
      `Quality: ${quality}/5`,
      `Energy: 6→${energyAfter}`,
      `Drift: away ${awaySeconds}s · idle ${idleSeconds}s`,
      `Interruptions: ${interruptions.length}`,
      videoUrl ? `Video: ${videoUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await postJSON("/api/posts", {
      feature: "PROGRESS",
      visibility: "PRIVATE",
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
    if (rec.state === "idle") rec.ensureStream().catch(() => { });
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

  // HYDRATION FIX: Calculate end time derived state
  const [endLabel, setEndLabel] = useState("");
  useEffect(() => {
    // Updat end label whenever seconds or running status changes
    const end = new Date(Date.now() + seconds * 1000);
    setEndLabel(end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }));
  }, [seconds, running]);

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
    <ScrollStarfield>
      <div className="min-h-screen text-white p-6 relative z-10">
        <div className="max-w-6xl mx-auto grid gap-6">
          <div className="flex items-center justify-between text-base font-medium text-white/80">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${phase === "work"
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                    : phase === "short"
                      ? "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                      : "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]"
                    }`}
                />
                <span className="font-bold text-white">
                  {phase === "work" ? "Work" : phase === "short" ? "Short break" : "Long break"}
                </span>
              </span>
              <span className="hidden sm:inline opacity-60">·</span>
              <span className="hidden sm:inline text-white font-bold">
                Cycle {cycleCount % s.cyclesUntilLong}/{s.cyclesUntilLong}
              </span>
              <span className="hidden sm:inline opacity-60">·</span>
              <span className="hidden sm:inline text-white font-bold">
                Today {s.completedToday}/{s.targetPerDay}
              </span>
            </div>
            <button
              className="btn-ghost text-sm text-white hover:bg-white/10 font-bold px-3 py-1 rounded-lg"
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

        </div>

        <div className="grid gap-6">
          {/* ROW 1: Timer & Camera */}
          <div className="grid gap-6 md:grid-cols-[1.05fr_1.25fr]">
            {/* Timer (Left) */}
            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/50 bg-black/20 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
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
              </div>
            </div>

            {/* Camera (Right) */}
            <div className="grid gap-4 h-fit">
              <div className="rounded-3xl border border-white/50 bg-black/50 backdrop-blur-md shadow-sm p-4 grid md:grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-white/30 bg-black/30 grid place-items-center aspect-video relative group">
                  <video
                    ref={rec.attachVideo}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    aria-label="Live camera preview"
                  />
                  {!rec.streamReady ? (
                    <div className="absolute inset-0 grid place-items-center">
                      <button
                        onClick={() => {
                          rec.ensureStream().catch(console.error);
                          setUserStoppedCamera(false);
                        }}
                        className="bg-white text-black font-bold px-4 py-2 rounded-lg shadow-sm border border-neutral-300 hover:bg-neutral-50"
                      >
                        Enable Camera
                      </button>
                    </div>
                  ) : (
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          rec.cleanup();
                          setUserStoppedCamera(true);
                        }}
                        className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-500"
                      >
                        Stop Camera
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid content-start gap-3 text-sm text-neutral-700">
                  <div className="flex items-center justify-between">
                    <div>
                      {rec.error ? (
                        <span className="text-red-500">{rec.error}</span>
                      ) : rec.streamReady ? (
                        <span className="text-green-600 font-medium flex items-center gap-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                          </span>
                          Camera active
                        </span>
                      ) : (
                        <span>Camera off</span>
                      )}
                    </div>
                  </div>
                  {rec.blob && (
                    <div className="grid gap-2">
                      <div className="text-neutral-800">Last clip from finished block:</div>
                      <video
                        src={videoSrc}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full aspect-video bg-black/50"
                      />
                      <a
                        className="btn-ghost w-max"
                        href={videoSrc}
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

          {/* ROW 2: Tasks & Stats */}
          <div className="grid gap-6 md:grid-cols-[1.05fr_1.25fr]">
            {/* Left: Tasks/Planner */}
            <div className="grid gap-4">
              {/* Upcoming (glass) */}
              <div className="rounded-3xl border border-white/50 bg-black/50 backdrop-blur-md shadow-sm p-4 text-white">
                <div className="text-xs font-bold opacity-80 uppercase tracking-widest text-white/70">UPCOMING</div>
                <div className="mt-2 text-xl font-bold text-white">
                  {nextTask ? nextTask.text : intention || "No upcoming task"}
                </div>
                <div className="mt-1 text-sm font-bold text-white/80">
                  {endLabel} · Focus
                </div>
              </div>

              {/* Planner controls (glass) */}
              <div className="rounded-3xl border border-white/50 bg-black/50 backdrop-blur-md shadow-sm p-6 grid gap-6">
                {/* Intention input — high contrast */}
                <input
                  className="input h-14 bg-white/5 border border-white/50 focus:border-white text-white placeholder:text-white/50 font-bold text-lg rounded-2xl backdrop-blur-sm px-4"
                  placeholder='Intention (e.g., "Design review")'
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                />

                <div className="flex flex-wrap gap-4 text-sm justify-between">
                  <Num
                    label="Focus (min)"
                    value={Math.round(s.work / 60)}
                    onChange={(v) => setS((p) => ({ ...p, work: v * 60 }))}
                    min={5}
                    max={120}
                  />
                  <Num
                    label="Break (min)"
                    value={Math.round(s.short / 60)}
                    onChange={(v) => setS((p) => ({ ...p, short: v * 60 }))}
                    min={3}
                    max={60}
                  />
                  <Num
                    label="Rest (min)"
                    value={Math.round(s.long / 60)}
                    onChange={(v) => setS((p) => ({ ...p, long: v * 60 }))}
                    min={5}
                    max={60}
                  />
                  <Num
                    label="Cycles ↦ long"
                    value={s.cyclesUntilLong}
                    onChange={(v) =>
                      setS((p) => ({ ...p, cyclesUntilLong: Math.max(1, v) }))
                    }
                    min={1}
                    max={10}
                  />
                  <Num
                    label="Target/day"
                    value={s.targetPerDay}
                    onChange={(v) =>
                      setS((p) => ({ ...p, targetPerDay: Math.max(1, v) }))
                    }
                    min={1}
                    max={24}
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
              <div className="rounded-3xl border border-white/50 bg-black/50 backdrop-blur-md shadow-sm p-4">
                <div className="font-bold text-white mb-3">Interruption ledger</div>
                <div className="flex gap-2">
                  <input
                    className="input w-full bg-white/5 text-white border border-white/50 focus:border-white placeholder:text-white/50 rounded-xl font-bold"
                    placeholder='Jot the urge (e.g., "check email")'
                    value={interruptNote}
                    onChange={(e) => setInterruptNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addInterrupt();
                    }}
                  />
                  <button className="btn-ghost font-bold text-white hover:bg-white/20 hover:text-white rounded-xl px-4 border border-white/30" onClick={addInterrupt}>
                    Add
                  </button>
                </div>
                <ul className="mt-3 grid gap-2 text-sm">
                  {interruptions.map((txt, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-white/30 px-3 py-2 bg-white/10 text-white font-bold"
                    >
                      {txt}
                    </li>
                  ))}
                  {interruptions.length === 0 && (
                    <li className="text-white/50 italic px-1">Nothing yet — good sign.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Right: Stats & Review */}
            <div className="grid gap-4 h-fit">
              {showReview && (
                <div className="rounded-3xl border border-black/10 bg-white shadow-sm p-4 grid gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-900">Session review</h3>
                    <span className="text-xs font-medium text-neutral-500">
                      {intention || "(no title)"}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-24 font-medium text-neutral-700">Energy after</span>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={energyAfter}
                        onChange={(e) => setEnergyAfter(Number(e.target.value))}
                        className="w-full accent-rose-600"
                      />
                      <span className="w-8 font-bold text-neutral-900">{energyAfter}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24 font-medium text-neutral-700">Quality</span>
                      <Select
                        value={String(quality)}
                        onChange={(v) => setQuality(Number(v) as Session["quality"])}
                        items={["1", "2", "3", "4", "5"]}
                        light
                      />
                    </div>
                    <div className="text-neutral-700 grid content-center">
                      Drift: away <b className="text-neutral-900">{awaySeconds}s</b> · idle <b className="text-neutral-900">{idleSeconds}s</b>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Removed visibility UI */}
                    {rec.blob && (
                      <div className="grid gap-2">
                        <span className="text-sm font-bold text-neutral-900">Recording</span>
                        <video
                          src={videoSrc}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full aspect-video bg-black/5 rounded-lg border border-neutral-200"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <button className="btn-gold bg-rose-600 hover:bg-rose-500 text-white border-none py-3 font-bold rounded-xl shadow-md" onClick={saveReview}>
                      Save review & continue
                    </button>
                    <p className="text-xs text-neutral-500 italic">
                      Heavy drift shortens the next block; excellent focus lengthens it.
                    </p>
                  </div>
                </div>
              )}

              {/* Stats Bar Graphs */}
              <div className="rounded-3xl border border-white/50 bg-black/50 backdrop-blur-md shadow-sm p-6 min-h-[220px]">
                <div className="grid md:grid-cols-2 gap-6 h-full">
                  <FocusWave
                    title="Focus Quality (5 = Locked In)"
                    data={list
                      .slice(-20)
                      .map((x) => x.quality as number)
                      .concat(phase === "work" && running ? [videoQuality] : [])}
                    max={5}
                    color={videoQuality >= 4 ? "bg-emerald-500" : videoQuality >= 2 ? "bg-amber-400" : "bg-rose-500"}
                  />
                  <FocusWave
                    title="Away Drift (%)"
                    data={list
                      .slice(-20)
                      .map((x) =>
                        Math.round(
                          ((x.awaySeconds + x.idleSeconds) /
                            Math.max(1, x.plannedSeconds)) *
                          100
                        )
                      ).concat(
                        phase === "work" && running
                          ? [Math.round(((awaySeconds + idleSeconds) / Math.max(1, s.work)) * 100)]
                          : []
                      )}
                    max={100}
                    color="bg-white"
                    inverse // Lower is better
                  />
                </div>
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
      </div>
    </ScrollStarfield>
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
      className="bg-white/5 backdrop-blur-md text-white rounded-3xl px-6 py-4 grid place-items-center relative border border-white/50"
    >
      <div className="absolute inset-0 rounded-3xl ring-1 ring-white/20 pointer-events-none" />
      <div className="grid place-items-center select-none">
        <div className="text-3xl font-bold opacity-50 -mb-1 tabular-nums">
          {String(prev).padStart(2, "0")}
        </div>
        <div className="text-7xl leading-none font-extrabold tabular-nums text-white drop-shadow-md">
          {String(big).padStart(2, "0")}
        </div>
        <div className="text-3xl font-bold opacity-50 -mt-1 tabular-nums">
          {String(next).padStart(2, "0")}
        </div>
      </div>
      <div className="mt-2 text-sm text-white/80 font-bold">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-28 text-neutral-900">{label}</span>
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
    <label className="flex flex-col gap-1">
      <span className="text-white/80 font-bold text-xs uppercase tracking-wider">{label}</span>
      <input
        className={`input w-24 h-12 bg-white/5 text-white border-2 border-white/30 focus:border-white rounded-xl text-center font-bold text-lg`}
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
        style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
        className={`input h-10 pr-9 pl-3 appearance-none w-full bg-white/5 text-white border border-white/50 font-bold rounded-xl`}
      >
        {items.map((it) => (
          <option key={it} value={it} className="bg-zinc-900 text-white">
            {it}
          </option>
        ))}
      </select>
      <svg
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white`}
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

function FocusWave({
  title,
  data,
  max,
  color,
  inverse
}: {
  title: string;
  data: number[];
  max: number;
  color: string;
  inverse?: boolean;
}) {
  return (

    <div className="rounded-2xl p-5 border border-white/50 bg-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs font-bold text-white/70">
          {data.length > 0 ? data[data.length - 1] : "-"}
        </div>
      </div>

      <div className="flex items-end gap-1.5 h-24 w-full overflow-hidden">
        {data.length === 0 && <div className="text-xs text-neutral-400 w-full text-center self-center">No data yet</div>}
        {data.map((v, i) => {
          // Show height relative to max (100%)
          // If 'inverse' is true, we might want to color code differently?
          // For now, let's just make sure 0 values show a tiny bar so it's not empty
          let heightPct = Math.min(100, Math.max(5, (v / max) * 100));

          // Color logic for 'inverse' (Away %):
          // Low (good) = Green, High (bad) = Red
          let barColor = color;
          if (inverse) {
            if (v < 10) barColor = "bg-emerald-500";
            else if (v < 25) barColor = "bg-amber-400";
            else barColor = "bg-rose-500";
          }

          return (
            <div
              key={i}
              className={`rounded-t-md opacity-80 hover:opacity-100 transition-all duration-300 flex-1 min-w-[6px] ${barColor}`}
              style={{ height: `${heightPct}%` }}
              title={inverse ? `Away: ${v}%` : `Quality: ${v}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// Safe time formatter hook or component isn't strictly necessary if we just wait for mount.
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
  // HYDRATION FIX: Use a client-side only display for the time to prevent server mismatch
  const [displayTime, setDisplayTime] = useState("");

  useEffect(() => {
    setDisplayTime(time);
  }, [time]);

  return (
    <div className={`${color} rounded-2xl p-4 border border-black/5 shadow-sm relative ml-6 bg-white`}>
      <div className="absolute -left-[2.1rem] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-neutral-300 shadow-sm z-10" />
      <div className="text-[28px] leading-none mb-2">{icon}</div>
      <div className="text-[15px] font-bold text-neutral-900">{title}</div>
      <div className="text-[13px] font-medium text-neutral-600 mt-1 min-h-[1.25em]">
        {displayTime || <span className="opacity-0">--:--</span>}
      </div>
      <div className="text-[12px] font-medium text-neutral-500">{subtitle}</div>
    </div>
  );
}

function TaskPanel({
  tasks,
  addTask,
  toggleTask,
  removeTask,
  clearDone,
  lightMode,
}: {
  tasks: Task[];
  addTask: (t: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  clearDone: () => void;
  lightMode?: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className={`rounded-3xl border p-4 shadow-sm border-white/50 bg-black/50 backdrop-blur-md`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-white">Tasks</div>
        <button className="btn-ghost btn-xs text-white/70 hover:text-white" onClick={clearDone}>
          Clear done
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          className="input w-full bg-white/5 text-white border border-white/50 focus:border-white placeholder:text-white/50 rounded-xl h-10 font-medium"
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
          className="btn-ghost font-bold text-white hover:bg-white/20 hover:text-white rounded-xl px-4 border border-white/30"
          onClick={() => {
            addTask(text);
            setText("");
          }}
        >
          Add
        </button>
      </div>
      <ul className="grid gap-2 text-sm">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-white/30 px-3 py-3 bg-white/10 flex items-center gap-3 transition-colors hover:border-white/50"
          >
            <input
              checked={t.done}
              onChange={() => toggleTask(t.id)}
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary border-white/50"
            />
            <span className={`font-bold ${t.done ? "line-through text-white/40" : "text-white"}`}>
              {t.text}
            </span>
            <button
              className="btn-ghost btn-xs ml-auto text-white/50 hover:text-red-500"
              onClick={() => removeTask(t.id)}
              aria-label="Delete"
            >
              ✕
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="text-white/50 italic px-1">No tasks yet — add one above.</li>
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
  lightMode?: boolean; // deprecated prop, kept for interface compat but unused styles
}) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div className="w-full px-6 pb-5">
        <div className={`pointer-events-auto rounded-[22px] px-6 py-4 flex items-center justify-between border shadow-lg transition-all border-white/50 bg-black/60 backdrop-blur-xl text-white`}>
          <button className={`btn-ghost font-bold text-white hover:bg-white/10 border border-white/20 rounded-xl px-4`} aria-label="Open tasks">
            Tasks
          </button>
          <div className="flex items-center gap-4">
            {!running ? (
              <button
                className="rounded-full w-14 h-14 p-0 bg-rose-600 hover:bg-rose-500 text-white text-xl font-bold shadow-md hover:scale-105 transition-all flex items-center justify-center pl-1"
                onClick={onStart}
                disabled={!canStart}
                aria-label="Start"
              >
                ▶
              </button>
            ) : (
              <button
                className="rounded-full w-14 h-14 p-0 bg-rose-600 hover:bg-rose-500 text-white text-xl font-bold shadow-md hover:scale-105 transition-all flex items-center justify-center gap-1"
                onClick={onPause}
                aria-label="Pause"
              >
                <span className="w-1.5 h-5 bg-white rounded-full" />
                <span className="w-1.5 h-5 bg-white rounded-full" />
              </button>
            )}
          </div>
          <button className={`btn-ghost font-bold text-white hover:bg-white/10 border border-white/20 rounded-xl px-4`} onClick={onReset} aria-label="Reset">
            Reset
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
      className="fixed bottom-4 right-4 z-[60] rounded-2xl shadow-xl w-[280px] p-5 border border-white/50 bg-black/70 backdrop-blur-xl text-white"
      role="dialog"
      aria-label="Pomodoro mini widget"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold uppercase tracking-wider text-white/70">
          {phase === "work"
            ? "Work Phase"
            : phase === "short"
              ? "Short Break"
              : "Long Break"}
        </div>
        <button className="btn-ghost btn-xs text-white/50 hover:text-white" onClick={onClose} aria-label="Close mini widget">
          ✕
        </button>
      </div>
      <div className="grid place-items-center gap-4">
        <div className="text-5xl font-bold tabular-nums tracking-tight text-white">{time}</div>
        <div className="flex items-center gap-3 w-full">
          {!running ? (
            <button className="flex-1 btn-gold btn-sm bg-rose-600 hover:bg-rose-500 text-white border-none py-2 h-auto text-base shadow-md" onClick={onStart}>
              Start
            </button>
          ) : (
            <button className="flex-1 btn-ghost btn-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 py-2 h-auto text-base" onClick={onPause}>
              Pause
            </button>
          )}
          <button className="flex-1 btn-ghost btn-sm text-white/50 hover:text-white border border-transparent hover:border-white/10 py-2 h-auto text-base" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
