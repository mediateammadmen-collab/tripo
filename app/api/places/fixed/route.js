// GET /api/places/fixed  ->  { places: { [placeKey]: { ok, photo, photoSource } } }
// Photos for the app's built-in trip ideas, all at once (see lib/server/fixed-photos.js).

import { fixedPhotos } from "@/lib/server/fixed-photos";

export const dynamic = "force-dynamic";

export async function GET() {
  const places = await fixedPhotos();
  const good = Object.keys(places).length > 0;
  return Response.json({ places }, { headers: { "Cache-Control": good ? "public, s-maxage=86400, stale-while-revalidate=604800" : "no-store" } });
}
