// GET /api/explore?q=Dhaka            (or ?lat=…&lng=…)
// A city guide: things to do, places to eat and places to stay, picked by the AI and then located on
// the map (with photos where Wikipedia has them), plus the current weather.
// -> { city: {name, country, lat, lng}, weather: {temp, code}|null, sights: [], food: [], stays: [] }
// Each city is built once and cached for a week.

import { getAdmin } from "@/lib/supabase/admin";
import { rateLimited } from "@/lib/server/ratelimit";
import { resolvePlaces } from "@/lib/server/places";

export const dynamic = "force-dynamic";

const UA = `Tripo/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || "travel planner"}; ${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact via site"})`;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest";
const TTL = 1000 * 60 * 60 * 24 * 7;
const memory = new Map();
const building = new Map(); // city key -> promise, so two visitors don't build the same guide twice

async function getJSON(url, timeout = 8000) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(timeout), cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function findCity(q) {
  const data = await getJSON("https://photon.komoot.io/api/?limit=5&lang=en&q=" + encodeURIComponent(q));
  const feats = (data.features || []).filter((f) => f.geometry);
  const f = feats.find((x) => ["city", "town", "village", "municipality", "island", "county", "state", "region"].includes(x.properties.osm_value) || x.properties.type === "city") || feats[0];
  if (!f) return null;
  const p = f.properties;
  return { name: p.name || q, country: p.country || "", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
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

async function askGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("ai_not_configured");
  const payload = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.4 } });
  for (const model of MODEL === FALLBACK_MODEL ? [MODEL] : [MODEL, FALLBACK_MODEL]) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) continue;
      const out = await res.json();
      const text = (out?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
      const a = text.indexOf("{"), b = text.lastIndexOf("}");
      return JSON.parse(a >= 0 && b > a ? text.slice(a, b + 1) : text);
    } catch {}
  }
  throw new Error("ai_unavailable");
}

const s = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

async function buildGuide(city) {
  const where = city.name + (city.country ? ", " + city.country : "");
  const data = await askGemini(
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
  // Find each one on the map. Sights may have a Wikipedia photo; restaurants and hotels come from map data.
  const flat = [
    ...lists.sights.map((x) => ({ name: x.name, context: city.name, kind: "place" })),
    ...lists.food.map((x) => ({ name: x.name, context: city.name, kind: "hotel" })),
    ...lists.stays.map((x) => ({ name: x.name, context: city.name, kind: "hotel" })),
  ];
  const found = await resolvePlaces(flat);
  // Drop map matches that landed far outside the city (a different place with the same name).
  const near = (i) => i && i.ok && i.lat != null && Math.hypot((i.lat - city.lat) * 111, (i.lng - city.lng) * 111 * Math.cos((city.lat * Math.PI) / 180)) < 80;
  let k = 0;
  const attach = (x) => {
    const i = found[k++];
    return near(i) ? { ...x, lat: i.lat, lng: i.lng, photo: i.photo || "", desc: i.desc || "", url: i.url || "" } : { ...x, photo: i && i.ok && i.lat == null ? i.photo || "" : "" };
  };
  return { sights: lists.sights.map(attach), food: lists.food.map(attach), stays: lists.stays.map(attach) };
}

export async function GET(req) {
  if (rateLimited("explore", req, 12)) return Response.json({ error: "rate_limited" }, { status: 429 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const qlat = parseFloat(url.searchParams.get("lat"));
  const qlng = parseFloat(url.searchParams.get("lng"));
  const hasPoint = Number.isFinite(qlat) && Number.isFinite(qlng) && Math.abs(qlat) <= 90 && Math.abs(qlng) <= 180;
  if (!q && !hasPoint) return Response.json({ error: "missing_place" }, { status: 400 });

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

  const key = "guide|" + (city.name + "|" + city.country).toLowerCase().slice(0, 150);
  let guide = null;
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < TTL) guide = hit.guide;
  const admin = getAdmin();
  if (!guide && admin) {
    try {
      const { data } = await admin.from("place_cache").select("data,updated_at").eq("key", key).maybeSingle();
      if (data && Date.now() - new Date(data.updated_at).getTime() < TTL) {
        guide = data.data;
        memory.set(key, { at: Date.now(), guide });
      }
    } catch {}
  }

  const wPromise = weather(city.lat, city.lng);
  if (!guide) {
    if (!building.has(key)) {
      building.set(
        key,
        buildGuide(city)
          .then((g) => {
            if (g.sights.length || g.food.length || g.stays.length) {
              memory.set(key, { at: Date.now(), guide: g });
              if (admin) admin.from("place_cache").upsert({ key, data: g, updated_at: new Date().toISOString() }).then(() => {}, () => {});
            }
            return g;
          })
          .finally(() => building.delete(key))
      );
    }
    try {
      guide = await building.get(key);
    } catch {
      return Response.json({ city, weather: await wPromise, sights: [], food: [], stays: [], unavailable: true });
    }
  }
  return Response.json({ city, weather: await wPromise, ...guide });
}
