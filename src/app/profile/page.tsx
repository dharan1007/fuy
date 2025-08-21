"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================
   Utility
============================================================ */
function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

/* ============================================================
   Inline UploadField (self-contained)
   - Drag & drop
   - File picker
   - Accept images/videos/audios (avatar flow uses images)
============================================================ */
type UploadedType = "IMAGE" | "VIDEO" | "AUDIO";
export type Uploaded = { type: UploadedType; url: string; file?: File };

function UploadField({
  onUploaded,
  accept = "image/*,video/*,audio/*",
  label = "Upload",
  hint = "Drag & drop or choose a file",
}: {
  onUploaded: (f: Uploaded) => void;
  accept?: string;
  label?: string;
  hint?: string;
}) {
  const inp = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];
    setBusy(true);
    const url = URL.createObjectURL(f);
    let type: UploadedType = "IMAGE";
    if (f.type.startsWith("video/")) type = "VIDEO";
    else if (f.type.startsWith("audio/")) type = "AUDIO";
    // If you upload to your backend, do it here and replace 'url' with the server URL.
    onUploaded({ type, url, file: f });
    setBusy(false);
  };

  return (
    <div
      className={cx(
        "rounded-2xl border border-dashed p-4 transition-colors",
        dragOver ? "border-stone-400 bg-stone-50" : "border-stone-300 bg-white"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-stone-600">{hint}</div>
        <button
          type="button"
          disabled={busy}
          className={cx(
            "rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm",
            "hover:bg-stone-100 disabled:opacity-60"
          )}
          onClick={() => inp.current?.click()}
        >
          {busy ? "Uploading…" : label}
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

/* ============================================================
   Types for API response
============================================================ */
type ProfileResp =
  | {
      ok: true;
      profile:
        | {
            displayName?: string | null;
            avatarUrl?: string | null;
            bio?: string | null;
          }
        | null;
    }
  | { ok: false; error: string };

/* ============================================================
   Field Primitives
============================================================ */
function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline gap-2">
        <label className="text-sm text-stone-700">{label}</label>
        {required && <span className="text-xs text-stone-500">required</span>}
      </div>
      {children}
      {hint && <div className="text-xs text-stone-500">{hint}</div>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={cx(
        "w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-[15px]",
        "focus:ring-2 focus:ring-stone-300 focus:outline-none"
      )}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className={cx(
        "w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-[15px]",
        "focus:ring-2 focus:ring-stone-300 focus:outline-none",
        "min-h-[120px] resize-y"
      )}
    />
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white",
        "hover:bg-stone-800 disabled:bg-stone-300 transition-colors"
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-800 hover:bg-stone-200 transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ============================================================
   Shell Components
============================================================ */
function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="grid">
        <h1 className="text-xl font-semibold tracking-wide text-stone-900">Profile</h1>
        <div className="text-sm text-stone-500">Make it calm, clear, and you.</div>
      </div>
      <div className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">you</div>
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function ProfilePreview({
  displayName,
  avatarUrl,
  bio,
}: {
  displayName: string;
  avatarUrl: string;
  bio: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200">
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-2xl">🙂</div>
        )}
      </div>
      <div className="grid gap-1">
        <div className="text-stone-900">{displayName || "Unnamed"}</div>
        {bio ? (
          <div className="max-w-[40ch] truncate text-sm text-stone-600">{bio}</div>
        ) : (
          <div className="text-sm text-stone-400">No bio yet</div>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <Card>
      <div className="animate-pulse grid gap-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-stone-200" />
          <div className="h-6 w-40 rounded-full bg-stone-200" />
        </div>
        <div className="h-10 w-full rounded-xl bg-stone-200" />
        <div className="h-24 w-full rounded-xl bg-stone-200" />
        <div className="h-10 w-40 rounded-full bg-stone-200" />
      </div>
    </Card>
  );
}

/* ============================================================
   Page Component
============================================================ */
export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  // Guard for React 18 StrictMode
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/profile", { cache: "no-store" });
        if (!r.ok) throw new Error("Fetch failed");
        const data: ProfileResp | any = await r.json();
        const p = (data && "ok" in data ? (data as any).profile : data) || {};
        setDisplayName(p?.displayName ?? "");
        setAvatarUrl(p?.avatarUrl ?? "");
        setBio(p?.bio ?? "");
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          avatarUrl: avatarUrl || null,
          bio: bio.trim(),
        }),
      });

      const ok = r.ok;
      setStatus(ok ? "Saved" : "Error");

      // Mirror to localStorage so other views reflect immediately
      if (ok && typeof window !== "undefined") {
        try {
          const prev = JSON.parse(localStorage.getItem("fuy.onboarding.v1") || "{}");
          localStorage.setItem(
            "fuy.onboarding.v1",
            JSON.stringify({
              ...prev,
              displayName: displayName.trim(),
              goals: prev?.goals ?? (bio || ""),
              ts: new Date().toISOString(),
            })
          );
        } catch {}
      }
    } catch {
      setStatus("Error");
    } finally {
      setTimeout(() => setStatus(""), 2400);
    }
  }

  const initials =
    displayName
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
        <PageHeader />

        {loading ? (
          <Skeleton />
        ) : (
          <>
            {/* Hero Preview */}
            <Card>
              <div className="grid gap-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <ProfilePreview displayName={displayName} avatarUrl={avatarUrl} bio={bio} />
                  <div className="grid gap-2">
                    <div className="text-xs text-stone-500">Profile card preview</div>
                    <div className="rounded-2xl border border-stone-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200">
                          {avatarUrl ? (
                            <img src={avatarUrl} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-stone-700">{initials}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-stone-900">
                            {displayName || "Unnamed"}
                          </div>
                          <div className="max-w-[34ch] truncate text-xs text-stone-500">
                            {bio || "No bio yet"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Avatar Picker */}
                <div className="grid gap-3">
                  <div className="text-sm text-stone-700">Avatar</div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200">
                      {avatarUrl ? (
                        <img src={avatarUrl} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-stone-700">{initials}</span>
                      )}
                    </div>
                    <UploadField
                      onUploaded={(u: Uploaded) => {
                        if (u.type === "IMAGE") setAvatarUrl(u.url);
                      }}
                      accept="image/*"
                      label="Choose image"
                      hint="Drag & drop an image or choose a file"
                    />
                    {avatarUrl && (
                      <GhostButton onClick={() => setAvatarUrl("")}>Remove</GhostButton>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Editable Fields */}
            <Card>
              <div className="grid gap-5">
                <Field label="Display name" hint="How your name appears publicly." required>
                  <TextInput
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="e.g., Aria Kapoor"
                    maxLength={60}
                  />
                </Field>

                <Field label="Bio" hint="A short line that feels like you.">
                  <Textarea
                    value={bio}
                    onChange={setBio}
                    placeholder="A sentence about what you care about, what you make, or how you see the world."
                    maxLength={280}
                    rows={5}
                  />
                </Field>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-stone-500">{status || " "}</div>
                  <PrimaryButton onClick={save} disabled={!displayName.trim() && !bio.trim()}>
                    Save changes
                  </PrimaryButton>
                </div>
              </div>
            </Card>

            {/* Gentle Tips */}
            <Card className="bg-stone-50">
              <div className="grid gap-2">
                <div className="text-sm font-medium text-stone-800">A peaceful profile</div>
                <ul className="ml-4 list-disc text-sm text-stone-600">
                  <li>Keep it simple — a short bio often speaks the loudest.</li>
                  <li>Choose an avatar with soft light and clear framing.</li>
                  <li>Let whitespace breathe; clarity is calming.</li>
                </ul>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
