// Server-side place look-up using free, open services:
//   Wikipedia  → location, photo and a short description for well-known places
//   Photon     → location for everything else (hotels, restaurants, small sights), from OpenStreetMap
// Results are cached (memory + the place_cache table) so each place is looked up once.

import { getAdmin } from "@/lib/supabase/admin";

const UA = `Tripo/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || "travel planner"}; ${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact via site"})`;
const TIMEOUT = 8000;
const memory = new Map();

const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ঀ-৿ ]+/g, " ").replace(/\s+/g, " ").trim();
export const cacheKey = (q) => (norm(q.name) + "|" + norm(q.context) + "|" + (q.kind === "hotel" ? "h" : "p")).slice(0, 200);

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

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
    photo: page.thumbnail ? page.thumbnail.source : "",
    desc: (page.extract || "").replace(/\s*\(\s*[^)]*(?:listen|pronounced|romanized)[^)]*\)/gi, "").trim().slice(0, 420),
    short: page.description || "",
    url: "https://en.wikipedia.org/?curid=" + page.pageid,
  };
}

async function fromPhoton(q) {
  const search = [q.name, q.context].filter(Boolean).join(", ");
  const data = await getJSON("https://photon.komoot.io/api/?limit=3&lang=en&q=" + encodeURIComponent(search));
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
    osmType: [p.osm_key, p.osm_value].filter(Boolean).join("="),
  };
}

async function lookup(q) {
  let wiki = null, osm = null;
  // Hotels are rarely on Wikipedia and a near-miss there is misleading, so they go straight to the map data.
  if (q.kind !== "hotel") {
    try { wiki = await fromWikipedia(q); } catch {}
  }
  if (!wiki || wiki.lat == null) {
    try { osm = await fromPhoton(q); } catch {}
  }
  const lat = wiki && wiki.lat != null ? wiki.lat : osm ? osm.lat : null;
  const lng = wiki && wiki.lng != null ? wiki.lng : osm ? osm.lng : null;
  if (lat == null && !(wiki && wiki.photo)) return { ok: false };
  return {
    ok: true,
    lat,
    lng,
    title: (wiki && wiki.title) || q.name,
    photo: (wiki && wiki.photo) || "",
    desc: (wiki && wiki.desc) || "",
    short: (wiki && wiki.short) || "",
    url: (wiki && wiki.url) || "",
    area: (osm && osm.area) || "",
  };
}

export async function resolvePlace(q) {
  if (!q || !q.name) return { ok: false };
  const key = cacheKey(q);
  if (memory.has(key)) return memory.get(key);

  const admin = getAdmin();
  if (admin) {
    try {
      const { data } = await admin.from("place_cache").select("data").eq("key", key).maybeSingle();
      if (data && data.data) {
        memory.set(key, data.data);
        return data.data;
      }
    } catch {}
  }

  const result = await lookup(q);
  memory.set(key, result);
  if (memory.size > 3000) memory.delete(memory.keys().next().value);
  if (admin) {
    admin.from("place_cache").upsert({ key, data: result, updated_at: new Date().toISOString() }).then(() => {}, () => {});
  }
  return result;
}

// Looks up several places, a few at a time to stay polite to the free services.
export async function resolvePlaces(list) {
  const out = new Array(list.length);
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const i = next++;
      try { out[i] = await resolvePlace(list[i]); } catch { out[i] = { ok: false }; }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return out;
}
