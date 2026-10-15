// POST /api/places  { places: [{ name, context, kind }], fast? }  ->  { places: [{ ok, lat, lng, photo, desc, title, url }] }
// Finds where places are (and a photo and description when available) for the map.

import { resolvePlaces } from "@/lib/server/places";

export const dynamic = "force-dynamic";

const MAX = 12;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  const list = (Array.isArray(body && body.places) ? body.places : [])
    .slice(0, MAX)
    .map((p) => ({
      name: String((p && p.name) || "").slice(0, 120).trim(),
      context: String((p && p.context) || "").slice(0, 80).trim(),
      kind: p && p.kind === "hotel" ? "hotel" : "place",
    }));
  if (!list.length) return Response.json({ places: [] });
  // fast: return as soon as each place is located; ones still waiting for a photo say photoPending.
  const places = await resolvePlaces(list, { fast: !!(body && body.fast) });
  return Response.json({ places });
}
