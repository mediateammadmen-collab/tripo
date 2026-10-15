"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { RichText } from "@/components/ui/Scene";
import Photo from "@/components/ui/Photo";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useMedia } from "@/lib/tripo/hooks";
import { usePins } from "@/lib/tripo/usePins";
import { pointsFromBlocks } from "@/lib/tripo/places";
import { accountsEnabled } from "@/lib/supabase/client";
import MapView from "@/components/map/MapView";
import { L, t } from "@/lib/tripo/i18n";
import { CONTENT, WELCOME_IDEAS, CARD_PHOTOS } from "@/lib/tripo/content";
import { runtime, whatsappUrl } from "@/lib/tripo/travel";
import { openVoice } from "@/lib/tripo/voice";
import { Places, Itinerary, FlightCard, HotelCard, showPlace } from "./Cards";

/* Opens the real-person help: WhatsApp when a number is configured, otherwise the in-app pane. */
export function openExpert() {
  if (runtime.AGENT_WHATSAPP) window.open(whatsappUrl(), "_blank", "noopener");
  else useTripo.getState().setChatSub("expert");
}

/* ---------------- chat blocks ---------------- */
function Message({ b }) {
  return (
    <div className={"msg-row " + b.role}>
      <div className={"msg " + b.role}>
        {b.role === "assistant" ? <RichText text={b.text} /> : <div className="rt">{b.text}</div>}
        <div className="msg-meta">
          <span className="msg-time">{b.time}</span>
          {b.role === "user" && <span className="msg-ticks"><Icon name="ticks" size={14} sw={1.6} style={{ height: 10 }} /></span>}
        </div>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="msg-row assistant">
      <div className="msg assistant">
        <div className="typing" aria-label={L("Tripo is typing", "Tripo লিখছে")}><i /><i /><i /></div>
      </div>
    </div>
  );
}

const WELCOME_CHIPS = ["flights", "stay", "planTrip", "planForMe", "packages"];

// The start of every conversation: talk live, tap an idea, or pick a shortcut.
function QuickChips() {
  const categoryTap = useTripo((s) => s.categoryTap);
  const send = useTripo((s) => s.sendChatMessage);
  const lang = useTripo((s) => s.lang);
  return (
    <div className="welcome">
      <button type="button" className="wl-voice" id="welcomeVoice" onClick={openVoice}>
        <span className="wl-orb"><Icon name="micRound" size={22} /></span>
        <span className="wl-voice-text">
          <b>{L("Talk to Tripo — live", "Tripo-র সাথে লাইভ কথা বলুন")}</b>
          <small>{L("Just say where you want to go. Places appear on your map while Tripo talks.", "শুধু বলুন কোথায় যেতে চান। Tripo কথা বলার সময়ই জায়গাগুলো ম্যাপে চলে আসবে।")}</small>
        </span>
        <span className="wl-go"><Icon name="chevRight" size={18} sw={2.4} /></span>
      </button>
      <div className="wl-ideas">
        {WELCOME_IDEAS.map((x) => (
          <button key={x.name} type="button" className="wl-idea" onClick={() => send(x.ask[lang])}>
            <Photo className="wl-art" q={{ name: x.name, context: x.country, kind: "place" }} caption={false} />
            <span>{x.title[lang]}</span>
          </button>
        ))}
      </div>
      <div className="quick-wrap">
        {WELCOME_CHIPS.map((key) => (
          <button key={key} type="button" className="quick-chip" onClick={() => categoryTap(key)}>{t("tabs." + key)}</button>
        ))}
        <button type="button" className="quick-chip agent" onClick={openExpert}>{L("👤 Talk to a real person", "👤 আসল মানুষের সাথে কথা বলুন")}</button>
      </div>
    </div>
  );
}

function ResultCards({ k }) {
  const lang = useTripo((s) => s.lang);
  const send = useTripo((s) => s.sendChatMessage);
  return (
    <div className="result-card-row">
      {(CONTENT[k] || []).map((item) => (
        <button
          key={item.title.en}
          type="button"
          className="result-card"
          onClick={() => send(L('Tell me more about "' + item.title.en + '"', '"' + item.title.bn + '" সম্পর্কে আরও বলুন'))}
        >
          <Photo className="result-card-media" q={CARD_PHOTOS[item.title.en] ? { name: CARD_PHOTOS[item.title.en][0], context: CARD_PHOTOS[item.title.en][1], kind: "place" } : null} icon="spark" caption={false} />
          <div className="result-card-body">
            <div className="result-card-tag">{item.tag[lang]}</div>
            <div className="result-card-title">{item.title[lang]}</div>
            <div className="result-card-sub">{item.sub[lang]}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function Handoff() {
  return (
    <div className="rich">
      <div className="handoff">
        <div className="handoff-av"><Icon name="headset" size={18} color="#0A0A0A" /></div>
        <div style={{ minWidth: 0 }}>
          <b>{L("Talk to a real travel expert", "আসল ট্রাভেল এক্সপার্টের সাথে কথা বলুন")}</b>
          <small>{L("A person from our team will help 1-to-1 with custom plans, visas, group trips and bookings.", "আমাদের টিমের একজন মানুষ কাস্টম প্ল্যান, ভিসা, গ্রুপ ট্রিপ ও বুকিংয়ে সরাসরি সাহায্য করবে।")}</small>
          <div className="handoff-btns">
            {runtime.AGENT_WHATSAPP ? (
              <a className="hb alt" target="_blank" rel="noopener" href={whatsappUrl()}><Icon name="whatsapp" size={14} /> WhatsApp</a>
            ) : (
              <button type="button" className="hb" onClick={openExpert}>{L("Chat now", "এখনই চ্যাট")}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Suggestions({ b }) {
  const send = useTripo((s) => s.sendChatMessage);
  const removeBlock = useTripo((s) => s.removeBlock);
  const list = (b.list || []).filter(Boolean).slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="sugg-wrap">
      {list.map((sug, i) => (
        <button key={i} type="button" className="sugg" onClick={() => { removeBlock(b.id); send(String(sug)); }}>{String(sug)}</button>
      ))}
    </div>
  );
}

function Block({ b }) {
  switch (b.t) {
    case "msg": return <Message b={b} />;
    case "typing": return <Typing />;
    case "chips": return <QuickChips />;
    case "cards": return <ResultCards k={b.key} />;
    case "places": return <Places places={b.places} />;
    case "itin": return <Itinerary items={b.items} dest={b.dest} />;
    case "flight": return <FlightCard f={b.f} />;
    case "hotel": return <HotelCard h={b.h} />;
    case "handoff": return <Handoff />;
    case "sugg": return <Suggestions b={b} />;
    default: return null;
  }
}

/* ---------------- the Tripo conversation ---------------- */
function AiThread({ active, onBack, pinCount }) {
  const router = useRouter();
  const blocks = useTripo((s) => s.blocks);
  const ready = useTripo((s) => s.ready);
  const send = useTripo((s) => s.sendChatMessage);
  const showTrips = useTripo((s) => s.showTrips);
  const showToast = useTripo((s) => s.showToast);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const bodyRef = useRef(null);
  const recRef = useRef(null);

  useEffect(() => {
    if (ready) useTripo.getState().ensureGreeting();
  }, [ready]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [blocks, active]);

  const submit = () => {
    const v = text;
    if (!v.trim()) return false;
    setText("");
    send(v);
    return true;
  };

  const micTap = () => {
    if (submit()) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast(t("micUnsupported")); return; }
    if (listening && recRef.current) { recRef.current.stop(); return; }
    const rec = new SR();
    recRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = useTripo.getState().lang === "bn" ? "bn-BD" : "en-US";
    rec.onstart = () => setListening(true);
    rec.onend = rec.onerror = () => setListening(false);
    rec.onresult = (evt) => {
      const said = evt.results && evt.results[0] && evt.results[0][0] ? evt.results[0][0].transcript : "";
      if (said) send(said);
    };
    try { rec.start(); } catch {}
  };

  return (
    <div className={"chat-subview" + (active ? " active" : "")} id="threadAI">
      <div className="head">
        <button className="head-btn" id="aiBackBtn" aria-label="Back" onClick={onBack}><Icon name="back" size={20} sw={2.2} /></button>
        <div className="head-avatar"><Icon name="sparkSolid" size={17} color="#fff" /></div>
        <div className="head-title">
          <span>Tripo</span>
          <span className="head-status" id="headStatus">{t("headStatus")}</span>
        </div>
        <button className="head-btn map-toggle" id="aiMapBtn" aria-label={L("Show the map", "ম্যাপ দেখুন")} title={L("Map", "ম্যাপ")} onClick={() => useTripo.getState().setMapOpen(true)}>
          <Icon name="map" size={19} />
          {pinCount > 0 && <span className="map-count">{pinCount}</span>}
        </button>
        <button className="head-btn" id="aiVoiceBtn" aria-label="Voice conversation" title={L("Talk to Tripo", "Tripo-র সাথে কথা বলুন")} onClick={openVoice}><Icon name="wave" size={19} sw={2.2} /></button>
        <button className="head-btn" id="aiSavedBtn" aria-label="My plan" title={L("My plan", "আমার প্ল্যান")} onClick={() => { showTrips("trips", null); router.push("/trips"); }}><Icon name="bookmark" size={19} /></button>
        <button className="head-btn" id="aiExpertBtn" aria-label="Talk to a real travel expert" title={L("Talk to a real person", "আসল মানুষের সাথে কথা বলুন")} onClick={openExpert}><Icon name="headset" size={19} /></button>
        <button className="head-btn" id="newChatBtn2" aria-label={L("New chat", "নতুন চ্যাট")} title={L("New chat", "নতুন চ্যাট")} onClick={() => useTripo.getState().newChat()}><Icon name="plus" size={20} sw={2.2} /></button>
      </div>

      <div className="body" id="chatBody" ref={bodyRef}>
        {blocks.length > 0 && <div className="day-divider">{L("Today", "আজ")}</div>}
        {blocks.map((b) => <Block key={b.id} b={b} />)}
      </div>

      <form className="input-row" id="chatForm" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="field-wrap">
          <input id="chatInput" type="text" placeholder={t("chatPlaceholder")} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button type="button" className={"send-circle" + (listening ? " listening" : "")} id="micBtn" aria-label="Send or speak" onClick={micTap}>
          <Icon name={text.trim() ? "send" : "mic"} size={16} id="micIcon" />
        </button>
      </form>
    </div>
  );
}

/* ---------------- real-person help (in-app chat arrives with accounts) ---------------- */
function ExpertThread({ active, onBack }) {
  return (
    <div className={"chat-subview" + (active ? " active" : "")} id="threadExpert">
      <div className="head">
        <button className="head-btn" id="expertBackBtn" aria-label="Back" onClick={onBack}><Icon name="back" size={20} sw={2.2} /></button>
        <div className="head-avatar" style={{ background: "#1E9E55", color: "#fff" }}><Icon name="headset" size={17} /></div>
        <div className="head-title">
          <span id="expertHeadName">{L("Travel expert", "ট্রাভেল এক্সপার্ট")}</span>
          <span className="head-status" id="expertHeadStatus">{L("Real person", "আসল মানুষ")}</span>
        </div>
      </div>
      <div className="body" id="expertBody">
        <div className="sys-note">
          {L("👋 Hi! Our travel experts help 1-to-1 with custom trips, visas, group bookings and booking problems.", "👋 হাই! আমাদের ট্রাভেল এক্সপার্টরা কাস্টম ট্রিপ, ভিসা, গ্রুপ বুকিং ও বুকিং সমস্যায় সরাসরি সাহায্য করেন।")}
        </div>
        <div className="sys-note" style={{ borderStyle: "solid" }}>
          {L("Live chat with our team is coming here soon. Until then, Tripo can help you plan right away.", "আমাদের টিমের সাথে লাইভ চ্যাট শিগগিরই এখানে আসছে। ততক্ষণ Tripo এখনই প্ল্যান করতে সাহায্য করবে।")}
          {runtime.AGENT_WHATSAPP ? (
            <div style={{ marginTop: 8 }}>
              <a className="hb alt" target="_blank" rel="noopener" href={whatsappUrl()}><Icon name="whatsapp" size={14} /> {L("Message us on WhatsApp", "WhatsApp-এ মেসেজ করুন")}</a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------- the map beside the conversation ---------------- */
function ChatMap({ points, pins, lines }) {
  // Frame the newest suggestions (everything from Tripo's latest answer that has places).
  const lastBlock = points.length ? points[points.length - 1].block : "";
  const newest = points.filter((p) => p.block === lastBlock).map((p) => p.key);
  const mapFocus = useTripo((s) => s.mapFocus);
  const mapOpen = useTripo((s) => s.mapOpen);
  const chatId = useTripo((s) => s.chatId);
  const select = (key) => {
    const p = points.find((x) => x.key === key);
    if (p) showPlace(p.kind, p.kind === "stop" ? { name: p.name, context: p.query.context } : p.data, p.query.context);
  };
  return (
    <div className={"chat-map" + (mapOpen ? " open" : "")} id="chatMap">
      <MapView
        points={pins}
        lines={lines}
        focusKey={mapFocus}
        onSelect={select}
        fitKey={(chatId || "new") + lastBlock}
        fitTo={newest}
        emptyHint={L("Places Tripo suggests will appear here on the map.", "Tripo যে জায়গাগুলো সাজেস্ট করবে সেগুলো এখানে ম্যাপে দেখা যাবে।")}
      />
      {pins.length > 0 && <div className="map-badge">{pins.length + L(pins.length === 1 ? " place" : " places", " টি জায়গা")}</div>}
      <button type="button" className="map-close" aria-label={L("Back to chat", "চ্যাটে ফিরুন")} onClick={() => useTripo.getState().setMapOpen(false)}>
        <Icon name="back" size={18} sw={2.2} /> {L("Chat", "চ্যাট")}
      </button>
    </div>
  );
}

/* ---------------- list of conversations ---------------- */
function when(ms) {
  const d = Math.floor((Date.now() - ms) / 86400000);
  if (d <= 0) return L("Today", "আজ");
  if (d === 1) return L("Yesterday", "গতকাল");
  if (d < 7) return d + L(" days ago", " দিন আগে");
  const dt = new Date(ms);
  return dt.getDate() + "/" + (dt.getMonth() + 1);
}

function ChatsList({ sub, always, open }) {
  const router = useRouter();
  const profile = useTripo((s) => s.profile);
  const user = useTripo((s) => s.user);
  const authReady = useTripo((s) => s.authReady);
  const trips = useTripo((s) => s.trips);
  const saved = useTripo((s) => s.saved);
  const chats = useTripo((s) => s.chats);
  const chatId = useTripo((s) => s.chatId);
  const setDrawer = useTripo((s) => s.setDrawer);
  const showTrips = useTripo((s) => s.showTrips);
  const planSub = trips.length || saved.length
    ? trips.length + L(trips.length === 1 ? " trip" : " trips", " টি ট্রিপ") + " · " + saved.length + L(" saved", " সেভ করা")
    : L("Save places, flights & hotels · build a trip", "জায়গা, ফ্লাইট ও হোটেল সেভ করুন · ট্রিপ বানান");
  const cur = (name) => (always && sub === name ? " current" : "");
  const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const showAccountRow = accountsEnabled && authReady && !user;

  return (
    <div className={"chat-subview" + (sub === "list" ? " active" : "")} id="chatsList">
      <div className="head">
        <button className="head-btn" id="menuBtn" aria-label="Menu" onClick={() => setDrawer(true)}><Icon name="menu" size={21} /></button>
        <Link href="/" className="head-logo" aria-label="Tripo home"><Icon name="sparkSolid" size={15} color="#FFFC00" /></Link>
        <div className="head-title" style={{ flexGrow: 1 }}><span>{t("tabChats")}</span></div>
        <button className="new-chat-btn" id="newChatBtn" onClick={() => { useTripo.getState().newChat(); open("ai"); }}>
          <Icon name="plus" size={15} sw={2.4} /> {L("New chat", "নতুন চ্যাট")}
        </button>
      </div>
      <div className="mini-list" id="chatsListRows">
        {showAccountRow && (
          <div className="chat-list-row signup-row" id="accountRow" role="button" tabIndex={0} onClick={() => router.push("/login")}>
            <div className="chat-list-avatar" style={{ background: "#FFFC00", color: "#0A0A0A" }}><Icon name="user" size={18} /></div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div className="chat-list-name">{L("Create a free account", "ফ্রি অ্যাকাউন্ট খুলুন")}</div>
              <div className="chat-list-sub">{L("Keep your trips and chats on every device", "সব ডিভাইসে আপনার ট্রিপ ও চ্যাট রাখুন")}</div>
            </div>
            <span className="new-trip-btn" style={{ padding: "7px 12px" }}>{L("Sign in", "সাইন ইন")}</span>
          </div>
        )}
        {!profile && !showAccountRow && (
          <div className="chat-list-row signup-row" id="styleRow" role="button" tabIndex={0} onClick={() => router.push("/signup")}>
            <div className="chat-list-avatar" style={{ background: "#0A0A0A", color: "#FFFC00", fontSize: 18 }}>✨</div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div className="chat-list-name">{L("Tell Tripo your travel style", "Tripo-কে আপনার ভ্রমণের ধরন জানান")}</div>
              <div className="chat-list-sub">{L("9 quick questions · 1 minute", "৯টি ছোট প্রশ্ন · ১ মিনিট")}</div>
            </div>
            <span className="new-trip-btn" style={{ padding: "7px 12px" }}>{L("Start", "শুরু")}</span>
          </div>
        )}
        <div className="chat-list-row trips-row" role="button" tabIndex={0} onClick={() => { showTrips("trips", null); router.push("/trips"); }}>
          <div className="chat-list-avatar" style={{ background: "#FFFC00", color: "#0A0A0A" }}><Icon name="suitcase" size={18} /></div>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div className="chat-list-name">{L("My plan", "আমার প্ল্যান")}</div>
            <div className="chat-list-sub">{planSub}</div>
          </div>
          <Icon name="chevRight" size={16} style={{ color: "var(--muted)" }} />
        </div>
        <div className={"chat-list-row" + (always && sub === "ai" && !chats.some((c) => c.id === chatId) ? " current" : "")} data-sub="ai" role="button" tabIndex={0} onClick={() => open("ai")}>
          <div className="chat-list-avatar" style={{ background: "#0A0A0A" }}><Icon name="sparkSolid" size={18} color="#FFFC00" /></div>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div className="chat-list-name">Tripo</div>
            <div className="chat-list-sub" style={ellipsis}>{t("chatsTripoSub")}</div>
          </div>
        </div>
        <div className={"chat-list-row" + cur("expert")} data-sub="expert" role="button" tabIndex={0} onClick={openExpert}>
          <div className="chat-list-avatar" style={{ background: "#1E9E55" }}><Icon name="headset" size={18} color="#fff" /></div>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div className="chat-list-name">
              {L("Travel expert", "ট্রাভেল এক্সপার্ট")}
              <span className="expert-badge">{L("Real person", "আসল মানুষ")}</span>
            </div>
            <div className="chat-list-sub" style={ellipsis}>{L("Get 1-to-1 help from a real person", "আসল মানুষের কাছ থেকে সরাসরি সাহায্য নিন")}</div>
          </div>
        </div>

        {chats.length > 0 && <div className="sec-head" style={{ margin: "10px 2px 0" }}>{L("Recent chats", "সাম্প্রতিক চ্যাট")}</div>}
        {chats.map((c) => (
          <div key={c.id} className={"chat-list-row past-chat" + (c.id === chatId ? " current" : "")} role="button" tabIndex={0} onClick={() => useTripo.getState().openChat(c.id)}>
            <div className="chat-list-avatar small"><Icon name="chat" size={15} /></div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div className="chat-list-name" style={ellipsis}>{c.title || L("Chat", "চ্যাট")}</div>
              <div className="chat-list-sub">{when(c.updatedAt || Date.now())}</div>
            </div>
            <button type="button" className="sv-x" aria-label={L("Delete chat", "চ্যাট মুছুন")} onClick={(e) => { e.stopPropagation(); useTripo.getState().deleteChat(c.id); }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatScreen() {
  useLang();
  const listAlways = useMedia("(min-width:1500px)"); // very wide: conversations list stays visible
  const rawSub = useTripo((s) => s.chatSub);
  const blocks = useTripo((s) => s.blocks);
  const setChatSub = useTripo((s) => s.setChatSub);
  const sub = listAlways && rawSub === "list" ? "ai" : rawSub;
  const back = () => setChatSub("list");
  // With the map beside the chat (wide screens), start on the conversation rather than the list.
  useEffect(() => {
    if (window.matchMedia("(min-width:1100px)").matches && useTripo.getState().chatSub === "list") setChatSub("ai");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const points = pointsFromBlocks(blocks);
  const { pins, lines } = usePins(points);
  return (
    <div className="view active" id="view-chats">
      <ChatsList sub={sub} always={listAlways} open={setChatSub} />
      <AiThread active={sub === "ai"} onBack={back} pinCount={pins.length} />
      <ExpertThread active={sub === "expert"} onBack={back} />
      <ChatMap points={points} pins={pins} lines={lines} />
    </div>
  );
}
