"use client";

import React from "react";
import { TemplateFull } from "@/lib/templates";
import Btn from "./Btn";
import { emit } from "@/lib/events";

export default function TemplateCard({
  tpl,
  isSaved,
}: {
  tpl: TemplateFull;
  isSaved: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-black/15 bg-white p-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{tpl.name}</div>
        <div className="truncate text-xs text-black/60">
          {tpl.description?.slice(0, 80)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Btn variant="soft" onClick={() => emit("tpl:use", { id: tpl.id })}>
          Use
        </Btn>
        <Btn variant="soft" onClick={() => emit("tpl:preview", { id: tpl.id })}>
          👁️
        </Btn>
        {!isSaved ? (
          <Btn
            variant="outline"
            onClick={() => emit("tpl:toggleSave", { id: tpl.id })}
          >
            💾
          </Btn>
        ) : (
          <Btn
            variant="outline"
            onClick={() => emit("tpl:toggleSave", { id: tpl.id })}
          >
            🗑️ Unsave
          </Btn>
        )}
      </div>
    </div>
  );
}
