"use client";

import { useCallback, useRef, useState } from "react";

export type UploadedType = "IMAGE" | "VIDEO" | "AUDIO";
export type Uploaded = { type: UploadedType; url: string; file?: File };

type Props = {
  /** e.g., "image/*,video/*,audio/*" */
  accept?: string;
  /** DOM event channel name the component will dispatch to (window) */
  channel?: string;
};

const DEFAULT_CHANNEL = "feed-upload";

export default function UploadField({ accept = "image/*,video/*,audio/*", channel = DEFAULT_CHANNEL }: Props) {
  const inp = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  function detectType(file: File): UploadedType {
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    if (file.type.startsWith("audio/")) return "AUDIO";
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (["png","jpg","jpeg","gif","webp","bmp","svg"].includes(ext)) return "IMAGE";
    if (["mp4","mov","webm","mkv","avi"].includes(ext)) return "VIDEO";
    if (["mp3","wav","m4a","ogg","flac"].includes(ext)) return "AUDIO";
    return "IMAGE";
  }

  async function tryServerUpload(file: File): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) return null;
      const json = await res.json();
      return typeof json?.url === "string" && json.url ? json.url : null;
    } catch {
      return null;
    }
  }

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];

    (async () => {
      setBusy(true);
      try {
        const serverUrl = await tryServerUpload(f);
        const fallbackUrl = URL.createObjectURL(f);
        const url = serverUrl || fallbackUrl;
        const type = detectType(f);

        const detail: Uploaded = { type, url, file: f };
        window.dispatchEvent(new CustomEvent(channel, { detail }));
      } finally {
        setBusy(false);
      }
    })();
  }, [channel]);

  return (
    <div
      className={`rounded-2xl border border-dashed ${dragOver ? "border-stone-400 bg-stone-50" : "border-stone-300 bg-white"} p-3 text-sm text-stone-600`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      role="button"
      tabIndex={0}
      aria-busy={busy || undefined}
      aria-label="Upload media"
      onClick={() => inp.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inp.current?.click(); } }}
      onPaste={(e) => {
        const files = e.clipboardData?.files;
        if (files && files.length) {
          e.preventDefault();
          handleFiles(files);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span>{busy ? "Uploading…" : "Drop a file here, or"}</span>
        <button
          type="button"
          className="rounded-xl border border-stone-300 bg-white px-3 py-1 text-sm"
          onClick={() => inp.current?.click()}
        >
          Choose file
        </button>
      </div>
      <input
        ref={inp}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
