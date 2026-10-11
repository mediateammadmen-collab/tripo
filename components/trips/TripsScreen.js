"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Scene } from "@/components/ui/Scene";
import { showPlace } from "@/components/chat/Cards";
import MapView from "@/components/map/MapView";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useAskTripo, useOpenChat } from "@/lib/tripo/hooks";
import { usePins } from "@/lib/tripo/usePins";
import { pointsFromTrip } from "@/lib/tripo/places";
import { L, getLang } from "@/lib/tripo/i18n";
import { slug, fmtDate, ymd, validDateAny } from "@/lib/tripo/util";
import { itemTitle, itemSub, itemLink, tripDates, countLine, tripPrompt } from "@/lib/tripo/items";
import { daysOf, unscheduled, dayCount, canEditTrip } from "@/lib/tripo/trips";
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
  return <Scene className="sv-thumb" scene={d.scene} name={(d.name || "") + " " + (d.country || d.context || "")} />;
}

/* ---------------- lists ---------------- */

// One saved place, flight or hotel in the Saved tab.
function SavedRow({ it }) {
  const trips = useTripo((s) => s.trips);
  const dropItem = useTripo((s) => s.dropItem);
  const openTripPicker = useTripo((s) => s.openTripPicker);
  const showToast = useTripo((s) => s.showToast);
  const ask = useAskTripo();
  const inTrips = trips.filter((t) => (t.items || []).some((x) => x.key === it.key));
  const link = itemLink(it);
  return (
    <div className="sv-row">
      <ItemThumb it={it} />
      <div className="sv-main">
        <div className="sv-title">{itemTitle(it)}</div>
        <div className="sv-sub">{itemSub(it)}</div>
        <div className="sv-actions">
          <button type="button" className={"sv-chip" + (inTrips.length ? "" : " y")} onClick={() => openTripPicker(it.kind, it.data)}>
            {inTrips.length ? "🧳 " + (inTrips.length === 1 ? inTrips[0].name : inTrips.length + L(" trips", " টি ট্রিপ")) : L("+ Add to trip", "+ ট্রিপে যোগ")}
          </button>
          {link ? (
            <a className="sv-chip" target="_blank" rel="noopener" href={link}>{it.kind === "flight" ? "Trip.com " : "Booking.com "}<Icon name="ext" size={13} sw={2.2} /></a>
          ) : (
            <button type="button" className="sv-chip" onClick={() => ask(L("Tell me more about ", "সম্পর্কে আরও বলুন: ") + itemTitle(it))}>{L("Ask Tripo", "Tripo-কে জিজ্ঞাসা")}</button>
          )}
        </div>
      </div>
      <button type="button" className="sv-x" aria-label={L("Delete", "মুছুন")} onClick={() => { dropItem(it.id); showToast(L("Deleted", "মুছে ফেলা হয়েছে")); }}>×</button>
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
    download("my-plan-tripo.html", planDocHTML(L("My plan", "আমার প্ল্যান"), trips, saved));
  };
  return (
    <button type="button" className="dl-btn" onClick={onClick}>
      <Icon name="download" size={16} sw={2.2} /> {L("Download my whole plan", "পুরো প্ল্যান ডাউনলোড করুন")}
    </button>
  );
}

function TripCard({ tr, onOpen }) {
  const n = tr.itinerary && tr.itinerary.length ? tr.itinerary.length : 0;
  return (
    <button type="button" className="trip-card" onClick={onOpen}>
      <div className="trip-banner">
        <Scene className="scene-fill" name={tr.dest || tr.name} />
        {tr.role === "member" && <span className="trip-flag">{L("Shared with you", "আপনার সাথে শেয়ার করা")}</span>}
        {tr.role !== "member" && tr.shareMode && tr.shareMode !== "off" && <span className="trip-flag">{tr.shareMode === "edit" ? L("Planning together", "একসাথে প্ল্যান") : L("Shared", "শেয়ার করা")}</span>}
        <div className="ov">
          <div className="place-name">{tr.name}</div>
          <div className="place-country">{[tr.dest, tripDates(tr)].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <div className="trip-meta">
        {countLine(tr.items || [])}
        {n ? <span>🗓 {n + L("-day plan", "-দিনের প্ল্যান")}</span> : null}
      </div>
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
          text={L("Ask Tripo for a plan and save it as a trip, or tap 🔖 on any place, flight or hotel and add it here.", "Tripo-কে প্ল্যান চেয়ে ট্রিপ হিসেবে সেভ করুন, অথবা যেকোনো জায়গা, ফ্লাইট বা হোটেলে 🔖 চেপে এখানে যোগ করুন।")}
          btnLabel={L("Create a trip", "ট্রিপ বানান")}
          onClick={() => openTripForm(null, null)}
        />
        {saved.length > 0 && <DownloadBar />}
      </>
    );
  }
  return (
    <>
      {trips.map((tr) => <TripCard key={tr.id} tr={tr} onOpen={() => showTrips("trips", tr.id)} />)}
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

/* ---------------- calendar ---------------- */
const MONTHS = { en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], bn: ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"] };
const WEEK = { en: ["S", "M", "T", "W", "T", "F", "S"], bn: ["র", "সো", "ম", "বু", "বৃ", "শু", "শ"] };
const TRIP_COLORS = ["#0A0A0A", "#1E9E55", "#B8161D", "#3E6E63", "#8A6E4B", "#6A4C93"];

function CalendarView() {
  const trips = useTripo((s) => s.trips);
  const showTrips = useTripo((s) => s.showTrips);
  const openTripForm = useTripo((s) => s.openTripForm);
  const dated = trips.filter((t) => validDateAny(t.start));
  const [month, setMonth] = useState(() => {
    const today = ymd(new Date());
    const next = dated.map((t) => t.start).filter((d) => d >= today.slice(0, 8) + "01").sort()[0] || today;
    return next.slice(0, 7);
  });
  const lang = getLang();
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysIn = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(month + "-" + (d < 10 ? "0" : "") + d);
  const shift = (n) => { const d = new Date(y, m - 1 + n, 1); setMonth(d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1)); };
  const today = ymd(new Date());
  const colorOf = (t) => TRIP_COLORS[trips.indexOf(t) % TRIP_COLORS.length];
  const inMonth = dated.filter((t) => t.start.slice(0, 7) <= month && (t.end || t.start).slice(0, 7) >= month);
  const undated = trips.filter((t) => !validDateAny(t.start));

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="head-btn" aria-label={L("Previous month", "আগের মাস")} onClick={() => shift(-1)}><Icon name="back" size={18} sw={2.2} /></button>
        <b id="calMonth">{MONTHS[lang][m - 1]} {y}</b>
        <button type="button" className="head-btn" aria-label={L("Next month", "পরের মাস")} onClick={() => shift(1)}><Icon name="back" size={18} sw={2.2} style={{ transform: "rotate(180deg)" }} /></button>
      </div>
      <div className="cal-grid cal-week">{WEEK[lang].map((w, i) => <span key={i}>{w}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={"e" + i} className="cal-cell empty" />;
          const here = dated.filter((t) => d >= t.start && d <= (t.end || t.start));
          return (
            <div key={d} className={"cal-cell" + (d === today ? " today" : "") + (here.length ? " busy" : "")} onClick={() => (here[0] ? showTrips("trips", here[0].id) : openTripForm(null, { start: d, end: d }))} role="button" tabIndex={0}>
              <span className="cal-num">{Number(d.slice(8))}</span>
              <div className="cal-bars">{here.slice(0, 3).map((t) => <i key={t.id} style={{ background: colorOf(t) }} title={t.name} />)}</div>
            </div>
          );
        })}
      </div>
      <div className="cal-list">
        {inMonth.map((t) => (
          <button key={t.id} type="button" className="cal-trip" onClick={() => showTrips("trips", t.id)}>
            <i style={{ background: colorOf(t) }} />
            <span><b>{t.name}</b><small>{tripDates(t)}</small></span>
            <Icon name="chevRight" size={15} />
          </button>
        ))}
        {!inMonth.length && <div className="empty-note">{L("No trips this month. Tap a date to plan one.", "এই মাসে কোনো ট্রিপ নেই। তারিখে ট্যাপ করে প্ল্যান করুন।")}</div>}
        {undated.length > 0 && (
          <>
            <div className="sec-head">{L("Trips without dates", "তারিখ ছাড়া ট্রিপ")}</div>
            {undated.map((t) => (
              <button key={t.id} type="button" className="cal-trip" onClick={() => showTrips("trips", t.id)}>
                <i style={{ background: "#C9C9C9" }} />
                <span><b>{t.name}</b><small>{t.dest || L("Add dates to see it on the calendar", "ক্যালেন্ডারে দেখতে তারিখ দিন")}</small></span>
                <Icon name="chevRight" size={15} />
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- one trip ---------------- */

// A text field that saves when you leave it (so we don't write on every keystroke).
function CommitField({ value, onCommit, placeholder, className, multiline, disabled, ariaLabel }) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  const props = {
    className,
    value: v,
    placeholder,
    disabled,
    "aria-label": ariaLabel,
    onChange: (e) => setV(e.target.value),
    onBlur: () => { if ((v || "") !== (value || "")) onCommit(v.trim()); },
  };
  if (multiline) return <textarea rows={2} {...props} />;
  return <input type="text" {...props} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />;
}

function StopRow({ tr, it, days, edit, first, last }) {
  const s = useTripo.getState();
  const link = itemLink(it);
  const isMapThing = it.kind !== "flight";
  return (
    <div className="stop-row" data-item={it.id}>
      <button type="button" className="stop-thumb" onClick={() => isMapThing && showPlace(it.kind === "hotel" ? "hotel" : it.kind === "stop" ? "stop" : "place", it.data, tr.dest)} aria-label={itemTitle(it)}>
        <ItemThumb it={it} />
      </button>
      <div className="sv-main">
        <div className="sv-title">{itemTitle(it)}</div>
        <div className="sv-sub">{itemSub(it)}</div>
        {edit ? (
          <CommitField className="stop-note" value={it.note} placeholder={L("Add a note (time, tickets, tips)…", "নোট লিখুন (সময়, টিকিট, টিপস)…")} onCommit={(v) => s.setItemNote(tr.id, it.id, v)} ariaLabel={L("Note", "নোট")} />
        ) : it.note ? <div className="stop-note ro">{it.note}</div> : null}
        <div className="sv-actions">
          {edit && (
            <select className="sv-chip stop-day" aria-label={L("Day", "দিন")} value={it.day || 0} onChange={(e) => s.setItemDay(tr.id, it.id, parseInt(e.target.value, 10) || null)}>
              <option value={0}>{L("Not scheduled", "দিন ঠিক হয়নি")}</option>
              {days.map((d) => <option key={d.n} value={d.n}>{L("Day ", "দিন ") + d.n}</option>)}
            </select>
          )}
          {link ? <a className="sv-chip" target="_blank" rel="noopener" href={link}>{it.kind === "flight" ? "Trip.com " : "Booking.com "}<Icon name="ext" size={13} sw={2.2} /></a> : null}
        </div>
      </div>
      {edit && (
        <div className="stop-tools">
          <button type="button" aria-label={L("Move up", "উপরে নিন")} disabled={first} onClick={() => s.moveTripItem(tr.id, it.id, -1)}><Icon name="up" size={15} sw={2.4} /></button>
          <button type="button" aria-label={L("Move down", "নিচে নিন")} disabled={last} onClick={() => s.moveTripItem(tr.id, it.id, 1)}><Icon name="down" size={15} sw={2.4} /></button>
          <button type="button" aria-label={L("Remove from trip", "ট্রিপ থেকে সরান")} onClick={() => s.removeTripItem(tr.id, it.id)}>×</button>
        </div>
      )}
    </div>
  );
}

function AddStop({ tr, day }) {
  const [v, setV] = useState("");
  const add = (e) => {
    e.preventDefault();
    const name = v.trim();
    if (!name) return;
    useTripo.getState().addToTrip(tr.id, "stop", { name, context: tr.dest || "" }, day);
    setV("");
  };
  return (
    <form className="add-stop" onSubmit={add}>
      <input type="text" value={v} maxLength={80} placeholder={L("Add a place or activity…", "জায়গা বা অ্যাক্টিভিটি যোগ করুন…")} onChange={(e) => setV(e.target.value)} aria-label={L("Add a stop", "স্টপ যোগ করুন")} />
      <button type="submit" aria-label={L("Add", "যোগ করুন")}><Icon name="plus" size={16} sw={2.4} /></button>
    </form>
  );
}

function Receipts({ tr, edit }) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const s = useTripo.getState();
  const list = tr.receipts || [];

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { s.showToast(L("That file is too big (4 MB max)", "ফাইলটি বেশি বড় (সর্বোচ্চ ৪ MB)")); return; }
    setBusy(true);
    try {
      const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(file); });
      const resp = await fetch("/api/receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mime: file.type, data }) });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok || !j.receipt) throw new Error(j.error || "failed");
      s.addReceipt(tr.id, { ...j.receipt, file: file.name });
      s.showToast(L("Booking added ✓", "বুকিং যোগ হয়েছে ✓"));
    } catch (err) {
      s.showToast(err && err.message === "not_a_booking" ? L("I couldn't find a booking in that file", "ফাইলে কোনো বুকিং পাইনি") : L("Couldn't read that file — try a clearer photo", "ফাইলটি পড়া যায়নি — পরিষ্কার ছবি দিন"));
    } finally {
      setBusy(false);
    }
  };

  const icon = { flight: "✈️", hotel: "🏨", train: "🚆", bus: "🚌", car: "🚗", activity: "🎟", restaurant: "🍽", other: "🧾" };
  return (
    <>
      <div className="sec-head">🧾 {L("Bookings & receipts", "বুকিং ও রসিদ")}</div>
      {list.map((r) => (
        <div className="sv-row receipt" key={r.id}>
          <div className="sv-thumb fl" style={{ fontSize: 22 }}>{icon[r.type] || icon.other}</div>
          <div className="sv-main">
            <div className="sv-title">{r.title || r.vendor || L("Booking", "বুকিং")}</div>
            <div className="sv-sub">{[r.vendor && r.vendor !== r.title ? r.vendor : "", [r.from, r.to].filter(Boolean).join(" → "), [r.start_date, r.end_date].filter(Boolean).map(fmtDate).filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}</div>
            <div className="sv-sub">{[r.confirmation ? L("Ref: ", "রেফ: ") + r.confirmation : "", r.amount ? r.amount + (r.currency ? " " + r.currency : "") : ""].filter(Boolean).join(" · ")}</div>
            {r.notes ? <div className="stop-note ro">{r.notes}</div> : null}
          </div>
          {edit && <button type="button" className="sv-x" aria-label={L("Delete", "মুছুন")} onClick={() => s.removeReceipt(tr.id, r.id)}>×</button>}
        </div>
      ))}
      {edit && (
        <>
          <input ref={fileRef} id="receiptFile" type="file" accept="image/*,application/pdf" hidden onChange={onFile} />
          <button type="button" className="ask-row" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>
            {busy ? L("Reading your booking…", "বুকিং পড়া হচ্ছে…") : L("+ Upload a ticket, hotel voucher or receipt (photo or PDF)", "+ টিকিট, হোটেল ভাউচার বা রসিদ আপলোড করুন (ছবি বা PDF)")}
          </button>
          {!list.length && <div className="sv-sub" style={{ textAlign: "center" }}>{L("Tripo reads the details for you. The file itself is not stored.", "Tripo তথ্যগুলো পড়ে নেবে। ফাইলটি সংরক্ষণ করা হয় না।")}</div>}
        </>
      )}
      {!edit && !list.length && <div className="empty-note">{L("No bookings added.", "কোনো বুকিং যোগ হয়নি।")}</div>}
    </>
  );
}

function TripDetail({ tr }) {
  const saved = useTripo((s) => s.saved);
  const mapFocus = useTripo((s) => s.mapFocus);
  const s = useTripo.getState();
  const ask = useAskTripo();
  const [confirm, setConfirm] = useState(false);
  const edit = canEditTrip(tr);
  const isMember = tr.role === "member";
  const items = tr.items || [];
  const days = daysOf(tr);
  const loose = unscheduled(tr).filter((it) => it.kind !== "flight" && it.kind !== "hotel");
  const flights = items.filter((it) => it.kind === "flight");
  const hotels = items.filter((it) => it.kind === "hotel" && !it.day);
  const keys = new Set(items.map((it) => it.key));
  const fromSaved = saved.filter((x) => !keys.has(x.key));
  const dest = tr.dest || tr.name;
  const points = pointsFromTrip(tr);
  const { pins, lines } = usePins(points);
  const select = (key) => { const p = points.find((x) => x.key === key); if (p) showPlace(p.kind, p.data, tr.dest); };
  const chips = [tr.dest, tripDates(tr), (tr.travelers || 1) + L(tr.travelers > 1 ? " travelers" : " traveler", " জন"), tr.budget].filter(Boolean);

  return (
    <>
      <div className="trip-card" style={{ cursor: "default" }}>
        <div className="trip-banner tall">
          <Scene className="scene-fill" name={tr.dest || tr.name} />
          {isMember && <span className="trip-flag">{L("Shared with you", "আপনার সাথে শেয়ার করা")}</span>}
          <div className="ov">
            <div className="place-name" style={{ fontSize: 20 }}>{tr.name}</div>
            <div className="trip-chips">{chips.map((c) => <span key={c}>{c}</span>)}</div>
          </div>
        </div>
        <div className="trip-actions">
          <button type="button" className="book-cta" style={{ margin: 0, flex: "1 1 100%" }} onClick={() => ask(tripPrompt(tr, items))}>✨ {L("Plan it with Tripo", "Tripo দিয়ে প্ল্যান করুন")}</button>
          <button type="button" className="pa-btn" id="shareTripBtn" onClick={() => s.openShare(tr.id)}>{L("Share", "শেয়ার")}</button>
          <button type="button" className="pa-btn" aria-label={L("Download", "ডাউনলোড")} onClick={() => download((slug(tr.name) || "trip") + "-tripo.html", planDocHTML(tr.name, [tr], []))}>⬇ {L("Download", "ডাউনলোড")}</button>
          {edit && <button type="button" className="pa-btn" onClick={() => s.openTripForm(tr.id)}>{L("Edit", "এডিট")}</button>}
          <button
            type="button"
            className="pa-btn"
            style={confirm ? { background: "#E5232B", color: "#fff", borderColor: "#E5232B" } : undefined}
            onClick={() => {
              if (!confirm) { setConfirm(true); return; }
              s.dropTrip(tr.id);
              s.showTrips("trips", null);
              s.showToast(isMember ? L("You left the trip", "আপনি ট্রিপ ছেড়েছেন") : L("Trip deleted", "ট্রিপ মুছে ফেলা হয়েছে"));
            }}
          >
            {confirm ? L("Tap to confirm", "নিশ্চিত করুন") : isMember ? L("Leave", "ছেড়ে দিন") : L("Delete", "মুছুন")}
          </button>
        </div>
      </div>

      {!edit && <div className="sys-note" style={{ alignSelf: "stretch", maxWidth: "none" }}>{L("You can view this trip. The owner hasn't switched on planning together.", "আপনি এই ট্রিপ দেখতে পারেন। মালিক একসাথে প্ল্যান চালু করেননি।")}</div>}

      {points.length > 0 && (
        <div className="trip-map">
          <MapView points={pins} lines={lines} focusKey={mapFocus} onSelect={select} fitKey={tr.id} />
        </div>
      )}

      <div className="sec-head">🗓 {L("Day-by-day plan", "দিনভিত্তিক প্ল্যান")}</div>
      {days.map((d) => (
        <div className="day-card" key={d.n} data-day={d.n}>
          <div className="day-head">
            <span className="itin-n">{L("D", "দিন ") + d.n}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {edit ? (
                <CommitField className="day-title" value={d.title} placeholder={L("Give this day a title", "এই দিনের শিরোনাম দিন")} onCommit={(v) => s.setDay(tr.id, d.n, { title: v })} ariaLabel={L("Day title", "দিনের শিরোনাম")} />
              ) : <div className="day-title ro">{d.title || L("Day ", "দিন ") + d.n}</div>}
              {d.date ? <div className="sv-sub">{fmtDate(d.date)}</div> : null}
            </div>
          </div>
          {edit ? (
            <CommitField multiline className="day-plan" value={d.plan} placeholder={L("Notes for the day…", "দিনের নোট…")} onCommit={(v) => s.setDay(tr.id, d.n, { plan: v })} ariaLabel={L("Day notes", "দিনের নোট")} />
          ) : d.plan ? <div className="day-plan ro">{d.plan}</div> : null}
          {d.stops.map((it, i) => <StopRow key={it.id} tr={tr} it={it} days={days} edit={edit} first={i === 0} last={i === d.stops.length - 1} />)}
          {edit && <AddStop tr={tr} day={d.n} />}
        </div>
      ))}
      {edit && dayCount(tr) < 30 && <button type="button" className="ask-row" id="addDayBtn" onClick={() => s.addDay(tr.id)}>{L("+ Add a day", "+ দিন যোগ করুন")}</button>}

      {(loose.length > 0 || edit) && (
        <>
          <div className="sec-head">📍 {L("Ideas — not scheduled yet", "আইডিয়া — এখনো দিন ঠিক হয়নি")}</div>
          {loose.map((it, i) => <StopRow key={it.id} tr={tr} it={it} days={days} edit={edit} first={i === 0} last={i === loose.length - 1} />)}
          {edit && <button type="button" className="ask-row" onClick={() => ask(L("Find things to see in ", "দেখার জায়গা খুঁজুন: ") + dest)}>{loose.length ? L("+ Find more with Tripo", "+ Tripo দিয়ে আরও খুঁজুন") : L("Find places with Tripo →", "Tripo দিয়ে জায়গা খুঁজুন →")}</button>}
        </>
      )}

      <div className="sec-head">✈️ {L("Flights", "ফ্লাইট")}</div>
      {flights.map((it, i) => <StopRow key={it.id} tr={tr} it={it} days={[]} edit={edit} first={i === 0} last={i === flights.length - 1} />)}
      {edit && <button type="button" className="ask-row" onClick={() => ask(L("Find flights to ", "ফ্লাইট খুঁজুন: ") + dest + (tr.start ? L(" on ", " তারিখ ") + tr.start : "") + (tr.end ? L(", back on ", ", ফেরা ") + tr.end : ""))}>{flights.length ? L("+ Find more with Tripo", "+ Tripo দিয়ে আরও খুঁজুন") : L("Nothing yet — find some with Tripo →", "এখনো কিছু নেই — Tripo দিয়ে খুঁজুন →")}</button>}

      <div className="sec-head">🏨 {L("Hotels", "হোটেল")}</div>
      {hotels.map((it, i) => <StopRow key={it.id} tr={tr} it={it} days={days} edit={edit} first={i === 0} last={i === hotels.length - 1} />)}
      {edit && <button type="button" className="ask-row" onClick={() => ask(L("Show me hotels in ", "হোটেল দেখান: ") + dest + (tr.start && tr.end ? L(" from ", " ") + tr.start + L(" to ", " থেকে ") + tr.end : ""))}>{hotels.length ? L("+ Find more with Tripo", "+ Tripo দিয়ে আরও খুঁজুন") : L("Nothing yet — find some with Tripo →", "এখনো কিছু নেই — Tripo দিয়ে খুঁজুন →")}</button>}

      <Receipts tr={tr} edit={edit} />

      {edit && fromSaved.length > 0 && (
        <>
          <div className="sec-head">🔖 {L("Add from your saved list", "সেভ করা থেকে যোগ করুন")}</div>
          {fromSaved.map((x) => (
            <div className="sv-row" key={x.id}>
              <ItemThumb it={x} />
              <div className="sv-main">
                <div className="sv-title">{itemTitle(x)}</div>
                <div className="sv-sub">{itemSub(x)}</div>
                <div className="sv-actions">
                  <button type="button" className="sv-chip y" onClick={() => s.addToTrip(tr.id, x.kind, x.data)}>{L("+ Add to this trip", "+ এই ট্রিপে যোগ")}</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}

export default function TripsScreen() {
  useLang();
  const router = useRouter();
  const trips = useTripo((s) => s.trips);
  const saved = useTripo((s) => s.saved);
  const tab = useTripo((s) => s.tripsTab);
  const openTripId = useTripo((s) => s.openTripId);
  const sync = useTripo((s) => s.sync);
  const showTrips = useTripo((s) => s.showTrips);
  const openTripForm = useTripo((s) => s.openTripForm);
  const tr = openTripId ? trips.find((x) => x.id === openTripId) : null;

  // Pick up changes friends made to shared trips: when this screen opens and when the window regains focus.
  useEffect(() => {
    if (sync !== "synced") return;
    let last = 0;
    const refresh = () => { if (Date.now() - last > 20000) { last = Date.now(); useTripo.getState().refreshTrips(); } };
    refresh();
    window.addEventListener("focus", refresh);
    const id = setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    return () => { window.removeEventListener("focus", refresh); clearInterval(id); };
  }, [sync]);

  const tabs = [["trips", L("Trips", "ট্রিপ") + " (" + trips.length + ")"], ["saved", L("Saved", "সেভ করা") + " (" + saved.length + ")"], ["calendar", L("Calendar", "ক্যালেন্ডার")]];

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
            {tabs.map((x) => (
              <button key={x[0]} type="button" data-t={x[0]} className={tab === x[0] ? "active" : ""} onClick={() => showTrips(x[0], null)}>{x[1]}</button>
            ))}
          </div>
        )}
      </div>
      <div className={"mini-list" + (tr ? " detail" : "") + (tab === "calendar" && !tr ? " plain" : "")} id="tripsBody">
        {tr ? <TripDetail key={tr.id} tr={tr} /> : tab === "saved" ? <SavedList /> : tab === "calendar" ? <CalendarView /> : <TripList />}
      </div>
      {sync === "error" && <button type="button" className="sync-note" onClick={() => router.push("/profile")}>{L("Some changes haven't reached your account yet — they'll retry.", "কিছু পরিবর্তন এখনো অ্যাকাউন্টে পৌঁছায়নি — আবার চেষ্টা হবে।")}</button>}
    </div>
  );
}
