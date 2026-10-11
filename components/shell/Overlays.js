"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Scene, RichText } from "@/components/ui/Scene";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useOpenChat } from "@/lib/tripo/hooks";
import { L, t } from "@/lib/tripo/i18n";
import { TABS } from "@/lib/tripo/content";
import { AIRPORTS } from "@/lib/tripo/travel";
import { tripDates } from "@/lib/tripo/items";
import { FRIEND_COLORS, initials, ymd } from "@/lib/tripo/util";
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
          <div className="wordmark">
            <Icon name="sparkSolid" size={17} />
            <span>Tripo</span>
          </div>
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

/* ---------------- add a saved item to a trip ---------------- */
export function TripPicker() {
  useLang();
  const itemId = useTripo((s) => s.tripPickerItemId);
  const saved = useTripo((s) => s.saved);
  const trips = useTripo((s) => s.trips);
  const close = useTripo((s) => s.closeTripPicker);
  const assignItem = useTripo((s) => s.assignItem);
  const openTripForm = useTripo((s) => s.openTripForm);
  const showToast = useTripo((s) => s.showToast);
  const it = saved.find((x) => x.id === itemId) || null;
  const open = !!it;

  const newTrip = () => {
    close();
    const dest = it ? (it.kind === "place" ? it.data.name : it.kind === "hotel" ? it.data.city : AIRPORTS[it.data.to] || it.data.toCity || "") : "";
    openTripForm(null, { dest, assignItem: itemId });
  };

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} id="tripPickOverlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3 id="tripPickTitle">{L("Add to a trip", "ট্রিপে যোগ করুন")}</h3>
          <button className="close-x" aria-label="Close" onClick={close}><Icon name="x" size={18} sw={2.2} /></button>
        </div>
        <div id="tripPickList">
          {open && !trips.length && (
            <div className="empty-note">{L("No trips yet. Create one to group your saved places, flights and hotels.", "এখনো কোনো ট্রিপ নেই। একটি ট্রিপ বানিয়ে সেভ করা জিনিস গুছিয়ে রাখুন।")}</div>
          )}
          {open && trips.map((tr) => {
            const on = it.tripId === tr.id;
            return (
              <button
                key={tr.id}
                type="button"
                className={"pick-row" + (on ? " on" : "")}
                onClick={() => {
                  assignItem(it.id, on ? null : tr.id);
                  close();
                  showToast(on ? L("Removed from trip", "ট্রিপ থেকে সরানো হয়েছে") : L("Added to ", "যোগ হয়েছে: ") + tr.name);
                }}
              >
                <Scene className="sv-thumb" name={tr.dest || tr.name} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div className="sv-title">{tr.name}</div>
                  <div className="sv-sub">{tripDates(tr) || tr.dest || ""}</div>
                </div>
                {on && <span className="pick-check">✓</span>}
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
  const [v, setV] = useState({ name: "", dest: "", start: "", end: "" });
  const nameRef = useRef(null);

  useEffect(() => {
    if (!form) return;
    const p = form.pending || {};
    setV({
      name: tr ? tr.name : p.name || (p.dest ? p.dest + L(" trip", " ট্রিপ") : ""),
      dest: tr ? tr.dest || "" : p.dest || "",
      start: tr ? tr.start || "" : p.start || "",
      end: tr ? tr.end || "" : p.end || "",
    });
    const id = setTimeout(() => nameRef.current && nameRef.current.focus(), 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const onSubmit = (e) => {
    e.preventDefault();
    const { trip, isNew } = submitTrip({ name: v.name.trim(), dest: v.dest.trim(), start: v.start, end: v.end });
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
            <input id="tfName" ref={nameRef} type="text" placeholder={L("e.g. Bangkok with friends", "যেমন বন্ধুদের সাথে ব্যাংকক")} autoComplete="off" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </div>
          <div className="bf">
            <label htmlFor="tfDest">{L("Destination", "গন্তব্য")}</label>
            <input id="tfDest" type="text" placeholder={L("City or country", "শহর বা দেশ")} autoComplete="off" value={v.dest} onChange={(e) => setV({ ...v, dest: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="bf">
              <label htmlFor="tfStart">{L("Start", "শুরু")}</label>
              <input id="tfStart" type="date" min={open ? ymd(new Date()) : undefined} value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />
            </div>
            <div className="bf">
              <label htmlFor="tfEnd">{L("End", "শেষ")}</label>
              <input id="tfEnd" type="date" min={v.start || undefined} value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} />
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

/* ---------------- voice conversation ---------------- */
export function VoiceOverlay() {
  const lang = useLang();
  const v = useVoice();
  const [typed, setTyped] = useState("");
  const inputRef = useRef(null);
  return (
    <div className={"voice-ov" + (v.open ? " open" : "")} id="voiceOverlay" data-state={v.state} role="dialog" aria-label="Voice conversation with Tripo">
      <div className="v-top">
        <b>Tripo · Voice</b>
        <span className="v-pill" id="vLang">{lang === "bn" ? "বাংলা" : "English"}</span>
      </div>
      <div className="v-center">
        <div className="v-status" id="vStatus" aria-live="polite">{v.status}</div>
        <button type="button" className="v-orb" id="vOrb" aria-label="Talk" onClick={() => orbTap(() => inputRef.current && inputRef.current.focus())}>
          <Icon name="micRound" size={54} className="v-mic" />
          <span className="v-bars"><i /><i /><i /><i /><i /></span>
        </button>
        <div className={"v-heard" + (v.interim ? " interim" : "")} id="vHeard">{v.heard ? "“" + v.heard + "”" : ""}</div>
        {v.reply ? <RichText className="v-reply" text={v.reply} /> : <div className="v-reply" id="vReply" />}
        <button type="button" className="v-link" id="vShowChat" onClick={closeVoice}>
          {L("See places, flights & hotels in the chat", "চ্যাটে জায়গা, ফ্লাইট ও হোটেল দেখুন")}
        </button>
      </div>
      <form className="v-type" id="vTypeForm" onSubmit={(e) => { e.preventDefault(); const x = typed.trim(); if (!x) return; setTyped(""); askTyped(x); }}>
        <div id="vTypeRow" style={{ display: v.typeBox ? "flex" : "none", flex: 1, gap: 8 }}>
          <input id="vTypeInput" ref={inputRef} type="text" autoComplete="off" placeholder={L("Type your question…", "আপনার প্রশ্ন লিখুন…")} value={typed} onChange={(e) => setTyped(e.target.value)} />
          <button type="submit" aria-label="Send">→</button>
        </div>
      </form>
      <div className="v-controls">
        <button type="button" className={"v-ctl" + (v.muted ? " on" : "")} id="vMuteBtn" onClick={toggleMute}>
          <span className="c"><Icon name="speaker" size={22} /></span>
          <span id="vMuteLbl">{v.muted ? L("Voice off", "ভয়েস বন্ধ") : L("Voice on", "ভয়েস চালু")}</span>
        </button>
        <button type="button" className="v-ctl end" id="vEndBtn" onClick={closeVoice}>
          <span className="c"><Icon name="x" size={26} sw={2.4} color="#fff" /></span>
          <span>{L("End", "শেষ")}</span>
        </button>
        <button type="button" className="v-ctl" id="vTypeBtn" onClick={() => { if (toggleTypeBox()) setTimeout(() => inputRef.current && inputRef.current.focus(), 30); }}>
          <span className="c"><Icon name="keyboard" size={22} /></span>
          <span>{L("Type", "লিখুন")}</span>
        </button>
      </div>
    </div>
  );
}
