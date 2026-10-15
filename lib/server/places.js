// Server-side place look-up using free, open services:
//   Wikipedia  → location, photo and a short description for well-known places
//   Photon     → location for everything else (hotels, restaurants, small sights), from OpenStreetMap
// Results are cached (memory + the place_cache table) so each place is looked up once.

import { getAdmin } from "@/lib/supabase/admin";
import { findPhoto, notPhoto } from "./photos";
import { getJSON } from "./http";

const memory = new Map();

const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ঀ-৿ ]+/g, " ").replace(/\s+/g, " ").trim();
export const cacheKey = (q) => ("v6|" + norm(q.name) + "|" + norm(q.context) + "|" + (q.kind === "hotel" ? "h" : "p")).slice(0, 200);

// Does a Wikipedia page title plausibly describe the place we asked for?
function titleMatches(title, name) {
  const a = norm(title).replace(/\(.*?\)/g, "").trim();
  const b = norm(name);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const ta = new Set(a.split(" ").filter((w) => w.length > 2));
  const tb = b.split(" ").filter((w) => w.length > 2);
  if (!tb.length) return false;
  const hit = tb.filter((w) => ta.has(w)).length;
  return hit / tb.length >= 0.6;
}

async function fromWikipedia(q) {
  const search = [q.name, q.context].filter(Boolean).join(" ");
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=4&redirects=1" +
    "&prop=coordinates%7Cpageimages%7Cextracts%7Cdescription&piprop=thumbnail&pithumbsize=640&exintro=1&explaintext=1&exsentences=2&gsrsearch=" +
    encodeURIComponent(search);
  const data = await getJSON(url);
  const pages = Object.values((data.query && data.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const page = pages.find((p) => titleMatches(p.title, q.name));
  if (!page) return null;
  const c = page.coordinates && page.coordinates[0];
  return {
    title: page.title,
    lat: c ? c.lat : null,
    lng: c ? c.lon : null,
    photo: page.thumbnail && !notPhoto(page.thumbnail.source) ? page.thumbnail.source : "",
    desc: (page.extract || "").replace(/\s*\(\s*[^)]*(?:listen|pronounced|romanized)[^)]*\)/gi, "").trim().slice(0, 420),
    short: page.description || "",
    url: "https://en.wikipedia.org/?curid=" + page.pageid,
  };
}

async function fromPhoton(q) {
  const search = [q.name, q.context].filter(Boolean).join(", ");
  const data = await getJSON("https://photon.komoot.io/api/?limit=3&lang=en&q=" + encodeURIComponent(search), 14000); // Photon is sometimes slow
  const feats = (data.features || []).filter((f) => f.geometry && f.geometry.coordinates);
  if (!feats.length) return null;
  // Prefer a result whose own name resembles what we asked for.
  const f = feats.find((x) => titleMatches(x.properties.name || "", q.name)) || (q.kind === "hotel" ? null : feats[0]);
  if (!f) return null;
  const p = f.properties || {};
  return {
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    area: [p.district || p.locality, p.city, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", "),
    osmKind: [p.osm_key, p.osm_value].filter(Boolean).join("="),
    osmType: p.osm_type || "", // N / W / R — used to look up the place's website and photos
    osmId: p.osm_id || "",
  };
}

// Where the place is (Wikipedia, then OpenStreetMap). Shared by the quick and the full look-up.
const locating = new Map();
function locate(q) {
  const key = cacheKey(q);
  if (!locating.has(key)) {
    locating.set(key, (async () => {
      let wiki = null, osm = null, failed = false;
      // Hotels are rarely on Wikipedia and a near-miss there is misleading, so they go straight to the map data.
      if (q.kind !== "hotel") {
        try { wiki = await fromWikipedia(q); } catch { failed = true; }
      }
      if (!wiki || wiki.lat == null) {
        try { osm = await fromPhoton(q); } catch { failed = true; }
      }
      // A service that was busy or slow shouldn't stop this place from being found next time.
      if (failed) setTimeout(() => locating.delete(key), 60000);
      return { wiki, osm };
    })());
    if (locating.size > 500) locating.delete(locating.keys().next().value);
  }
  return locating.get(key);
}

function result(q, { wiki, osm }, pic) {
  const lat = wiki && wiki.lat != null ? wiki.lat : osm ? osm.lat : null;
  const lng = wiki && wiki.lng != null ? wiki.lng : osm ? osm.lng : null;
  return {
    ok: true,
    lat,
    lng,
    title: (wiki && wiki.title) || q.name,
    photo: pic.photo || "",
    photoAlt: pic.photoAlt || "",
    photoSource: pic.photoSource || "",
    photoArea: pic.photoArea || "",
    photoNear: !!pic.photoNear,
    desc: (wiki && wiki.desc) || "",
    short: (wiki && wiki.short) || "",
    url: (wiki && wiki.url) || "",
    area: (osm && osm.area) || "",
  };
}

async function lookup(q) {
  const loc = await locate(q);
  const { wiki, osm } = loc;
  const lat = wiki && wiki.lat != null ? wiki.lat : osm ? osm.lat : null;
  const lng = wiki && wiki.lng != null ? wiki.lng : osm ? osm.lng : null;
  // Always a real photo: Wikipedia's if it has one, otherwise the best one we can find for this exact place
  // (or, for a place that isn't on the map, at least of its city).
  const pic = wiki && wiki.photo
    ? { photo: wiki.photo, photoSource: "Wikipedia" }
    : await findPhoto({ name: q.name, context: q.context, kind: q.kind, lat, lng, osmType: osm && osm.osmType, osmId: osm && osm.osmId });
  if (lat == null && !pic.photo) return { ok: false };
  return result(q, loc, pic);
}

// Results without a photo are kept only briefly (the map and photo services may just have been busy).
const RETRY_MS = 2 * 60 * 1000;
async function cached(key) {
  if (memory.has(key)) {
    const hit = memory.get(key);
    if (hit.photo || !hit.at || Date.now() - hit.at < RETRY_MS) return hit;
    memory.delete(key);
  }
  const admin = getAdmin();
  if (!admin) return null;
  try {
    const { data } = await admin.from("place_cache").select("data").eq("key", key).maybeSingle();
    if (data && data.data) {
      memory.set(key, data.data);
      return data.data;
    }
  } catch {}
  return null;
}

// The full look-up (location + photo), run once even if several requests ask for it at the same time.
const running = new Map();
function fullLookup(q, key) {
  if (!running.has(key)) {
    running.set(key, lookup(q).then((res) => {
      memory.set(key, res.photo ? res : { ...res, at: Date.now() });
      if (memory.size > 3000) memory.delete(memory.keys().next().value);
      const admin = getAdmin();
      if (admin && res.photo) admin.from("place_cache").upsert({ key, data: res, updated_at: new Date().toISOString() }).then(() => {}, () => {});
      return res;
    }).finally(() => running.delete(key)));
  }
  return running.get(key);
}

// fast: answer as soon as the place is located, so the map pin appears right away. When the photo still has to be
// found, the answer says photoPending and the caller asks again (without fast) for the finished result.
export async function resolvePlace(q, { fast = false } = {}) {
  if (!q || !q.name) return { ok: false };
  const key = cacheKey(q);
  const hit = await cached(key);
  if (hit) return hit;
  if (!fast) return fullLookup(q, key);
  const full = fullLookup(q, key).catch(() => ({ ok: false }));
  const loc = await locate(q);
  const quick = await Promise.race([full, new Promise((r) => setTimeout(() => r(null), 50))]);
  if (quick) return quick;
  const { wiki, osm } = loc;
  const located = (wiki && wiki.lat != null) || !!osm;
  if (wiki && wiki.photo) return result(q, loc, { photo: wiki.photo, photoSource: "Wikipedia" });
  if (!located) return { ok: false, photoPending: true };
  return { ...result(q, loc, {}), photoPending: true };
}

// Looks up several places, a few at a time to stay polite to the free services.
export async function resolvePlaces(list, opts) {
  const out = new Array(list.length);
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const i = next++;
      try { out[i] = await resolvePlace(list[i], opts); } catch { out[i] = { ok: false }; }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return out;
}
