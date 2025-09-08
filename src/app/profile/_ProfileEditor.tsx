// src/app/profile/_ProfileEditor.tsx
"use client";

import useSWR from "swr";
import { useMemo, useRef, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Media = { type: "IMAGE" | "VIDEO" | "AUDIO"; url: string };
type Post = { id: string; content: string; visibility: string; feature: string; createdAt: string; media: Media[] };

export default function ProfileEditor() {
  const { data, mutate, isLoading } = useSWR("/api/profile", fetcher);
  const [saving, setSaving] = useState(false);

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const profile = data?.profile || {};
  const stats = data?.stats || { friends: 0, posts: 0 };

  const [localAvatar, setLocalAvatar] = useState<File | null>(null);
  const [localCover, setLocalCover] = useState<File | null>(null);

  const avatarPreview = useMemo(
    () => (localAvatar ? URL.createObjectURL(localAvatar) : profile?.avatarUrl || ""),
    [localAvatar, profile?.avatarUrl]
  );
  const coverPreview = useMemo(
    () => (localCover ? URL.createObjectURL(localCover) : profile?.coverVideoUrl || ""),
    [localCover, profile?.coverVideoUrl]
  );

  if (isLoading || !data) return <div className="p-6">Loading…</div>;
  if (data.error) return <div className="p-6 text-red-600">{data.error}</div>;

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    if (localAvatar) fd.set("avatar", localAvatar);
    if (localCover) fd.set("cover", localCover);

    const res = await fetch("/api/profile", { method: "PUT", body: fd });
    setSaving(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed to save profile");
      return;
    }
    setLocalAvatar(null);
    setLocalCover(null);
    mutate();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-white">
      {/* Cover video / banner */}
      <div className="relative">
        {coverPreview ? (
          <video
            src={coverPreview}
            className="w-full h-56 md:h-72 lg:h-80 object-cover"
            controls
            playsInline
            muted
            loop
          />
        ) : (
          <div className="w-full h-56 md:h-72 lg:h-80 bg-gradient-to-r from-indigo-200 via-sky-200 to-emerald-200" />
        )}

        {/* Avatar */}
        <div className="absolute -bottom-10 left-6 flex items-end gap-4">
          <div className="relative">
            <img
              src={
                avatarPreview ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  data?.name || profile?.displayName || "U"
                )}`
              }
              alt="profile"
              className="h-24 w-24 rounded-full ring-4 ring-white object-cover bg-white"
            />
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-black/80 text-white text-xs px-2 py-1"
            >
              Change
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setLocalAvatar(e.target.files?.[0] ?? null)}
            />
          </div>

          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            className="rounded-full bg-white shadow px-3 py-1 text-sm hover:shadow-md"
          >
            Change cover video
          </button>
          <input
            ref={coverInput}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => setLocalCover(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {/* Content card */}
      <div className="mx-auto max-w-4xl px-6 pt-14">
        {/* Stats */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Stat label="Friends" value={stats.friends} />
          <Stat label="Posts" value={stats.posts} />
        </div>

        <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/80 backdrop-blur rounded-xl p-6 shadow-sm">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Name (account)</label>
            <input
              name="name"
              defaultValue={data?.name ?? ""}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Display Name</label>
            <input
              name="displayName"
              defaultValue={profile?.displayName ?? ""}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Location</label>
            <input
              name="location"
              defaultValue={profile?.location ?? ""}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Bio</label>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              className="mt-1 w-full rounded border p-2 min-h-[96px]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Tags (comma-separated)</label>
            <input
              name="tags"
              defaultValue={profile?.tags ?? ""}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              disabled={saving}
              className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {(localAvatar || localCover) && (
              <span className="text-sm text-gray-500">You have unsaved media changes</span>
            )}
          </div>
        </form>

        {/* Posts */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Your recent posts</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(data?.posts as Post[] | undefined)?.map((p) => (
              <article key={p.id} className="rounded-lg border bg-white/80 p-4 hover:shadow-sm transition">
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {p.feature} • {p.visibility}
                </div>
                <p className="whitespace-pre-wrap text-sm">{p.content}</p>
                {p.media?.length ? (
                  <div className="mt-3 space-y-2">
                    {p.media.map((m, i) =>
                      m.type === "IMAGE" ? (
                        <img key={i} src={m.url} className="w-full h-48 object-cover rounded" />
                      ) : m.type === "VIDEO" ? (
                        <video key={i} src={m.url} className="w-full h-48 object-cover rounded" controls />
                      ) : null
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full bg-white/80 px-4 py-2 shadow text-sm">
      <span className="font-semibold">{value}</span> <span className="text-gray-600">{label}</span>
    </div>
  );
}
