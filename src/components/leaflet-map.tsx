"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type LatLng = { lat: number; lng: number };
export type POICategory =
  | "Cafés"
  | "Restaurants"
  | "ATMs"
  | "Bus Stops"
  | "Museums"
  | "Parkings"
  | "Emergencies"
  | "Sport Centers";

export type LeafletMapProps = {
  basemapStyle: "dark" | "light" | "sepia";
  activeCategory: POICategory | null;
  center?: [number, number];
  zoom?: number;
};

const STORAGE_ROUTE = "awe-routes:leaflet";

function getPts(): LatLng[] {
  try {
    const raw = localStorage.getItem(STORAGE_ROUTE);
    return raw ? (JSON.parse(raw) as LatLng[]) : [];
  } catch {
    return [];
  }
}
function setPts(pts: LatLng[]) {
  localStorage.setItem(STORAGE_ROUTE, JSON.stringify(pts));
}

function basemap(style: "dark" | "light" | "sepia") {
  switch (style) {
    case "dark":
      return {
        url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
        attr: "&copy; Stadia Maps, &copy; OpenMapTiles, &copy; OSM",
      };
    case "sepia":
      return {
        url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
        attr: "&copy; Stadia Maps, &copy; OpenMapTiles, &copy; OSM",
      };
    default:
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attr: "&copy; OSM",
      };
  }
}

const categoryQueries: Record<POICategory, string> = {
  Cafés: 'node["amenity"="cafe"]',
  Restaurants: 'node["amenity"="restaurant"]',
  ATMs: 'node["amenity"="atm"]',
  "Bus Stops": 'node["highway"="bus_stop"]',
  Museums: 'node["tourism"="museum"]',
  Parkings: 'node["amenity"="parking"]',
  Emergencies: 'node["amenity"="hospital"]',
  "Sport Centers": 'node["leisure"="sports_centre"]',
};

async function fetchPOIs(bounds: any, category: POICategory) {
  const q = categoryQueries[category];
  const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
  const url = `https://overpass-api.de/api/interpreter?data=[out:json];(${q}(${bbox}););out;`;
  const res = await fetch(url);
  return res.json();
}

export default function LeafletMap({
  basemapStyle,
  activeCategory,
  center = [20.59, 78.96],
  zoom = 5,
}: LeafletMapProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);

  const [leafletReady, setLeafletReady] = useState(false);
  const LRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const poiLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  // --- Debounced/safe invalidateSize
  const rafId = useRef<number | null>(null);
  const safeInvalidate = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    // guard: only if container exists and is attached
    const container = map?._container as HTMLElement | undefined;
    if (!container || !container.parentNode) return;
    try {
      map.invalidateSize(false);
    } catch {
      // ignore; can happen during teardown
    }
  }, []);
  const scheduleInvalidate = useCallback(() => {
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      safeInvalidate();
    });
  }, [safeInvalidate]);

  /* Load Leaflet on client */
  useEffect(() => {
    (async () => {
      const L = await import("leaflet");
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      LRef.current = L;
      setLeafletReady(true);
    })();
  }, []);

  /* Init map once */
  useEffect(() => {
    if (!leafletReady || !mapElRef.current || mapRef.current) return;
    const L = LRef.current as typeof import("leaflet");
    const map = L.map(mapElRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });
    mapRef.current = map;

    routeLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);

    const { url, attr } = basemap(basemapStyle);
    tileLayerRef.current = L.tileLayer(url, { attribution: attr }).addTo(map);

    // restore route
    drawRoute(getPts());

    // click to append point
    map.on("click", (e: any) => {
      const next = [...getPts(), { lat: e.latlng.lat, lng: e.latlng.lng }];
      setPts(next);
      drawRoute(next);
    });

    // Resize observers — debounced & guarded
    const ro = new ResizeObserver(() => scheduleInvalidate());
    if (holderRef.current) ro.observe(holderRef.current);
    if (mapElRef.current) ro.observe(mapElRef.current);
    const onWinResize = () => scheduleInvalidate();
    window.addEventListener("resize", onWinResize);

    // Hotkey: F for fullscreen
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.key === "f" || ev.key === "F") && document.activeElement === document.body) {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);

    // first paint
    setTimeout(scheduleInvalidate, 200);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("keydown", onKey);
      // cancel any pending rAF to avoid running after removal
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      try {
        map.remove();
      } finally {
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady]);

  /* Switch basemap safely */
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const { url, attr } = basemap(basemapStyle);
    tileLayerRef.current = L.tileLayer(url, { attribution: attr }).addTo(map);
    scheduleInvalidate();
  }, [basemapStyle, leafletReady, scheduleInvalidate]);

  /* POIs: immediate on category change and on moveend */
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;

    let abort = false;
    const refresh = async () => {
      if (!activeCategory) {
        poiLayerRef.current?.clearLayers();
        return;
      }
      try {
        const data = await fetchPOIs(map.getBounds(), activeCategory);
        if (abort) return;
        poiLayerRef.current?.clearLayers();
        (data.elements || []).forEach((p: any) => {
          L.marker([p.lat, p.lon])
            .bindPopup(`<b>${activeCategory}</b><br/>${p.tags?.name || "Unnamed"}`)
            .addTo(poiLayerRef.current);
        });
      } catch {
        // ignore network errors
      }
    };

    refresh(); // immediate on change
    map.on("moveend", refresh);
    return () => {
      abort = true;
      map.off("moveend", refresh);
    };
  }, [activeCategory, leafletReady]);

  /* Helpers */
  const drawRoute = useCallback((pts: LatLng[]) => {
    const L = LRef.current;
    routeLayerRef.current?.clearLayers();
    if (!pts.length) return;
    const latlngs = pts.map((p) => [p.lat, p.lng]) as [number, number][];
    const poly = L.polyline(latlngs, { color: "#f18f01", weight: 4 });
    poly.addTo(routeLayerRef.current);
    latlngs.forEach((ll, i) =>
      L.marker(ll).bindPopup(`Waypoint ${i + 1}`).addTo(routeLayerRef.current)
    );
  }, []);

  const fitToRoute = useCallback(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const pts = getPts();
    if (!pts.length || !map) return;
    const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng]) as [number, number][]);
    map.fitBounds(bounds.pad(0.1));
  }, []);

  const undoLast = useCallback(() => {
    const pts = getPts();
    if (!pts.length) return;
    pts.pop();
    setPts(pts);
    drawRoute(pts);
  }, [drawRoute]);

  const clearRoute = useCallback(() => {
    setPts([]);
    routeLayerRef.current?.clearLayers();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = holderRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {}
    // fix size after transition
    setTimeout(scheduleInvalidate, 120);
  }, [scheduleInvalidate]);

  return (
    <div
      ref={holderRef}
      style={{
        width: "100%",
        minHeight: "78vh",
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div ref={mapElRef} style={{ position: "absolute", inset: 0 }} />

      {/* Toolbar */}
      <div
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          zIndex: 5000,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button onClick={toggleFullscreen} title="Fullscreen (F)" style={btnStyle}>
          ⛶ Fullscreen
        </button>
        <button onClick={fitToRoute} title="Fit to route" style={btnStyle}>
          ⤢ Fit
        </button>
        <button onClick={undoLast} title="Undo last point" style={btnStyle}>
          ↶ Undo
        </button>
        <button onClick={clearRoute} title="Clear route" style={btnStyle}>
          ✕ Clear
        </button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.25)",
  background: "rgba(0,0,0,.65)",
  color: "white",
  fontSize: 14,
  fontWeight: 600,
  backdropFilter: "blur(6px)",
  cursor: "pointer",
};
