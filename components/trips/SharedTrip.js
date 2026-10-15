"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import MapView from "@/components/map/MapView";
import { LogoMark } from "@/components/shell/AppShell";
import { Toast } from "@/components/shell/Overlays";
import { useTripo } from "@/lib/tripo/store";
import { useLang } from "@/lib/tripo/hooks";
import { L } from "@/lib/tripo/i18n";
import { fmtDate } from "@/lib/tripo/util";
import { itemTitle, itemSub, itemLink, tripDates } from "@/lib/tripo/items";
import { daysOf, unscheduled } from "@/lib/tripo/trips";

function Row({ it }) {
  const link = itemLink(it);
  const d = it.data || {};
  return (
    <div className="stop-row">
      <div className="stop-thumb">
        {it.kind === "flight" ? <div className="sv-thumb fl"><Icon name="plane" size={22} /></div> : <Photo className="sv-thumb" q={{ name: d.name || "", context: it.kind === "hotel" ? d.city || "" : d.country || d.context || "", kind: it.kind === "hotel" ? "hotel" : "place" }} caption={false} />}
      </div>
      <div className="sv-main">
        <div className="sv-title">{itemTitle(it)}</div>
        <div className="sv-sub">{itemSub(it)}</div>
        {it.note ? <div className="stop-note ro">{it.note}</div> : null}
        {link ? <div className="sv-actions"><a className="sv-chip" target="_blank" rel="noopener" href={link}>{it.kind === "flight" ? "Trip.com " : "Booking.com "}<Icon name="ext" size={13} sw={2.2} /></a></div> : null}
      </div>
    </div>
  );
}

// The public page for a shared trip.
export default function SharedTrip({ trip, mode, shareId, pins }) {
  useLang();
  const router = useRouter();
  const user = useTripo((s) => s.user);
  const authReady = useTripo((s) => s.authReady);
  const mine = useTripo((s) => s.trips.some((t) => t.id === trip.id));
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(null);
  const days = daysOf(trip);
  const loose = unscheduled(trip);
  const flights = loose.filter((it) => it.kind === "flight");
  const hotels = loose.filter((it) => it.kind === "hotel");
  const ideas = loose.filter((it) => it.kind !== "flight" && it.kind !== "hotel");
  const chips = [trip.dest, tripDates(trip), (trip.travelers || 1) + L(trip.travelers > 1 ? " travelers" : " traveler", " জন"), trip.budget].filter(Boolean);
  const byDay = {};
  pins.forEach((p) => { if (p.label) (byDay[p.label] = byDay[p.label] || []).push([p.lng, p.lat]); });

  const open = () => { useTripo.getState().showTrips("trips", trip.id); router.push("/trips"); };
  const join = async () => {
    setBusy(true);
    try {
      await useTripo.getState().joinTrip(shareId);
      open();
    } catch {
      useTripo.getState().showToast(L("Couldn't join this trip. Ask the owner to check the link.", "ট্রিপে যোগ দেওয়া যায়নি। মালিককে লিংকটি দেখতে বলুন।"));
      setBusy(false);
    }
  };

  return (
    <main className="shared">
      <header className="legal-top">
        <Link href="/" className="legal-brand"><LogoMark size={14} />Tripo</Link>
        <Link href="/" className="legal-back">{L("Plan your own trip →", "নিজের ট্রিপ প্ল্যান করুন →")}</Link>
      </header>

      <div className="shared-body">
        <div className="trip-card" style={{ cursor: "default" }}>
          <div className="trip-banner tall">
            <Photo q={{ name: trip.dest || trip.name, context: "", kind: "place" }} icon="suitcase" />
            <div className="ov">
              <h1 className="place-name" style={{ fontSize: 22, margin: 0 }}>{trip.name}</h1>
              <div className="trip-chips">{chips.map((c) => <span key={c}>{c}</span>)}</div>
            </div>
          </div>
          <div className="trip-actions">
            {mine ? (
              <button type="button" className="book-cta" style={{ margin: 0, flex: "1 1 100%" }} onClick={open}>{L("Open in my trips →", "আমার ট্রিপে খুলুন →")}</button>
            ) : mode === "edit" ? (
              user ? (
                <button type="button" className="book-cta" id="joinTripBtn" disabled={busy} style={{ margin: 0, flex: "1 1 100%" }} onClick={join}>{busy ? L("Joining…", "যোগ দেওয়া হচ্ছে…") : L("Join this trip and plan together", "ট্রিপে যোগ দিয়ে একসাথে প্ল্যান করুন")}</button>
              ) : (
                <Link className="book-cta" id="joinSignInBtn" style={{ margin: 0, flex: "1 1 100%", opacity: authReady ? 1 : 0.6 }} href={"/login?next=/t/" + shareId}>{L("Sign in to join and plan together", "যোগ দিয়ে একসাথে প্ল্যান করতে সাইন ইন করুন")}</Link>
              )
            ) : (
              <span className="sv-sub" style={{ padding: "2px 4px" }}>{L("Shared with you to view.", "আপনার দেখার জন্য শেয়ার করা।")}</span>
            )}
          </div>
        </div>

        {pins.length > 0 && (
          <div className="trip-map">
            <MapView points={pins} lines={Object.values(byDay)} focusKey={focus} onSelect={setFocus} fitKey={trip.id} />
          </div>
        )}

        <div className="sec-head">🗓 {L("Day-by-day plan", "দিনভিত্তিক প্ল্যান")}</div>
        {days.map((d) => (
          <div className="day-card" key={d.n}>
            <div className="day-head">
              <span className="itin-n">{L("D", "দিন ") + d.n}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="day-title ro">{d.title || L("Day ", "দিন ") + d.n}</div>
                {d.date ? <div className="sv-sub">{fmtDate(d.date)}</div> : null}
              </div>
            </div>
            {d.plan ? <div className="day-plan ro">{d.plan}</div> : null}
            {d.stops.map((it) => <Row key={it.id} it={it} />)}
            {!d.stops.length && !d.plan ? <div className="sv-sub">{L("Nothing planned yet.", "এখনো কিছু প্ল্যান হয়নি।")}</div> : null}
          </div>
        ))}

        {ideas.length > 0 && <><div className="sec-head">📍 {L("Ideas", "আইডিয়া")}</div>{ideas.map((it) => <Row key={it.id} it={it} />)}</>}
        {flights.length > 0 && <><div className="sec-head">✈️ {L("Flights", "ফ্লাইট")}</div>{flights.map((it) => <Row key={it.id} it={it} />)}</>}
        {hotels.length > 0 && <><div className="sec-head">🏨 {L("Hotels", "হোটেল")}</div>{hotels.map((it) => <Row key={it.id} it={it} />)}</>}

        <div className="ex-note" style={{ marginTop: 18 }}>{L("Made with Tripo, an AI travel agent. Suggestions can be wrong — check details before you book.", "Tripo (AI ট্রাভেল এজেন্ট) দিয়ে তৈরি। সাজেশন ভুল হতে পারে — বুকিংয়ের আগে মিলিয়ে নিন।")}</div>
      </div>
      <Toast />
    </main>
  );
}
