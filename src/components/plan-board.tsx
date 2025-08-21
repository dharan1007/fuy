"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------------- Types ---------------- */
type UUID = string;
export type CardType = "note" | "link" | "image" | "video" | "todo";

export type WaypointRef = { index: number } | null;

export type ChecklistItem = { id: UUID; text: string; done: boolean };

export type Card = {
  id: UUID;
  type: CardType;
  title: string;
  content?: string;             // text for note, URL for link/image/video
  tags: string[];
  checklist?: ChecklistItem[];  // only for "todo"
  waypoint?: WaypointRef;       // optional waypoint link
  createdAt: number;
};

export type Plan = {
  id: UUID;
  title: string;
  members: string[];   // names/emails
  cards: Card[];
  createdAt: number;
};

type PlanIndexEntry = { id: string; title: string; createdAt: number };

function uid(): UUID {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ---------------- LocalStorage Keys ---------------- */
const LS_KEY_INDEX = "awe-routes:plans:index";
const LS_KEY_PLAN = (id: string) => `awe-routes:plans:${id}`;

/* ---------------- Component ---------------- */
export default function PlanBoard({
  currentWaypointCount = 0,
}: {
  currentWaypointCount?: number;
}) {
  const [plans, setPlans] = useState<PlanIndexEntry[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [active, setActive] = useState<Plan | null>(null);

  // load index & active plan (from ?plan=) on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_INDEX);
      const list = raw ? (JSON.parse(raw) as PlanIndexEntry[]) : [];
      setPlans(list);

      const url = new URL(window.location.href);
      const qPlan = url.searchParams.get("plan");

      if (qPlan) {
        const p = loadPlan(qPlan);
        if (p) {
          setActivePlanId(p.id);
          setActive(p);
          if (!list.find((x) => x.id === p.id)) {
            const updated = [...list, { id: p.id, title: p.title, createdAt: p.createdAt }];
            setPlans(updated);
            persistIndex(updated);
          }
          return;
        }
      }

      if (list.length) {
        const first = loadPlan(list[0].id);
        setActivePlanId(list[0].id);
        setActive(first ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  /* ---------- Persistence helpers ---------- */
  function persistIndex(next: PlanIndexEntry[]) {
    localStorage.setItem(LS_KEY_INDEX, JSON.stringify(next));
  }
  function persistPlan(p: Plan) {
    localStorage.setItem(LS_KEY_PLAN(p.id), JSON.stringify(p));
  }
  function loadPlan(id: string): Plan | null {
    try {
      const raw = localStorage.getItem(LS_KEY_PLAN(id));
      return raw ? (JSON.parse(raw) as Plan) : null;
    } catch {
      return null;
    }
  }

  /* ---------- Plan CRUD ---------- */
  function createPlan() {
    const title = prompt("Plan title")?.trim();
    if (!title) return;
    const p: Plan = { id: uid(), title, members: [], cards: [], createdAt: Date.now() };
    const idx = [...plans, { id: p.id, title: p.title, createdAt: p.createdAt }];
    setPlans(idx);
    persistIndex(idx);
    setActive(p);
    setActivePlanId(p.id);
    persistPlan(p);
    const u = new URL(window.location.href);
    u.searchParams.set("plan", p.id);
    history.replaceState(null, "", u.toString());
  }

  function selectPlan(id: string) {
    const p = loadPlan(id);
    setActivePlanId(id);
    setActive(p);
    const u = new URL(window.location.href);
    u.searchParams.set("plan", id);
    history.replaceState(null, "", u.toString());
  }

  function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    localStorage.removeItem(LS_KEY_PLAN(id));
    const nextIdx = plans.filter((x) => x.id !== id);
    setPlans(nextIdx);
    persistIndex(nextIdx);
    if (activePlanId === id) {
      const nextActive = nextIdx[0] ?? null;
      setActivePlanId(nextActive?.id ?? null);
      setActive(nextActive ? loadPlan(nextActive.id) : null);
      const u = new URL(window.location.href);
      if (nextActive) u.searchParams.set("plan", nextActive.id);
      else u.searchParams.delete("plan");
      history.replaceState(null, "", u.toString());
    }
  }

  function copyInviteLink() {
    if (!active) return;
    const u = new URL(window.location.href);
    u.searchParams.set("plan", active.id);
    navigator.clipboard.writeText(u.toString()).then(
      () => alert("Invite link copied! Share it with your friends."),
      () => alert("Could not copy link; copy from the address bar.")
    );
  }

  function exportPlan() {
    if (!active) return;
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.title.replace(/\s+/g, "_")}_${active.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importPlan(f: File) {
    try {
      const json = JSON.parse(await f.text()) as Plan;
      if (!json?.id || !json?.title) throw new Error();
      persistPlan(json);
      const idx = [
        ...plans.filter((x) => x.id !== json.id),
        { id: json.id, title: json.title, createdAt: json.createdAt ?? Date.now() },
      ];
      setPlans(idx);
      persistIndex(idx);
      setActivePlanId(json.id);
      setActive(json);
      const u = new URL(window.location.href);
      u.searchParams.set("plan", json.id);
      history.replaceState(null, "", u.toString());
    } catch {
      alert("Invalid plan file");
    }
  }

  /* ---------- Members ---------- */
  function addMember() {
    if (!active) return;
    const who = prompt("Add member (name or email)")?.trim();
    if (!who) return;
    const next: Plan = { ...active, members: [...active.members, who] };
    setActive(next);
    persistPlan(next);
  }

  function removeMember(i: number) {
    if (!active) return;
    const next: Plan = { ...active, members: active.members.filter((_, idx) => idx !== i) };
    setActive(next);
    persistPlan(next);
  }

  function renamePlan() {
    if (!active) return;
    const t = prompt("Rename plan", active.title)?.trim();
    if (!t || t === active.title) return;
    const next: Plan = { ...active, title: t };
    setActive(next);
    persistPlan(next);
    const idx = plans.map((p: PlanIndexEntry) => (p.id === next.id ? { ...p, title: t } : p));
    setPlans(idx);
    persistIndex(idx);
  }

  /* ---------- Cards ---------- */
  function addCard(type: CardType) {
    if (!active) return;
    const c: Card = {
      id: uid(),
      type,
      title: type === "note" ? "New Note" : type === "todo" ? "New Todo" : "New Card",
      content: "",
      tags: [],
      checklist: type === "todo" ? [] : undefined,
      waypoint: null,
      createdAt: Date.now(),
    };
    const next: Plan = { ...active, cards: [c, ...active.cards] };
    setActive(next);
    persistPlan(next);
  }

  function deleteCard(id: string) {
    if (!active) return;
    const next: Plan = { ...active, cards: active.cards.filter((c) => c.id !== id) };
    setActive(next);
    persistPlan(next);
  }

  function updateCard(update: Card) {
    if (!active) return;
    const next: Plan = {
      ...active,
      cards: active.cards.map((c) => (c.id === update.id ? update : c)),
    };
    setActive(next);
    persistPlan(next);
  }

  /* ---------- Search / filter ---------- */
  const [editing, setEditing] = useState<Card | null>(null);
  const [query, setQuery] = useState<string>("");

  const visibleCards: Card[] = useMemo(() => {
    if (!active) return [];
    const q = query.trim().toLowerCase();
    if (!q) return active.cards;
    return active.cards.filter((c) => {
      const hay = [
        c.title,
        c.content ?? "",
        ...(c.tags ?? []),
        ...(c.checklist?.map((i) => i.text) ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [active, query]);

  /* ---------- Render ---------- */
  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      {/* Sidebar: Plans */}
      <aside className="grid gap-3">
        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Plans</div>
            <button className="pill-blue" onClick={createPlan}>
              New
            </button>
          </div>

          <div className="grid gap-1">
            {plans.length === 0 && <div className="text-sm text-stone-600">No plans yet.</div>}
            {plans
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg border px-2 py-1.5 ${
                    activePlanId === p.id
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white text-stone-900 border-stone-200"
                  }`}
                >
                  <button onClick={() => selectPlan(p.id)} className="text-left truncate">
                    {p.title}
                  </button>
                  <button onClick={() => deletePlan(p.id)} className="text-xs opacity-80 hover:opacity-100">
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Invite & Share */}
        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="font-medium">Invite & Share</div>
          <div className="text-sm text-stone-700">
            {active ? (
              <>
                <div className="mb-2">Share this plan with a link.</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm"
                    onClick={copyInviteLink}
                  >
                    Copy Invite Link
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm"
                    onClick={exportPlan}
                  >
                    Export JSON
                  </button>
                  <label className="cursor-pointer">
                    <span className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm inline-block">
                      Import JSON
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="application/json"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) importPlan(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </>
            ) : (
              <div>Create a plan first.</div>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Members</div>
            <button
              disabled={!active}
              onClick={addMember}
              className="px-2 py-1 rounded-lg text-[12px] border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="grid gap-1">
            {active?.members.length ? (
              active.members.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border px-2 py-1.5 bg-white border-stone-200"
                >
                  <span className="truncate">{m}</span>
                  <button onClick={() => removeMember(i)} className="text-xs opacity-80 hover:opacity-100">
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-stone-600">No members yet.</div>
            )}
          </div>
          <button
            disabled={!active}
            onClick={renamePlan}
            className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm disabled:opacity-50"
          >
            Rename Plan
          </button>
        </div>
      </aside>

      {/* Main: Cards */}
      <section className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">{active?.title ?? "No plan selected"}</div>
          <div className="flex flex-wrap gap-2">
            <button disabled={!active} onClick={() => addCard("note")} className="pill-blue disabled:opacity-50">
              + Note
            </button>
            <button disabled={!active} onClick={() => addCard("link")} className="pill-blue disabled:opacity-50">
              + Link
            </button>
            <button disabled={!active} onClick={() => addCard("image")} className="pill-blue disabled:opacity-50">
              + Image
            </button>
            <button disabled={!active} onClick={() => addCard("video")} className="pill-blue disabled:opacity-50">
              + Video
            </button>
            <button disabled={!active} onClick={() => addCard("todo")} className="pill-blue disabled:opacity-50">
              + Todo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards or #tag"
            className="w-full px-3 py-2 rounded-lg border border-stone-200"
          />
        </div>

        <CardsList
          active={!!active}
          visibleCards={visibleCards}
          onEdit={(c) => setEditing(c)}
          onDelete={(id) => deleteCard(id)}
        />
      </section>

      {editing && active && (
        <EditorModal
          card={editing}
          onClose={() => setEditing(null)}
          onSave={(next: Card) => {
            updateCard(next);
            setEditing(null);
          }}
          maxWaypointIndex={Math.max(0, currentWaypointCount - 1)}
        />
      )}
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function CardsList({
  active,
  visibleCards,
  onEdit,
  onDelete,
}: {
  active: boolean;
  visibleCards: Card[];
  onEdit: (c: Card) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {active ? (
        visibleCards.length ? (
          visibleCards.map((c) => (
            <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-3 flex items-start gap-3">
              <span className="text-xs uppercase px-2 py-1 rounded bg-stone-100">{c.type}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{c.title}</div>
                <div className="text-sm text-stone-700 truncate">
                  {c.type === "note"
                    ? c.content || "—"
                    : c.type === "link"
                    ? c.content || "—"
                    : c.type === "image"
                    ? c.content || "—"
                    : c.type === "video"
                    ? c.content || "—"
                    : `${c.checklist?.filter((i) => i.done).length ?? 0}/${c.checklist?.length ?? 0} done`}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.tags.map((t: string) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-stone-100">
                      #{t}
                    </span>
                  ))}
                  {c.waypoint && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-sky-100 text-sky-800">
                      waypoint {c.waypoint.index + 1}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(c)}
                  className="px-2 py-1 rounded border border-stone-200 bg-white hover:bg-stone-50 text-[12px]"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="px-2 py-1 rounded border border-red-200 bg-red-600 text-white hover:bg-red-500 text-[12px]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-stone-600">No cards match your search.</div>
        )
      ) : (
        <div className="text-sm text-stone-600">Create or select a plan.</div>
      )}
    </div>
  );
}

function EditorModal({
  card,
  onClose,
  onSave,
  maxWaypointIndex,
}: {
  card: Card;
  onClose: () => void;
  onSave: (c: Card) => void;
  maxWaypointIndex: number;
}) {
  const [local, setLocal] = useState<Card>({ ...card });
  const [tagsInput, setTagsInput] = useState<string>(local.tags.join(", "));

  function set<K extends keyof Card>(key: K, val: Card[K]) {
    setLocal((prev) => ({ ...prev, [key]: val }));
  }

  function applyTags() {
    const cleaned = tagsInput
      .split(/[,\s]+/)
      .map((t: string) => t.trim())
      .filter(Boolean);
    set("tags", Array.from(new Set(cleaned)));
  }

  function upsertChecklistItem() {
    const text = prompt("Checklist item")?.trim();
    if (!text) return;
    const item: ChecklistItem = { id: Math.random().toString(36).slice(2), text, done: false };
    setLocal((prev) => ({ ...prev, checklist: [...(prev.checklist ?? []), item] }));
  }

  function toggleItem(id: string) {
    setLocal((prev) => ({
      ...prev,
      checklist: (prev.checklist ?? []).map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    }));
  }

  function removeItem(id: string) {
    setLocal((prev) => ({ ...prev, checklist: (prev.checklist ?? []).filter((i) => i.id !== id) }));
  }

  function attachWaypoint() {
    if (maxWaypointIndex < 0) {
      alert("No waypoints yet.");
      return;
    }
    const idxStr = prompt(`Attach to waypoint # (1…${maxWaypointIndex + 1})`);
    if (!idxStr) return;
    const idx = Number(idxStr) - 1;
    if (Number.isNaN(idx) || idx < 0 || idx > maxWaypointIndex) {
      alert("Invalid waypoint number.");
      return;
    }
    set("waypoint", { index: idx });
  }

  function detachWaypoint() {
    set("waypoint", null);
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-[60]" onClick={onClose}>
      <div
        className="w-[min(720px,92vw)] max-h-[86vh] overflow-auto rounded-2xl bg-white shadow-xl ring-1 ring-black/10 p-4 grid gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-medium">Edit Card</div>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded border border-stone-200 bg-white hover:bg-stone-50 text-[12px]"
          >
            Close
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid gap-2">
            <label className="text-[12px] text-stone-600">Title</label>
            <input
              value={local.title}
              onChange={(e) => set("title", e.target.value)}
              className="px-3 py-2 rounded-lg border border-stone-200"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-[12px] text-stone-600">Type</label>
            <select
              value={local.type}
              onChange={(e) => set("type", e.target.value as CardType)}
              className="px-3 py-2 rounded-lg border border-stone-200"
            >
              <option value="note">Note</option>
              <option value="link">Link</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="todo">Todo</option>
            </select>
          </div>

          {(local.type === "note" ||
            local.type === "link" ||
            local.type === "image" ||
            local.type === "video") && (
            <div className="grid gap-2 md:col-span-2">
              <label className="text-[12px] text-stone-600">
                {local.type === "note"
                  ? "Note Content"
                  : local.type === "link"
                  ? "URL"
                  : local.type === "image"
                  ? "Image URL"
                  : "Video URL"}
              </label>
              {local.type === "note" ? (
                <textarea
                  value={local.content ?? ""}
                  onChange={(e) => set("content", e.target.value)}
                  className="px-3 py-2 rounded-lg border border-stone-200 min-h-[120px]"
                />
              ) : (
                <input
                  value={local.content ?? ""}
                  onChange={(e) => set("content", e.target.value)}
                  placeholder="https://…"
                  className="px-3 py-2 rounded-lg border border-stone-200"
                />
              )}
            </div>
          )}

          {local.type === "todo" && (
            <div className="grid gap-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] text-stone-600">Checklist</label>
                <button
                  onClick={upsertChecklistItem}
                  className="px-2 py-1 rounded border border-stone-200 bg-white hover:bg-stone-50 text-[12px]"
                >
                  Add item
                </button>
              </div>
              <div className="grid gap-2">
                {(local.checklist ?? []).map((i) => (
                  <div key={i.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={i.done} onChange={() => toggleItem(i.id)} />
                    <input
                      className="flex-1 px-2 py-1 rounded border border-stone-200"
                      value={i.text}
                      onChange={(e) =>
                        setLocal((prev) => ({
                          ...prev,
                          checklist: (prev.checklist ?? []).map((ci) =>
                            ci.id === i.id ? { ...ci, text: e.target.value } : ci
                          ),
                        }))
                      }
                    />
                    <button
                      onClick={() => removeItem(i.id)}
                      className="text-[12px] px-2 py-1 rounded border border-stone-200 bg-white hover:bg-stone-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {!local.checklist?.length && <div className="text-sm text-stone-500">No items yet.</div>}
              </div>
            </div>
          )}

          <div className="grid gap-2 md:col-span-2">
            <label className="text-[12px] text-stone-600">Tags (comma or space separated)</label>
            <div className="flex gap-2">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200"
              />
              <button
                onClick={applyTags}
                className="px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50"
              >
                Apply
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {local.tags.map((t: string) => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-stone-100">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label className="text-[12px] text-stone-600">Attach to Waypoint (optional)</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (maxWaypointIndex < 0) {
                    alert("No waypoints yet.");
                    return;
                  }
                  const idxStr = prompt(`Attach to waypoint # (1…${maxWaypointIndex + 1})`);
                  if (!idxStr) return;
                  const idx = Number(idxStr) - 1;
                  if (Number.isNaN(idx) || idx < 0 || idx > maxWaypointIndex) {
                    alert("Invalid waypoint number.");
                    return;
                  }
                  setLocal((p) => ({ ...p, waypoint: { index: idx } }));
                }}
                className="px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50"
              >
                Attach
              </button>
              <button
                onClick={() => setLocal((p) => ({ ...p, waypoint: null }))}
                className="px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50"
              >
                Detach
              </button>
              {local.waypoint ? (
                <span className="self-center text-sm">Attached to waypoint #{local.waypoint.index + 1}</span>
              ) : (
                <span className="self-center text-sm text-stone-500">None</span>
              )}
            </div>
          </div>
        </div>

        {local.type === "image" && local.content && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={local.content} alt="" className="max-h-60 rounded-lg border border-stone-200" />
          </div>
        )}
        {local.type === "video" && local.content && (
          <div className="mt-2">
            <video src={local.content} className="max-h-60 rounded-lg border border-stone-200" controls />
          </div>
        )}
        {local.type === "link" && local.content && (
          <div className="mt-2">
            <a href={local.content} target="_blank" className="text-sky-700 hover:underline">
              {local.content}
            </a>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(local)}
            className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-900 text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
