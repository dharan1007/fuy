"use client";
import { useEffect, useMemo, useState } from "react";

type LatLng = { lat: number; lng: number };

export default function AweRouteForm() {
  const [name, setName] = useState("");
  const [cues, setCues] = useState<string>("sky,texture,quiet,edges,colors");

  const [geojson, setGeojson] = useState<string>(
    '{"type":"LineString","coordinates":[]}'
  );

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("awe-routes:leaflet");
      if (!raw) return;
      const pts = JSON.parse(raw) as LatLng[] | null;
      if (Array.isArray(pts) && pts.length) {
        const gj = ptsToGeoJSON(pts);
        setGeojson(JSON.stringify(gj, null, 2));
        setMsg({ type: "info", text: "Loaded current map route into the editor." });
      }
    } catch {}
  }, []);

  const cueArray = useMemo(
    () => cues.split(",").map((s) => s.trim()).filter(Boolean),
    [cues]
  );

  async function save() {
    setMsg(null);
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

  async function importGpx(file: File) {
    setMsg(null);
    try {
      const text = await file.text();
      const doc = new DOMParser().parseFromString(text, "text/xml");
      const pts: LatLng[] = [];
      const nodes = Array.from(doc.getElementsByTagName("trkpt"));
      nodes.forEach((n) => {
        const lat = parseFloat(n.getAttribute("lat") || "");
        const lon = parseFloat(n.getAttribute("lon") || "");
        if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push({ lat, lng: lon });
      });
      if (!pts.length) {
        const rte = Array.from(doc.getElementsByTagName("rtept"));
        rte.forEach((n) => {
          const lat = parseFloat(n.getAttribute("lat") || "");
          const lon = parseFloat(n.getAttribute("lon") || "");
          if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push({ lat, lng: lon });
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
    <div className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-stone-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white/90">Create / Save Route</h3>
        {msg && (
          <span
            className={
              msg.type === "ok"
                ? "text-emerald-300 text-sm"
                : msg.type === "info"
                ? "text-stone-300 text-sm"
                : "text-red-300 text-sm"
            }
          >
            {msg.text}
          </span>
        )}
      </div>

      <input
        className="rounded px-3 py-2 outline-none border border-white/10 bg-black/30 text-stone-100 placeholder:text-stone-500"
        placeholder="Route name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="grid gap-1">
        <span className="text-sm text-stone-400">Attention cues (comma-separated)</span>
        <textarea
          className="rounded p-2 outline-none border border-white/10 bg-black/30 text-stone-100"
          value={cues}
          onChange={(e) => setCues(e.target.value)}
          rows={2}
        />
        {!!cueArray.length && (
          <span className="text-[12px] text-stone-400">Parsed: [{cueArray.join(", ")}]</span>
        )}
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white/10 text-stone-100 hover:bg-white/20 border border-white/10"
          onClick={() => {
            try {
              const raw = localStorage.getItem("awe-routes:leaflet");
              if (!raw) return setMsg({ type: "err", text: "No current route found in map." });
              const pts = JSON.parse(raw) as LatLng[];
              if (!Array.isArray(pts) || !pts.length) {
                return setMsg({ type: "err", text: "Map route is empty." });
              }
              const gj = ptsToGeoJSON(pts);
              setGeojson(JSON.stringify(gj, null, 2));
              setMsg({ type: "ok", text: "Loaded GeoJSON from current map route." });
            } catch {
              setMsg({ type: "err", text: "Could not load route from map." });
            }
          }}
        >
          Use current map route
        </button>

        <label className="cursor-pointer">
          <span className="px-3 py-1.5 rounded-2xl text-[13px] transition bg-white/10 text-stone-100 hover:bg-white/20 border border-white/10 inline-block">
            Import GPX
          </span>
          <input type="file" className="hidden" accept=".gpx,application/gpx+xml" onChange={onGpxInput} />
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-sm text-stone-400">GeoJSON (LineString or Feature&lt;LineString&gt;)</span>
        <textarea
          className="rounded p-2 font-mono text-xs outline-none border border-white/10 bg-black/30 text-stone-100"
          value={geojson}
          onChange={(e) => setGeojson(e.target.value)}
          rows={10}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          className="bg-white text-black rounded px-4 py-2 w-fit disabled:opacity-50"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save route"}
        </button>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function ptsToGeoJSON(pts: LatLng[]) {
  return {
    type: "LineString",
    coordinates: pts.map((p) => [p.lng, p.lat]),
  };
}
