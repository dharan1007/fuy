"use client";

import React, { useEffect, useRef, useState } from "react";
import { Block, MIN_H_CARD, MIN_W_CARD } from "@/lib/templates";

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
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mousedown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-resizer]") || t.closest("[data-no-drag]") || t.closest("[data-block-toolbar]")) return;
      if (e.button !== 0) return;
      drag.current = { down: true, sx: e.clientX, sy: e.clientY, ox: block.x, oy: block.y };
      emit("block:activate", { id: block.id });
    };
    const mousemove = (e: MouseEvent) => {
      if (!drag.current.down) return;
      const dx = e.clientX - drag.current.sx;
      const dy = e.clientY - drag.current.sy;
      const nx = Math.round(drag.current.ox + dx);
      const ny = Math.round(drag.current.oy + dy);
      emit("block:move", { id: block.id, x: nx, y: ny });
    };
    const mouseup = () => {
      drag.current.down = false;
    };

    el.addEventListener("mousedown", mousedown);
    window.addEventListener("mousemove", mousemove);
    window.addEventListener("mouseup", mouseup);
    return () => {
      el.removeEventListener("mousedown", mousedown);
      window.removeEventListener("mousemove", mousemove);
      window.removeEventListener("mouseup", mouseup);
    };
  }, [block.id, block.x, block.y]);

  // resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!res.current.down) return;
      const dw = e.clientX - res.current.sx;
      const dh = e.clientY - res.current.sy;
      const w = Math.max(MIN_W_CARD, res.current.sw + dw);
      const h = Math.max(MIN_H_CARD, res.current.sh + dh);
      emit("block:resize", { id: block.id, w, h });
    };
    const onUp = () => (res.current.down = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [block.id]);

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

      <div className="h-full w-full rounded-2xl bg-white shadow-sm ring-1 ring-black/15">
        {block.type === "TEXT" && (
          <textarea
            data-no-drag
            className="h-full w-full resize-none rounded-2xl bg-white p-3 text-sm outline-none"
            value={block.text || ""}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Write…"
          />
        )}

        {block.type === "CHECKLIST" && (
          <div className="flex h-full w-full flex-col gap-2 p-2">
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
                    className="flex-1 border-none bg-transparent text-sm outline-none"
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
                className="rounded-md border border-black/20 px-2 py-1 text-sm"
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
                  className="rounded-md border border-black/20 px-2 py-1 text-sm"
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
          <DrawLayer stroke={block.drawing?.stroke ?? "#000"} strokeWidth={block.drawing?.strokeWidth ?? 2}
            onMutatePaths={(paths) => update({ drawing: { stroke: "#000", strokeWidth: 2, paths } })}
          />
        )}

        {block.type === "IMAGE" && (
          <ImageLayer block={block} onPatch={update} />
        )}

        {block.type === "VIDEO" && (
          <VideoLayer block={block} onPatch={update} />
        )}

        {block.type === "AUDIO" && (
          <AudioLayer block={block} onPatch={update} />
        )}
      </div>

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
  stroke,
  strokeWidth,
  onMutatePaths,
}: {
  stroke: string;
  strokeWidth: number;
  onMutatePaths: (paths: { points: [number, number][] }[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draw = useRef({ down: false });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const getPoint = (e: PointerEvent): [number, number] => {
      const rect = svg.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    let paths: { points: [number, number][] }[] = [];

    const onDown = (e: PointerEvent) => {
      (e.target as Element).setPointerCapture(e.pointerId);
      draw.current.down = true;
      const p = getPoint(e);
      paths = [...paths, { points: [p] }];
      onMutatePaths(paths);
    };
    const onMove = (e: PointerEvent) => {
      if (!draw.current.down) return;
      const p = getPoint(e);
      paths = [...paths];
      paths[paths.length - 1] = {
        points: [...paths[paths.length - 1].points, p],
      };
      onMutatePaths(paths);
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

  return (
    <svg ref={svgRef} data-no-drag className="h-full w-full rounded-2xl bg-white">
      {/* paths are drawn by consumer via patching; this stub keeps the layer */}
      {/* keep simple: actual path rendering occurs from parent Block state */}
    </svg>
  );
}

function ImageLayer({ block, onPatch }: { block: Block; onPatch: (p: Partial<Block>) => void }) {
  const [tmpUrl, setTmpUrl] = useState(block.url || "");
  useEffect(() => setTmpUrl(block.url || ""), [block.url]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1 overflow-hidden rounded-2xl bg-black/5">
        {block.url ? (
          <img src={block.url} alt={block.caption || "image"} className="h-full w-full bg-black/10 object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-black/50">
            Drop an image or paste a URL below
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-2">
        <input
          className="flex-1 rounded-xl border border-black/20 bg-white px-2 py-1 text-sm outline-none"
          placeholder="Caption"
          value={block.caption || ""}
          onChange={(e) => onPatch({ caption: e.target.value })}
        />
        <input
          className="flex-1 min-w-[180px] rounded-xl border border-black/20 bg-white px-2 py-1 text-sm outline-none"
          placeholder="Paste image URL…"
          value={tmpUrl}
          onChange={(e) => setTmpUrl(e.target.value)}
          onBlur={() => tmpUrl.trim() && onPatch({ url: tmpUrl.trim() })}
        />
      </div>
    </div>
  );
}

function VideoLayer({ block, onPatch }: { block: Block; onPatch: (p: Partial<Block>) => void }) {
  const [tmpUrl, setTmpUrl] = useState(block.url || "");
  useEffect(() => setTmpUrl(block.url || ""), [block.url]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1 overflow-hidden rounded-2xl bg-black/80">
        {block.url ? (
          <video src={block.url} controls className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
            Paste a video URL below
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-2">
        <input
          className="flex-1 rounded-xl border border-black/20 bg-white px-2 py-1 text-sm outline-none"
          placeholder="Paste video URL…"
          value={tmpUrl}
          onChange={(e) => setTmpUrl(e.target.value)}
          onBlur={() => tmpUrl.trim() && onPatch({ url: tmpUrl.trim() })}
        />
      </div>
    </div>
  );
}

function AudioLayer({ block, onPatch }: { block: Block; onPatch: (p: Partial<Block>) => void }) {
  const [tmpUrl, setTmpUrl] = useState(block.url || "");
  useEffect(() => setTmpUrl(block.url || ""), [block.url]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 overflow-hidden rounded-2xl bg-black/5">
        {block.url ? (
          <div className="p-3"><audio src={block.url} controls className="w-full" /></div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-black/60">
            Paste an audio URL below
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-2">
        <input
          className="flex-1 rounded-xl border border-black/20 bg-white px-2 py-1 text-sm outline-none"
          placeholder="Paste audio URL…"
          value={tmpUrl}
          onChange={(e) => setTmpUrl(e.target.value)}
          onBlur={() => tmpUrl.trim() && onPatch({ url: tmpUrl.trim() })}
        />
      </div>
    </div>
  );
}
