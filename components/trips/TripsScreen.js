"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { Scene } from "@/components/ui/Scene";
import { ItineraryDays } from "@/components/chat/Cards";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useAskTripo, useOpenChat } from "@/lib/tripo/hooks";
import { L } from "@/lib/tripo/i18n";
import { slug } from "@/lib/tripo/util";
import { itemTitle, itemSub, itemLink, tripDates, countLine, tripPrompt } from "@/lib/tripo/items";
import { planDocHTML, downloadHTML } from "@/lib/tripo/plandoc";

function download(filename, html) {
  const toast = useTripo.getState().showToast;
  try {
    downloadHTML(filename, html);
    toast(L("Downloaded ✓", "ডাউনলোড হয়েছে ✓"));
  } catch {
    toast(L("Downloads aren't available here", "এখানে ডাউনলোড চালু নেই"));
  }
}

function ItemThumb({ it }) {
  const d = it.data || {};
  if (it.kind === "flight") return <div className="sv-thumb fl"><Icon name="plane" size={22} /></div>;
  if (it.kind === "hotel") return <Scene className="sv-thumb" scene="hotel" name={d.name} />;
  return <Scene className="sv-thumb" scene={d.scene} name={(d.name || "") + " " + (d.country || "")} />;
}

// One saved place, flight or hotel. `inTrip` = shown inside a trip; `addTo` = offer to add to that trip.
function SavedRow({ it, inTrip, addTo }) {
  const trips = useTripo((s) => s.trips);
  const assignItem = useTripo((s) => s.assignItem);
  const dropItem = useTripo((s) => s.dropItem);
  const openTripPicker = useTripo((s) => s.openTripPicker);
  const showToast = useTripo((s) => s.showToast);
  const ask = useAskTripo();
  const tr = it.tripId ? trips.find((x) => x.id === it.tripId) : null;
  const link = itemLink(it);
  return (
    <div className="sv-row">
      <ItemThumb it={it} />
      <div className="sv-main">
        <div className="sv-title">{itemTitle(it)}</div>
        <div className="sv-sub">{itemSub(it)}</div>
        <div className="sv-actions">
          {addTo ? (
            <button type="button" className="sv-chip y" onClick={() => assignItem(it.id, addTo)}>{L("+ Add to this trip", "+ এই ট্রিপে যোগ")}</button>
          ) : inTrip ? null : (
            <button type="button" className={"sv-chip" + (tr ? "" : " y")} onClick={() => openTripPicker(it.id)}>{tr ? "🧳 " + tr.name : L("+ Add to trip", "+ ট্রিপে যোগ")}</button>
          )}
          {link ? (
            <a className="sv-chip" target="_blank" rel="noopener" href={link}>{it.kind === "flight" ? "Trip.com " : "Booking.com "}<Icon name="ext" size={13} sw={2.2} /></a>
          ) : (
            <button type="button" className="sv-chip" onClick={() => ask(L("Tell me more about ", "সম্পর্কে আরও বলুন: ") + itemTitle(it))}>{L("Ask Tripo", "Tripo-কে জিজ্ঞাসা")}</button>
          )}
        </div>
      </div>
      {inTrip ? (
        <button type="button" className="sv-x" aria-label={L("Remove from trip", "ট্রিপ থেকে সরান")} onClick={() => assignItem(it.id, null)}>×</button>
      ) : (
        <button type="button" className="sv-x" aria-label={L("Delete", "মুছুন")} onClick={() => { dropItem(it.id); showToast(L("Deleted", "মুছে ফেলা হয়েছে")); }}>×</button>
      )}
    </div>
  );
}

function EmptyState({ title, text, btnLabel, onClick }) {
  return (
    <div className="trips-empty">
      <Scene className="trips-empty-art" scene="island" name="empty-state" />
      <b>{title}</b>
      <p>{text}</p>
      {btnLabel && <button type="button" className="book-cta" style={{ width: "auto", display: "inline-flex", padding: "11px 18px" }} onClick={onClick}>{btnLabel}</button>}
    </div>
  );
}

function DownloadBar() {
  const onClick = () => {
    const { trips, saved } = useTripo.getState();
    download("my-plan-tripo.html", planDocHTML(L("My plan", "আমার প্ল্যান"), trips, saved.filter((x) => !x.tripId), saved));
  };
  return (
    <button type="button" className="dl-btn" onClick={onClick}>
      <Icon name="download" size={16} sw={2.2} /> {L("Download my whole plan", "পুরো প্ল্যান ডাউনলোড করুন")}
    </button>
  );
}

function TripList() {
  const trips = useTripo((s) => s.trips);
  const saved = useTripo((s) => s.saved);
  const showTrips = useTripo((s) => s.showTrips);
  const openTripForm = useTripo((s) => s.openTripForm);
  if (!trips.length) {
    return (
      <>
        <EmptyState
          title={L("Plan your first trip", "আপনার প্রথম ট্রিপ")}
          text={L("Tap 🔖 on any place, flight or hotel in the chat to save it, then group them into a trip here.", "চ্যাটে যেকোনো জায়গা, ফ্লাইট বা হোটেলে 🔖 চাপুন, তারপর এখানে ট্রিপে সাজান।")}
          btnLabel={L("Create a trip", "ট্রিপ বানান")}
          onClick={() => openTripForm(null, null)}
        />
        {saved.length > 0 && <DownloadBar />}
      </>
    );
  }
  return (
    <>
      {trips.map((tr) => {
        const items = saved.filter((x) => x.tripId === tr.id);
        return (
          <button key={tr.id} type="button" className="trip-card" onClick={() => showTrips("trips", tr.id)}>
            <div className="trip-banner">
              <Scene className="scene-fill" name={tr.dest || tr.name} />
              <div className="ov">
                <div className="place-name">{tr.name}</div>
                <div className="place-country">{[tr.dest, tripDates(tr)].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            <div className="trip-meta">
              {countLine(items)}
              {tr.itinerary && tr.itinerary.length ? <span>🗓 {tr.itinerary.length + L("-day plan", "-দিনের প্ল্যান")}</span> : null}
            </div>
          </button>
        );
      })}
      <DownloadBar />
    </>
  );
}

function SavedList() {
  const saved = useTripo((s) => s.saved);
  const openChat = useOpenChat();
  const [filter, setFilter] = useState("all");
  const filters = [["all", L("All", "সব")], ["place", L("📍 Places", "📍 জায়গা")], ["flight", L("✈️ Flights", "✈️ ফ্লাইট")], ["hotel", L("🏨 Hotels", "🏨 হোটেল")]];
  const list = saved.filter((x) => filter === "all" || x.kind === filter);
  return (
    <>
      <div className="filter-row" style={{ marginBottom: 2 }}>
        {filters.map((f) => (
          <button key={f[0]} type="button" className={"filter-chip" + (filter === f[0] ? " active" : "")} onClick={() => setFilter(f[0])}>{f[1]}</button>
        ))}
      </div>
      {!list.length ? (
        <EmptyState
          title={L("Nothing saved yet", "এখনো কিছু সেভ হয়নি")}
          text={L("Ask Tripo for ideas, then tap 🔖 to keep the ones you like.", "Tripo-কে আইডিয়া জিজ্ঞাসা করুন, পছন্দেরগুলোতে 🔖 চাপুন।")}
          btnLabel={L("Get ideas from Tripo", "Tripo থেকে আইডিয়া নিন")}
          onClick={openChat}
        />
      ) : (
        <>
          {list.map((it) => <SavedRow key={it.id} it={it} />)}
          <DownloadBar />
        </>
      )}
    </>
  );
}

function TripDetail({ tr }) {
  const saved = useTripo((s) => s.saved);
  const openTripForm = useTripo((s) => s.openTripForm);
  const dropTrip = useTripo((s) => s.dropTrip);
  const showTrips = useTripo((s) => s.showTrips);
  const showToast = useTripo((s) => s.showToast);
  const ask = useAskTripo();
  const [confirm, setConfirm] = useState(false);
  const items = saved.filter((x) => x.tripId === tr.id);
  const loose = saved.filter((x) => !x.tripId);
  const dest = tr.dest || tr.name;
  const sections = [
    ["place", "📍 " + L("Places", "জায়গা"), L("Find things to see in ", "দেখার জায়গা খুঁজুন: ") + dest],
    ["flight", "✈️ " + L("Flights", "ফ্লাইট"), L("Find flights to ", "ফ্লাইট খুঁজুন: ") + dest + (tr.start ? L(" on ", " তারিখ ") + tr.start : "") + (tr.end ? L(", back on ", ", ফেরা ") + tr.end : "")],
    ["hotel", "🏨 " + L("Hotels", "হোটেল"), L("Show me hotels in ", "হোটেল দেখান: ") + dest + (tr.start && tr.end ? L(" from ", " ") + tr.start + L(" to ", " থেকে ") + tr.end : "")],
  ];
  return (
    <>
      <div className="trip-card" style={{ cursor: "default" }}>
        <div className="trip-banner tall">
          <Scene className="scene-fill" name={tr.dest || tr.name} />
          <div className="ov">
            <div className="place-name" style={{ fontSize: 20 }}>{tr.name}</div>
            <div className="place-country">{[tr.dest, tripDates(tr)].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <div className="trip-actions">
          <button type="button" className="book-cta" style={{ margin: 0, flex: "1 1 100%" }} onClick={() => ask(tripPrompt(tr, items))}>✨ {L("Plan it with Tripo", "Tripo দিয়ে প্ল্যান করুন")}</button>
          <button type="button" className="pa-btn" aria-label={L("Download", "ডাউনলোড")} onClick={() => download((slug(tr.name) || "trip") + "-tripo.html", planDocHTML(tr.name, [tr], [], saved))}>⬇ {L("Download", "ডাউনলোড")}</button>
          <button type="button" className="pa-btn" onClick={() => openTripForm(tr.id)}>{L("Edit", "এডিট")}</button>
          <button
            type="button"
            className="pa-btn"
            style={confirm ? { background: "#E5232B", color: "#fff", borderColor: "#E5232B" } : undefined}
            onClick={() => {
              if (!confirm) { setConfirm(true); return; }
              dropTrip(tr.id);
              showTrips("trips", null);
              showToast(L("Trip deleted", "ট্রিপ মুছে ফেলা হয়েছে"));
            }}
          >
            {confirm ? L("Tap to confirm", "নিশ্চিত করুন") : L("Delete", "মুছুন")}
          </button>
        </div>
      </div>

      {tr.itinerary && tr.itinerary.length > 0 && (
        <>
          <div className="sec-head">🗓 {L("Day-by-day plan", "দিনভিত্তিক প্ল্যান")}</div>
          <ItineraryDays items={tr.itinerary} style={{ maxWidth: "none" }} />
        </>
      )}

      {sections.map((sec) => {
        const list = items.filter((x) => x.kind === sec[0]);
        return (
          <div key={sec[0]} style={{ display: "contents" }}>
            <div className="sec-head">{sec[1]}</div>
            {list.map((x) => <SavedRow key={x.id} it={x} inTrip />)}
            <button type="button" className="ask-row" onClick={() => ask(sec[2])}>
              {list.length ? L("+ Find more with Tripo", "+ Tripo দিয়ে আরও খুঁজুন") : L("Nothing yet — find some with Tripo →", "এখনো কিছু নেই — Tripo দিয়ে খুঁজুন →")}
            </button>
          </div>
        );
      })}

      {loose.length > 0 && (
        <>
          <div className="sec-head">🔖 {L("Add from your saved list", "সেভ করা থেকে যোগ করুন")}</div>
          {loose.map((x) => <SavedRow key={x.id} it={x} addTo={tr.id} />)}
        </>
      )}
    </>
  );
}

export default function TripsScreen() {
  useLang();
  const trips = useTripo((s) => s.trips);
  const saved = useTripo((s) => s.saved);
  const tab = useTripo((s) => s.tripsTab);
  const openTripId = useTripo((s) => s.openTripId);
  const showTrips = useTripo((s) => s.showTrips);
  const openTripForm = useTripo((s) => s.openTripForm);
  const tr = openTripId ? trips.find((x) => x.id === openTripId) : null;

  return (
    <div className="view active" id="view-trips">
      <div className="mini-head">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {tr && (
            <button className="head-btn" id="tripsBackBtn" aria-label="Back" style={{ marginLeft: -8 }} onClick={() => showTrips(tab, null)}>
              <Icon name="back" size={20} sw={2.2} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="mini-head-title" id="tripsTitle">{tr ? tr.name : L("My plan", "আমার প্ল্যান")}</span>
            <span className="mini-head-sub" id="tripsSub">{tr ? tr.dest || "" : L("Everything you save and every trip you create lives here", "আপনার সেভ করা সব কিছু আর সব ট্রিপ এখানে থাকে")}</span>
          </div>
          <button type="button" className="new-trip-btn" id="newTripBtn" onClick={() => openTripForm(null, null)}>{L("+ New trip", "+ নতুন ট্রিপ")}</button>
        </div>
        {!tr && (
          <div className="seg" id="tripsSeg">
            <button type="button" data-t="trips" className={tab === "trips" ? "active" : ""} onClick={() => showTrips("trips", null)}>{L("Trips", "ট্রিপ") + " (" + trips.length + ")"}</button>
            <button type="button" data-t="saved" className={tab === "saved" ? "active" : ""} onClick={() => showTrips("saved", null)}>{L("Saved", "সেভ করা") + " (" + saved.length + ")"}</button>
          </div>
        )}
      </div>
      <div className={"mini-list" + (tr ? " detail" : "")} id="tripsBody">
        {tr ? <TripDetail key={tr.id} tr={tr} /> : tab === "trips" ? <TripList /> : <SavedList />}
      </div>
    </div>
  );
}
