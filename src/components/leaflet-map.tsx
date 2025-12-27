"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PlaceDetailModal from "./place-detail-modal";

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
  height?: string;
  onWaypointDelete?: (index: number) => void;
  onCreatePlan?: (data: { lat: number; lng: number; name?: string }) => void;
  plans?: any[];
  onSelectPlan?: (plan: any) => void;
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
  const apiKey = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY;
  switch (style) {
    case "dark":
      return {
        url: `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${apiKey}`,
        attr: "&copy; Stadia Maps, &copy; OpenMapTiles, &copy; OSM",
      };
    case "sepia":
      return {
        url: `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${apiKey}`,
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
  // Request more results with higher limit (up to 100,000 items)
  const overpassQuery = `[out:json][timeout:30];(${q}(${bbox}););out center body;`;
  const url = `https://overpass-api.de/api/interpreter`;

  try {
    const res = await fetch(url, {
      method: "POST",
      body: overpassQuery,
      headers: {
        "Content-Type": "application/osm3s",
      },
    });

    if (!res.ok) {
      console.error(`Overpass API error: ${res.status}`);
      return { elements: [] };
    }

    const data = await res.json();
    // Return up to 100 results
    return {
      elements: (data.elements || []).slice(0, 100),
    };
  } catch (err) {
    console.error("Failed to fetch POIs:", err);
    return { elements: [] };
  }
}

export default function LeafletMap({
  basemapStyle,
  activeCategory,
  center = [20.59, 78.96],
  zoom = 5,
  height = "78vh",
  onWaypointDelete,
  onCreatePlan,
  plans = [],
  onSelectPlan
}: LeafletMapProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);

  const [leafletReady, setLeafletReady] = useState(false);
  const [waypointLabels, setWaypointLabels] = useState<Record<number, string>>(
    {}
  );
  const [selectedPlace, setSelectedPlace] = useState<{
    osmId: string;
    placeName: string;
    category: POICategory;
    lat: number;
    lng: number;
  } | null>(null);
  const LRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const poiLayerRef = useRef<any>(null);
  const plansLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const listenerTrackerRef = useRef<Set<string>>(new Set());

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
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      LRef.current = L;
      setLeafletReady(true);
    })();
  }, []);

  /* Init map once */
  useEffect(() => {
    if (!leafletReady || !mapElRef.current || mapRef.current) return;
    const L = LRef.current as typeof import("leaflet");

    // Log for debugging
    console.log("[LeafletMap] Initializing map...");

    const map = L.map(mapElRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true, // Better performance with canvas rendering
      fadeAnimation: true,
    });
    mapRef.current = map;
    console.log("[LeafletMap] Map instance created:", { center, zoom });

    routeLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);
    plansLayerRef.current = L.layerGroup().addTo(map); // Init Plans Layer

    const { url, attr } = basemap(basemapStyle);
    console.log("[LeafletMap] Creating tile layer with URL:", url);
    tileLayerRef.current = L.tileLayer(url, {
      attribution: attr,
      maxZoom: 19,
      minZoom: 0,
      updateWhenIdle: false,
      keepBuffer: 2,
    }).addTo(map);
    console.log("[LeafletMap] Tile layer added to map");

    // Ensure tile layer loads and then invalidate size
    const onTileLoad = () => {
      console.log("[LeafletMap] Tile layer loaded");
      try {
        map.invalidateSize(true);
      } catch (e) {
        console.error("[LeafletMap] Error invalidating size:", e);
      }
    };

    const onTileError = () => {
      console.error("[LeafletMap] Tile layer failed to load");
    };

    tileLayerRef.current.on("load", onTileLoad);
    tileLayerRef.current.on("error", onTileError);

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
      if (
        (ev.key === "f" || ev.key === "F") &&
        document.activeElement === document.body
      ) {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);

    // first paint - aggressive multiple attempts to ensure map renders
    setTimeout(scheduleInvalidate, 0);
    setTimeout(scheduleInvalidate, 50);
    setTimeout(scheduleInvalidate, 100);
    setTimeout(scheduleInvalidate, 200);
    setTimeout(scheduleInvalidate, 500);
    setTimeout(scheduleInvalidate, 1000);
    setTimeout(scheduleInvalidate, 1500);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("keydown", onKey);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      try {
        if (tileLayerRef.current) {
          tileLayerRef.current.off("load", onTileLoad);
          tileLayerRef.current.off("error", onTileError);
        }
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
    tileLayerRef.current = L.tileLayer(url, {
      attribution: attr,
      maxZoom: 19,
      minZoom: 0,
      updateWhenIdle: false,
      keepBuffer: 2,
      className: "map-tiles-filter", // Add class for CSS filtering
    }).addTo(map);
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
          // Monochrome POI marker
          const markerHtml = `<div style="font-size: 20px; filter: grayscale(100%) brightness(200%);">📍</div>`;
          const icon = L.divIcon({
            html: markerHtml,
            className: "poi-marker",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const marker = L.marker([p.lat, p.lon], { icon });
          const placeName = p.tags?.name || "Unnamed";

          marker.on("click", () => {
            setSelectedPlace({
              osmId: p.id?.toString() || `osm-${p.lat}-${p.lon}`,
              placeName,
              category: activeCategory,
              lat: p.lat,
              lng: p.lon,
            });
          });

          marker.bindPopup(`
            <div style="text-align:center;">
              <b>${activeCategory}</b><br/>${placeName}<br/>
              <button id="poi-create-${p.id}" style="
                margin-top: 8px;
                background: #fff;
                color: #000;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: bold;
                cursor: pointer;
              ">Create Plan Here</button>
            </div>
            <div style="text-align:center; margin-top:4px;"><small>Click marker details</small></div>
          `);

          marker.on("popupopen", () => {
            setTimeout(() => {
              const btn = document.getElementById(`poi-create-${p.id}`);
              if (btn && onCreatePlan) {
                btn.onclick = () => {
                  onCreatePlan({ lat: p.lat, lng: p.lon, name: placeName });
                  marker.closePopup();
                };
              }
            }, 50);
          });
          marker.addTo(poiLayerRef.current);
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
  }, [activeCategory, leafletReady, onCreatePlan]);

  /* Render Plans */
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const L = LRef.current;
    plansLayerRef.current?.clearLayers();

    plans.forEach(plan => {
      if (!plan.latitude || !plan.longitude) return;

      let emoji = "📅";
      if (plan.type === 'COMMUNITY') emoji = "🎉";

      const html = `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); cursor: pointer;">${emoji}</div>`;
      const icon = L.divIcon({
        html,
        className: 'plan-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([plan.latitude, plan.longitude], { icon });

      // Popup or Click
      // If onSelectPlan is provided, handle click.
      marker.on('click', () => {
        if (onSelectPlan) onSelectPlan(plan);
      });

      // Also bind tooltip
      marker.bindTooltip(plan.title || "Hopin Plan", { direction: 'top', offset: [0, -15], className: 'bg-black text-white border-white/20' });

      marker.addTo(plansLayerRef.current);
    });
  }, [plans, leafletReady, onSelectPlan]);

  /* Helpers */
  const createCustomMarker = useCallback(
    (
      lat: number,
      lng: number,
      label: string,
      emoji = "📍",
      waypointIndex?: number
    ) => {
      const L = LRef.current;

      // Create emoji-only marker (no white background) - Grayscale filter
      const markerHtml = `<div style="font-size: 32px; filter: grayscale(100%) drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${emoji}</div>`;

      const customIcon = L.divIcon({
        html: markerHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -25],
        className: "custom-marker",
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Create popup content generator (Monochrome styles)
      const createPopupContent = (isEditMode: boolean) => {
        const displayLabel =
          waypointIndex !== undefined
            ? waypointLabels[waypointIndex] || label
            : label;

        if (isEditMode) {
          return `
          <div style="min-width: 200px; padding: 10px; font-family: sans-serif; background: #000; color: #fff; border: 1px solid #333;">
            <input
              type="text"
              id="wp-input-${waypointIndex}"
              value="${displayLabel}"
              style="
                width: 100%;
                padding: 8px;
                background: #222;
                color: #fff;
                border: 1px solid #444;
                border-radius: 4px;
                font-weight: 600;
                margin-bottom: 8px;
                box-sizing: border-box;
                font-size: 14px;
              "
              placeholder="Enter waypoint name"
              autofocus
            />
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
              <button id="wp-save-${waypointIndex}" style="
                padding: 8px 12px;
                background: #fff;
                color: #000;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
              ">✓ Save</button>
              <button id="wp-cancel-${waypointIndex}" style="
                padding: 8px 12px;
                background: #333;
                color: #fff;
                border: 1px solid #555;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
              ">✗ Cancel</button>
            </div>
            ${waypointIndex !== undefined && emoji === "📍"
              ? `
              <button id="wp-delete-${waypointIndex}" style="
                width: 100%;
                padding: 8px 12px;
                background: transparent;
                color: #fff;
                border: 1px solid #fff;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
              ">🗑 Delete Point</button>
            `
              : ""
            }
          </div>
        `;
        } else {
          return `
          <div style="min-width: 150px; padding: 10px; font-family: sans-serif; background: #000; color: #fff;">
            <p style="margin: 0 0 10px 0; font-weight: 600; font-size: 14px; word-wrap: break-word;">${displayLabel}</p>
            <button id="wp-create-${waypointIndex}" style="
              width: 100%;
              padding: 8px 12px;
              background: #fff;
              color: #000;
              border: none;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 6px;
              cursor: pointer;
            ">Create Plan Here</button>
            <button id="wp-edit-${waypointIndex}" style="
              width: 100%;
              padding: 8px 12px;
              background: #333;
              color: #fff;
              border: 1px solid #555;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 6px;
            ">✎ Edit Name</button>
            ${waypointIndex !== undefined && emoji === "📍"
              ? `
              <button id="wp-delete-${waypointIndex}" style="
                width: 100%;
                padding: 8px 12px;
                background: transparent;
                border: 1px solid #fff;
                color: #fff;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
              ">✕ Delete</button>
            `
              : ""
            }
          </div>
        `;
        }
      };

      marker.bindPopup(createPopupContent(false));

      // Setup handlers
      let isEditMode = false;

      marker.on("popupopen", () => {
        setTimeout(() => {
          const listenerId = `wp-${waypointIndex}`;
          if (listenerTrackerRef.current.has(listenerId)) return;
          listenerTrackerRef.current.add(listenerId);

          // Edit button handler
          const editBtn = document.getElementById(`wp-edit-${waypointIndex}`);
          if (editBtn) {
            editBtn.onclick = (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              isEditMode = true;
              marker.setPopupContent(createPopupContent(true));
              setTimeout(() => {
                const input = document.getElementById(
                  `wp-input-${waypointIndex}`
                ) as HTMLInputElement;
                if (input) {
                  input.focus();
                  input.select();
                }
                setupEditHandlers();
              }, 50);
            };
          }

          // Create Plan Handler
          const createBtn = document.getElementById(`wp-create-${waypointIndex}`);
          if (createBtn && onCreatePlan) {
            createBtn.onclick = (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              onCreatePlan({
                lat,
                lng,
                name:
                  (waypointIndex !== undefined
                    ? waypointLabels[waypointIndex]
                    : undefined) || label,
              });
              marker.closePopup();
            };
          }

          // Delete button handler (view mode)
          const deleteBtn = document.getElementById(
            `wp-delete-${waypointIndex}`
          );
          if (deleteBtn && !isEditMode) {
            deleteBtn.onclick = (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              if (waypointIndex !== undefined) {
                const pts = getPts();
                pts.splice(waypointIndex, 1);
                setPts(pts);
                drawRoute(pts);
                if (onWaypointDelete) onWaypointDelete(waypointIndex);
              }
              marker.closePopup();
            };
          }
        }, 30);
      });

      const setupEditHandlers = () => {
        setTimeout(() => {
          // Save button
          const saveBtn = document.getElementById(`wp-save-${waypointIndex}`);
          if (saveBtn) {
            saveBtn.onclick = (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              const input = document.getElementById(
                `wp-input-${waypointIndex}`
              ) as HTMLInputElement;
              if (input && waypointIndex !== undefined) {
                const newLabel = input.value.trim() || label;
                setWaypointLabels((prev) => ({
                  ...prev,
                  [waypointIndex]: newLabel,
                }));
                isEditMode = false;
                marker.setPopupContent(createPopupContent(false));
                marker.openPopup();
              }
            };
          }

          // Cancel button
          const cancelBtn = document.getElementById(
            `wp-cancel-${waypointIndex}`
          );
          if (cancelBtn) {
            cancelBtn.onclick = (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              isEditMode = false;
              marker.setPopupContent(createPopupContent(false));
              marker.openPopup();
            };
          }

          // Delete button (edit mode)
          const deleteBtn = document.getElementById(
            `wp-delete-${waypointIndex}`
          );
          if (deleteBtn) {
            deleteBtn.onclick = (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              if (waypointIndex !== undefined) {
                const pts = getPts();
                pts.splice(waypointIndex, 1);
                setPts(pts);
                drawRoute(pts);
                if (onWaypointDelete) onWaypointDelete(waypointIndex);
              }
              marker.closePopup();
            };
          }
        }, 30);
      };

      return marker;
    },
    [waypointLabels, onWaypointDelete, onCreatePlan]
  );

  const drawRoute = useCallback(
    (pts: LatLng[]) => {
      const L = LRef.current;
      routeLayerRef.current?.clearLayers();
      listenerTrackerRef.current.clear();
      if (!pts.length) return;
      const latlngs = pts.map((p) => [p.lat, p.lng]) as [number, number][];
      // White route line for monochrome theme
      const poly = L.polyline(latlngs, {
        color: "#ffffff",
        weight: 3,
        opacity: 0.8,
        dashArray: "1, 6",
      });
      poly.addTo(routeLayerRef.current);
      latlngs.forEach((ll, i) => {
        const emoji = i === 0 ? "🟢" : i === latlngs.length - 1 ? "🏁" : "📍";
        createCustomMarker(
          ll[0],
          ll[1],
          `Waypoint ${i + 1}`,
          emoji,
          i
        ).addTo(routeLayerRef.current);
      });
    },
    [createCustomMarker]
  );

  const fitToRoute = useCallback(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const pts = getPts();
    if (!pts.length || !map) return;
    const bounds = L.latLngBounds(
      pts.map((p) => [p.lat, p.lng]) as [number, number][]
    );
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
    } catch { }
    // fix size after transition
    setTimeout(scheduleInvalidate, 120);
  }, [scheduleInvalidate]);

  return (
    <div
      ref={holderRef}
      style={{
        width: "100%",
        height: height,
        minHeight: height,
        maxHeight: height,
        position: "relative",
        overflow: "hidden",
        background: "#000", // Ensure black background
      }}
    >
      <div
        ref={mapElRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />

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
        <button
          onClick={toggleFullscreen}
          title="Fullscreen (F)"
          style={btnStyle}
        >
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

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetailModal
          osmId={selectedPlace.osmId}
          placeName={selectedPlace.placeName}
          category={selectedPlace.category}
          lat={selectedPlace.lat}
          lng={selectedPlace.lng}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      <style jsx global>{`
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: #000 !important;
          color: #fff !important;
          border: 1px solid #333 !important;
        }
        .leaflet-container {
          background: #000 !important;
        }
      `}</style>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(0,0,0,.6)",
  color: "white",
  fontSize: 13,
  fontWeight: 500,
  backdropFilter: "blur(4px)",
  whiteSpace: "nowrap",
  cursor: "pointer",
};
