"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import MapView from "@/components/map/MapView";
import { SaveButton, PlacePhoto, showPlace } from "@/components/chat/Cards";
import { keyFor } from "@/lib/tripo/places";
import { runtime } from "@/lib/tripo/travel";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useAskTripo, useOpenChat } from "@/lib/tripo/hooks";
import { L, t } from "@/lib/tripo/i18n";
import { CONTENT, AGENT_QUICK_KEYS } from "@/lib/tripo/content";
import { openVoice } from "@/lib/tripo/voice";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function MiniCard({ color, tag, title, sub, onClick }) {
  return (
    <div className="mini-card" role="button" tabIndex={0} onClick={onClick}>
      <div className="mini-card-thumb" style={{ background: color }} />
      <div>
        {tag ? <div className="mini-card-tag">{tag}</div> : null}
        <div className="mini-card-title">{title}</div>
        <div className="mini-card-sub">{sub}</div>
      </div>
    </div>
  );
}

const moreAbout = (title) => L('Tell me more about "' + title + '"', '"' + title + '" সম্পর্কে আরও বলুন');

/* ---------------- Explore: a city guide with a map ---------------- */
const guideCache = new Map(); // city guides already loaded in this visit
const WEATHER = [
  [0, 0, "☀️", ["Clear", "পরিষ্কার"]], [1, 3, "⛅", ["Partly cloudy", "আংশিক মেঘলা"]], [45, 48, "🌫", ["Foggy", "কুয়াশা"]],
  [51, 67, "🌧", ["Rain", "বৃষ্টি"]], [71, 77, "❄️", ["Snow", "তুষার"]], [80, 82, "🌦", ["Showers", "বৃষ্টি"]], [95, 99, "⛈", ["Thunderstorm", "বজ্রঝড়"]],
];
function weatherLabel(w) {
  if (!w) return "";
  const m = WEATHER.find((x) => w.code >= x[0] && w.code <= x[1]);
  return (m ? m[2] + " " : "") + w.temp + "°C" + (m ? " · " + L(m[3][0], m[3][1]) : "");
}

function ExploreCard({ item, group, city }) {
  const openTripPicker = useTripo((s) => s.openTripPicker);
  const isStay = group === "stays";
  const data = isStay
    ? { name: item.name, city: city.name, area: item.area || "", type: item.type || "", budget: item.budget || "" }
    : { name: item.name, country: city.name, scene: group === "food" ? "city" : "", tagline: item.why || "" };
  const kind = isStay ? "hotel" : "place";
  const open = () => showPlace(kind, isStay ? { ...data, why: item.why } : data, city.name);
  return (
    <div className="ex-card" data-name={item.name}>
      <div className="ex-media" role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }}>
        <PlacePhoto info={item.photo ? { photo: item.photo } : null} scene={isStay ? "hotel" : group === "food" ? "city" : ""} name={item.name + " " + city.name} />
        <SaveButton kind={kind} data={data} onImage />
        {item.lat == null && <span className="ex-nopin">{L("Not on map", "ম্যাপে নেই")}</span>}
      </div>
      <div className="ex-body">
        <div className="ex-name">{item.name}</div>
        <div className="ex-meta">{[item.type, item.area].filter(Boolean).join(" · ")}{item.budget ? <span className="budget"> {item.budget}</span> : null}</div>
        {item.why ? <div className="ex-why">{item.why}</div> : null}
        <div className="sv-actions">
          <button type="button" className="sv-chip y" onClick={() => openTripPicker(kind, data)}>{L("+ Add to trip", "+ ট্রিপে যোগ")}</button>
          <button type="button" className="sv-chip" onClick={open}>{L("Details", "বিস্তারিত")}</button>
        </div>
      </div>
    </div>
  );
}

export function ExploreScreen() {
  useLang();
  const ready = useTripo((s) => s.ready);
  const profile = useTripo((s) => s.profile);
  const mapFocus = useTripo((s) => s.mapFocus);
  const mapOpen = useTripo((s) => s.mapOpen);
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [tab, setTab] = useState("sights");
  const [text, setText] = useState("");

  const load = async (params, label) => {
    const key = JSON.stringify(params);
    if (guideCache.has(key)) { setState({ loading: false, data: guideCache.get(key), error: "" }); return; }
    setState((s) => ({ loading: true, data: null, error: "", label }));
    try {
      const res = await fetch("/api/explore?" + new URLSearchParams(params).toString());
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) throw new Error("not_found");
      if (!res.ok || !data.city) throw new Error("failed");
      // Let the place panel and map reuse what we already know about these places.
      const seed = {};
      ["sights", "food", "stays"].forEach((g) => (data[g] || []).forEach((it) => {
        const k = keyFor(g === "stays" ? "hotel" : "place", g === "stays" ? { name: it.name, city: data.city.name } : { name: it.name, country: data.city.name });
        it.key = k;
        seed[k] = it.lat != null || it.photo ? { ok: true, lat: it.lat ?? null, lng: it.lng ?? null, photo: it.photo || "", desc: it.desc || "", url: it.url || "", title: it.name } : { ok: false };
      }));
      useTripo.setState({ placeInfo: { ...useTripo.getState().placeInfo, ...seed } });
      if (!data.unavailable) guideCache.set(key, data);
      setState({ loading: false, data, error: "" });
    } catch (e) {
      setState({ loading: false, data: null, error: e.message === "not_found" ? "not_found" : "failed" });
    }
  };

  // First visit: the traveler's home city.
  useEffect(() => {
    if (!ready || query) return;
    const home = (profile && profile.home) || runtime.HOME_CITY || "Dhaka";
    setQuery(home);
    load({ q: home }, home);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const search = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setText("");
    setQuery(v);
    setTab("sights");
    load({ q: v }, v);
  };
  const nearMe = () => {
    if (!navigator.geolocation) { useTripo.getState().showToast(L("Location isn't available in this browser", "এই ব্রাউজারে লোকেশন পাওয়া যায় না")); return; }
    setState((s) => ({ ...s, loading: true, label: L("your location", "আপনার লোকেশন") }));
    navigator.geolocation.getCurrentPosition(
      (pos) => { setTab("sights"); load({ lat: pos.coords.latitude.toFixed(3), lng: pos.coords.longitude.toFixed(3) }, L("your location", "আপনার লোকেশন")); },
      () => { setState((s) => ({ ...s, loading: false })); useTripo.getState().showToast(L("Couldn't get your location", "আপনার লোকেশন পাওয়া যায়নি")); },
      { timeout: 10000, maximumAge: 600000 }
    );
  };

  const d = state.data;
  const tabs = [["sights", L("Things to do", "দর্শনীয় স্থান")], ["food", L("Eat & drink", "খাওয়া-দাওয়া")], ["stays", L("Stays", "থাকার জায়গা")]];
  const list = d ? d[tab] || [] : [];
  const pins = list.filter((x) => x.lat != null).map((x) => ({ key: x.key, lat: x.lat, lng: x.lng, name: x.name, kind: tab === "stays" ? "hotel" : tab === "food" ? "food" : "place" }));
  const select = (key) => {
    const it = list.find((x) => x.key === key);
    if (!it) return;
    const el = document.querySelector('.ex-card[data-name="' + CSS.escape(it.name) + '"] .ex-media');
    if (el) el.click();
  };

  return (
    <div className="view active" id="view-explore">
      <div className="ex-main">
        <div className="mini-head">
          <span className="mini-head-title" id="exploreCity">{d ? d.city.name : state.loading ? L("Exploring…", "খোঁজা হচ্ছে…") : L("Explore", "এক্সপ্লোর")}</span>
          <span className="mini-head-sub">{d ? [d.city.country, weatherLabel(d.weather)].filter(Boolean).join(" · ") : L("Find things to do, eat and stay — anywhere", "যেকোনো জায়গায় ঘোরা, খাওয়া ও থাকার জায়গা খুঁজুন")}</span>
          <form className="ex-search" onSubmit={search}>
            <Icon name="search" size={16} />
            <input id="exploreInput" type="text" value={text} maxLength={80} placeholder={L("Search a city — Bangkok, Sylhet, Bali…", "শহর খুঁজুন — ব্যাংকক, সিলেট, বালি…")} onChange={(e) => setText(e.target.value)} aria-label={L("City", "শহর")} />
            <button type="button" className="ex-near" onClick={nearMe} aria-label={L("Near me", "আমার কাছে")} title={L("Near me", "আমার কাছে")}><Icon name="locate" size={17} /></button>
          </form>
          <div className="filter-row" id="exploreTabs" style={{ marginTop: 10, marginBottom: -2 }}>
            {tabs.map((x) => (
              <button key={x[0]} type="button" className={"filter-chip" + (tab === x[0] ? " active" : "")} onClick={() => setTab(x[0])}>{x[1]}{d ? " · " + (d[x[0]] || []).length : ""}</button>
            ))}
            <button type="button" className="filter-chip map-toggle" onClick={() => useTripo.getState().setMapOpen(true)}><Icon name="map" size={14} /> {L("Map", "ম্যাপ")}</button>
          </div>
        </div>
        <div className="mini-list" id="exploreList">
          {state.loading && (
            <div className="trips-empty"><div className="typing" style={{ justifyContent: "center", display: "flex" }}><i /><i /><i /></div><p>{L("Building a guide for ", "গাইড তৈরি হচ্ছে: ") + (state.label || query)}… {L("This takes a few seconds the first time.", "প্রথমবার কয়েক সেকেন্ড লাগে।")}</p></div>
          )}
          {!state.loading && state.error && (
            <div className="trips-empty"><b>{state.error === "not_found" ? L("I couldn't find that place", "জায়গাটি খুঁজে পাইনি") : L("Couldn't load this guide", "গাইড লোড করা যায়নি")}</b><p>{L("Check the spelling or try a nearby city.", "বানান দেখে নিন অথবা কাছাকাছি শহর দিয়ে চেষ্টা করুন।")}</p></div>
          )}
          {!state.loading && d && d.unavailable && (
            <div className="trips-empty"><b>{L("The guide is busy right now", "গাইড এই মুহূর্তে ব্যস্ত")}</b><p>{L("Try again in a moment, or ask Tripo in the chat.", "একটু পরে আবার চেষ্টা করুন, অথবা চ্যাটে Tripo-কে জিজ্ঞাসা করুন।")}</p></div>
          )}
          {!state.loading && d && !d.unavailable && list.map((it) => <ExploreCard key={it.name} item={it} group={tab} city={d.city} />)}
          {!state.loading && d && !d.unavailable && !list.length && <div className="empty-note">{L("Nothing here yet for this place.", "এই জায়গার জন্য এখনো কিছু নেই।")}</div>}
          {!state.loading && d && !d.unavailable && list.length > 0 && <div className="ex-note">{L("Picked by Tripo's AI and placed on the map with OpenStreetMap data. Check details before you go.", "Tripo-র AI বাছাই করেছে, OpenStreetMap ডেটা দিয়ে ম্যাপে বসানো। যাওয়ার আগে তথ্য মিলিয়ে নিন।")}</div>}
        </div>
      </div>
      <div className={"chat-map" + (mapOpen ? " open" : "")} id="exploreMap">
        <MapView points={pins} focusKey={mapFocus} onSelect={select} fitKey={(d ? d.city.name : "") + tab} emptyHint={state.loading ? "" : L("Search a city to see it on the map.", "ম্যাপে দেখতে শহর খুঁজুন।")} />
        <button type="button" className="map-close" aria-label={L("Back to list", "তালিকায় ফিরুন")} onClick={() => useTripo.getState().setMapOpen(false)}>
          <Icon name="back" size={18} sw={2.2} /> {L("List", "তালিকা")}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Inspiration ---------------- */
export function InspirationScreen() {
  const lang = useLang();
  const ask = useAskTripo();
  return (
    <div className="view active" id="view-inspiration">
      <div className="mini-head">
        <span className="mini-head-title">{t("tabInspiration")}</span>
        <span className="mini-head-sub" id="inspirationSub">{t("resultsIntro.inspiration")}</span>
      </div>
      <div className="mini-list" id="inspirationList">
        {CONTENT.inspiration.map((item) => (
          <MiniCard key={item.title.en} color={item.color} tag={item.tag[lang]} title={item.title[lang]} sub={item.sub[lang]} onClick={() => ask(moreAbout(item.title[lang]))} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- My Agent: quick ask ---------------- */
export function AgentScreen() {
  useLang();
  const ask = useAskTripo();
  const openChat = useOpenChat();
  const [text, setText] = useState("");
  return (
    <div className="view active" id="view-agent">
      <div className="mini-head">
        <span className="mini-head-title">{t("tabAgent")}</span>
        <span className="mini-head-sub">{t("agentSub")}</span>
      </div>
      <div className="agent-panel">
        <div className="agent-greeting">{t("agentGreeting")}</div>
        <div className="filter-row" id="agentQuickActions" style={{ justifyContent: "center", marginBottom: 22 }}>
          {AGENT_QUICK_KEYS.map((key) => (
            <button key={key} type="button" className="filter-chip" onClick={() => { openChat(); useTripo.getState().categoryTap(key); }}>{t("tabs." + key)}</button>
          ))}
          <button type="button" className="filter-chip" onClick={() => document.getElementById("agentInput").focus()}>{t("agentActionAskAnything")}</button>
        </div>
        <button className="agent-mic" id="agentMicBtn" aria-label="Speak to Tripo" onClick={() => { openChat(); openVoice(); }}>
          <Icon name="mic" size={30} sw={1.8} color="#0A0A0A" />
        </button>
        <div className="agent-hint" id="agentHint">{t("tapToSpeak")}</div>
        <form className="agent-field" id="agentForm" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; const v = text; setText(""); ask(v); }}>
          <input id="agentInput" type="text" placeholder={t("agentPlaceholder")} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="agent-send" aria-label="Send"><Icon name="send" size={15} color="#0A0A0A" /></button>
        </form>
      </div>
    </div>
  );
}
