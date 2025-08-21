"use client";
import { useEffect, useMemo, useState } from "react";

type LatLng = { lat: number; lng: number };

export default function AweRouteForm() {
  const [name, setName] = useState("");
  const [cues, setCues] = useState<string>("sky,texture,quiet,edges,colors");

  // store a pretty-printed GeoJSON string
  const [geojson, setGeojson] = useState<string>('{"type":"LineString","coordinates":[]}');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Try to pre-fill from current map route on mount (if any)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("awe-routes:leaflet");
      if (!raw) return;
      const pts = JSON.parse(raw) as LatLng[] | null;
      if (Array.isArray(pts) && pts.length) {
        const gj = ptsToGeoJSON(pts);
        setGeojson(JSON.stringify(gj, null, 2));
      }
    } catch {
      // ignore if parsing fails
    }
  }, []);

  const cueArray = useMemo(
    () =>
      cues
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [cues]
  );

  async function save() {
    setMsg(null);

    // Basic validation
    if (!name.trim()) {
      setMsg({ type: "err", text: "Please enter a route name." });
      return;
    }

    let parsedGeo: any;
    try {
      parsedGeo = JSON.parse(geojson);
    } catch {
      setMsg({ type: "err", text: "GeoJSON is not valid JSON." });
      return;
    }

    // Accept either LineString geometry or Feature(Feature<LineString>)
    const valid =
      (parsedGeo?.type === "LineString" && Array.isArray(parsedGeo.coordinates)) ||
      (parsedGeo?.type === "Feature" &&
        parsedGeo.geometry?.type === "LineString" &&
        Array.isArray(parsedGeo.geometry.coordinates));

    if (!valid) {
      setMsg({
        type: "err",
        text: "GeoJSON must be a LineString or a Feature with LineString geometry.",
      });
      return;
    }

    const payload = {
      name: name.trim(),
      cues: cueArray,
      // store as string on server or as parsed object — here we send parsed
      geojson: parsedGeo,
    };

    try {
      setSaving(true);
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Request failed (${res.status})`);
      }
      setName("");
      setMsg({ type: "ok", text: "Saved route." });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Failed to save route." });
    } finally {
      setSaving(false);
    }
  }

  function loadFromMap() {
    setMsg(null);
    try {
      const raw = localStorage.getItem("awe-routes:leaflet");
      if (!raw) {
        setMsg({ type: "err", text: "No current route found in map." });
        return;
      }
      const pts = JSON.parse(raw) as LatLng[];
      if (!Array.isArray(pts) || !pts.length) {
        setMsg({ type: "err", text: "Map route is empty." });
        return;
      }
      const gj = ptsToGeoJSON(pts);
      setGeojson(JSON.stringify(gj, null, 2));
      setMsg({ type: "ok", text: "Loaded GeoJSON from current map route." });
    } catch {
      setMsg({ type: "err", text: "Could not load route from map." });
    }
  }

  async function importGpx(file: File) {
    setMsg(null);
    try {
      const text = await file.text();
      const doc = new DOMParser().parseFromString(text, "text/xml");

      // Try to extract <trkpt lat=".." lon=".."> elements
      const pts: LatLng[] = [];
      const nodes = Array.from(doc.getElementsByTagName("trkpt"));
      nodes.forEach((n) => {
        const lat = parseFloat(n.getAttribute("lat") || "");
        const lon = parseFloat(n.getAttribute("lon") || "");
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          pts.push({ lat, lng: lon });
        }
      });

      if (!pts.length) {
        // Fallback: try <rtept lat=".." lon="..">
        const rte = Array.from(doc.getElementsByTagName("rtept"));
        rte.forEach((n) => {
          const lat = parseFloat(n.getAttribute("lat") || "");
          const lon = parseFloat(n.getAttribute("lon") || "");
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            pts.push({ lat, lng: lon });
          }
        });
      }

      if (!pts.length) throw new Error("No track/route points found in GPX.");

      const gj = ptsToGeoJSON(pts);
      setGeojson(JSON.stringify(gj, null, 2));
      setMsg({ type: "ok", text: `Imported ${pts.length} points from GPX.` });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Failed to import GPX." });
    }
  }

  function onGpxInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) importGpx(f);
    e.currentTarget.value = "";
  }

  return (
    <div className="grid gap-4">
      <input
        className="border rounded px-3 py-2"
        placeholder="Route name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="grid gap-1">
        <span className="text-sm">Attention cues (comma-separated)</span>
        <textarea
          className="border rounded p-2"
          value={cues}
          onChange={(e) => setCues(e.target.value)}
          rows={2}
        />
        {!!cueArray.length && (
          <span className="text-[12px] text-stone-500">Parsed: [{cueArray.join(", ")}]</span>
        )}
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm"
          onClick={loadFromMap}
        >
          Use current map route
        </button>

        <label className="cursor-pointer">
          <span className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm inline-block">
            Import GPX
          </span>
          <input
            type="file"
            className="hidden"
            accept=".gpx,application/gpx+xml"
            onChange={onGpxInput}
          />
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-sm">GeoJSON (LineString or Feature&lt;LineString&gt;)</span>
        <textarea
          className="border rounded p-2 font-mono text-xs"
          value={geojson}
          onChange={(e) => setGeojson(e.target.value)}
          rows={10}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          className="bg-black text-white rounded px-4 py-2 w-fit disabled:opacity-50"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save route"}
        </button>
        {msg && (
          <span
            className={
              msg.type === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

// Convert our local map points to a plain GeoJSON LineString
function ptsToGeoJSON(pts: LatLng[]) {
  return {
    type: "LineString",
    coordinates: pts.map((p) => [p.lng, p.lat]), // GeoJSON is [lon, lat]
  };
}
