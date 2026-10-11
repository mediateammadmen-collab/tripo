// The shape of a trip and helpers for its day-by-day plan.
//
// trip = {
//   id, name, dest, start, end, travelers, budget,
//   items:     [{ id, key, kind: place|hotel|flight|stop, data, day: null|1.., note }],  (order in the list = order in the day)
//   itinerary: [{ day, title, plan }]      day titles and notes (from Tripo or typed by the traveler)
//   dayCount,  receipts: [{ id, ... }],  createdAt, updatedAt,
//   owner, shareId, shareMode, role       (only for trips stored in an account)
// }

import { uid, clean, nightsBetween, validDateAny, ymd } from "./util";
import { itemKey } from "./items";

const MAX_DAYS = 30;

export function makeTripItem(kind, data, day) {
  const d = clean(data || {});
  return { id: uid("i_"), key: itemKey(kind, d), kind, data: d, day: day || null, note: "" };
}

export function dayCount(trip) {
  let n = 0;
  if (validDateAny(trip.start) && validDateAny(trip.end)) n = nightsBetween(trip.start, trip.end) + 1;
  const planned = Array.isArray(trip.itinerary) ? trip.itinerary.length : 0;
  const used = (trip.items || []).reduce((m, it) => Math.max(m, it.day || 0), 0);
  return Math.min(MAX_DAYS, Math.max(1, n, planned, used, trip.dayCount || 0));
}

export function dayDate(trip, n) {
  if (!validDateAny(trip.start)) return "";
  const d = new Date(trip.start + "T00:00:00");
  d.setDate(d.getDate() + n - 1);
  return ymd(d);
}

// [{ n, date, title, plan, stops: [item] }]
export function daysOf(trip) {
  const plan = Array.isArray(trip.itinerary) ? trip.itinerary : [];
  const out = [];
  for (let n = 1; n <= dayCount(trip); n++) {
    const p = plan[n - 1] || {};
    out.push({ n, date: dayDate(trip, n), title: p.title || "", plan: p.plan || "", stops: (trip.items || []).filter((it) => it.day === n) });
  }
  return out;
}

export function unscheduled(trip) {
  return (trip.items || []).filter((it) => !it.day);
}

export function canEditTrip(trip) {
  return !trip.role || trip.role === "owner" || trip.shareMode === "edit";
}

// Brings older saved data up to the current shape (trips used to point at saved items by id).
export function normalizeData(saved, trips) {
  let changed = false;
  const outTrips = trips.map((t) => {
    if (Array.isArray(t.items)) return t;
    changed = true;
    return { ...t, items: [] };
  });
  const outSaved = saved.map((s) => {
    if (!s.tripId) return s;
    changed = true;
    const t = outTrips.find((x) => x.id === s.tripId);
    if (t && !t.items.some((it) => it.key === s.key)) t.items.push({ id: uid("i_"), key: s.key, kind: s.kind, data: s.data, day: null, note: "" });
    const { tripId, ...rest } = s;
    return rest;
  });
  return { saved: outSaved, trips: outTrips, changed };
}

// Turns a plan from Tripo into trip days, with each day's named places as stops.
export function itineraryToTrip(items, dest) {
  const itinerary = items.map((d, i) => ({ day: i + 1, title: d.title || "", plan: d.plan || "" }));
  const stops = [];
  items.forEach((d, i) => {
    (Array.isArray(d.places) ? d.places : []).slice(0, 6).forEach((name) => {
      if (typeof name === "string" && name.trim()) stops.push(makeTripItem("stop", { name: name.trim(), context: dest || "" }, i + 1));
    });
  });
  return { itinerary, items: stops };
}
