"use client";

import { useCallback, useRef, useState } from "react";
import { uploadFileClientSide } from "@/lib/upload-helper";

export type UploadedType = "IMAGE" | "VIDEO" | "AUDIO";
export type Uploaded = { type: UploadedType; url: string; file?: File };

type Props = {
  /** e.g., "image/*,video/*,audio/*" */
  accept?: string;
  /** DOM event channel name the component will dispatch to (window) */
  channel?: string;
  /** Callback when upload completes */
  onUpload?: (result: Uploaded) => void;
};

const DEFAULT_CHANNEL = "feed-upload";

export default function UploadField({ accept = "image/*,video/*,audio/*", channel = DEFAULT_CHANNEL, onUpload }: Props) {
  const inp = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  function detectType(file: File): UploadedType {
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    if (file.type.startsWith("audio/")) return "AUDIO";
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "IMAGE";
    if (["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) return "VIDEO";
    if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "AUDIO";
    return "IMAGE";
  }


  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];

    (async () => {
      setBusy(true);
      try {
        const type = detectType(f);
        const url = await uploadFileClientSide(f, type);

        if (!url) {
          throw new Error("Upload failed - no URL returned");
        }
        const detail: Uploaded = { type, url: url!, file: f };

        // Dispatch event (legacy support)
        window.dispatchEvent(new CustomEvent(channel, { detail }));

        // Call callback if provided
        onUpload?.(detail);
      } finally {
        setBusy(false);
      }
    })();
  }, [channel, onUpload]);

  return (
    <div
      className={`rounded-2xl border border-dashed ${dragOver ? "border-white/40 bg-white/10" : "border-white/20 bg-transparent"} p-3 text-sm text-white/70`}
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
