"use client";

import { useEffect, useMemo } from "react";
import { useTripo } from "./store";

// Looks up the given map points (see lib/tripo/places.js) and returns the ones we could locate,
// ready for <MapView>: pins plus dotted lines joining each day's stops in order.
export function usePins(points) {
  const placeInfo = useTripo((s) => s.placeInfo);
  const resolvePlaces = useTripo((s) => s.resolvePlaces);
  const sig = points.map((p) => p.key).join("|");

  useEffect(() => {
    if (points.length) resolvePlaces(points.map((p) => p.query));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return useMemo(() => {
    const pins = [];
    const byDay = {};
    let pending = 0;
    points.forEach((p) => {
      const i = placeInfo[p.key];
      if (i && i.loading) pending++;
      if (!i || !i.ok || i.lat == null) return;
      pins.push({ key: p.key, lat: i.lat, lng: i.lng, name: p.name, kind: p.kind === "stop" ? "place" : p.kind, label: p.day || "" });
      if (p.day) (byDay[p.day] = byDay[p.day] || []).push([i.lng, i.lat]);
    });
    return { pins, lines: Object.values(byDay), pending };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, placeInfo]);
}
