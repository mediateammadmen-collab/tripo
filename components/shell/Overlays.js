"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { RichText } from "@/components/ui/Scene";
import Photo from "@/components/ui/Photo";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useOpenChat, useAskTripo } from "@/lib/tripo/hooks";
import { L, t } from "@/lib/tripo/i18n";
import { TABS } from "@/lib/tripo/content";
import { AIRPORTS, bookingUrl } from "@/lib/tripo/travel";
import { tripDates, itemKey } from "@/lib/tripo/items";
import { canEditTrip } from "@/lib/tripo/trips";
import { cloud } from "@/lib/tripo/cloud";
import { FRIEND_COLORS, initials, addDays } from "@/lib/tripo/util";
import { SaveButton, PlacePhoto } from "@/components/chat/Cards";
import { useVoice, closeVoice, orbTap, toggleMute, toggleTypeBox, askTyped } from "@/lib/tripo/voice";

const TAB_ICON = { planForMe: "spark", nearby: "target", newPlace: "globe", planTrip: "pencil", packages: "box", stay: "house", flights: "plane", inspiration: "spark" };

/* ---------------- toast ---------------- */
export function Toast() {
  const toast = useTripo((s) => s.toast);
  const hide = useTripo((s) => s.hideToast);
  return (
    <div className={"toast" + (toast ? " show" : "")} id="toast" role="status" aria-live="polite">
      {toast && (
        <>
          <span>{toast.text}</span>
          {toast.actionLabel ? (
            <button type="button" onClick={() => { hide(); toast.action && toast.action(); }}>
              {toast.actionLabel}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ---------------- side menu ---------------- */
export function Drawer() {
  useLang();
  const open = useTripo((s) => s.drawerOpen);
  const setDrawer = useTripo((s) => s.setDrawer);
  const setInvite = useTripo((s) => s.setInvite);
  const lang = useTripo((s) => s.lang);
  const setLang = useTripo((s) => s.setLang);
  const openChat = useOpenChat();
  const close = () => setDrawer(false);
  return (
    <>
      <div className={"drawer-overlay" + (open ? " open" : "")} id="drawerOverlay" onClick={close} />
      <div className={"drawer" + (open ? " open" : "")} id="drawer">
        <div className="drawer-head">
          <Link href="/" className="wordmark" onClick={close} aria-label="Tripo home">
            <Icon name="sparkSolid" size={17} />
            <span>Tripo</span>
          </Link>
          <button className="close-x" id="drawerCloseBtn" aria-label="Close menu" onClick={close}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="lang-toggle" role="group" aria-label="Language">
          <button id="langEnBtn" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
          <button id="langBnBtn" className={lang === "bn" ? "active" : ""} onClick={() => setLang("bn")}>বাং</button>
        </div>
        <div className="drawer-section-label">{t("exploreLabel")}</div>
        <div id="drawerTabs">
          {TABS.map((key) => (
            <button
              key={key}
              className="drawer-item"
              onClick={() => { close(); openChat(); useTripo.getState().categoryTap(key); }}
            >
              <Icon name={TAB_ICON[key]} size={13} />
              <span>{t("tabs." + key)}</span>
            </button>
          ))}
        </div>
        <button className="drawer-invite" id="drawerInviteBtn" onClick={() => { close(); setInvite(true); }}>
          <Icon name="userPlus" size={15} />
          <span>{t("inviteShort")}</span>
        </button>
      </div>
    </>
  );
}

/* ---------------- invite friends ---------------- */
export function InviteModal() {
  useLang();
  const open = useTripo((s) => s.inviteOpen);
  const setInvite = useTripo((s) => s.setInvite);
  const friends = useTripo((s) => s.friends);
  const addFriend = useTripo((s) => s.addFriend);
  const removeFriend = useTripo((s) => s.removeFriend);
  const showToast = useTripo((s) => s.showToast);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const share = () => {
    const link = window.location.origin + "/";
    const text = L("Plan trips with Tripo, my AI travel buddy:", "Tripo দিয়ে ট্রিপ প্ল্যান করুন — আমার AI ট্রাভেল সঙ্গী:");
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
    const copy = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done).catch(() => showToast(link));
      else showToast(link);
    };
    if (navigator.share) navigator.share({ title: "Tripo", text, url: link }).catch((e) => { if (!e || e.name !== "AbortError") copy(); });
    else copy();
  };

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} id="inviteOverlay" onClick={(e) => { if (e.target === e.currentTarget) setInvite(false); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>{t("inviteTitle")}</h3>
          <button className="close-x" id="inviteCloseBtn" aria-label="Close" onClick={() => setInvite(false)}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <form
          id="friendForm"
          className="field-row"
          onSubmit={(e) => { e.preventDefault(); const v = name.trim(); if (!v) return; setName(""); addFriend(v); }}
        >
          <label htmlFor="friendNameInput" className="sr-only">{t("friendNameLabel")}</label>
          <input id="friendNameInput" type="text" placeholder={t("friendPlaceholder")} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="add-friend-btn">{t("addBtn")}</button>
        </form>
        <div className="friend-list" id="friendList">
          {friends.length === 0 ? (
            <div className="empty-note">{t("emptyFriends")}</div>
          ) : (
            friends.map((f, idx) => (
              <div className="friend-row" key={f.id}>
                <div className="avatar" style={{ background: FRIEND_COLORS[idx % FRIEND_COLORS.length] }}>{initials(f.name)}</div>
                <div className="friend-name">{f.name}</div>
                <button type="button" className="remove-friend" aria-label="Remove" onClick={() => removeFriend(f.id)}>×</button>
              </div>
            ))
          )}
        </div>
        <button className="share-btn" id="shareLinkBtn" onClick={share}>
          <Icon name="share" size={15} />
          <span>{copied ? t("linkCopied") : t("shareLink")}</span>
        </button>
      </div>
    </div>
  );
}

/* ---------------- add something to a trip ---------------- */
export function TripPicker() {
  useLang();
  const pick = useTripo((s) => s.tripPicker);
  const trips = useTripo((s) => s.trips);
  const close = useTripo((s) => s.closeTripPicker);
  const addToTrip = useTripo((s) => s.addToTrip);
  const openTripForm = useTripo((s) => s.openTripForm);
  const showToast = useTripo((s) => s.showToast);
  const open = !!pick;
  const key = pick ? itemKey(pick.kind, pick.data) : "";
  const editable = trips.filter(canEditTrip);

  const newTrip = () => {
    close();
    const d = pick.data || {};
    const dest = pick.kind === "place" ? d.name : pick.kind === "hotel" ? d.city : pick.kind === "stop" ? d.context : AIRPORTS[d.to] || d.toCity || "";
    openTripForm(null, { dest: dest || "", add: pick });
  };

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} id="tripPickOverlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3 id="tripPickTitle">{L("Add to a trip", "ট্রিপে যোগ করুন")}</h3>
          <button className="close-x" aria-label="Close" onClick={close}><Icon name="x" size={18} sw={2.2} /></button>
        </div>
        <div id="tripPickList">
          {open && !editable.length && (
            <div className="empty-note">{L("No trips yet. Create one to group your saved places, flights and hotels.", "এখনো কোনো ট্রিপ নেই। একটি ট্রিপ বানিয়ে সেভ করা জিনিস গুছিয়ে রাখুন।")}</div>
          )}
          {open && editable.map((tr) => {
            const item = (tr.items || []).find((it) => it.key === key);
            return (
              <button
                key={tr.id}
                type="button"
                className={"pick-row" + (item ? " on" : "")}
                onClick={() => {
                  if (item) { useTripo.getState().removeTripItem(tr.id, item.id); showToast(L("Removed from trip", "ট্রিপ থেকে সরানো হয়েছে")); }
                  else { addToTrip(tr.id, pick.kind, pick.data); showToast(L("Added to ", "যোগ হয়েছে: ") + tr.name); }
                  close();
                }}
              >
                <Photo className="sv-thumb" q={{ name: tr.dest || tr.name, context: "", kind: "place" }} caption={false} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div className="sv-title">{tr.name}</div>
                  <div className="sv-sub">{tripDates(tr) || tr.dest || ""}</div>
                </div>
                {item && <span className="pick-check">✓</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className="share-btn" id="tripPickNewBtn" onClick={newTrip}>
          <span>{L("+ Create a new trip", "+ নতুন ট্রিপ বানান")}</span>
        </button>
      </div>
    </div>
  );
}

/* ---------------- create / edit a trip ---------------- */
const BUDGETS = [["", "—"], ["$", "$ · Budget"], ["$$", "$$ · Mid-range"], ["$$$", "$$$ · Comfort"], ["$$$$", "$$$$ · Luxury"]];

export function TripForm() {
  useLang();
  const router = useRouter();
  const form = useTripo((s) => s.tripForm);
  const trips = useTripo((s) => s.trips);
  const close = useTripo((s) => s.closeTripForm);
  const submitTrip = useTripo((s) => s.submitTrip);
  const showToast = useTripo((s) => s.showToast);
  const showTrips = useTripo((s) => s.showTrips);
  const open = !!form;
  const tr = form && form.tripId ? trips.find((x) => x.id === form.tripId) : null;
  const [v, setV] = useState({ name: "", dest: "", start: "", end: "", travelers: 1, budget: "" });
  const nameRef = useRef(null);

  useEffect(() => {
    if (!form) return;
    const p = form.pending || {};
    setV({
      name: tr ? tr.name : p.name || (p.dest ? p.dest + L(" trip", " ট্রিপ") : ""),
      dest: tr ? tr.dest || "" : p.dest || "",
      start: tr ? tr.start || "" : p.start || "",
      end: tr ? tr.end || "" : p.end || "",
      travelers: tr ? tr.travelers || 1 : p.travelers || 1,
      budget: tr ? tr.budget || "" : p.budget || "",
    });
    const id = setTimeout(() => nameRef.current && nameRef.current.focus(), 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const onSubmit = (e) => {
    e.preventDefault();
    const { trip, isNew } = submitTrip({ name: v.name.trim(), dest: v.dest.trim(), start: v.start, end: v.end, travelers: v.travelers, budget: v.budget });
    if (!trip) return;
    showToast(
      isNew ? L("Trip added to My plan 🎉", "ট্রিপ আমার প্ল্যানে যোগ হয়েছে 🎉") : L("Trip updated", "ট্রিপ আপডেট হয়েছে"),
      L("Open", "খুলুন"),
      () => { showTrips("trips", trip.id); router.push("/trips"); }
    );
  };

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} id="tripFormOverlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3 id="tripFormTitle">{tr ? L("Edit trip", "ট্রিপ এডিট") : L("Create a trip", "নতুন ট্রিপ")}</h3>
          <button className="close-x" aria-label="Close" onClick={close}><Icon name="x" size={18} sw={2.2} /></button>
        </div>
        <form id="tripForm" onSubmit={onSubmit}>
          <div className="bf">
            <label htmlFor="tfName">{L("Trip name", "ট্রিপের নাম")}</label>
            <input id="tfName" ref={nameRef} type="text" maxLength={80} placeholder={L("e.g. Bangkok with friends", "যেমন বন্ধুদের সাথে ব্যাংকক")} autoComplete="off" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </div>
          <div className="bf">
            <label htmlFor="tfDest">{L("Destination", "গন্তব্য")}</label>
            <input id="tfDest" type="text" maxLength={80} placeholder={L("City or country", "শহর বা দেশ")} autoComplete="off" value={v.dest} onChange={(e) => setV({ ...v, dest: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="bf">
              <label htmlFor="tfStart">{L("Start", "শুরু")}</label>
              <input id="tfStart" type="date" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />
            </div>
            <div className="bf">
              <label htmlFor="tfEnd">{L("End", "শেষ")}</label>
              <input id="tfEnd" type="date" min={v.start || undefined} value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} />
            </div>
            <div className="bf">
              <label htmlFor="tfWho">{L("Travelers", "যাত্রী")}</label>
              <select id="tfWho" value={v.travelers} onChange={(e) => setV({ ...v, travelers: parseInt(e.target.value, 10) || 1 })}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="bf">
              <label htmlFor="tfBudget">{L("Budget", "বাজেট")}</label>
              <select id="tfBudget" value={v.budget} onChange={(e) => setV({ ...v, budget: e.target.value })}>
                {BUDGETS.map((b) => <option key={b[0]} value={b[0]}>{b[1]}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="book-cta" id="tfSubmit" style={{ width: "100%", margin: "10px 0 0" }}>
            {tr ? L("Save changes", "সেভ করুন") : L("Create trip", "ট্রিপ বানান")}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- place details ---------------- */
export function PlaceSheet() {
  useLang();
  const sheet = useTripo((s) => s.placeSheet);
  const info = useTripo((s) => (s.placeSheet ? s.placeInfo[s.placeSheet.key] : null));
  const close = useTripo((s) => s.closePlace);
  const openTripPicker = useTripo((s) => s.openTripPicker);
  const ask = useAskTripo();
  const open = !!sheet;
  if (!open) return <div className="modal-overlay" id="placeOverlay" />;
  const d = sheet.data || {};
  const name = sheet.name;
  const kind = sheet.kind === "hotel" ? "hotel" : "place";
  const saveData = kind === "hotel" ? d : { name, city: d.city || "", country: d.country || d.context || "", scene: d.scene || "", tagline: d.tagline || "", best_time: d.best_time || "" };
  const tripKind = sheet.kind === "stop" ? "place" : kind;
  const where = sheet.query && sheet.query.context ? sheet.query.context : "";
  const go = (text) => { close(); useTripo.getState().setMapOpen(false); ask(text); };
  return (
    <div className="modal-overlay open" id="placeOverlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal place-sheet">
        <div className="ps-media">
          <PlacePhoto info={info} q={sheet.query} />
          <button className="close-x ps-close" aria-label="Close" onClick={close}><Icon name="x" size={16} sw={2.2} /></button>
          <SaveButton kind={kind} data={saveData} onImage />
        </div>
        <div className="ps-body">
          <h3>{name}</h3>
          <div className="ps-sub">{[kind === "hotel" ? [d.type, d.area].filter(Boolean).join(" · ") : info && info.short, where].filter(Boolean).filter((x, i, a) => !(i > 0 && a[0].includes(x))).join(" · ")}</div>
          {d.tagline ? <p className="ps-tag">{d.tagline}</p> : null}
          {d.why ? <p className="ps-tag">{d.why}</p> : null}
          {info && info.desc ? <p className="ps-desc">{info.desc}</p> : null}
          {info && info.loading ? <p className="ps-desc ps-muted">{L("Looking this place up…", "জায়গাটি খোঁজা হচ্ছে…")}</p> : null}
          {d.best_time ? <span className="place-best">{L("Best time: ", "সেরা সময়: ") + d.best_time}</span> : null}
          <div className="ps-actions">
            <button type="button" className="pa-btn y" onClick={() => { close(); openTripPicker(tripKind, tripKind === "hotel" ? d : saveData); }}>{L("+ Add to trip", "+ ট্রিপে যোগ")}</button>
            {kind === "hotel" ? (
              <a className="pa-btn" target="_blank" rel="noopener" href={bookingUrl(name + (d.city ? ", " + d.city : ""), addDays(14), addDays(17), 2, 1)}>Booking.com ↗</a>
            ) : (
              <>
                <button type="button" className="pa-btn" onClick={() => go(L("Find me flights to ", "ফ্লাইট খুঁজে দিন: ") + name)}>{L("✈️ Flights", "✈️ ফ্লাইট")}</button>
                <button type="button" className="pa-btn" onClick={() => go(L("Show me hotels in ", "হোটেল দেখান: ") + name)}>{L("🏨 Hotels", "🏨 হোটেল")}</button>
              </>
            )}
            <button type="button" className="pa-btn" onClick={() => go(L("Tell me more about ", "সম্পর্কে আরও বলুন: ") + name + (where ? ", " + where : ""))}>{L("Ask Tripo", "Tripo-কে জিজ্ঞাসা")}</button>
          </div>
          <div className="ps-links">
            <a target="_blank" rel="noopener" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + (where ? ", " + where : ""))}>{L("Open in Google Maps", "Google Maps-এ খুলুন")} ↗</a>
            {info && info.url ? <a target="_blank" rel="noopener" href={info.url}>{L("Photo & text: Wikipedia", "ছবি ও লেখা: Wikipedia")} ↗</a> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- share a trip ---------------- */
export function ShareDialog() {
  useLang();
  const router = useRouter();
  const tripId = useTripo((s) => s.shareTripId);
  const trip = useTripo((s) => s.trips.find((x) => x.id === s.shareTripId) || null);
  const user = useTripo((s) => s.user);
  const sync = useTripo((s) => s.sync);
  const close = useTripo((s) => s.closeShare);
  const setShare = useTripo((s) => s.setShare);
  const showToast = useTripo((s) => s.showToast);
  const [members, setMembers] = useState([]);
  const open = !!tripId && !!trip;
  const mode = (trip && trip.shareMode) || "off";
  const isOwner = trip && (!trip.role || trip.role === "owner");
  const link = trip && trip.shareId && mode !== "off" && typeof window !== "undefined" ? window.location.origin + "/t/" + trip.shareId : "";

  useEffect(() => {
    setMembers([]);
    if (!open || !user || mode !== "edit") return;
    let live = true;
    cloud.members(tripId).then((m) => live && setMembers(m || [])).catch(() => {});
    return () => { live = false; };
  }, [open, tripId, user, mode]);

  const copy = () => {
    if (navigator.share) navigator.share({ title: trip.name, url: link }).catch((e) => { if (!e || e.name !== "AbortError") navigator.clipboard && navigator.clipboard.writeText(link).then(() => showToast(L("Link copied", "লিংক কপি হয়েছে"))); });
    else if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => showToast(L("Link copied", "লিংক কপি হয়েছে"))).catch(() => showToast(link));
    else showToast(link);
  };
  const options = [
    ["off", L("Private", "প্রাইভেট"), L("Only you can see this trip.", "শুধু আপনি এই ট্রিপ দেখতে পারবেন।")],
    ["view", L("Anyone with the link can view", "লিংক থাকলে যে কেউ দেখতে পারবে"), L("A read-only page. No account needed to look.", "শুধু দেখার পেজ। দেখতে অ্যাকাউন্ট লাগবে না।")],
    ["edit", L("Plan together", "একসাথে প্ল্যান"), L("Friends who sign in can join and edit the plan with you.", "বন্ধুরা সাইন ইন করে যোগ দিয়ে আপনার সাথে প্ল্যান এডিট করতে পারবে।")],
  ];

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} id="shareOverlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>{L("Share this trip", "ট্রিপ শেয়ার করুন")}</h3>
          <button className="close-x" aria-label="Close" onClick={close}><Icon name="x" size={18} sw={2.2} /></button>
        </div>
        {open && !user && (
          <>
            <div className="empty-note" style={{ textAlign: "left", padding: "4px 0 14px" }}>{L("Sign in to share a trip. Shared trips are stored in your account so friends can open them from any device.", "ট্রিপ শেয়ার করতে সাইন ইন করুন। শেয়ার করা ট্রিপ আপনার অ্যাকাউন্টে থাকে, তাই বন্ধুরা যেকোনো ডিভাইস থেকে খুলতে পারে।")}</div>
            <button type="button" className="book-cta" style={{ width: "100%", margin: 0 }} onClick={() => { close(); router.push("/login"); }}>{L("Sign in or create an account", "সাইন ইন বা অ্যাকাউন্ট খুলুন")}</button>
          </>
        )}
        {open && user && sync === "setup" && (
          <div className="empty-note" style={{ textAlign: "left" }}>{L("Sharing isn't switched on yet for this site.", "এই সাইটে শেয়ারিং এখনো চালু হয়নি।")}</div>
        )}
        {open && user && sync !== "setup" && !isOwner && (
          <div className="empty-note" style={{ textAlign: "left" }}>{L("Only the person who created this trip can change how it's shared.", "যিনি ট্রিপটি বানিয়েছেন শুধু তিনিই শেয়ারিং বদলাতে পারেন।")}</div>
        )}
        {open && user && sync !== "setup" && isOwner && (
          <>
            <div className="share-options">
              {options.map((o) => (
                <button key={o[0]} type="button" className={"pick-row" + (mode === o[0] ? " on" : "")} data-mode={o[0]} onClick={() => setShare(trip.id, o[0])}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left", padding: "2px 4px" }}>
                    <div className="sv-title">{o[1]}</div>
                    <div className="sv-sub">{o[2]}</div>
                  </div>
                  {mode === o[0] && <span className="pick-check">✓</span>}
                </button>
              ))}
            </div>
            {link && (
              <>
                <div className="share-link" id="shareLink">{link}</div>
                <button type="button" className="book-cta" style={{ width: "100%", margin: "8px 0 0" }} onClick={copy}>{L("Copy link", "লিংক কপি করুন")}</button>
              </>
            )}
            {mode === "edit" && (
              <div className="share-members">
                <b>{L("Planning with you", "আপনার সাথে প্ল্যান করছেন")}</b>
                {members.length ? members.map((m) => <span key={m.user_id} className="pref-chip">{m.name || L("Traveler", "ভ্রমণকারী")}</span>) : <span className="sv-sub">{L("Nobody has joined yet — send them the link.", "এখনো কেউ যোগ দেয়নি — লিংক পাঠান।")}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- voice conversation ---------------- */
export function VoiceOverlay() {
  const lang = useLang();
  const v = useVoice();
  const [typed, setTyped] = useState("");
  const inputRef = useRef(null);
  const live = v.mode === "live";
  const caption = v.reply.length > 260 ? "…" + v.reply.slice(-260) : v.reply;
  return (
    <div className={"vdock" + (v.open ? " open" : "")} id="voiceOverlay" data-state={v.state} data-mode={v.mode} role="dialog" aria-label={L("Voice conversation with Tripo", "Tripo-র সাথে ভয়েস কথোপকথন")}>
      <div className="vd-head">
        <span className="vd-live"><i />{live ? L("Live voice", "লাইভ ভয়েস") : L("Voice", "ভয়েস")}</span>
        <span className="v-pill" id="vLang">{lang === "bn" ? "বাংলা" : "English"}</span>
        <button type="button" className="vd-x" aria-label={L("End voice chat", "ভয়েস চ্যাট শেষ করুন")} onClick={closeVoice}><Icon name="x" size={16} sw={2.4} /></button>
      </div>
      <div className="vd-main">
        <button type="button" className="vd-orb" id="vOrb" aria-label={v.state === "speaking" ? L("Interrupt", "থামান") : L("Talk", "কথা বলুন")} onClick={() => orbTap(() => inputRef.current && inputRef.current.focus())}>
          <span className="vd-ring r1" /><span className="vd-ring r2" />
          <span className="vd-core">
            {v.state === "speaking" ? <span className="vd-bars"><i /><i /><i /><i /></span> : v.state === "connecting" || v.state === "thinking" ? <span className="vd-dots"><i /><i /><i /></span> : <Icon name="micRound" size={28} />}
          </span>
        </button>
        <div className="vd-text">
          <div className="vd-status" id="vStatus" aria-live="polite">{v.status}</div>
          {v.heard ? <div className={"vd-said" + (v.interim ? " interim" : "")} id="vHeard">“{v.heard}”</div> : null}
          {caption ? <div className="vd-reply" id="vReply">{caption.replace(/\*\*/g, "")}</div> : null}
          {!v.heard && !caption && v.state === "listening" ? <div className="vd-hint">{L("Try: “Suggest a beach weekend near Dhaka”", "বলুন: “ঢাকার কাছে সৈকতে উইকেন্ড সাজেস্ট করো”")}</div> : null}
        </div>
      </div>
      {v.shown > 0 && <div className="vd-shown">✨ {v.shown === 1 ? L("1 card added to your chat and map", "চ্যাট ও ম্যাপে ১টি কার্ড যোগ হয়েছে") : L(v.shown + " cards added to your chat and map", "চ্যাট ও ম্যাপে " + v.shown + "টি কার্ড যোগ হয়েছে")}</div>}
      <form className="vd-type" id="vTypeForm" style={{ display: v.typeBox ? "flex" : "none" }} onSubmit={(e) => { e.preventDefault(); const x = typed.trim(); if (!x) return; setTyped(""); askTyped(x); }}>
        <input id="vTypeInput" ref={inputRef} type="text" autoComplete="off" placeholder={L("Type to Tripo…", "Tripo-কে লিখুন…")} value={typed} onChange={(e) => setTyped(e.target.value)} />
        <button type="submit" aria-label={L("Send", "পাঠান")}><Icon name="send" size={16} sw={2.4} /></button>
      </form>
      <div className="vd-controls">
        <button type="button" className={"vd-btn" + (v.muted ? " on" : "")} id="vMuteBtn" onClick={toggleMute} aria-pressed={v.muted}>
          <Icon name={live ? "mic" : "speaker"} size={18} />
          <span id="vMuteLbl">{live ? (v.muted ? L("Mic off", "মাইক বন্ধ") : L("Mic on", "মাইক চালু")) : v.muted ? L("Voice off", "ভয়েস বন্ধ") : L("Voice on", "ভয়েস চালু")}</span>
        </button>
        <button type="button" className={"vd-btn" + (v.typeBox ? " on" : "")} id="vTypeBtn" onClick={() => { if (toggleTypeBox()) setTimeout(() => inputRef.current && inputRef.current.focus(), 30); }}>
          <Icon name="keyboard" size={18} />
          <span>{L("Type", "লিখুন")}</span>
        </button>
        <button type="button" className="vd-btn end" id="vEndBtn" onClick={closeVoice}>
          <Icon name="x" size={18} sw={2.6} />
          <span>{L("End", "শেষ")}</span>
        </button>
      </div>
    </div>
  );
}
