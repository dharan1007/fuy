"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Block,
  BlockType,
  JournalEntry,
  Mood,
  TemplateFull,
  TemplateVisibility,
  analyzeEntryForTags,
  clamp,
  loadCommunity,
  loadEntries,
  loadLocalTemplates,
  newTemplateId,
  pickSummary,
  saveCommunity,
  saveEntries,
  saveLocalTemplates,
  uid,
  MIN_H_CARD,
  MIN_W_CARD,
} from "@/lib/templates";
import useKeyDown from "@/hooks/useKeyDown";
import useFullscreen from "@/hooks/useFullscreen";
import Btn from "./Btn";
import CanvasArea from "./CanvasArea";
import TemplateCard from "./TemplateCard";
import TemplatePreview from "./TemplatePreview";
import generatePlan, { AIPlan, AIBlockPlan, AIOptions } from "@/lib/ai";
import AISuggestionsPanel from "./AISuggestionsPanel";
import { SuggestionsResponse } from "@/lib/ai-suggestions";

export default function JournalEditor() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [localTemplates, setLocalTemplates] = useState<TemplateFull[]>([]);
  const [communityTemplates, setCommunityTemplates] = useState<TemplateFull[]>([]);

  const [title, setTitle] = useState("Morning Reflection");
  const [mood, setMood] = useState<Mood>("🙂");
  const [tags, setTags] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panRef = useRef({ down: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  const [sidebarW, setSidebarW] = useState(360);
  const sideResRef = useRef({ down: false, sx: 0, sw: 360 });

  const [previewTpl, setPreviewTpl] = useState<TemplateFull | null>(null);

  // AI (single free-text input—no selections)
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // AI Suggestions
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // sensible defaults; generator mainly relies on aiPrompt text
  const aiOptRef = useRef<AIOptions>({
    style: "reflective",
    boostCreativity: true,
    timeboxMinutes: 25,
    include: { text: true, checklist: true, draw: true, image: true, audio: true, video: true },
    mood: null,
  });

  const pageRef = useRef<HTMLDivElement | null>(null);
  const fs = useFullscreen(pageRef);

  /* ------------ load & derive ------------- */
  useEffect(() => {
    setEntries(loadEntries());
    setLocalTemplates(loadLocalTemplates());
    setCommunityTemplates(loadCommunity());
  }, []);

  const textSummary = useMemo(() => pickSummary(blocks), [blocks]);
  useEffect(() => {
    const info = analyzeEntryForTags(textSummary);
    const merged = Array.from(new Set([...(tags ?? []), ...info.tags]));
    setTags(merged.slice(0, 12));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textSummary]);

  /* ------------ viewport pan/zoom ------------- */
  useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;

    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-resizer]") || t.closest("[data-no-drag]") || t.closest("[data-block-toolbar]")) return;
      if (e.button !== 0) return;
      panRef.current = { down: true, sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    };
    const move = (e: MouseEvent) => {
      if (!panRef.current.down) return;
      const dx = e.clientX - panRef.current.sx;
      const dy = e.clientY - panRef.current.sy;
      setOffset({ x: panRef.current.ox + dx, y: panRef.current.oy + dy });
    };
    const up = () => { panRef.current.down = false; };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((prev) => clamp(prev + (e.deltaY < 0 ? 0.1 : -0.1), 0.3, 2));
      }
    };

    root.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    root.addEventListener("wheel", wheel, { passive: false });
    return () => {
      root.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      root.removeEventListener("wheel", wheel as any);
    };
  }, [offset.x, offset.y]);

  /* ------------ AI regenerate from “Questions” (⌘/Ctrl+Enter) ------------- */
  async function regenerateFrom(text: string) {
    try {
      setAiLoading(true);
      const plan = await generatePlan(text, aiOptRef.current);
      insertFromPlan(plan);
    } catch (e) {
      console.error(e);
      alert("Could not regenerate from your reply.");
    } finally {
      setAiLoading(false);
    }
  }

  useKeyDown((e) => {
    // arrow key nudge (existing)
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      if (!activeId) return;
      const idx = blocks.findIndex((b) => b.id === activeId);
      if (idx < 0) return;
      const step = e.shiftKey ? 10 : 2;
      const b = { ...blocks[idx] };
      let changed = false;
      if (e.key === "ArrowLeft") { b.x -= step; changed = true; }
      if (e.key === "ArrowRight") { b.x += step; changed = true; }
      if (e.key === "ArrowUp") { b.y -= step; changed = true; }
      if (e.key === "ArrowDown") { b.y += step; changed = true; }
      if (changed) {
        const arr = [...blocks];
        arr[idx] = b;
        setBlocks(arr);
      }
      return;
    }

    // NEW: ⌘/Ctrl+Enter to regenerate from the "Questions" Text block
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      const ae = document.activeElement as HTMLElement | null;
      const typing =
        ae &&
        (ae.tagName === "TEXTAREA" ||
          (ae as any).isContentEditable ||
          ae.tagName === "INPUT");
      if (!typing) return;

      if (!activeId) return;
      const b = blocks.find((x) => x.id === activeId);
      if (!b || b.type !== "TEXT") return;

      const cap = (b.caption || "").toLowerCase();
      const txt = (b.text || "");
      const looksLikeQuestions =
        cap.includes("question") || /quick questions/i.test(txt);

      if (looksLikeQuestions) {
        e.preventDefault();
        regenerateFrom(txt);
      }
    }
  });

  /* ------------ sidebar resize ------------- */
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!sideResRef.current.down) return;
      const w = clamp(sideResRef.current.sw + (e.clientX - sideResRef.current.sx), 260, 520);
      setSidebarW(w);
    };
    const up = () => (sideResRef.current.down = false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  /* ------------ BLOCK EVENT BRIDGE ------------- */
  useEffect(() => {
    const onRemove = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string }>;
      const id = e.detail?.id;
      if (!id) return;
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      setActiveId((aid) => (aid === id ? null : aid));
    };
    const onUpdate = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string; patch: Partial<Block> }>;
      const { id, patch } = e.detail || {};
      if (!id || !patch) return;
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    };
    const onMove = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string; x: number; y: number }>;
      const { id, x, y } = e.detail || {};
      if (!id) return;
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)));
    };
    const onResize = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string; w: number; h: number }>;
      const { id, w, h } = e.detail || {};
      if (!id) return;
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, w, h } : b)));
    };
    const onActivate = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string }>;
      const { id } = e.detail || {};
      if (id) setActiveId(id);
    };

    window.addEventListener("block:remove", onRemove as EventListener);
    window.addEventListener("block:update", onUpdate as EventListener);
    window.addEventListener("block:move", onMove as EventListener);
    window.addEventListener("block:resize", onResize as EventListener);
    window.addEventListener("block:activate", onActivate as EventListener);
    return () => {
      window.removeEventListener("block:remove", onRemove as EventListener);
      window.removeEventListener("block:update", onUpdate as EventListener);
      window.removeEventListener("block:move", onMove as EventListener);
      window.removeEventListener("block:resize", onResize as EventListener);
      window.removeEventListener("block:activate", onActivate as EventListener);
    };
  }, []);

  /* ------------ TEMPLATE EVENT BRIDGE ------------- */
  useEffect(() => {
    const onUse = (evt: Event) => {
      const e = evt as CustomEvent<any>;
      const id = e.detail?.id ?? e.detail?.tplId;
      if (!id) return;
      const tpl = [...communityTemplates, ...localTemplates].find((t) => t.id === id);
      if (tpl) addFromTemplate(tpl);
    };
    const onPreview = (evt: Event) => {
      const e = evt as CustomEvent<any>;
      const id = e.detail?.id ?? e.detail?.tplId;
      const tpl = [...communityTemplates, ...localTemplates].find((t) => t.id === id);
      if (tpl) setPreviewTpl(tpl);
    };
    const onToggleSave = (evt: Event) => {
      const e = evt as CustomEvent<any>;
      const id = e.detail?.id ?? e.detail?.tplId;
      const tpl =
        [...communityTemplates, ...localTemplates].find((t) => t.id === id) ??
        communityTemplates.find((t) => t.id === id);
      if (tpl) toggleSaveTemplate(tpl);
    };

    const onPrevUse = (evt: Event) => {
      const e = evt as CustomEvent<any>;
      const id = e.detail?.id ?? e.detail?.tplId;
      const tpl = [...communityTemplates, ...localTemplates].find((t) => t.id === id);
      if (tpl) addFromTemplate(tpl);
      setPreviewTpl(null);
    };
    const onPrevSave = (evt: Event) => {
      const e = evt as CustomEvent<any>;
      const id = e.detail?.id ?? e.detail?.tplId;
      const tpl = communityTemplates.find((t) => t.id === id);
      if (tpl) cloneCommunityToPersonal(tpl);
      setPreviewTpl(null);
    };
    const onPrevClose = () => setPreviewTpl(null);

    window.addEventListener("tpl:use", onUse as EventListener);
    window.addEventListener("tpl:preview", onPreview as EventListener);
    window.addEventListener("tpl:toggleSave", onToggleSave as EventListener);
    window.addEventListener("preview:use", onPrevUse as EventListener);
    window.addEventListener("preview:save", onPrevSave as EventListener);
    window.addEventListener("preview:close", onPrevClose as EventListener);

    return () => {
      window.removeEventListener("tpl:use", onUse as EventListener);
      window.removeEventListener("tpl:preview", onPreview as EventListener);
      window.removeEventListener("tpl:toggleSave", onToggleSave as EventListener);
      window.removeEventListener("preview:use", onPrevUse as EventListener);
      window.removeEventListener("preview:save", onPrevSave as EventListener);
      window.removeEventListener("preview:close", onPrevClose as EventListener);
    };
  }, [communityTemplates, localTemplates]);

  /* ------------ block/template helpers ------------- */
  const addBlock = (partial: Partial<Block>) => {
    const b: Block = {
      id: uid(),
      type: "TEXT",
      x: Math.round((-offset.x + 80) / zoom),
      y: Math.round((-offset.y + 80) / zoom),
      w: 320,
      h: 180,
      ...partial,
    };
    setBlocks((s) => [...s, b]);
    setActiveId(b.id);
  };

  const addFromTemplate = (tpl: TemplateFull) => {
    let cx = Math.round((-offset.x + 120) / zoom);
    let cy = Math.round((-offset.y + 100) / zoom);
    const gap = 24;
    const colW = 380;

    const newBlocks: Block[] = [];
    let col = 0;
    let maxH = 0;

    for (const tb of tpl.blocks) {
      const w = Math.max(MIN_W_CARD, (tb as any).w ?? 320);
      const h = Math.max(MIN_H_CARD, (tb as any).h ?? 180);
      const nb: Block = {
        id: uid(),
        type: tb.type as BlockType,
        text: tb.text,
        url: tb.url,
        caption: tb.caption,
        editor: tb.editor,
        checklist: tb.checklist?.map((c) => ({ ...c, id: uid() })),
        drawing:
          tb.drawing && {
            stroke: tb.drawing.stroke,
            strokeWidth: tb.drawing.strokeWidth,
            paths: (tb.drawing.paths ?? []).map((p) => ({ points: [...p.points] })),
          },
        x: cx + col * (colW + gap),
        y: cy,
        w, h,
      };
      newBlocks.push(nb);
      maxH = Math.max(maxH, h);
      col++;
      if (col === 2) {
        col = 0;
        cy += maxH + gap;
        maxH = 0;
      }
    }
    setBlocks((s) => [...s, ...newBlocks]);
    if (newBlocks[0]) setActiveId(newBlocks[0].id);
  };

  const saveEntry = () => {
    const id = uid();
    const dateISO = selectedDate.toISOString();
    const computed = analyzeEntryForTags(pickSummary(blocks));
    const entry: JournalEntry = {
      id,
      title,
      dateISO,
      coverUrl: blocks.find((b) => b.type === "IMAGE")?.url,
      mood,
      tags: Array.from(new Set([...(tags ?? []), ...(computed.tags ?? [])])).slice(0, 12),
      blocks,
      summary: computed.summary,
    };
    const all = [entry, ...entries];
    setEntries(all);
    saveEntries(all);
    alert("Saved");
  };

  const newFromBlank = () => {
    setTitle("New Journal");
    setBlocks([]);
    setActiveId(null);
    setMood("🙂");
    setTags([]);
  };

  const deleteEntry = (id: string) => {
    const all = entries.filter((e) => e.id !== id);
    setEntries(all);
    saveEntries(all);
  };

  const openEntry = (e: JournalEntry) => {
    setTitle(e.title);
    setBlocks(e.blocks);
    setMood(e.mood ?? "🙂");
    setTags(e.tags ?? []);
    const d = new Date(e.dateISO);
    if (!isNaN(d.getTime())) setSelectedDate(d);
    setActiveId(null);
  };

  const cloneCommunityToPersonal = (tpl: TemplateFull) => {
    const clone: TemplateFull = {
      ...tpl,
      id: newTemplateId(),
      sourceId: tpl.id,
      visibility: "PRIVATE",
      author: "me",
      createdAt: new Date().toISOString(),
      reviews: [],
      avgRating: null,
      reviewsCount: 0,
    };
    const all = [clone, ...localTemplates];
    setLocalTemplates(all);
    saveLocalTemplates(all);
  };

  const unsavePersonalCloneBySource = (sourceId: string) => {
    const remaining = localTemplates.filter((t) => t.sourceId !== sourceId);
    setLocalTemplates(remaining);
    saveLocalTemplates(remaining);
  };

  const removePersonalTemplate = (id: string) => {
    const remaining = localTemplates.filter((t) => t.id !== id);
    setLocalTemplates(remaining);
    saveLocalTemplates(remaining);
  };

  const isSavedTemplate = (tpl: TemplateFull) => {
    if (tpl.visibility === "PRIVATE") return true;
    return localTemplates.some((t) => t.sourceId === tpl.id);
  };

  const toggleSaveTemplate = (tpl: TemplateFull) => {
    if (tpl.visibility === "PRIVATE") {
      removePersonalTemplate(tpl.id);
    } else {
      const saved = localTemplates.find((t) => t.sourceId === tpl.id);
      if (saved) unsavePersonalCloneBySource(tpl.id);
      else cloneCommunityToPersonal(tpl);
    }
  };

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = cur - 4; y <= cur + 4; y++) arr.push(y);
    return arr;
  }, []);
  const daysStrip = useMemo(() => {
    const arr: { d: Date; key: string }[] = [];
    const base = new Date(selectedDate);
    base.setDate(base.getDate() - 3);
    for (let i = 0; i < 15; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      arr.push({ d, key: d.toISOString().slice(0, 10) });
    }
    return arr;
  }, [selectedDate]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entries;
    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list.slice(0, 100);
  }, [entries, search]);

  const saveCanvasAsTemplate = (visibility: TemplateVisibility, name: string) => {
    const tpl: TemplateFull = {
      id: newTemplateId(),
      name,
      description: pickSummary(blocks),
      visibility,
      author: "me",
      createdAt: new Date().toISOString(),
      blocks: blocks.map(({ x, y, id, ...rest }) => ({ ...rest })),
      reviews: [],
      avgRating: null,
      reviewsCount: 0,
      sourceId: undefined,
    };
    if (visibility === "PRIVATE") {
      const all = [tpl, ...localTemplates];
      setLocalTemplates(all);
      saveLocalTemplates(all);
      alert("Saved as personal template!");
    } else {
      const all = [tpl, ...communityTemplates];
      setCommunityTemplates(all);
      saveCommunity(all);
      alert("Published to community templates!");
    }
  };

  function insertFromPlan(plan: AIPlan) {
    if (plan.title) setTitle(plan.title);
    if (plan.mood) setMood(plan.mood);
    if (plan.tags?.length) {
      setTags((prev) => Array.from(new Set([...(prev ?? []), ...plan.tags!])).slice(0, 12));
    }

    let cx = Math.round((-offset.x + 120) / zoom);
    let cy = Math.round((-offset.y + 120) / zoom);
    const gap = 24;
    const colW = 400;
    let col = 0;
    let rowMaxH = 0;

    const sizeFor = (k: AIBlockPlan["kind"]) =>
      k === "TEXT"
        ? { w: 420, h: 240 }
        : k === "CHECKLIST"
        ? { w: 360, h: 220 }
        : k === "IMAGE"
        ? { w: 460, h: 300 }
        : k === "VIDEO"
        ? { w: 460, h: 280 }
        : k === "AUDIO"
        ? { w: 380, h: 140 }
        : { w: 480, h: 320 };

    const created: Block[] = [];

    for (const g of plan.blocks) {
      const { w, h } = sizeFor(g.kind);
      const nb: Block = {
        id: uid(),
        type: g.kind === "CHECKLIST" ? "CHECKLIST" : (g.kind as unknown as BlockType),
        x: cx + col * (colW + gap),
        y: cy,
        w: Math.max(MIN_W_CARD, w),
        h: Math.max(MIN_H_CARD, h),
        caption: "caption" in g ? g.caption : undefined,
      } as Block;

      if (g.kind === "TEXT") {
        nb.type = "TEXT";
        nb.text = g.text;
        nb.editor = "MARKDOWN";
      } else if (g.kind === "CHECKLIST") {
        nb.type = "CHECKLIST";
        nb.checklist = (g.items || []).map((t) => ({ id: uid(), text: t, done: false }));
      } else if (g.kind === "DRAW") {
        nb.type = "DRAW";
        nb.drawing = { stroke: "#000", strokeWidth: 2, paths: [] };
      }
      created.push(nb);

      rowMaxH = Math.max(rowMaxH, nb.h);
      col++;
      if (col === 2) {
        col = 0;
        cy += rowMaxH + gap;
        rowMaxH = 0;
      }
    }

    if (created.length) {
      setBlocks((prev) => [...prev, ...created]);
      setActiveId(created[0].id);
    }
  }

  async function handleGenerateAI() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      alert(`Tell me what you want (e.g., "Morning routine + groceries + reminders").`);
      return;
    }
    try {
      setAiLoading(true);
      const plan = await generatePlan(prompt, aiOptRef.current);
      insertFromPlan(plan);
      setAiOpen(false);
      setAiPrompt("");
    } catch (e) {
      console.error(e);
      alert("Could not create content from your request.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSuggestionsRequest(goalText: string) {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const response = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalText, type: "goal" }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuggestions(data);
      } else {
        setSuggestionsError(data.error || "Failed to generate suggestions");
      }
    } catch (error) {
      console.error(error);
      setSuggestionsError("Error fetching suggestions. Please try again.");
    } finally {
      setSuggestionsLoading(false);
    }
  }

  /* ------------ UI ------------- */

  return (
    <div ref={pageRef} className="flex h-[100dvh] w-full overflow-hidden bg-white text-black">
      {/* Sidebar */}
      <aside
        className="relative flex h-full flex-col border-r border-black/10 bg-white"
        style={{ width: sidebarW }}
      >
        <div className="flex items-center justify-between p-3">
          <div className="text-lg font-semibold">My Journal</div>
          <Btn variant="soft" onClick={newFromBlank}>➕ New</Btn>
        </div>

        {/* calendar */}
        <div className="mx-3 rounded-2xl border border-black/15 bg-white p-2">
          <div className="flex items-center justify-between gap-2 px-1 text-xs text-black/70">
            <span>
              {selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px]">Year</label>
              <select
                className="rounded-lg border border-black/20 bg-white px-2 py-1 text-xs"
                value={selectedDate.getFullYear()}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  const d = new Date(selectedDate);
                  d.setFullYear(y);
                  setSelectedDate(d);
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
              <div key={w} className="rounded-lg bg-black/5 py-1 text-center text-xs text-black/60">
                {w}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {daysStrip.map(({ d, key }) => {
              const isToday = new Date().toDateString() === d.toDateString();
              const isActive = selectedDate.toDateString() === d.toDateString();
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(d)}
                  className={[
                    "min-w-10 rounded-xl px-3 py-2 text-center text-sm",
                    isActive
                      ? "bg-black text-white"
                      : isToday
                      ? "bg-black/10"
                      : "bg-black/5 hover:bg-black/10",
                  ].join(" ")}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* search */}
        <div className="p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries or tags…"
            className="w-full rounded-xl border border-black/20 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>

        {/* entries */}
        <div className="mx-3 mb-3 flex-1 overflow-auto rounded-2xl border border-black/15 bg-white">
          <div className="sticky top-0 z-10 border-b border-black/10 bg-black/5 p-2 text-xs font-semibold">
            Entries
          </div>
          {filteredEntries.length === 0 && (
            <div className="p-4 text-sm text-black/60">No entries yet</div>
          )}
          <ul>
            {filteredEntries.map((e) => (
              <li key={e.id} className="flex items-center gap-2 border-b border-black/10 p-2 hover:bg-black/5">
                <button className="flex-1 text-left" onClick={() => openEntry(e)}>
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-black/60">
                    {new Date(e.dateISO).toLocaleString()}
                  </div>
                </button>
                <Btn variant="outline" onClick={() => deleteEntry(e.id)}>🗑️</Btn>
              </li>
            ))}
          </ul>
        </div>

        {/* templates */}
        <div className="mx-3 mb-3 rounded-2xl border border-black/15 bg-white">
          <div className="sticky top-0 z-10 border-b border-black/10 bg-black/5 p-2 text-xs font-semibold">
            Templates
          </div>
          <div className="p-2">
            <div className="mb-2 text-xs font-semibold text-black/70">Community</div>
            <div className="flex flex-col gap-2">
              {communityTemplates.map((t) => (
                <TemplateCard key={t.id} tpl={t} isSaved={isSavedTemplate(t)} />
              ))}
            </div>

            <div className="mt-4 mb-2 text-xs font-semibold text-black/70">Personal</div>
            <div className="flex flex-col gap-2">
              {localTemplates.map((t) => (
                <TemplateCard key={t.id} tpl={t} isSaved={true} />
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Btn
                variant="outline"
                onClick={() =>
                  saveCanvasAsTemplate("PRIVATE", prompt("Template name?") || "My Template")
                }
              >
                Save
              </Btn>
              <Btn
                variant="outline"
                onClick={() =>
                  saveCanvasAsTemplate("PUBLIC", prompt("Template name?") || "Shared Template")
                }
              >
                Publish
              </Btn>
            </div>
          </div>
        </div>

        <div
          className="absolute right-[-5px] top-0 h-full w-2 cursor-col-resize"
          onMouseDown={(e) => {
            sideResRef.current = { down: true, sx: e.clientX, sw: sidebarW };
          }}
        />
      </aside>

      {/* Main */}
      <section className="relative flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-black/10 bg-white p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-[200px] flex-1 rounded-xl border border-black/20 bg-white px-3 py-2 text-sm outline-none"
            placeholder="Entry title"
          />
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value as Mood)}
            className="rounded-xl border border-black/20 bg-white px-2 py-2 text-sm"
          >
            {["😍", "😀", "🙂", "😐", "😟", "😢", "😡"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div className="hidden items-center gap-1 md:flex">
            <Btn variant="outline" onClick={() => setZoom((z) => clamp(z - 0.1, 0.3, 2))}>－</Btn>
            <div className="w-10 select-none text-center text-sm">{(zoom * 100).toFixed(0)}%</div>
            <Btn variant="outline" onClick={() => setZoom((z) => clamp(z + 0.1, 0.3, 2))}>＋</Btn>
            <Btn
              variant="outline"
              onClick={() => {
                setOffset({ x: 0, y: 0 });
                setZoom(1);
              }}
            >
              ⟲
            </Btn>
          </div>

          <Btn
            variant="outline"
            onClick={fs.toggle}
            title={fs.isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
          >
            {fs.isFullscreen ? "🗗 Fullscreen Off" : "⛶ Fullscreen"}
          </Btn>

          <Btn variant="soft" onClick={saveEntry}>💾 Save</Btn>
          <Btn variant="soft" onClick={() => entries[0] && openEntry(entries[0])}>📂 Open last</Btn>
        </div>

        {/* Toolbar */}
        <div className="sticky top-[52px] z-10 border-b border-black/10 bg-white p-2">
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="soft" onClick={() =>
              addBlock({ type: "TEXT", text: "## Reflection\nWrite thoughts here…", editor: "MARKDOWN", w: 380, h: 220 })
            }>
              ✍️ Text
            </Btn>
            <Btn variant="soft" onClick={() =>
              addBlock({
                type: "CHECKLIST",
                checklist: [
                  { id: uid(), text: "Task 1", done: false },
                  { id: uid(), text: "Task 2", done: false },
                ],
                w: 320, h: 200,
              })
            }>
              ☑️ Checklist
            </Btn>
            <Btn variant="soft" onClick={() => addBlock({ type: "IMAGE", w: 440, h: 300 })}>🖼️ Image</Btn>
            <Btn variant="soft" onClick={() => addBlock({ type: "VIDEO", w: 440, h: 280 })}>📹 Video</Btn>
            <Btn variant="soft" onClick={() => addBlock({ type: "AUDIO", w: 380, h: 140 })}>🎙️ Audio</Btn>
            <Btn variant="soft" onClick={() =>
              addBlock({ type: "DRAW", drawing: { stroke: "#000000", strokeWidth: 2, paths: [] }, w: 480, h: 320 })
            }>
              ✏️ Draw
            </Btn>

            <div className="ml-auto" />
            <Btn variant="solid" onClick={() => setSuggestionsOpen((s) => !s)}>✨ AI Suggestions</Btn>
            <Btn variant="solid" onClick={() => setAiOpen((s) => !s)}>🤖 AI</Btn>
          </div>

          {aiOpen && (
            <div className="mt-3 rounded-xl border border-black/15 bg-white p-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm">Tell me (in plain text) what to create</label>
                <textarea
                  className="min-h-[110px] w-full rounded-lg border border-black/20 bg-white p-2 text-sm outline-none"
                  placeholder={`e.g., “Create a morning routine, add groceries: apples x4, oat milk, chicken 1kg; remind me to call mom at 7pm; walk the dog at 7am & 8pm; math homework due Friday; and list 3 MITs.”`}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                  <Btn variant="outline" onClick={() => setAiOpen(false)}>Close</Btn>
                  <Btn variant="solid" onClick={handleGenerateAI}>
                    {aiLoading ? "Creating…" : "Create"}
                  </Btn>
                </div>
                <div className="text-xs text-black/60">
                  Tip: after it adds a <em>Questions</em> block, edit it and press <b>⌘/Ctrl+Enter</b> to regenerate.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <CanvasArea
          viewportRef={viewportRef}
          zoom={zoom}
          offset={offset}
          blocks={blocks}
          activeId={activeId}
        />
      </section>

      {previewTpl && <TemplatePreview tpl={previewTpl} />}

      <AISuggestionsPanel
        isOpen={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        onGoalSubmit={handleSuggestionsRequest}
        isLoading={suggestionsLoading}
        suggestions={suggestions}
        error={suggestionsError || undefined}
      />
    </div>
  );
}
