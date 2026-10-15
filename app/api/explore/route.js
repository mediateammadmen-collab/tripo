// GET /api/explore?q=Dhaka            (or ?lat=…&lng=…)
// A city guide: things to do, places to eat and places to stay, picked by the AI and then located on
// the map (with photos where Wikipedia has them), plus the current weather.
// -> { city: {name, country, lat, lng}, weather: {temp, code}|null, sights: [], food: [], stays: [] }
// Each city's picks are made once and cached for a week; locations come from the shared place cache.

import { getAdmin } from "@/lib/supabase/admin";
import { rateLimited } from "@/lib/server/ratelimit";
import { resolvePlaces } from "@/lib/server/places";
import { generateJSON, parseJSON } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

const UA = `Tripo/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || "travel planner"}; ${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact via site"})`;
const TTL = 1000 * 60 * 60 * 24 * 7;
const memory = new Map();
const building = new Map(); // city key -> promise, so two visitors don't build the same guide twice

async function getJSON(url, timeout = 8000) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(timeout), cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

const cities = new Map(); // city name -> location, remembered while the server runs

async function findCityPhoton(q) {
  const data = await getJSON("https://photon.komoot.io/api/?limit=5&lang=en&q=" + encodeURIComponent(q));
  const feats = (data.features || []).filter((f) => f.geometry);
  const f = feats.find((x) => ["city", "town", "village", "municipality", "island", "county", "state", "region"].includes(x.properties.osm_value) || x.properties.type === "city") || feats[0];
  if (!f) return null;
  const p = f.properties;
  return { name: p.name || q, country: p.country || "", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
}

async function findCityNominatim(q) {
  const data = await getJSON("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&addressdetails=1&q=" + encodeURIComponent(q));
  const r = Array.isArray(data) && data[0];
  if (!r) return null;
  const a = r.address || {};
  return { name: a.city || a.town || a.village || a.state || r.name || q, country: a.country || "", lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
}

// Finds a city by asking Photon and Nominatim at the same time; the first good answer wins
// (either can be slow at times). Results are remembered.
async function findCity(q) {
  const k = q.trim().toLowerCase();
  if (cities.has(k)) return cities.get(k);
  const ok = (fn) => fn(q).then((c) => c || Promise.reject(new Error("none")));
  let city = null;
  try {
    city = await Promise.any([ok(findCityPhoton), ok(findCityNominatim)]);
  } catch {
    try { city = await findCityPhoton(q); } catch {}
  }
  if (city) cities.set(k, city);
  return city;
}

async function nameOf(lat, lng) {
  const data = await getJSON(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`);
  const p = (data.features && data.features[0] && data.features[0].properties) || {};
  const name = p.city || p.county || p.state || p.name;
  return name ? { name, country: p.country || "" } : null;
}

async function weather(lat, lng) {
  try {
    const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`, 6000);
    return w.current ? { temp: Math.round(w.current.temperature_2m), code: w.current.weather_code } : null;
  } catch {
    return null;
  }
}

async function askAI(prompt) {
  return parseJSON(await generateJSON({ messages: [{ role: "user", content: prompt }], temperature: 0.4, timeoutMs: 25000 }));
}

const s = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

async function buildGuide(city) {
  const where = city.name + (city.country ? ", " + city.country : "");
  const data = await askAI(
    `You are a local travel expert. List the best-known places for a visitor to ${where}.\n` +
      "Reply with ONE JSON object only:\n" +
      '{"sights": [{"name","type","why"}], "food": [{"name","type","area","budget","why"}], "stays": [{"name","type","area","budget","why"}]}\n' +
      "- sights: 10 top attractions (landmarks, museums, parks, markets, viewpoints). type like \"Fort\", \"Museum\", \"Park\".\n" +
      "- food: 8 well-known restaurants or cafes that locals would recognise, across budgets. type is the cuisine.\n" +
      "- stays: 8 well-known hotels, resorts or guesthouses across budgets. type like \"5★ hotel\", \"Guesthouse\".\n" +
      "- name: the usual English name exactly as a map search would find it. area: neighbourhood. budget: \"$\", \"$$\" or \"$$$\". why: max 10 words.\n" +
      "Only include real places you are confident exist in or very near this city. Give fewer items rather than guessing. Never invent prices or ratings."
  );
  const lists = {
    sights: (Array.isArray(data.sights) ? data.sights : []).filter((x) => x && x.name).slice(0, 10).map((x) => ({ name: s(x.name, 80), type: s(x.type, 30), why: s(x.why, 90) })),
    food: (Array.isArray(data.food) ? data.food : []).filter((x) => x && x.name).slice(0, 8).map((x) => ({ name: s(x.name, 80), type: s(x.type, 30), area: s(x.area, 40), budget: s(x.budget, 4), why: s(x.why, 90) })),
    stays: (Array.isArray(data.stays) ? data.stays : []).filter((x) => x && x.name).slice(0, 8).map((x) => ({ name: s(x.name, 80), type: s(x.type, 30), area: s(x.area, 40), budget: s(x.budget, 4), why: s(x.why, 90) })),
  };
  return lists;
}

// Places each guide item on the map. Lookups already cached are instant; anything slower than the
// time budget is sent back as "pending" and the browser finishes it in the background.
async function locate(lists, city, budgetMs) {
  const flat = [
    ...lists.sights.map((x) => ({ name: x.name, context: city.name, kind: "place" })),
    ...lists.food.map((x) => ({ name: x.name, context: city.name, kind: "hotel" })),
    ...lists.stays.map((x) => ({ name: x.name, context: city.name, kind: "hotel" })),
  ];
  // Six look-ups at a time (polite to the free services); whatever isn't done by the deadline stays null.
  const found = new Array(flat.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < flat.length) {
      const i = next++;
      try { found[i] = (await resolvePlaces([flat[i]], { fast: true }))[0]; } catch { found[i] = { ok: false }; }
    }
  };
  const all = Promise.all(Array.from({ length: 6 }, worker));
  await Promise.race([all, new Promise((r) => setTimeout(r, budgetMs))]);
  // Drop map matches that landed far outside the city (a different place with the same name).
  const near = (i) => i && i.ok && i.lat != null && Math.hypot((i.lat - city.lat) * 111, (i.lng - city.lng) * 111 * Math.cos((city.lat * Math.PI) / 180)) < 80;
  let k = 0;
  const attach = (x) => {
    const i = found[k++];
    if (i === null || (!i.ok && i.photoPending)) return { ...x, pending: true };
    // Located, but its photo is still being found: the pin shows now and the browser fetches the photo.
    if (i.photoPending) return near(i) ? { ...x, lat: i.lat, lng: i.lng, photoPending: true, desc: i.desc || "", url: i.url || "" } : { ...x, pending: true };
    const pic = i && i.ok ? { photo: i.photo || "", photoArea: i.photoArea || "", photoNear: !!i.photoNear } : { photo: "" };
    return near(i) ? { ...x, lat: i.lat, lng: i.lng, ...pic, desc: i.desc || "", url: i.url || "" } : { ...x, ...(i && i.ok && i.lat == null ? pic : { photo: "" }) };
  };
  return { sights: lists.sights.map(attach), food: lists.food.map(attach), stays: lists.stays.map(attach) };
}

// A city's saved picks (memory first, then the database), or null.
async function cachedGuide(key) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.guide;
  const admin = getAdmin();
  if (!admin) return null;
  try {
    const { data } = await admin.from("place_cache").select("data,updated_at").eq("key", key).maybeSingle();
    if (data && Date.now() - new Date(data.updated_at).getTime() < TTL) {
      memory.set(key, { at: Date.now(), guide: data.data });
      return data.data;
    }
  } catch {}
  return null;
}

// Starts (or joins) building a city's picks; saves them when done.
function startGuide(key, city) {
  if (!building.has(key)) {
    building.set(
      key,
      buildGuide(city)
        .then((g) => {
          if (g.sights.length || g.food.length || g.stays.length) {
            memory.set(key, { at: Date.now(), guide: g });
            const admin = getAdmin();
            if (admin) admin.from("place_cache").upsert({ key, data: g, updated_at: new Date().toISOString() }).then(() => {}, () => {});
          }
          return g;
        })
        .finally(() => building.delete(key))
    );
  }
  return building.get(key);
}

export async function GET(req) {
  if (rateLimited("explore", req, 12)) return Response.json({ error: "rate_limited" }, { status: 429 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const qlat = parseFloat(url.searchParams.get("lat"));
  const qlng = parseFloat(url.searchParams.get("lng"));
  const hasPoint = Number.isFinite(qlat) && Number.isFinite(qlng) && Math.abs(qlat) <= 90 && Math.abs(qlng) <= 180;
  if (!q && !hasPoint) return Response.json({ error: "missing_place" }, { status: 400 });

  // A typed city: if its picks aren't saved yet, the AI starts on them while we look the city up.
  const qKey = q ? "guide2|q|" + q.toLowerCase().slice(0, 120) : "";
  let guide = q ? await cachedGuide(qKey) : null;
  const pending = q && !guide ? startGuide(qKey, { name: q, country: "" }).catch(() => null) : null;

  let city;
  try {
    if (hasPoint) {
      const n = await nameOf(qlat, qlng);
      city = n ? { ...n, lat: qlat, lng: qlng } : null;
    } else city = await findCity(q);
  } catch {
    return Response.json({ error: "lookup_failed" }, { status: 502 });
  }
  if (!city) return Response.json({ error: "not_found" }, { status: 404 });

  const wPromise = weather(city.lat, city.lng);
  if (!guide && pending) guide = await pending;
  if (!guide && !q) {
    const key = "guide2|" + (city.name + "|" + city.country).toLowerCase().slice(0, 150);
    guide = (await cachedGuide(key)) || (await startGuide(key, city).catch(() => null));
  }
  if (!guide) return Response.json({ city, weather: await wPromise, sights: [], food: [], stays: [], unavailable: true });

  const located = await locate(guide, city, 4000);
  return Response.json({ city, weather: await wPromise, ...located });
}
