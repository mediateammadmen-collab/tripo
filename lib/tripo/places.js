// Turning the things Tripo talks about (places, hotels, itinerary stops) into map look-ups.

// What to search for: the name plus a little context (country or city) so the right one is found.
export function placeQuery(kind, d, dest) {
  d = d || {};
  if (kind === "hotel") return { name: d.name || "", context: d.city || dest || "", kind: "hotel" };
  if (kind === "stop") return { name: d.name || "", context: d.context || dest || "", kind: "stop" };
  return { name: d.name || "", context: [d.city, d.country].filter(Boolean).join(", ") || dest || "", kind: "place" };
}

export function placeKey(q) {
  return (String(q.name || "").trim() + "|" + String(q.context || "").trim()).toLowerCase();
}

export function keyFor(kind, d, dest) {
  return placeKey(placeQuery(kind, d, dest));
}

// Everything on the map for a conversation, in the order Tripo mentioned it.
// Returns [{ key, query, kind, name, sub, data, day, block }]  (block = the answer it came from)
export function pointsFromBlocks(blocks) {
  const out = [];
  const seen = new Set();
  const add = (kind, d, dest, extra) => {
    if (!d || !d.name) return;
    const query = placeQuery(kind, d, dest);
    const key = placeKey(query);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, query, kind, name: d.name, data: d, block: cur, ...extra });
  };
  let cur = 0; // which answer a point came from: goes up with each traveler message
  (blocks || []).forEach((b) => {
    if (b.t === "msg" && b.role === "user") cur++;
    if (b.t === "places") (b.places || []).slice(0, 8).forEach((p) => add("place", p, "", { sub: [p.city, p.country].filter(Boolean).join(", ") }));
    else if (b.t === "hotel" && b.h) (b.h.options || []).slice(0, 8).forEach((o) => add("hotel", { ...o, city: b.h.city || "" }, b.h.city, { sub: [o.type, o.area].filter(Boolean).join(" · ") }));
    else if (b.t === "itin")
      (b.items || []).forEach((d, i) =>
        (Array.isArray(d.places) ? d.places : []).slice(0, 5).forEach((name) => {
          if (typeof name === "string" && name.trim()) add("stop", { name: name.trim(), context: b.dest || "" }, b.dest, { day: d.day || i + 1, sub: d.title || "" });
        })
      );
  });
  return out;
}

// The map points for a trip: its stops, hotels and places (flights have no single location).
export function pointsFromTrip(trip) {
  const out = [];
  const seen = new Set();
  (trip.items || []).forEach((it) => {
    if (it.kind === "flight" || !it.data || !it.data.name) return;
    const kind = it.kind === "hotel" ? "hotel" : it.kind === "stop" ? "stop" : "place";
    const query = placeQuery(kind, it.data, trip.dest);
    const key = placeKey(query);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, query, kind, name: it.data.name, data: it.data, day: it.day || null, sub: it.data.country || it.data.city || "" });
  });
  return out;
}

export function googleMapsUrl(info, name) {
  if (info && info.lat != null) return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name) + "&center=" + info.lat + "," + info.lng;
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name);
}
