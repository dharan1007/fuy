"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Pin = { id: string; lat: number; lng: number; note: string; color: string; rating: number; createdAt: number; updatedAt: number; };
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function JoyMap() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [note, setNote] = useState("");
  const [color, setColor] = useState("#f97316");
  const [rating, setRating] = useState(4);
  const [filter, setFilter] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => { try { const raw = localStorage.getItem("joy-map:leaflet"); if (raw) setPins(JSON.parse(raw)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("joy-map:leaflet", JSON.stringify(pins)); } catch {} }, [pins]);

  async function runSearch(q: string) {
    const query = q.trim(); if (!query) return setResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8`,
        { headers: { "Accept-Language": "en", "User-Agent": "fuy-app/1.0" } });
      setResults(await res.json());
    } catch { setResults([]); }
  }

  const filteredPins = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? pins.filter(p => p.note.toLowerCase().includes(q)) : pins;
  }, [pins, filter]);

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <aside className="grid gap-3">
        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="font-medium">New pin</div>
          <textarea rows={3} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 ring-stone-200/60"
            placeholder="Write a quick joy note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex items-center gap-3">
            <label className="text-sm text-stone-600">Color</label>
            <input className="h-8 w-10 rounded-md border border-stone-200" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <label className="text-sm text-stone-600 ml-2">Rating</label>
            <input type="range" min={1} max={5} value={rating} onChange={(e) => setRating(parseInt(e.target.value))} />
            <span className="text-sm text-stone-700 w-6 text-right">{rating}</span>
          </div>
          <p className="text-[12px] text-stone-500">Click the map to drop a pin with this note/color/rating.</p>
        </div>

        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80 grid gap-3">
          <div className="font-medium">Search places</div>
          <div className="flex gap-2">
            <input className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 ring-stone-200/60"
              placeholder="e.g., Gateway of India Mumbai"
              onKeyDown={(e) => { if (e.key === "Enter") runSearch((e.target as HTMLInputElement).value); }} />
            <button className="px-3 py-1.5 rounded-2xl text-[13px] bg-white border border-stone-200 hover:bg-stone-50"
              onClick={() => { const el = (document.activeElement as HTMLInputElement); runSearch(el?.value || ""); }}>
              Search
            </button>
          </div>
          <ul className="max-h-48 overflow-auto grid gap-1 text-sm">
            {results.map(r => (
              <li key={r.place_id} className="flex items-start justify-between gap-2">
                <span className="text-stone-700">{r.display_name}</span>
                <button className="text-blue-600 hover:underline text-sm"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("joymap:flyto", { detail: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) } }));
                    setResults([]);
                  }}>Go</button>
              </li>
            ))}
            {results.length === 0 && <li className="text-stone-500">No results (try another query).</li>}
          </ul>
        </div>

        <div className="rounded-2xl p-4 ring-1 ring-black/5 bg-white/80">
          <div className="font-medium mb-2">Pins ({filteredPins.length})</div>
          <input className="mb-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 ring-stone-200/60"
            placeholder="Filter notes…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <ul className="grid gap-2 max-h-64 overflow-auto pr-1">
            {filteredPins.map(p => (
              <li key={p.id} className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                    <span className="font-medium">⭐ {p.rating}</span>
                  </div>
                  <button className="text-red-600 hover:underline" onClick={() => setPins(prev => prev.filter(x => x.id !== p.id))}>Delete</button>
                </div>
                <div className="mt-1 text-stone-700">{p.note}</div>
                <button className="mt-1 text-xs text-stone-600 hover:underline"
                  onClick={() => window.dispatchEvent(new CustomEvent("joymap:flyto", { detail: { lat: p.lat, lng: p.lng } }))}>
                  Focus
                </button>
              </li>
            ))}
            {filteredPins.length === 0 && <li className="text-sm text-stone-500">No pins.</li>}
          </ul>
        </div>
      </aside>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden ring-1 ring-black/5 bg-white/80" style={{ aspectRatio: "4 / 3" }}>
        <MapContainer center={[19.076, 72.8777]} zoom={12} className="h-full w-full" style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <FlyToListener />
          <MapClick onClick={(lat, lng) => setPins(prev => [...prev, {
            id: uid(), lat, lng, note: note || "Untitled", color, rating, createdAt: Date.now(), updatedAt: Date.now()
          }])} />

          {pins.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]}>
              <Popup minWidth={240}>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-sm">⭐ {p.rating}</span>
                  </div>
                  <textarea className="w-full rounded border border-stone-200 p-2 text-sm" rows={3}
                    value={p.note} onChange={(e) => setPins(prev => prev.map(x => x.id === p.id ? { ...x, note: e.target.value, updatedAt: Date.now() } : x))} />
                  <div className="flex items-center gap-2">
                    <input type="color" value={p.color} onChange={(e) => setPins(prev => prev.map(x => x.id === p.id ? { ...x, color: e.target.value, updatedAt: Date.now() } : x))} />
                    <input type="range" min={1} max={5} value={p.rating} onChange={(e) => setPins(prev => prev.map(x => x.id === p.id ? { ...x, rating: parseInt(e.target.value), updatedAt: Date.now() } : x))} />
                  </div>
                  <div className="flex justify-between">
                    <button className="text-red-600 text-sm hover:underline" onClick={() => setPins(prev => prev.filter(x => x.id !== p.id))}>Delete</button>
                    <button className="text-stone-600 text-sm hover:underline"
                      onClick={() => window.dispatchEvent(new CustomEvent("joymap:flyto", { detail: { lat: p.lat, lng: p.lng } }))}>
                      Center here
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function MapClick({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}
function FlyToListener() {
  const map = useMap();
  useEffect(() => {
    const handler = (e: any) => { map.flyTo([e.detail.lat, e.detail.lng], Math.max(map.getZoom(), 14), { duration: 0.6 }); };
    window.addEventListener("joymap:flyto", handler as any);
    return () => window.removeEventListener("joymap:flyto", handler as any);
  }, [map]);
  return null;
}
