"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import UploadField, { type Uploaded } from "../../components/UploadField";



const CHANNEL = "feed-upload";

// Types
type Visibility = "PUBLIC" | "FRIENDS" | "PRIVATE";
type Scope = "public" | "friends" | "me";
type Feature =
  | "OTHER"
  | "JOURNAL"
  | "AWE"
  | "BONDS"
  | "SERENDIPITY"
  | "CREATIVE";

type MediaType = "IMAGE" | "VIDEO" | "AUDIO";

type PostMedia = {
  id?: string;
  url: string;
  type: MediaType;
};

type UserProfile = {
  displayName?: string;
  avatarUrl?: string;
};

type User = {
  id?: string;
  email?: string;
  profile?: UserProfile;
};

type Group = {
  id: string;
  name: string;
};

type Comment = {
  id: string;
  user?: User;
  userId?: string;
  content: string;
  createdAt: string | number | Date;
};

type Post = {
  id: string;
  userId?: string;
  user?: User;
  group?: Group | null;
  content?: string;
  media?: PostMedia[];
  createdAt: string | number | Date;
  likes?: number;
  likedByMe?: boolean;
  comments?: Comment[];
  shares?: number;
};

// Utils
function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}
function formatWhen(ts: string | number | Date) {
  const d = new Date(ts);
  return d.toLocaleString();
}
function postPermalink(id: string) {
  // Adjust route if your app uses different post URLs
  return `${window.location.origin}/post/${id}`;
}

// UI primitives
function Avatar({ src, size = 44 }: { src?: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-stone-200 overflow-hidden shrink-0"
    >
      {src ? <img src={src} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
    </div>
  );
}
function Button({
  children,
  onClick,
  intent = "neutral",
  className,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  intent?: "neutral" | "primary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base = "px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150";
  const color =
    intent === "primary"
      ? "bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-300"
      : intent === "danger"
        ? "bg-red-100 text-red-700 hover:bg-red-200"
        : intent === "ghost"
          ? "bg-transparent text-stone-700 hover:bg-stone-100"
          : "bg-stone-100 hover:bg-stone-200 text-stone-800";
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cx(base, color, className || "")}>
      {children}
    </button>
  );
}
function IconButton({
  label,
  onClick,
  active,
  title,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cx(
        "px-3 py-1 rounded-full text-sm transition-colors",
        active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
      )}
    >
      {label}
    </button>
  );
}
function Input({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-1 focus:ring-stone-400",
        className
      )}
    />
  );
}
function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-stone-400",
        className
      )}
    >
      {options.map((op) => (
        <option key={op}>{op}</option>
      ))}
    </select>
  );
}
function Textarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full px-0 py-2 border-0 rounded-none resize-y min-h-[64px] text-base focus:ring-0 focus:outline-none",
        className
      )}
    />
  );
}

function MediaPreview({
  list,
  layout = "grid",
}: {
  list: Array<{ url: string; type: MediaType }>;
  layout?: "grid" | "row";
}) {
  if (!list?.length) return null;
  const baseItem = "rounded-xl overflow-hidden border border-stone-200";
  if (layout === "row") {
    return (
      <div className="mt-2 flex flex-wrap gap-8">
        {list.map((m, i) => (
          <div key={i} className={baseItem}>
            {m.type === "IMAGE" && <img src={m.url} className="w-80 h-60 object-cover" />}
            {m.type === "VIDEO" && <video src={m.url} className="w-80 h-60" controls />}
            {m.type === "AUDIO" && <audio src={m.url} controls />}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {list.map((m, i) => (
        <div key={i} className={baseItem}>
          {m.type === "IMAGE" && <img src={m.url} className="w-full h-64 object-cover" />}
          {m.type === "VIDEO" && <video src={m.url} className="w-full h-64" controls />}
          {m.type === "AUDIO" && <audio src={m.url} controls className="w-full" />}
        </div>
      ))}
    </div>
  );
}

// Recording Modal using getUserMedia + MediaRecorder
function RecordingModal({
  kind, // "video" | "audio" | "photo"
  open,
  onClose,
  onSave,
}: {
  kind: "video" | "audio" | "photo";
  open: boolean;
  onClose: () => void;
  onSave: (file: File, previewUrl: string, mediaType: MediaType) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      if (!open) return;
      setError(null);
      try {
        if (kind === "photo" || kind === "video") {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: kind === "video",
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
        }
      } catch {
        setError("Camera/Microphone permission denied or unsupported.");
      }
    }
    setup();
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
      streamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      setRecording(false);
      setError(null);
    };
  }, [open, kind]);

  async function takePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    const url = URL.createObjectURL(file);
    onSave(file, url, "IMAGE");
    onClose();
  }

  function startRecording() {
    if (!streamRef.current) return;
    try {
      const mime =
        kind === "video"
          ? (MediaRecorder.isTypeSupported("video/webm;codecs=vp9") && "video/webm;codecs=vp9") ||
          (MediaRecorder.isTypeSupported("video/webm;codecs=vp8") && "video/webm;codecs=vp8") ||
          "video/webm"
          : "audio/webm";
      const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const ext = kind === "video" ? "webm" : "webm";
        const filename = `${kind}-${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: mime });
        const url = URL.createObjectURL(blob);
        onSave(file, url, kind === "video" ? "VIDEO" : "AUDIO");
        onClose();
      };
      rec.start();
      setRecording(true);
    } catch {
      setError("Recording is not supported in this browser.");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      setRecording(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold capitalize">{kind} capture</div>
          <Button intent="ghost" onClick={onClose}>Close</Button>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        {(kind === "photo" || kind === "video") && (
          <div className="mt-3 rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-64 object-contain" muted playsInline />
          </div>
        )}

        <div className="mt-4 flex gap-2 justify-end">
          {kind === "photo" && <Button intent="primary" onClick={takePhoto}>Take Photo</Button>}
          {kind !== "photo" && !recording && <Button intent="primary" onClick={startRecording}>Start Recording</Button>}
          {kind !== "photo" && recording && <Button intent="danger" onClick={stopRecording}>Stop</Button>}
        </div>

        <div className="text-xs text-stone-500 mt-2">
          Tip: Allow camera/mic permissions. On mobile, “Quick” buttons below also open native capture.
        </div>
      </div>
    </div>
  );
}

// API helpers (optimistic UI for like/comment; share variants)
async function apiToggleLike(postId: string, like: boolean) {
  try {
    await fetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ like }),
    });
  } catch { }
}
async function apiCreateComment(postId: string, content: string) {
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) return (await res.json()) as Comment;
  } catch { }
  return null;
}
async function apiShareLog(postId: string) {
  // Optional analytics/logging on your server
  try {
    await fetch(`/api/posts/${encodeURIComponent(postId)}/share`, { method: "POST" });
  } catch { }
}
async function apiSearchUsers(q: string): Promise<Array<{ id: string; displayName: string; avatarUrl?: string }>> {
  try {
    const r = await fetch(`/api/search/users?q=${encodeURIComponent(q)}`);
    if (r.ok) return await r.json();
  } catch { }
  return [];
}
async function apiSearchGroups(q: string): Promise<Group[]> {
  try {
    const r = await fetch(`/api/search/groups?q=${encodeURIComponent(q)}`);
    if (r.ok) return await r.json();
  } catch { }
  return [];
}
async function apiShareInSite(payload: { postId: string; toUserId?: string; toGroupId?: string; message?: string }) {
  try {
    await fetch(`/api/share/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch { }
}

// Share Modal: share to users/groups inside the site
function ShareModal({
  open,
  post,
  onClose,
  onShared,
}: {
  open: boolean;
  post: Post | null;
  onClose: () => void;
  onShared: () => void;
}) {
  const [tab, setTab] = useState<"users" | "groups">("users");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setQuery("");
    setResults([]);
    setSelectedId(null);
    setMessage("");
    setTab("users");
  }, [open]);

  async function search() {
    setSearching(true);
    if (tab === "users") {
      const r = await apiSearchUsers(query);
      setResults(r);
    } else {
      const r = await apiSearchGroups(query);
      setResults(r);
    }
    setSearching(false);
  }

  async function share() {
    if (!post || !selectedId) return;
    setSending(true);
    await apiShareInSite({
      postId: post.id,
      toUserId: tab === "users" ? selectedId : undefined,
      toGroupId: tab === "groups" ? selectedId : undefined,
      message: message || undefined,
    });
    setSending(false);
    onShared();
    onClose();
  }

  if (!open || !post) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Share post</div>
          <Button intent="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="mt-3 flex gap-2">
          <Button intent={tab === "users" ? "primary" : "neutral"} onClick={() => setTab("users")}>
            To Users
          </Button>
          <Button intent={tab === "groups" ? "primary" : "neutral"} onClick={() => setTab("groups")}>
            To Groups
          </Button>
        </div>

        <div className="mt-4 grid gap-2">
          <Input
            value={query}
            onChange={setQuery}
            placeholder={tab === "users" ? "Search users…" : "Search groups…"}
          />
          <div className="flex gap-2">
            <Button onClick={search} disabled={!query.trim() || searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
        </div>

        <div className="mt-3 max-h-56 overflow-auto border rounded-xl">
          {results.length === 0 && (
            <div className="p-3 text-sm text-stone-500">{searching ? "Searching…" : "No results yet."}</div>
          )}
          {results.map((item: any) => {
            const id = item.id;
            const label = item.displayName || item.name || id;
            return (
              <button
                key={id}
                onClick={() => setSelectedId(id)}
                className={cx(
                  "w-full text-left px-3 py-2 border-b last:border-b-0",
                  selectedId === id ? "bg-stone-100" : ""
                )}
              >
                <div className="text-sm font-medium text-stone-800">{label}</div>
                {item.avatarUrl && (
                  <div className="mt-1">
                    <img src={item.avatarUrl} className="w-9 h-9 rounded-full object-cover" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <Textarea value={message} onChange={setMessage} placeholder="Add a message (optional)" />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button intent="primary" onClick={share} disabled={!selectedId || sending}>
            {sending ? "Sending…" : "Share"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Comments
function CommentList({ comments }: { comments?: Comment[] }) {
  if (!comments?.length) return null;
  return (
    <div className="mt-2 pl-12 space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="text-sm">
          <span className="font-medium text-stone-800">
            {c.user?.profile?.displayName || c.user?.email || c.userId || "User"}
          </span>{" "}
          <span className="text-stone-700">{c.content}</span>{" "}
          <span className="text-stone-400 text-xs">· {formatWhen(c.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

// Feed item with actions (Like, Comment, Share)
function FeedItem({
  post,
  onLocalUpdate,
  onShareOpen,
  onShareCountIncrement,
}: {
  post: Post;
  onLocalUpdate: (update: (p: Post) => Post) => void;
  onShareOpen: (post: Post) => void;
  onShareCountIncrement: (postId: string) => void;
}) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");

  const likes = post.likes || 0;
  const commentsCount = post.comments?.length || 0;
  const sharesCount = post.shares || 0;

  async function handleLike() {
    const nextLiked = !post.likedByMe;
    onLocalUpdate((p) => ({
      ...p,
      likedByMe: nextLiked,
      likes: Math.max(0, (p.likes || 0) + (nextLiked ? 1 : -1)),
    }));
    apiToggleLike(post.id, nextLiked);
  }

  async function handleAddComment() {
    const text = commentText.trim();
    if (!text) return;
    setCommentText("");
    const temp: Comment = {
      id: `temp-${Date.now()}`,
      content: text,
      createdAt: Date.now(),
    };
    onLocalUpdate((p) => ({ ...p, comments: [...(p.comments || []), temp] }));
    const created = await apiCreateComment(post.id, text);
    if (created) {
      onLocalUpdate((p) => ({
        ...p,
        comments: (p.comments || []).filter((c) => c.id !== temp.id).concat(created),
      }));
    }
  }

  async function handleShare() {
    const url = postPermalink(post.id);

    // Prefer Web Share API if available:
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Check this post",
          text: post.content || "See this post",
          url,
        });
        onShareCountIncrement(post.id);
        apiShareLog(post.id);
        return;
      } catch {
        // if user cancels or error, fall back to modal or clipboard
      }
    }

    // If user wants to share in-site to other users/groups:
    onShareOpen(post);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(postPermalink(post.id));
      onShareCountIncrement(post.id);
      apiShareLog(post.id);
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="border-b border-stone-200 px-4 py-3 flex gap-3">
      <Avatar src={post.user?.profile?.avatarUrl} size={44} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="font-semibold text-stone-900 truncate">
            {post.user?.profile?.displayName || post.user?.email || post.userId || "User"}
          </span>
          <span className="text-stone-500">· {formatWhen(post.createdAt)}</span>
          {post.group?.name && (
            <span className="ml-2 text-xs bg-stone-100 rounded-full px-2 py-0.5">{post.group.name}</span>
          )}
        </div>

        {post.content && (
          <div className="mt-1 text-stone-800 text-[15px] leading-6 whitespace-pre-wrap">
            {post.content}
          </div>
        )}

        {post.media?.length ? <MediaPreview list={post.media} /> : null}

        <div className="flex items-center gap-2 text-sm text-stone-600 mt-3">
          <IconButton label={`♥ ${likes || ""}`} onClick={handleLike} active={post.likedByMe} title="Like" />
          <IconButton
            label={`💬 ${commentsCount || ""}`}
            onClick={() => setShowCommentBox((s) => !s)}
            title="Comment"
          />
          <IconButton label={`↗ ${sharesCount || ""}`} onClick={handleShare} title="Share to apps or in-site" />

        </div>

        {showCommentBox && (
          <div className="mt-2 pl-12 flex items-center gap-2">
            <Input
              value={commentText}
              onChange={setCommentText}
              placeholder="Write a comment…"
              className="flex-1"
            />
            <Button intent="primary" onClick={handleAddComment} disabled={!commentText.trim()}>
              Send
            </Button>
          </div>
        )}

        <CommentList comments={post.comments} />
      </div>
    </div>
  );
}

function Navbar({
  onScopeChange,
  activeScope,
}: {
  onScopeChange: (s: Scope) => void;
  activeScope: Scope;
}) {
  const item = (label: string, scope: Scope) => (
    <button
      key={scope}
      onClick={() => onScopeChange(scope)}
      className={cx(
        "px-3 py-1.5 rounded-full text-sm",
        activeScope === scope ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-xl font-semibold">Stream</div>
        <div className="flex gap-2">
          {item("Public", "public")}
          {item("Friends", "friends")}
          {item("Me", "me")}
        </div>
      </div>
    </div>
  );
}

// Quick capture inputs (mobile friendly: capture attribute)
function QuickCapture({
  onFile,
}: {
  onFile: (file: File, previewUrl: string, mediaType: MediaType) => void;
}) {
  const photoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLInputElement | null>(null);

  function handle(e: React.ChangeEvent<HTMLInputElement>, mediaType: MediaType) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    onFile(f, url, mediaType);
    e.target.value = ""; // reset selection
  }

  return (
    <div className="flex gap-2">
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e, "IMAGE")}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e, "VIDEO")}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        capture
        className="hidden"
        onChange={(e) => handle(e, "AUDIO")}
      />
      <Button onClick={() => photoRef.current?.click()}>Quick Photo</Button>
      <Button onClick={() => videoRef.current?.click()}>Quick Video</Button>
      <Button onClick={() => audioRef.current?.click()}>Quick Audio</Button>
    </div>
  );
}

function Composer({
  content,
  setContent,
  feature,
  setFeature,
  visibility,
  setVisibility,
  groupId,
  setGroupId,
  media,
  addMediaFromFile,
  onPost,
  openRecorder,
}: {
  content: string;
  setContent: (v: string) => void;
  feature: Feature;
  setFeature: (v: Feature) => void;
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  groupId: string;
  setGroupId: (v: string) => void;
  media: PostMedia[];
  addMediaFromFile: (file: File, url: string, type: MediaType) => void;
  onPost: () => void;
  openRecorder: (kind: "photo" | "video" | "audio") => void;
}) {
  return (
    <div className="border-b border-stone-200 px-4 py-3 flex gap-3">
      <Avatar size={44} />
      <div className="flex-1">
        <Textarea value={content} onChange={setContent} placeholder="What’s happening?" />
        {media.length ? <MediaPreview list={media} layout="row" /> : null}

        <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
          <Select
            value={feature}
            options={["OTHER", "JOURNAL", "AWE", "BONDS", "SERENDIPITY", "CREATIVE"]}
            onChange={(v) => setFeature(v as Feature)}
            className="w-auto"
          />
          <Select
            value={visibility}
            options={["PUBLIC", "FRIENDS", "PRIVATE"]}
            onChange={(v) => setVisibility(v as Visibility)}
            className="w-auto"
          />
          <Input value={groupId} onChange={setGroupId} placeholder="Group ID" className="w-auto" />

          {/* Your UploadField — dispatches events to CHANNEL */}
          <div className="ml-auto">
            <UploadField channel={CHANNEL} accept="image/*,video/*,audio/*" />
          </div>

          <Button onClick={() => openRecorder("photo")}>Take Photo</Button>
          <Button onClick={() => openRecorder("video")}>Record Video</Button>
          <Button onClick={() => openRecorder("audio")}>Record Audio</Button>

          <Button intent="primary" onClick={onPost} disabled={!content.trim() && media.length === 0}>
            Post
          </Button>
        </div>

        {/* Mobile-native capture shortcuts */}
        <div className="mt-2">
          <QuickCapture onFile={addMediaFromFile} />
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [content, setContent] = useState("");
  const [feature, setFeature] = useState<Feature>("OTHER");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [groupId, setGroupId] = useState("");
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [feed, setFeed] = useState<Post[]>([]);
  const [scope, setScope] = useState<Scope>("public");
  const [loading, setLoading] = useState(false);

  // Recording modal state
  const [recOpen, setRecOpen] = useState(false);
  const [recKind, setRecKind] = useState<"photo" | "video" | "audio">("photo");

  // Share modal state
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePost, setSharePost] = useState<Post | null>(null);

  function openRecorder(kind: "photo" | "video" | "audio") {
    setRecKind(kind);
    setRecOpen(true);
  }

  // Receive uploads from UploadField via window event
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<Uploaded>;
      if (!detail || !detail.url) return;
      const upper = (detail.type as string)?.toUpperCase?.() || "";
      const type: MediaType =
        upper.includes("IMAGE") ? "IMAGE" : upper.includes("VIDEO") ? "VIDEO" : "AUDIO";
      setMedia((prev) => [...prev, { url: detail.url, type }]);
    };
    window.addEventListener(CHANNEL, handler as EventListener);
    return () => window.removeEventListener(CHANNEL, handler as EventListener);
  }, []);

  function addMediaFromFile(file: File, url: string, type: MediaType) {
    // If needed, upload to server and replace 'url' with returned permanent URL.
    setMedia((prev) => [...prev, { url, type }]);
  }

  function handleRecorderSave(file: File, previewUrl: string, mediaType: MediaType) {
    addMediaFromFile(file, previewUrl, mediaType);
  }

  // Load feed
  async function refresh(nextScope: Scope = scope) {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/posts?scope=${nextScope}${groupId ? `&groupId=${encodeURIComponent(groupId)}` : ""}`
      );
      if (r.ok) {
        const data = (await r.json()) as Post[];
        setFeed(Array.isArray(data) ? data : []);
      } else {
        setFeed([]);
      }
    } catch {
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh("public");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScopeChange(s: Scope) {
    setScope(s);
    await refresh(s);
  }

  // Create a new post
  async function post() {
    if (!content.trim() && media.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          feature,
          visibility,
          groupId: groupId || null,
          media: media.map((m) => ({ url: m.url, type: m.type })),
          // scoring knobs retained
          connectionScore: visibility !== "PRIVATE" ? 1 : 0,
          creativityScore: feature === "CREATIVE" ? 3 : 0,
        }),
      });
      if (res.ok) {
        setContent("");
        setMedia([]);
        await refresh(visibility === "PUBLIC" ? "public" : "me");
      }
    } finally {
      setLoading(false);
    }
  }

  // Local update helper for a single post
  function updatePostLocal(postId: string, update: (p: Post) => Post) {
    setFeed((prev) => prev.map((p) => (p.id === postId ? update(p) : p)));
  }

  // Share open and share count increment
  function openShareModal(p: Post) {
    setSharePost(p);
    setShareOpen(true);
  }
  function incrementShareCount(postId: string) {
    setFeed((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, shares: (p.shares || 0) + 1 } : p))
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-900">
      <Navbar onScopeChange={handleScopeChange} activeScope={scope} />

      <main className="max-w-2xl mx-auto">
        <Composer
          content={content}
          setContent={setContent}
          feature={feature}
          setFeature={setFeature}
          visibility={visibility}
          setVisibility={setVisibility}
          groupId={groupId}
          setGroupId={setGroupId}
          media={media}
          addMediaFromFile={addMediaFromFile}
          onPost={post}
          openRecorder={openRecorder}
        />

        {loading && (
          <div className="px-4 py-3 text-sm text-stone-500 border-b border-stone-200">Loading…</div>
        )}

        {feed.map((p) => (
          <FeedItem
            key={p.id}
            post={p}
            onLocalUpdate={(fn) => updatePostLocal(p.id, fn)}
            onShareOpen={openShareModal}
            onShareCountIncrement={incrementShareCount}
          />
        ))}

        {!loading && feed.length === 0 && (
          <div className="px-4 py-6 text-sm text-stone-500">Nothing to show yet.</div>
        )}
      </main>

      <RecordingModal
        kind={recKind}
        open={recOpen}
        onClose={() => setRecOpen(false)}
        onSave={handleRecorderSave}
      />

      <ShareModal
        open={shareOpen}
        post={sharePost}
        onClose={() => setShareOpen(false)}
        onShared={() => {
          if (sharePost) incrementShareCount(sharePost.id);
          if (sharePost) apiShareLog(sharePost.id);
        }}
      />
    </div>
  );
}
