"use client";

import React from "react";
import { TemplateFull } from "@/lib/templates";
import Btn from "./Btn";
import { emit } from "@/lib/events";

export default function TemplatePreview({ tpl }: { tpl: TemplateFull }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{tpl.name}</div>
            <div className="text-sm text-black/60">{tpl.description}</div>
          </div>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <Btn variant="soft" onClick={() => emit("tplPreview:use", { id: tpl.id })}>
            🚀 Use
          </Btn>
          <Btn variant="soft" onClick={() => emit("tplPreview:save", { id: tpl.id })}>
            📌 Save
          </Btn>
          <Btn variant="outline" onClick={() => emit("tplPreview:close")}>
            ✖ Close
          </Btn>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {tpl.blocks.map((b, i) => (
            <div key={i} className="rounded-2xl border border-black/15 bg-white p-2">
              <div className="mb-1 text-xs text-black/60">{b.type}</div>
              {b.type === "TEXT" && (
                <pre className="whitespace-pre-wrap text-sm">{b.text}</pre>
              )}
              {b.type === "CHECKLIST" && (
                <ul className="text-sm">
                  {(b.checklist ?? []).map((c) => (
                    <li key={c.id}>- {c.text}</li>
                  ))}
                </ul>
              )}
              {b.type === "IMAGE" && b.url && (
                <img src={b.url} className="h-40 w-full rounded-md object-cover" />
              )}
              {b.type === "VIDEO" && b.url && (
                <video
                  src={b.url}
                  className="h-40 w-full rounded-md bg-black object-contain"
                  controls
                />
              )}
              {b.type === "AUDIO" && b.url && (
                <audio src={b.url} controls className="w-full" />
              )}
              {b.type === "DRAW" && (
                <div className="h-40 w-full rounded-md bg-black/5" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
