"use client";

import React, { useEffect, useRef, useState } from "react";
import { Block, MIN_H_CARD, MIN_W_CARD } from "@/lib/templates";
import { GripHorizontal, Upload, Camera, Mic, Video as VideoIcon } from "lucide-react";

type Props = {
  block: Block;
  /** parent (CanvasArea) should compute this and pass in */
  active: boolean;
};

function cx(...a: Array<string | false | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function BlockCard({ block, active }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ down: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const res = useRef({ down: false, sx: 0, sy: 0, sw: 0, sh: 0 });

  // ---- helpers to talk to parent ----
  const emit = (name: string, detail: any) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  // drag to move
  const blockRef = useRef(block);
  blockRef.current = block;

  // drag to move
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleDragStart = (x: number, y: number) => {
      const b = blockRef.current;
      drag.current = { down: true, sx: x, sy: y, ox: b.x, oy: b.y };
      emit("block:activate", { id: b.id });
    };

    const handleDragMove = (x: number, y: number) => {
      if (!drag.current.down) return;
      const b = blockRef.current;
      const dx = x - drag.current.sx;
      const dy = y - drag.current.sy;
      const nx = Math.round(drag.current.ox + dx);
      const ny = Math.round(drag.current.oy + dy);
      emit("block:move", { id: b.id, x: nx, y: ny });
    };

    const handleDragEnd = () => {
      drag.current.down = false;
    };

    const mousedown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-drag-handle]")) return;
      if (t.closest("[data-resizer]") || t.closest("[data-no-drag]") || t.closest("[data-block-toolbar]")) return;
      if (e.button !== 0) return;
      handleDragStart(e.clientX, e.clientY);
    };

    const touchstart = (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-drag-handle]")) return;
      if (t.closest("[data-resizer]") || t.closest("[data-no-drag]") || t.closest("[data-block-toolbar]")) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    };

    const mousemove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const touchmove = (e: TouchEvent) => {
      if (!drag.current.down || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };

    const mouseup = handleDragEnd;
    const touchend = handleDragEnd;

    el.addEventListener("mousedown", mousedown);
    el.addEventListener("touchstart", touchstart, { passive: true });
    window.addEventListener("mousemove", mousemove);
    window.addEventListener("touchmove", touchmove, { passive: false });
    window.addEventListener("mouseup", mouseup);
    window.addEventListener("touchend", touchend);

    return () => {
      el.removeEventListener("mousedown", mousedown);
      el.removeEventListener("touchstart", touchstart);
      window.removeEventListener("mousemove", mousemove);
      window.removeEventListener("touchmove", touchmove);
      window.removeEventListener("mouseup", mouseup);
      window.removeEventListener("touchend", touchend);
    };
  }, []);

  // resize
  useEffect(() => {
    const handleResize = (x: number, y: number) => {
      if (!res.current.down) return;
      const dw = x - res.current.sx;
      const dh = y - res.current.sy;
      const w = Math.max(MIN_W_CARD, res.current.sw + dw);
      const h = Math.max(MIN_H_CARD, res.current.sh + dh);
      emit("block:resize", { id: blockRef.current.id, w, h });
    };

    const onMouseMove = (e: MouseEvent) => {
      handleResize(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!res.current.down || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleResize(touch.clientX, touch.clientY);
    };

    const onEnd = () => (res.current.down = false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  // content renderers (all send updates via event)
  const update = (patch: Partial<Block>) =>
    emit("block:update", { id: block.id, patch });

  return (
    <div
      ref={ref}
      data-block
      className="group absolute select-none"
      style={{
        transform: `translate(${block.x}px, ${block.y}px)`,
        width: block.w,
        height: block.h,
      }}
      onMouseDown={() => emit("block:activate", { id: block.id })}
    >
      {active && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 16,
            outline: "3px solid #000",
            outlineOffset: 6,
          }}
        />
      )}

      {/* Drag Handle */}
      <div
        data-drag-handle
        className="absolute right-2 top-2 z-20 flex h-6 w-6 cursor-move items-center justify-center rounded-md bg-black/5 hover:bg-black/10"
      >
        <GripHorizontal className="h-4 w-4 text-black/40" />
      </div>

      {block.type === "TEXT" && (
        <textarea
          data-no-drag
          className="h-full w-full resize-none bg-transparent p-2 text-base font-medium text-black outline-none placeholder:text-black/40"
          style={{
            border: active ? "2px solid #000" : "1px solid #ddd",
            borderRadius: 8,
          }}
          value={block.text || ""}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Write…"
        />
      )}

      {block.type === "CHECKLIST" && (
        <div
          className="flex h-full w-full flex-col gap-2 p-2"
          style={{
            border: active ? "2px solid #000" : "1px solid #ddd",
            borderRadius: 8,
            backgroundColor: "transparent",
          }}
        >
          <div className="flex-1 overflow-auto">
            {(block.checklist ?? []).map((it, i) => (
              <label
                key={it.id}
                className="mb-1 flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-black/5"
              >
                <input
                  data-no-drag
                  type="checkbox"
                  className="size-4"
                  checked={!!it.done}
                  onChange={(e) => {
                    const next = [...(block.checklist ?? [])];
                    next[i] = { ...it, done: e.target.checked };
                    update({ checklist: next });
                  }}
                />
                <input
                  data-no-drag
                  className="flex-1 border-none bg-transparent text-base font-medium text-black outline-none placeholder:text-black/40"
                  value={it.text}
                  onChange={(e) => {
                    const next = [...(block.checklist ?? [])];
                    next[i] = { ...it, text: e.target.value };
                    update({ checklist: next });
                  }}
                  placeholder="List item"
                />
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              data-no-drag
              className="rounded-md border border-black/20 px-2 py-1 text-sm hover:bg-black/5"
              onClick={() =>
                update({
                  checklist: [
                    ...(block.checklist ?? []),
                    { id: crypto.randomUUID(), text: "New item", done: false },
                  ],
                })
              }
            >
              Add
            </button>
            {!!(block.checklist ?? []).length && (
              <button
                data-no-drag
                className="rounded-md border border-black/20 px-2 py-1 text-sm hover:bg-black/5"
                onClick={() =>
                  update({
                    checklist: (block.checklist ?? []).filter((x) => !x.done),
                  })
                }
              >
                Clear done
              </button>
            )}
          </div>
        </div>
      )}

      {block.type === "DRAW" && (
        <DrawLayer
          paths={block.drawing?.paths ?? []}
          stroke={block.drawing?.stroke ?? "#000"}
          strokeWidth={block.drawing?.strokeWidth ?? 2}
          onMutatePaths={(paths) => update({ drawing: { ...block.drawing!, paths } })}
          onSettingsChange={(s) => update({ drawing: { ...block.drawing!, ...s } })}
          active={active}
        />
      )}

      {block.type === "IMAGE" && (
        <ImageLayer block={block} onPatch={update} active={active} />
      )}

      {block.type === "VIDEO" && (
        <VideoLayer block={block} onPatch={update} active={active} />
      )}

      {block.type === "AUDIO" && (
        <AudioLayer block={block} onPatch={update} active={active} />
      )}

      {/* resizer */}
      <div
        data-resizer
        className="absolute -bottom-2 -right-2 hidden h-4 w-4 cursor-nwse-resize rounded-full border border-black/20 bg-white group-hover:block"
        onMouseDown={(e) => {
          e.stopPropagation();
          res.current = {
            down: true,
            sx: e.clientX,
            sy: e.clientY,
            sw: block.w,
            sh: block.h,
          };
        }}
      />

      {active && (
        <div
          data-block-toolbar
          className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-black/20 bg-white px-2 py-1 text-xs shadow"
        >
          <div className="flex items-center gap-2">
            <span className="text-black/70">{block.type}</span>
            <button
              className="rounded-md px-2 py-0.5 hover:bg-black/5"
              onClick={() => emit("block:remove", { id: block.id })}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Lightweight media/draw layers (event-bridge friendly) ---------- */

function DrawLayer({
  paths,
  stroke,
  strokeWidth,
  onMutatePaths,
  onSettingsChange,
  active,
}: {
  paths: { points: [number, number][]; stroke?: string; strokeWidth?: number }[];
  stroke: string;
  strokeWidth: number;
  onMutatePaths: (paths: { points: [number, number][]; stroke?: string; strokeWidth?: number }[]) => void;
  onSettingsChange: (settings: { stroke?: string; strokeWidth?: number }) => void;
  active?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draw = useRef({ down: false });

  // Convert points array to SVG polyline string
  const toPoints = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");

  const pathsRef = useRef(paths);
  const strokeRef = useRef(stroke);
  const strokeWidthRef = useRef(strokeWidth);

  useEffect(() => {
    pathsRef.current = paths;
    strokeRef.current = stroke;
    strokeWidthRef.current = strokeWidth;
  }, [paths, stroke, strokeWidth]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const getPoint = (e: PointerEvent): [number, number] => {
      const rect = svg.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest("[data-no-drag]")) return;
      (e.target as Element).setPointerCapture(e.pointerId);
      draw.current.down = true;
      const p = getPoint(e);
      const newPath = {
        points: [p],
        stroke: strokeRef.current,
        strokeWidth: strokeWidthRef.current,
      };
      onMutatePaths([...pathsRef.current, newPath]);
    };

    const onMove = (e: PointerEvent) => {
      if (!draw.current.down) return;
      const p = getPoint(e);
      const currentPaths = pathsRef.current;
      if (currentPaths.length === 0) return;

      const nextPaths = [...currentPaths];
      const lastPath = nextPaths[nextPaths.length - 1];
      nextPaths[nextPaths.length - 1] = {
        ...lastPath,
        points: [...lastPath.points, p],
      };
      onMutatePaths(nextPaths);
    };

    const onUp = (e: PointerEvent) => {
      draw.current.down = false;
      (e.target as Element).releasePointerCapture(e.pointerId);
    };

    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointerleave", onUp);
    return () => {
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointerleave", onUp);
    };
  }, [onMutatePaths]);

  const colors = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"];
  const widths = [2, 4, 8];

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none"
        style={{
          border: active ? "2px solid #000" : "1px solid #ddd",
          borderRadius: 8,
          backgroundColor: "#fff", // White canvas for drawing
          cursor: "crosshair",
        }}
      >
        {paths.map((p, i) => (
          <polyline
            key={i}
            points={toPoints(p.points)}
            fill="none"
            stroke={p.stroke || "#000"}
            strokeWidth={p.strokeWidth || 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* Toolbar */}
      {active && (
        <div
          data-no-drag
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-black/10 bg-white p-2 shadow-lg"
        >
          {/* Colors */}
          <div className="flex items-center gap-1 border-r border-black/10 pr-2">
            {colors.map((c) => (
              <button
                key={c}
                className={`h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-110 ${stroke === c ? "ring-2 ring-black ring-offset-1" : ""
                  }`}
                style={{ backgroundColor: c }}
                onClick={() => onSettingsChange({ stroke: c })}
              />
            ))}
          </div>

          {/* Widths */}
          <div className="flex items-center gap-2 border-r border-black/10 pr-2">
            {widths.map((w) => (
              <button
                key={w}
                className={`flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5 ${strokeWidth === w ? "bg-black/5" : ""
                  }`}
                onClick={() => onSettingsChange({ strokeWidth: w })}
              >
                <div
                  className="rounded-full bg-black"
                  style={{ width: w, height: w }}
                />
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              className="rounded px-2 py-1 text-xs font-medium hover:bg-black/5"
              onClick={() => onMutatePaths(paths.slice(0, -1))}
              disabled={paths.length === 0}
            >
              Undo
            </button>
            <button
              className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
              onClick={() => onMutatePaths([])}
              disabled={paths.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageLayer({ block, onPatch, active }: { block: Block; onPatch: (p: Partial<Block>) => void; active?: boolean }) {
  const [tmpUrl, setTmpUrl] = useState(block.url || "");
  useEffect(() => setTmpUrl(block.url || ""), [block.url]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        onPatch({ url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{
        border: active ? "2px solid #000" : "1px solid #ddd",
        borderRadius: 8,
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      <div className="relative flex-1 overflow-hidden group/img">
        {block.url ? (
          <img src={block.url} alt={block.caption || "image"} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-black/40">
            <div className="flex gap-2">
              <label htmlFor={`img-upload-${block.id}`} className="cursor-pointer rounded-md bg-black/5 p-2 hover:bg-black/10">
                <input id={`img-upload-${block.id}`} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <Upload className="h-5 w-5 text-black/60" />
              </label>
              <label htmlFor={`img-camera-${block.id}`} className="cursor-pointer rounded-md bg-black/5 p-2 hover:bg-black/10">
                <input id={`img-camera-${block.id}`} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
                <Camera className="h-5 w-5 text-black/60" />
              </label>
            </div>
            <span>Upload or Take Photo</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 p-1 bg-black/5">
        <input
          data-no-drag
          className="flex-1 border-none bg-transparent px-1 py-0.5 text-sm font-medium text-black outline-none placeholder:text-black/40"
          placeholder="Caption"
          value={block.caption || ""}
          onChange={(e) => onPatch({ caption: e.target.value })}
        />
        <input
          data-no-drag
          className="flex-1 min-w-[120px] border-none bg-transparent px-1 py-0.5 text-xs outline-none text-black/60"
          placeholder="Image URL…"
          value={tmpUrl}
          onChange={(e) => setTmpUrl(e.target.value)}
          onBlur={() => tmpUrl.trim() && onPatch({ url: tmpUrl.trim() })}
        />
      </div>
    </div>
  );
}

function VideoLayer({ block, onPatch, active }: { block: Block; onPatch: (p: Partial<Block>) => void; active?: boolean }) {
  const [tmpUrl, setTmpUrl] = useState(block.url || "");
  useEffect(() => setTmpUrl(block.url || ""), [block.url]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        onPatch({ url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{
        border: active ? "2px solid #000" : "1px solid #ddd",
        borderRadius: 8,
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      <div className="relative flex-1 overflow-hidden bg-black/10">
        {block.url ? (
          <video src={block.url} controls className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-black/40">
            <div className="flex gap-2">
              <label htmlFor={`vid-upload-${block.id}`} className="cursor-pointer rounded-md bg-black/5 p-2 hover:bg-black/10">
                <input id={`vid-upload-${block.id}`} type="file" accept="video/*" className="hidden" onChange={handleFile} />
                <Upload className="h-5 w-5 text-black/60" />
              </label>
              <label htmlFor={`vid-camera-${block.id}`} className="cursor-pointer rounded-md bg-black/5 p-2 hover:bg-black/10">
                <input id={`vid-camera-${block.id}`} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFile} />
                <VideoIcon className="h-5 w-5 text-black/60" />
              </label>
            </div>
            <span>Upload or Record Video</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 p-1 bg-black/5">
        <input
          data-no-drag
          className="flex-1 border-none bg-transparent px-1 py-0.5 text-xs outline-none text-black/60"
          placeholder="Video URL…"
          value={tmpUrl}
          onChange={(e) => setTmpUrl(e.target.value)}
          onBlur={() => tmpUrl.trim() && onPatch({ url: tmpUrl.trim() })}
        />
      </div>
    </div>
  );
}

function AudioLayer({ block, onPatch, active }: { block: Block; onPatch: (p: Partial<Block>) => void; active?: boolean }) {
  const [tmpUrl, setTmpUrl] = useState(block.url || "");
  useEffect(() => setTmpUrl(block.url || ""), [block.url]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        onPatch({ url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{
        border: active ? "2px solid #000" : "1px solid #ddd",
        borderRadius: 8,
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      <div className="flex-1 overflow-hidden p-2 bg-black/5 flex items-center justify-center">
        {block.url ? (
          <audio src={block.url} controls className="w-full" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-xs text-black/40">
            <div className="flex gap-2">
              <label htmlFor={`aud-upload-${block.id}`} className="cursor-pointer rounded-md bg-white p-2 hover:bg-gray-50 shadow-sm">
                <input id={`aud-upload-${block.id}`} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
                <Upload className="h-5 w-5 text-black/60" />
              </label>
              <label htmlFor={`aud-mic-${block.id}`} className="cursor-pointer rounded-md bg-white p-2 hover:bg-gray-50 shadow-sm">
                <input id={`aud-mic-${block.id}`} type="file" accept="audio/*" capture className="hidden" onChange={handleFile} />
                <Mic className="h-5 w-5 text-black/60" />
              </label>
            </div>
            <span>Upload or Record Audio</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 p-1 bg-black/5 border-t border-black/10">
        <input
          data-no-drag
          className="flex-1 border-none bg-transparent px-1 py-0.5 text-xs outline-none text-black/60"
          placeholder="Audio URL…"
          value={tmpUrl}
          onChange={(e) => setTmpUrl(e.target.value)}
          onBlur={() => tmpUrl.trim() && onPatch({ url: tmpUrl.trim() })}
        />
      </div>
    </div>
  );
}
