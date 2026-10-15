// Real, large photos for the landing page, from Wikipedia (one request for all of them).
// Fetched on the server and refreshed daily, so the page loads with its photos already in place.

import { LANDING_PLACES } from "@/lib/tripo/landing-places";

export { LANDING_PLACES };

// -> { [key]: { src, page } } for every place that has a real photograph (JPEG/WebP; maps and flags are skipped).
export async function landingPhotos() {
  try {
    const titles = LANDING_PLACES.map((p) => p.title).join("|");
    const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|info&inprop=url&piprop=thumbnail&pithumbsize=1600&titles=" + encodeURIComponent(titles);
    const res = await fetch(url, {
      headers: { "User-Agent": `Tripo/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || "travel planner"})` },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    const q = data.query || {};
    // Map the titles we asked for to the page titles Wikipedia returned (after redirects/normalising).
    const alias = {};
    (q.normalized || []).concat(q.redirects || []).forEach((r) => (alias[r.from] = r.to));
    const resolve = (t) => { let x = t; for (let i = 0; i < 3 && alias[x]; i++) x = alias[x]; return x; };
    const byTitle = {};
    Object.values(q.pages || {}).forEach((p) => (byTitle[p.title] = p));
    const out = {};
    LANDING_PLACES.forEach((pl) => {
      const p = byTitle[resolve(pl.title)];
      const src = p && p.thumbnail && p.thumbnail.source;
      if (src && /\.(jpe?g|webp)(\?|$|\/)/i.test(src.split("?")[0] + "/")) out[pl.key] = { src, page: p.fullurl || "" };
    });
    return out;
  } catch {
    return {};
  }
}
