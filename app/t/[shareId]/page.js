import { notFound } from "next/navigation";
import { getAdmin } from "@/lib/supabase/admin";
import { resolvePlaces } from "@/lib/server/places";
import { pointsFromTrip } from "@/lib/tripo/places";
import SharedTrip from "@/components/trips/SharedTrip";

// A trip someone shared by link. Read-only for everyone; signed-in friends can join when the
// owner has switched on "plan together".

export const dynamic = "force-dynamic";

async function loadTrip(shareId) {
  if (!/^[a-z0-9]{8,48}$/.test(shareId)) return null;
  const admin = getAdmin();
  if (!admin) return null;
  const { data, error } = await admin.from("trips").select("id,data,share_mode").eq("share_id", shareId).in("share_mode", ["view", "edit"]).maybeSingle();
  if (error || !data) return null;
  // Only what a visitor should see: never receipts or account details.
  const d = data.data || {};
  return {
    mode: data.share_mode,
    trip: {
      id: data.id,
      name: String(d.name || "Trip").slice(0, 80),
      dest: String(d.dest || "").slice(0, 80),
      start: d.start || "",
      end: d.end || "",
      travelers: d.travelers || 1,
      budget: d.budget || "",
      dayCount: d.dayCount || 0,
      itinerary: Array.isArray(d.itinerary) ? d.itinerary.slice(0, 30) : [],
      items: (Array.isArray(d.items) ? d.items : []).slice(0, 200).map((it) => ({ id: it.id, key: it.key, kind: it.kind, data: it.data, day: it.day || null, note: it.note || "" })),
    },
  };
}

export async function generateMetadata({ params }) {
  const { shareId } = await params;
  const found = await loadTrip(shareId);
  if (!found) return { title: "Trip not found", robots: { index: false } };
  const t = found.trip;
  return {
    title: t.name,
    description: ["A trip plan made with Tripo", t.dest].filter(Boolean).join(" · "),
    robots: { index: false },
  };
}

export default async function SharedTripPage({ params }) {
  const { shareId } = await params;
  const found = await loadTrip(shareId);
  if (!found) notFound();
  const points = pointsFromTrip(found.trip);
  const info = await resolvePlaces(points.map((p) => p.query));
  const pins = points
    .map((p, i) => (info[i] && info[i].ok && info[i].lat != null ? { key: p.key, lat: info[i].lat, lng: info[i].lng, name: p.name, kind: p.kind === "stop" ? "place" : p.kind, label: p.day || "" } : null))
    .filter(Boolean);
  return <SharedTrip trip={found.trip} mode={found.mode} shareId={shareId} pins={pins} />;
}
