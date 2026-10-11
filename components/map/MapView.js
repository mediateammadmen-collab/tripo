"use client";

// The live map (MapLibre + free OpenStreetMap tiles from OpenFreeMap).
// points: [{ key, lat, lng, name, kind, label }]   lines: [[[lng, lat], …], …]

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const HOME = { center: [90.4, 23.7], zoom: 5.4 }; // Bangladesh
const ICON = {
  place: '<path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  hotel: '<path d="M2 20V8"/><path d="M2 12h20v8"/><path d="M22 16H2"/><path d="M6 12V9h5a3 3 0 013 3"/>',
  food: '<path d="M7 2v8a2 2 0 002 2v10M5 2v6M9 2v6M17 2c-1.7 1-3 3.5-3 6s1 3 3 3v11"/>',
};

function pinElement(p, showName) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tp-pin";
  el.setAttribute("aria-label", p.name);
  const inner = p.label != null && p.label !== ""
    ? '<span class="tp-pin-n">' + String(p.label).replace(/[<>&]/g, "") + "</span>"
    : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (ICON[p.kind] || ICON.place) + "</svg>";
  el.innerHTML = '<span class="tp-pin-dot">' + inner + "</span>";
  if (showName) {
    const name = document.createElement("span");
    name.className = "tp-pin-name";
    name.textContent = p.name;
    el.appendChild(name);
  }
  return el;
}

// fitTo: keys of the points to frame (defaults to all of them), e.g. just the newest suggestions.
export default function MapView({ points = [], lines = [], focusKey = null, onSelect, emptyHint = "", className = "", fitKey = "", fitTo = null }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const libRef = useRef(null);
  const markersRef = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map = null;
    let ro = null;
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled || !boxRef.current) return;
        if (ml.setWorkerUrl) ml.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
        libRef.current = ml;
        map = new ml.Map({ container: boxRef.current, style: STYLE, center: HOME.center, zoom: HOME.zoom, attributionControl: { compact: true }, cooperativeGestures: false });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
        map.on("load", () => {
          if (cancelled) return;
          map.addSource("tp-lines", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({ id: "tp-lines", type: "line", source: "tp-lines", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#0A0A0A", "line-width": 2.5, "line-dasharray": [1, 2], "line-opacity": 0.75 } });
          mapRef.current = map;
          setReady(true);
        });
        map.on("error", () => {});
        ro = new ResizeObserver(() => map && map.resize());
        ro.observe(boxRef.current);
      } catch (e) {
        console.warn("Map failed to load:", e && e.message);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      mapRef.current = null;
      if (map) map.remove();
    };
  }, []);

  // Keep the pins in step with the points.
  const sig = points.map((p) => p.key + ":" + p.lat + "," + p.lng + ":" + (p.label ?? "")).join("|");
  useEffect(() => {
    const map = mapRef.current, ml = libRef.current;
    if (!ready || !map || !ml) return;
    const markers = markersRef.current;
    markers.forEach((m) => m.remove());
    markers.clear();
    const showNames = points.length <= 14;
    points.forEach((p) => {
      const el = pinElement(p, showNames);
      el.addEventListener("click", (e) => { e.stopPropagation(); onSelectRef.current && onSelectRef.current(p.key); });
      markers.set(p.key, new ml.Marker({ element: el, anchor: "top" }).setLngLat([p.lng, p.lat]).addTo(map));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sig]);

  // Fit the view when the set of places changes.
  const framed = fitTo && fitTo.length ? points.filter((p) => fitTo.includes(p.key)) : points;
  const fitSig = fitKey + "#" + framed.map((p) => p.key).join("|");
  useEffect(() => {
    const map = mapRef.current, ml = libRef.current;
    if (!ready || !map || !ml || !framed.length) return;
    if (framed.length === 1) {
      map.easeTo({ center: [framed[0].lng, framed[0].lat], zoom: 11, duration: 700 });
      return;
    }
    const b = new ml.LngLatBounds();
    framed.forEach((p) => b.extend([p.lng, p.lat]));
    map.fitBounds(b, { padding: { top: 70, bottom: 70, left: 60, right: 60 }, maxZoom: 14, duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitSig]);

  // Dotted routes between a day's stops.
  const lineSig = JSON.stringify(lines);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const src = map.getSource("tp-lines");
    if (src) src.setData({ type: "FeatureCollection", features: lines.filter((l) => l.length > 1).map((l) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: l } })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lineSig]);

  // Highlight the selected place…
  useEffect(() => {
    if (!ready) return;
    markersRef.current.forEach((m, key) => m.getElement().classList.toggle("on", key === focusKey));
  }, [ready, focusKey, sig]);

  // …and fly to it when the selection changes (or once its location is known).
  const focusPoint = focusKey ? points.find((x) => x.key === focusKey) : null;
  const focusSig = focusPoint ? focusKey + "@" + focusPoint.lat + "," + focusPoint.lng : "";
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focusPoint) return;
    map.easeTo({ center: [focusPoint.lng, focusPoint.lat], zoom: Math.max(map.getZoom(), 12.5), duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusSig]);

  return (
    <div className={"tp-map " + className}>
      <div ref={boxRef} className="tp-map-canvas" />
      {failed && <div className="tp-map-note">Map unavailable on this device.</div>}
      {!failed && ready && !points.length && emptyHint ? <div className="tp-map-note">{emptyHint}</div> : null}
    </div>
  );
}
