"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

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

export type PlanMember = {
  id: string;
  userId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  user: {
    id: string;
    name: string | null;
    email: string | null;
    profile: {
      avatarUrl: string | null;
    } | null;
  };
};

export type Plan = {
  id: UUID;
  title: string;
  description?: string | null;
  ownerId: string;
  members: PlanMember[];
  cards: Card[];
  createdAt: string;
};

/* ---------------- Component ---------------- */
export default function PlanBoard({
  currentWaypointCount = 0,
}: {
  currentWaypointCount?: number;
}) {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [active, setActive] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);

  // Load plans from API
  useEffect(() => {
    if (session?.user) {
      fetchPlans();
    }
  }, [session]);

  async function fetchPlans() {
    try {
      setLoading(true);
      const res = await fetch("/api/hopin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        // Restore active plan if exists
        const url = new URL(window.location.href);
        const qPlan = url.searchParams.get("plan");
        if (qPlan) {
          const found = data.find((p: Plan) => p.id === qPlan);
          if (found) {
            setActivePlanId(found.id);
            setActive(found);
          }
        } else if (data.length > 0 && !activePlanId) {
          setActivePlanId(data[0].id);
          setActive(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createPlan() {
    const title = prompt("Plan title")?.trim();
    if (!title) return;
    try {
      const res = await fetch("/api/hopin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const newPlan = await res.json();
        setPlans([newPlan, ...plans]);
        setActivePlanId(newPlan.id);
        setActive(newPlan);
        const u = new URL(window.location.href);
        u.searchParams.set("plan", newPlan.id);
        history.replaceState(null, "", u.toString());
      }
    } catch (e) {
      alert("Failed to create plan");
    }
  }

  async function searchUsers(q: string) {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function inviteUser(userId: string) {
    if (!active) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/hopin/plans/${active.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        alert("Invite sent!");
        setShowSearch(false);
        setSearchQuery("");
        fetchPlans(); // Refresh to see pending member
      } else {
        const err = await res.json();
        alert(err.error || "Failed to invite");
      }
    } catch (e) {
      alert("Error sending invite");
    } finally {
      setInviting(false);
    }
  }

  function selectPlan(id: string) {
    const found = plans.find((p) => p.id === id);
    if (found) {
      setActivePlanId(id);
      setActive(found);
      const u = new URL(window.location.href);
      u.searchParams.set("plan", id);
      history.replaceState(null, "", u.toString());
    }
  }

  /* ---------- Cards (Local only for now, as per schema limitation) ---------- */
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    if (activePlanId) {
      const saved = localStorage.getItem(`awe-routes:plans:${activePlanId}:cards`);
      if (saved) {
        try {
          setCards(JSON.parse(saved));
        } catch { setCards([]); }
      } else {
        setCards([]);
      }
    } else {
      setCards([]);
    }
  }, [activePlanId]);

  useEffect(() => {
    if (activePlanId) {
      localStorage.setItem(`awe-routes:plans:${activePlanId}:cards`, JSON.stringify(cards));
    }
  }, [cards, activePlanId]);

  function addCard(type: CardType) {
    if (!activePlanId) return;
    const c: Card = {
      id: Math.random().toString(36).slice(2),
      type,
      title: type === "note" ? "New Note" : type === "todo" ? "New Todo" : "New Card",
      content: "",
      tags: [],
      checklist: type === "todo" ? [] : undefined,
      waypoint: null,
      createdAt: Date.now(),
    };
    setCards([c, ...cards]);
  }

  function updateCard(update: Card) {
    setCards(cards.map((c) => (c.id === update.id ? update : c)));
  }

  function deleteCard(id: string) {
    setCards(cards.filter((c) => c.id !== id));
  }

  /* ---------- Search / filter ---------- */
  const [editing, setEditing] = useState<Card | null>(null);
  const [query, setQuery] = useState<string>("");

  const visibleCards: Card[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => {
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
  }, [cards, query]);

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

          <div className="grid gap-1 max-h-[200px] overflow-y-auto">
            {loading && <div className="text-xs text-stone-500">Loading...</div>}
            {!loading && plans.length === 0 && <div className="text-sm text-stone-600">No plans yet.</div>}
            {plans.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-lg border px-2 py-1.5 cursor-pointer ${activePlanId === p.id
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-900 border-stone-200 hover:bg-stone-50"
                  }`}
                onClick={() => selectPlan(p.id)}
              >
                <div className="truncate font-medium text-sm">{p.title}</div>
                <div className="text-[10px] opacity-70 ml-2">{p.members.length} 👤</div>
              </div>
            ))}
          </div>
        </div>

        {/* Members */}
        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Members</div>
            <button
              disabled={!active}
              onClick={() => setShowSearch(true)}
              className="px-2 py-1 rounded-lg text-[12px] border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50"
            >
              + Add
            </button>
          </div>
          <div className="grid gap-2 max-h-[200px] overflow-y-auto">
            {active?.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border px-2 py-1.5 bg-white border-stone-200"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <img
                    src={m.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${m.user.name}`}
                    className="w-5 h-5 rounded-full bg-stone-200"
                  />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-medium truncate">{m.user.name || "User"}</span>
                    <span className="text-[10px] text-stone-500">{m.status}</span>
                  </div>
                </div>
              </div>
            ))}
            {!active && <div className="text-sm text-stone-600">Select a plan.</div>}
          </div>
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

      {/* Add Member Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowSearch(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Add Friend to Plan</h3>
              <button onClick={() => setShowSearch(false)}>✕</button>
            </div>
            <input
              autoFocus
              className="w-full border p-2 rounded-lg"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => searchUsers(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <img src={u.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs text-stone-500">{u.email}</div>
                    </div>
                  </div>
                  <button
                    disabled={inviting}
                    onClick={() => inviteUser(u.id)}
                    className="bg-black text-white px-3 py-1 rounded-lg text-xs hover:opacity-80 disabled:opacity-50"
                  >
                    Invite
                  </button>
                </div>
              ))}
              {searchQuery.length > 1 && searchResults.length === 0 && (
                <div className="text-center text-stone-500 py-4">No users found</div>
              )}
            </div>
          </div>
        </div>
      )}

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
