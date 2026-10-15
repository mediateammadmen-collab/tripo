// Real photos for the app's built-in places (trip ideas, welcome ideas, idea cards), fetched in a couple of
// batched requests instead of one look-up per card. They are the same for everyone, so they are cached for a day.

import { INSPIRATION, WELCOME_IDEAS, CARD_PHOTOS } from "@/lib/tripo/content";
import { placeKey } from "@/lib/tripo/places";
import { getJSON } from "./http";
import { notPhoto } from "./photos";

const DAY = 24 * 60 * 60 * 1000;
let saved = null; // { at, photos }

function fixedPlaces() {
  const list = [
    ...INSPIRATION.map((x) => ({ name: x.place, context: x.country })),
    ...WELCOME_IDEAS.map((x) => ({ name: x.name, context: x.country || "" })),
    ...Object.values(CARD_PHOTOS).map(([name, context]) => ({ name, context })),
  ];
  const seen = new Set();
  return list.filter((p) => {
    const k = placeKey(p);
    if (!p.name || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// One request for up to 50 titles -> { title asked for: photo url }
async function pageImages(site, titles, size) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const d = await getJSON(`https://${site}/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=${size}&titles=` + encodeURIComponent(batch.join("|")), 12000);
    const q = d.query || {};
    const alias = {};
    (q.normalized || []).concat(q.redirects || []).forEach((r) => (alias[r.from] = r.to));
    const resolve = (t) => { let x = t; for (let n = 0; n < 3 && alias[x]; n++) x = alias[x]; return x; };
    const byTitle = {};
    Object.values(q.pages || {}).forEach((p) => (byTitle[p.title] = p));
    batch.forEach((t) => {
      const p = byTitle[resolve(t)];
      const src = p && p.thumbnail && p.thumbnail.source;
      if (src && /^https:/.test(src) && !notPhoto(src)) out[t] = src;
    });
  }
  return out;
}

// -> { [placeKey]: { ok, photo, photoSource } }
export async function fixedPhotos() {
  if (saved && Date.now() - saved.at < DAY) return saved.photos;
  const places = fixedPlaces();
  const titles = [...new Set(places.map((p) => p.name))];
  let wiki = {}, voyage = {};
  try { wiki = await pageImages("en.wikipedia.org", titles, 960); } catch {}
  const missing = titles.filter((t) => !wiki[t]);
  if (missing.length) {
    try { voyage = await pageImages("en.wikivoyage.org", missing, 960); } catch {}
  }
  const photos = {};
  places.forEach((p) => {
    const photo = wiki[p.name] || voyage[p.name];
    if (photo) photos[placeKey(p)] = { ok: true, photo, photoSource: wiki[p.name] ? "Wikipedia" : "Wikivoyage" };
  });
  // Only remember a good answer; if the services were busy, the next visitor tries again.
  if (Object.keys(photos).length >= places.length / 2) saved = { at: Date.now(), photos };
  return photos;
}
