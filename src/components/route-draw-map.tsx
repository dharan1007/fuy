"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ---------------- types ---------------- */
type LatLng = { lat: number; lng: number; owner?: string };
type Tool = "polyline" | "move" | "erase";

/* -- minimal card type mirrored from plan-board (so we can show popups) -- */
type ChecklistItem = { id: string; text: string; done: boolean };
type CardType = "note" | "link" | "image" | "video" | "todo";
type PlanCard = {
  id: string;
  type: CardType;
  title: string;
  content?: string;
  tags: string[];
  checklist?: ChecklistItem[];
  waypoint?: { index: number } | null;
  createdAt: number;
};

/* ---------------- localStorage keys ---------------- */
const PLAN_KEY = (id: string) => `awe-routes:plans:${id}`;
const ROUTE_KEY = "awe-routes:leaflet";
const USERS_KEY = "awe-routes:users"; // <— extra: store ad-hoc users when no plan

/* ---------------- users & colors ---------------- */
const PALETTE = [
  "#2563eb", "#16a34a", "#dc2626", "#9333ea", "#f59e0b",
  "#0891b2", "#f43f5e", "#0ea5e9", "#22c55e", "#a855f7",
];
function colorForUser(name: string) {
  const s = (name || "me").toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function makeDivIconHTML(color: string) {
  const size = 18;
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};
    border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,.35);
  "></div>`;
}

/* ---------------- tiny hook for other components ---------------- */
export function useRoutePointCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      try {
        const raw = localStorage.getItem(ROUTE_KEY);
        const arr = raw ? (JSON.parse(raw) as LatLng[]) : [];
        setCount(Array.isArray(arr) ? arr.length : 0);
      } catch {}
    }, 800);
    return () => clearInterval(t);
  }, []);
  return count;
}

/* ---------------- utils ---------------- */
function escapeHTML(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function escapeAttr(s: string) {
  return escapeHTML(s);
}

/* ---------------- main component ---------------- */
export default function RouteDrawMap() {
  const [tool, setTool] = useState<Tool>("polyline");
  const [pts, setPts] = useState<LatLng[]>([]);
  const [undoStack, setUndo] = useState<LatLng[][]>([]);
  const [redoStack, setRedo] = useState<LatLng[][]>([]);

  // current user (owner of new pins)
  const [currentUser, setCurrentUser] = useState<string>("Me");
  const [knownUsers, setKnownUsers] = useState<string[]>(["Me"]);

  // active plan hook-ups (for popups & member persistence)
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [cardsByWaypoint, setCardsByWaypoint] = useState<Record<number, PlanCard[]>>({});

  // Leaflet refs
  const LRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // latest refs to avoid stale closures
  const toolRef = useRef<Tool>(tool);
  const ptsRef = useRef<LatLng[]>(pts);
  const userRef = useRef<string>(currentUser);
  useEffect(() => void (toolRef.current = tool), [tool]);
  useEffect(() => void (ptsRef.current = pts), [pts]);
  useEffect(() => void (userRef.current = currentUser), [currentUser]);

  // drag session
  const isDraggingRef = useRef<boolean>(false);
  const dragIndexRef = useRef<number | null>(null);
  const tempPtsRef = useRef<LatLng[] | null>(null);

  /* ---------- load/save route ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROUTE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as any[];
        const normalized = Array.isArray(arr)
          ? arr.map((p) => ({ lat: p.lat, lng: p.lng, owner: p.owner ?? "Me" }))
          : [];
        setPts(normalized);
      }
      // load saved ad-hoc users (for no-plan mode)
      const uRaw = localStorage.getItem(USERS_KEY);
      if (uRaw) {
        const saved = JSON.parse(uRaw) as string[];
        if (Array.isArray(saved) && saved.length) {
          setKnownUsers(Array.from(new Set(["Me", ...saved])));
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(ROUTE_KEY, JSON.stringify(pts)); } catch {}
  }, [pts]);

  function pushUndo(prev: LatLng[]) {
    setUndo((u) => [...u.slice(-49), prev.map((p) => ({ ...p }))]);
    setRedo([]);
  }

  /* ---------- watch plan + cards + members (poll URL/LS; merge users) ---------- */
  useEffect(() => {
    const poll = () => {
      try {
        const url = new URL(window.location.href);
        const pid = url.searchParams.get("plan");
        setActivePlanId(pid);

        // owners from current route
        const ownersFromRoute = Array.from(new Set((ptsRef.current ?? []).map(p => p.owner ?? "Me")));

        // locally saved users (when not using a plan)
        let savedUsers: string[] = [];
        try {
          const uRaw = localStorage.getItem(USERS_KEY);
          const list = uRaw ? (JSON.parse(uRaw) as string[]) : [];
          if (Array.isArray(list)) savedUsers = list;
        } catch {}

        let members: string[] = ["Me", ...ownersFromRoute, ...savedUsers];

        // plan members + cards
        let cByIdx: Record<number, PlanCard[]> = {};
        if (pid) {
          const raw = localStorage.getItem(PLAN_KEY(pid));
          if (raw) {
            const plan = JSON.parse(raw);
            if (Array.isArray(plan?.members)) members = [...members, ...plan.members.filter(Boolean)];
            const cards: PlanCard[] = Array.isArray(plan?.cards) ? plan.cards : [];
            for (const card of cards) {
              if (card?.waypoint && typeof card.waypoint.index === "number") {
                const idx = card.waypoint.index;
                if (!cByIdx[idx]) cByIdx[idx] = [];
                cByIdx[idx].push(card);
              }
            }
          }
        }
        setKnownUsers(Array.from(new Set(members)));
        setCardsByWaypoint(cByIdx);
      } catch {}
    };
    const t = setInterval(poll, 1000);
    poll();
    return () => clearInterval(t);
  }, []);

  /* ---------- init Leaflet once ---------- */
  useEffect(() => {
    if (mapRef.current) return;
    let disposed = false;

    (async () => {
      await import("leaflet/dist/leaflet.css");
      const L = await import("leaflet");
      LRef.current = L;

      // default marker icons (unused since we use divIcon, but keep for safety)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const el = document.getElementById("awe-leaflet-map");
      if (!el) return;
      // @ts-ignore - Leaflet container sentinel
      if ((el as any)._leaflet_id) {
        const fresh = el.cloneNode(false) as HTMLElement;
        el.parentNode?.replaceChild(fresh, el);
      }

      const map = L.map("awe-leaflet-map", { dragging: true, zoomControl: true }).setView([19.076, 72.8777], 12);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);

      polylineRef.current = L.polyline([], { weight: 4, color: "#0ea5e9" }).addTo(map);

      const onClick = (e: any) => {
        if (toolRef.current !== "polyline" || isDraggingRef.current) return;
        const { lat, lng } = e.latlng;
        const before = ptsRef.current;
        pushUndo(before);
        setPts([...before, { lat, lng, owner: userRef.current || "Me" }]);
      };
      map.on("click", onClick);

      renderAll();

      return () => {
        if (disposed) return;
        disposed = true;
        try {
          map.off("click", onClick);
          markersRef.current.forEach((m) => m.remove());
          markersRef.current = [];
          polylineRef.current?.remove();
          polylineRef.current = null;
          map.off(); map.remove();
        } finally { mapRef.current = null; }
      };
    })();
  }, []);

  /* ---------- render helpers ---------- */
  function markerForIndex(i: number) {
    const L = LRef.current;
    const p = (tempPtsRef.current ?? ptsRef.current)[i];
    const color = colorForUser(p.owner || "Me");
    const mk = L.marker([p.lat, p.lng], {
      draggable: true,
      icon: L.divIcon({
        className: "awe-div-icon",
        html: makeDivIconHTML(color),
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    });

    // click -> open popup with cards for this waypoint
    mk.on("click", () => openPopupForWaypoint(i, mk));

    // erase or move
    mk.on("mousedown", () => {
      if (toolRef.current === "erase" && !isDraggingRef.current) {
        const before = ptsRef.current; pushUndo(before); setPts(before.filter((_, idx) => idx !== i));
      }
    });

    mk.on("dragstart", () => {
      if (toolRef.current !== "move") { mk.setLatLng([p.lat, p.lng]); return; }
      isDraggingRef.current = true; dragIndexRef.current = i;
      tempPtsRef.current = ptsRef.current.map((q) => ({ ...q }));
      pushUndo(ptsRef.current);
      mapRef.current.dragging.disable();
    });

    mk.on("drag", (ev: any) => {
      if (!isDraggingRef.current || dragIndexRef.current === null) return;
      const idx = dragIndexRef.current; const { lat, lng } = ev.latlng;
      if (tempPtsRef.current) {
        tempPtsRef.current[idx] = { ...tempPtsRef.current[idx], lat, lng };
        polylineRef.current?.setLatLngs(tempPtsRef.current.map((u) => [u.lat, u.lng]));
        mk.setLatLng([lat, lng]);
      }
    });

    mk.on("dragend", (ev: any) => {
      if (!isDraggingRef.current) return;
      const idx = dragIndexRef.current!;
      const { lat, lng } = ev.target.getLatLng();
      const next = (tempPtsRef.current ?? ptsRef.current).map((u, j) => (j === idx ? { ...u, lat, lng } : u));
      tempPtsRef.current = null; isDraggingRef.current = false; dragIndexRef.current = null;
      mapRef.current.dragging.enable(); setPts(next);
    });

    return mk;
  }

  function renderAll() {
    const L = LRef.current; const map = mapRef.current; if (!L || !map) return;
    const current = tempPtsRef.current ?? ptsRef.current;

    if (!polylineRef.current) polylineRef.current = L.polyline([], { weight: 4, color: "#0ea5e9" }).addTo(map);
    polylineRef.current.setLatLngs(current.map((p) => [p.lat, p.lng]));

    const need = current.length, have = markersRef.current.length;
    if (have > need) { for (let i = have - 1; i >= need; i--) { markersRef.current[i].remove(); markersRef.current.pop(); } }
    for (let i = have; i < need; i++) {
      const mk = markerForIndex(i);
      mk.addTo(map); markersRef.current.push(mk);
    }
    // update positions + icons (in case owner changed)
    for (let i = 0; i < markersRef.current.length; i++) {
      const p = current[i]; const mk = markersRef.current[i];
      const ll = mk.getLatLng(); if (ll.lat !== p.lat || ll.lng !== p.lng) mk.setLatLng([p.lat, p.lng]);
      const color = colorForUser(p.owner || "Me");
      mk.setIcon(L.divIcon({ className: "awe-div-icon", html: makeDivIconHTML(color), iconSize: [18,18], iconAnchor: [9,9] }));
    }
  }

  // Popup HTML
  function renderPopupHTML(idx: number, cards: PlanCard[]) {
    const header = `<div style="font-weight:600;margin-bottom:6px">Waypoint #${idx + 1}</div>`;
    if (!cards.length) {
      return header + `<div style="color:#6b7280;font-size:12px">No cards linked. Open the Plan and attach cards to this waypoint.</div>`;
    }
    const items = cards.map((c) => {
      const tags = (c.tags || [])
        .map((t) => `<span style="background:#f3f4f6;border-radius:999px;padding:2px 6px;font-size:10px;margin-right:4px">#${escapeHTML(t)}</span>`)
        .join("");
      let body = "";
      if (c.type === "note") body = `<div style="white-space:pre-wrap;font-size:12px;color:#374151">${escapeHTML(c.content || "")}</div>`;
      if (c.type === "link") body = `<a href="${escapeAttr(c.content || "#")}" target="_blank" style="color:#2563eb;word-break:break-all">${escapeHTML(c.content || "")}</a>`;
      if (c.type === "image") body = `<img src="${escapeAttr(c.content || "")}" style="max-width:220px;max-height:150px;border-radius:8px;border:1px solid #e5e7eb" />`;
      if (c.type === "video") body = `<video src="${escapeAttr(c.content || "")}" style="max-width:220px;max-height:150px;border-radius:8px;border:1px solid #e5e7eb" controls></video>`;
      if (c.type === "todo") {
        const done = (c.checklist || []).filter((i) => i.done).length; const total = (c.checklist || []).length;
        body = `<div style="font-size:12px;color:#374151">${done}/${total} done</div>`;
      }
      return `
        <div style="padding:8px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;background:#fff">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px">${escapeHTML(c.title || "Card")}</div>
          ${body}
          <div style="margin-top:6px">${tags}</div>
        </div>
      `;
    }).join("");
    return header + items;
  }

  function openPopupForWaypoint(index: number, mk: any) {
    const cards = cardsByWaypoint[index] || [];
    const html = renderPopupHTML(index, cards);
    mk.bindPopup(html, { minWidth: 240, maxWidth: 260 }).openPopup();
  }

  /* ---------- render on state changes (avoid churn during drag) ---------- */
  useEffect(() => { if (!isDraggingRef.current) renderAll(); }, [pts]);
  useEffect(() => { if (!isDraggingRef.current) renderAll(); }, [tool]);

  /* ---------- distance ---------- */
  const distancePretty = useMemo(() => {
    const L = LRef.current; const arr = ptsRef.current; if (!L || arr.length < 2) return "0 m";
    let meters = 0; for (let i = 1; i < arr.length; i++) meters += L.latLng(arr[i - 1]).distanceTo(L.latLng(arr[i]));
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(0)} m`;
  }, [pts]);

  /* ---------- undo/redo ---------- */
  function undo() {
    setUndo((u) => {
      if (!u.length) return u;
      setRedo((r) => [pts.map((p) => ({ ...p })), ...r].slice(0, 50));
      const prev = u[u.length - 1]; setPts(prev);
      return u.slice(0, -1);
    });
  }
  function redo() {
    setRedo((r) => {
      if (!r.length) return r;
      setUndo((u) => [...u, pts.map((p) => ({ ...p }))].slice(-50));
      const next = r[0]; setPts(next);
      return r.slice(1);
    });
  }

  /* ---------- export/import ---------- */
  function exportGPX() {
    const gpx = toGPX(pts);
    downloadBlob(`route_${Date.now()}.gpx`, new Blob([gpx], { type: "application/gpx+xml" }));
  }
  function exportJSON() {
    downloadBlob(`route_${Date.now()}.json`, new Blob([JSON.stringify(pts, null, 2)], { type: "application/json" }));
  }
  async function importJSON(file: File) {
    try {
      const list = JSON.parse(await file.text()) as LatLng[];
      if (!Array.isArray(list)) throw new Error();
      // make sure owners exist
      const normalized = list.map((p) => ({ lat: p.lat, lng: p.lng, owner: p.owner ?? "Me" }));
      pushUndo(pts); setPts(normalized);
    } catch { alert("Invalid file"); }
  }

  /* ---------- UI ---------- */
  function addUserPrompt() {
    const name = prompt("Add user name / email")?.trim();
    if (!name) return;

    // 1) Always show immediately in UI
    const nextLocalUsers = Array.from(new Set([...knownUsers, name]));
    setKnownUsers(nextLocalUsers);
    setCurrentUser(name);

    // 2) Persist: if a plan is active, add to plan.members; otherwise save to USERS_KEY
    try {
      const url = new URL(window.location.href);
      const pid = url.searchParams.get("plan");
      if (pid) {
        const raw = localStorage.getItem(PLAN_KEY(pid));
        const plan = raw ? JSON.parse(raw) : null;
        if (plan) {
          const members: string[] = Array.isArray(plan.members) ? plan.members : [];
          if (!members.includes(name)) {
            plan.members = [...members, name];
            localStorage.setItem(PLAN_KEY(pid), JSON.stringify(plan));
          }
        }
      } else {
        const raw = localStorage.getItem(USERS_KEY);
        const list = raw ? (JSON.parse(raw) as string[]) : [];
        const merged = Array.from(new Set([...(Array.isArray(list) ? list : []), name]));
        localStorage.setItem(USERS_KEY, JSON.stringify(merged));
      }
    } catch {}
  }

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      {/* Controls */}
      <aside className="grid gap-3">
        {/* Tools */}
        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="font-medium">Tools</div>
          <div className="flex flex-wrap gap-2">
            <ToolBtn onClick={() => setTool("polyline")} active={tool === "polyline"}>Polyline</ToolBtn>
            <ToolBtn onClick={() => setTool("move")} active={tool === "move"}>Move</ToolBtn>
            <ToolBtn onClick={() => setTool("erase")} active={tool === "erase"}>Erase</ToolBtn>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={undo} disabled={!undoStack.length}>Undo</Btn>
            <Btn onClick={redo} disabled={!redoStack.length}>Redo</Btn>
            <Btn tone="danger" onClick={() => { if (confirm("Clear route?")) { pushUndo(pts); setPts([]); } }}>Clear</Btn>
          </div>
        </div>

        {/* Current User & legend */}
        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="font-medium">Users & Colors</div>
          <div className="flex items-center gap-2">
            <select
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              className="px-3 py-2 rounded-lg border border-stone-200 flex-1"
            >
              {knownUsers.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <button onClick={addUserPrompt} className="px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50">Add</button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {knownUsers.map((u) => (
              <div key={u} className="flex items-center gap-2">
                <span
                  className="inline-block rounded-full border border-white shadow"
                  style={{ width: 14, height: 14, background: colorForUser(u) }}
                />
                <span className="text-sm">{u}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data */}
        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="font-medium">Data</div>
          <div className="text-sm text-stone-700">
            <div>Length: <b>{distancePretty}</b></div>
            <div>Waypoints: <b>{pts.length}</b></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={exportGPX}>Export GPX</Btn>
            <Btn onClick={exportJSON}>Export JSON</Btn>
            <label className="cursor-pointer">
              <span className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm inline-block">
                Import JSON
              </span>
              <input type="file" className="hidden" accept="application/json" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) importJSON(f);
                e.currentTarget.value = "";
              }} />
            </label>
          </div>
          <p className="text-[12px] text-stone-500">
            Polyline: click map to add points (owned by the selected user) • Move: drag points (map pan disabled during drag) • Erase: click a point. Click a pin to see linked plan cards.
          </p>
        </div>
      </aside>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden ring-1 ring-black/5 bg-white/80" style={{ aspectRatio: "4 / 3" }}>
        <div id="awe-leaflet-map" className="h-full w-full" style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}

/* ---------- small UI + helpers ---------- */

function ToolBtn({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-2xl text-[13px] transition border shadow-sm ${
        active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-900 hover:bg-stone-50 border-stone-200"
      }`}
    >
      {children}
    </button>
  );
}
function Btn({ onClick, children, tone = "neutral", disabled }: { onClick?: () => void; children: React.ReactNode; tone?: "neutral" | "danger"; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-2xl text-[13px] transition border shadow-sm disabled:opacity-50 ${
        tone === "danger" ? "bg-red-600 text-white hover:bg-red-500 border-red-700" : "bg-white text-stone-900 hover:bg-stone-50 border-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

function toGPX(points: LatLng[]) {
  if (!points.length) {
    return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="AweRoutes" xmlns="http://www.topografix.com/GPX/1/1"></gpx>`;
  }
  const trkpts = points
    .map((p) => `<trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><time>${new Date().toISOString()}</time></trkpt>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="AweRoutes" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Route ${new Date().toISOString()}</name>
    <trkseg>
      ${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}
function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
