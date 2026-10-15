// Finds a REAL photo for a place, hotel or restaurant from free, open sources — never a drawing.
//
// Tried in order until one works:
//   1. the place's Wikipedia photo (passed in by the caller), or for a destination its Wikivoyage photo
//   2. OpenStreetMap's links for the place: its Wikidata photo, a photo it lists, or its official website's
//      share image (og:image) — this is how hotels and restaurants get a picture of themselves
//   3. Wikimedia Commons photos taken right at that spot
//   4. Openverse (openly licensed photos, e.g. from Flickr) whose title matches the name
//   5. a photo of the surrounding city (marked as such, so the app can say "Photo of Dhaka")

import { getJSON } from "./http";

const cityPhotos = new Map();

// Nominatim asks for at most one request per second.
let nominatimChain = Promise.resolve();
function nominatim(url) {
  const run = nominatimChain.then(() => getJSON(url, 8000));
  nominatimChain = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, 1100)));
  return run;
}

const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function nameMatches(text, name) {
  const t = new Set(norm(text).split(" ").filter((w) => w.length > 2));
  const n = norm(name).split(" ").filter((w) => w.length > 2 && !["hotel", "resort", "restaurant", "the", "and", "cafe"].includes(w));
  if (!n.length) return false;
  return n.filter((w) => t.has(w)).length / n.length >= 0.5;
}
// Wikipedia's lead image for a country or region is often a flag, map or emblem — drawings, not photos.
export const notPhoto = (u) => /\.svg|\.gif|flag_of|_map|map_of|locator|location|emblem|seal_of|coat_of_arms|logo/i.test(String(u || ""));
const httpsOnly = (u) => (typeof u === "string" && /^https:\/\//i.test(u) ? u : "");

function commonsFile(file, width = 640) {
  const f = String(file || "").replace(/^File:/i, "").trim();
  return f ? "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(f.replace(/ /g, "_")) + "?width=" + width : "";
}

async function wikidataPhoto(qid) {
  if (!/^Q\d+$/.test(qid || "")) return "";
  const d = await getJSON("https://www.wikidata.org/wiki/Special:EntityData/" + qid + ".json");
  const claim = d.entities && d.entities[qid] && d.entities[qid].claims && d.entities[qid].claims.P18;
  const file = claim && claim[0] && claim[0].mainsnak && claim[0].mainsnak.datavalue && claim[0].mainsnak.datavalue.value;
  return commonsFile(file);
}

async function websitePhoto(site) {
  let url = String(site || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Tripo/1.0)", Accept: "text/html" }, signal: AbortSignal.timeout(6000), redirect: "follow", cache: "no-store" });
  if (!res.ok) return "";
  const html = (await res.text()).slice(0, 400000);
  const m =
    html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
  if (!m) return "";
  try {
    const abs = new URL(m[1].replace(/&amp;/g, "&"), res.url).toString();
    // Skip logos and icons; we want a photo of the place.
    if (/logo|icon|favicon|placeholder|default/i.test(abs) || /\.svg(\?|$)/i.test(abs)) return "";
    // Facebook/Instagram image links expire after a while, which would leave a broken photo behind.
    if (/fbcdn\.net|cdninstagram\.com/i.test(abs)) return "";
    return httpsOnly(abs);
  } catch {
    return "";
  }
}

// What OpenStreetMap knows about the place (website, Wikidata id, image).
async function osmLinks({ osmType, osmId, name, context }) {
  let rows;
  if (osmType && osmId) rows = await nominatim(`https://nominatim.openstreetmap.org/lookup?format=jsonv2&extratags=1&osm_ids=${osmType}${osmId}`);
  else rows = await nominatim(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&extratags=1&q=${encodeURIComponent([name, context].filter(Boolean).join(", "))}`);
  const r = Array.isArray(rows) && rows[0];
  if (!r) return {};
  const x = r.extratags || {};
  return { website: x.website || x["contact:website"] || x.url || "", wikidata: x.wikidata || x["brand:wikidata"] || "", image: x.image || "", wikimedia: x.wikimedia_commons || "" };
}

async function commonsNear(lat, lng) {
  const d = await getJSON(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=geosearch&ggscoord=${lat}%7C${lng}&ggsradius=120&ggslimit=10&ggsnamespace=6&prop=imageinfo&iiprop=url%7Cmime%7Csize&iiurlwidth=640`);
  const pages = Object.values((d.query && d.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const p of pages) {
    const ii = p.imageinfo && p.imageinfo[0];
    if (ii && /image\/(jpeg|png|webp)/.test(ii.mime) && (ii.width || 0) >= 400 && !/map|logo|plan|diagram|flag|coat of arms/i.test(p.title)) return httpsOnly(ii.thumburl || ii.url);
  }
  return "";
}

async function openverse(name, context) {
  const d = await getJSON(`https://api.openverse.org/v1/images/?page_size=6&mature=false&q=${encodeURIComponent([name, context].filter(Boolean).join(" "))}`);
  for (const r of d.results || []) {
    if (nameMatches((r.title || "") + " " + (r.tags || []).map((t) => t.name).join(" "), name)) {
      // The original (often Flickr) loads more reliably than Openverse's thumbnail proxy; keep the other as a backup.
      const main = httpsOnly(r.url) || httpsOnly(r.thumbnail);
      if (main) return { photo: main, photoAlt: main === r.url ? httpsOnly(r.thumbnail) : "" };
    }
  }
  return null;
}

// Wikivoyage (the travel guide sister of Wikipedia) opens each destination with a wide real photo.
// Only destinations have an article there, so this is used for places, never for hotels or restaurants.
async function voyagePhoto(title) {
  const d = await getJSON("https://en.wikivoyage.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=1200&titles=" + encodeURIComponent(title));
  const page = Object.values((d.query && d.query.pages) || {})[0];
  const photo = httpsOnly(page && page.thumbnail && page.thumbnail.source);
  return notPhoto(photo) ? "" : photo;
}

// A real photo of the city (used last, and labelled "Photo of <city>").
// Several places in one city share a single request; a failed request is not remembered, so it is tried again later.
async function pageImage(title) {
  try {
    const d = await getJSON("https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=640&titles=" + encodeURIComponent(title));
    const page = Object.values((d.query && d.query.pages) || {})[0];
    const photo = httpsOnly(page && page.thumbnail && page.thumbnail.source);
    // A country's page image is often its flag or a map — not a photo.
    return notPhoto(photo) ? "" : photo;
  } catch {
    return null; // the service was busy or unreachable: don't remember this
  }
}
export function cityPhoto(city) {
  const key = norm(city);
  if (!key) return Promise.resolve("");
  if (!cityPhotos.has(key)) {
    const run = (async () => {
      // "Dhaka, Bangladesh" -> try the whole name, then "Dhaka".
      const tries = [city, String(city).split(",")[0].trim()].filter((t, i, a) => t && a.indexOf(t) === i);
      let failed = false;
      for (const t of tries) {
        const photo = await pageImage(t);
        if (photo) return photo;
        if (photo === null) failed = true;
      }
      if (failed) cityPhotos.delete(key);
      return "";
    })();
    cityPhotos.set(key, run);
  }
  return cityPhotos.get(key);
}

const attempt = async (fn) => {
  try {
    return (await fn()) || "";
  } catch {
    return "";
  }
};

// q: { name, context, kind, lat, lng, osmType, osmId }  ->  { photo, photoSource, photoArea, photoNear }
export async function findPhoto(q) {
  const isBusiness = q.kind === "hotel";
  // Destinations (a country, region, island, city): the travel guide's own photo.
  if (!isBusiness) {
    const photo = await attempt(() => voyagePhoto(q.name));
    if (photo) return { photo, photoSource: "Wikivoyage", photoArea: "" };
  }
  // Hotels and restaurants: their own photo first (via OpenStreetMap's links).
  if (isBusiness || q.osmId || q.lat == null) {
    const links = await attempt(() => osmLinks(q));
    if (links) {
      for (const [fn, source] of [
        [() => wikidataPhoto(links.wikidata), "Wikimedia Commons"],
        [() => (links.wikimedia ? commonsFile(links.wikimedia) : httpsOnly(links.image)), "Wikimedia Commons"],
        [() => websitePhoto(links.website), "Official website"],
      ]) {
        const photo = await attempt(fn);
        if (photo) return { photo, photoSource: source, photoArea: "" };
      }
    }
  }
  if (q.lat != null) {
    const photo = await attempt(() => commonsNear(q.lat, q.lng));
    // A real photo taken at this spot — it may show the street or view rather than the building itself.
    if (photo) return { photo, photoSource: "Wikimedia Commons", photoArea: "", photoNear: true };
  }
  const ov = await attempt(() => openverse(q.name, q.context));
  if (ov) return { photo: ov.photo, photoAlt: ov.photoAlt, photoSource: "Openverse", photoArea: "" };
  const area = await attempt(() => cityPhoto(q.context));
  if (area) return { photo: area, photoSource: "Wikipedia", photoArea: q.context };
  return { photo: "", photoSource: "", photoArea: "" };
}
