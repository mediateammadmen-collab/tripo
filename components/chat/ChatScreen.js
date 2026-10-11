"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Scene, RichText } from "@/components/ui/Scene";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useWide } from "@/lib/tripo/hooks";
import { L, t } from "@/lib/tripo/i18n";
import { TABS, CONTENT } from "@/lib/tripo/content";
import { runtime, whatsappUrl } from "@/lib/tripo/travel";
import { openVoice } from "@/lib/tripo/voice";
import { Places, Itinerary, FlightCard, HotelCard } from "./Cards";

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

function QuickChips() {
  const categoryTap = useTripo((s) => s.categoryTap);
  return (
    <div className="quick-wrap">
      {TABS.map((key) => (
        <button key={key} type="button" className="quick-chip" onClick={() => categoryTap(key)}>{t("tabs." + key)}</button>
      ))}
      <button type="button" className="quick-chip voice" onClick={openVoice}>{L("🎙 Talk to Tripo", "🎙 Tripo-র সাথে কথা বলুন")}</button>
      <button type="button" className="quick-chip agent" onClick={openExpert}>{L("👤 Talk to a real person", "👤 আসল মানুষের সাথে কথা বলুন")}</button>
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
          <Scene className="result-card-media" name={item.title.en} />
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
function AiThread({ active, onBack }) {
  const router = useRouter();
  const blocks = useTripo((s) => s.blocks);
  const ready = useTripo((s) => s.ready);
  const send = useTripo((s) => s.sendChatMessage);
  const setInvite = useTripo((s) => s.setInvite);
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
        <button className="head-btn" id="aiVoiceBtn" aria-label="Voice conversation" title={L("Talk to Tripo", "Tripo-র সাথে কথা বলুন")} onClick={openVoice}><Icon name="wave" size={19} sw={2.2} /></button>
        <button className="head-btn" id="aiSavedBtn" aria-label="My plan" title={L("My plan", "আমার প্ল্যান")} onClick={() => { showTrips("trips", null); router.push("/trips"); }}><Icon name="bookmark" size={19} /></button>
        <button className="head-btn" id="aiExpertBtn" aria-label="Talk to a real travel expert" title={L("Talk to a real person", "আসল মানুষের সাথে কথা বলুন")} onClick={openExpert}><Icon name="headset" size={19} /></button>
        <button className="head-btn" id="inviteOpenBtn2" aria-label="Invite friends" onClick={() => setInvite(true)}><Icon name="userPlus" size={19} /></button>
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

/* ---------------- list of conversations ---------------- */
function ChatsList({ sub, wide, open }) {
  const router = useRouter();
  const profile = useTripo((s) => s.profile);
  const trips = useTripo((s) => s.trips);
  const saved = useTripo((s) => s.saved);
  const history = useTripo((s) => s.history);
  const setDrawer = useTripo((s) => s.setDrawer);
  const setInvite = useTripo((s) => s.setInvite);
  const showTrips = useTripo((s) => s.showTrips);
  const last = history.length ? (history[history.length - 1].display || history[history.length - 1].content).replace(/\*\*/g, "") : t("chatsTripoSub");
  const planSub = trips.length || saved.length
    ? trips.length + L(trips.length === 1 ? " trip" : " trips", " টি ট্রিপ") + " · " + saved.length + L(" saved", " সেভ করা")
    : L("Save places, flights & hotels · build a trip", "জায়গা, ফ্লাইট ও হোটেল সেভ করুন · ট্রিপ বানান");
  const cur = (name) => (wide && sub === name ? " current" : "");

  return (
    <div className={"chat-subview" + (sub === "list" ? " active" : "")} id="chatsList">
      <div className="head">
        <button className="head-btn" id="menuBtn" aria-label="Menu" onClick={() => setDrawer(true)}><Icon name="menu" size={21} /></button>
        <div className="head-title" style={{ flexGrow: 1 }}><span>{t("tabChats")}</span></div>
        <button className="head-btn" id="inviteOpenBtn" aria-label="Invite friends" onClick={() => setInvite(true)}><Icon name="userPlus" size={19} /></button>
      </div>
      <div className="mini-list" id="chatsListRows">
        {!profile && (
          <div className="chat-list-row signup-row" role="button" tabIndex={0} onClick={() => router.push("/signup")}>
            <div className="chat-list-avatar" style={{ background: "#0A0A0A", color: "#FFFC00", fontSize: 18 }}>✨</div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div className="chat-list-name">{L("Sign up for picks made for you", "আপনার জন্য সাজেশন পেতে সাইন আপ")}</div>
              <div className="chat-list-sub">{L("Answer 9 quick questions · 1 minute", "৯টি ছোট প্রশ্ন · ১ মিনিট")}</div>
            </div>
            <span className="new-trip-btn" style={{ padding: "7px 12px" }}>{L("Sign up", "সাইন আপ")}</span>
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
        <div className={"chat-list-row" + cur("ai")} data-sub="ai" role="button" tabIndex={0} onClick={() => open("ai")}>
          <div className="chat-list-avatar" style={{ background: "#0A0A0A" }}><Icon name="sparkSolid" size={18} color="#FFFC00" /></div>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div className="chat-list-name">Tripo</div>
            <div className="chat-list-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last}</div>
          </div>
        </div>
        <div className={"chat-list-row" + cur("expert")} data-sub="expert" role="button" tabIndex={0} onClick={openExpert}>
          <div className="chat-list-avatar" style={{ background: "#1E9E55" }}><Icon name="headset" size={18} color="#fff" /></div>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div className="chat-list-name">
              {L("Travel expert", "ট্রাভেল এক্সপার্ট")}
              <span className="expert-badge">{L("Real person", "আসল মানুষ")}</span>
            </div>
            <div className="chat-list-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{L("Get 1-to-1 help from a real person", "আসল মানুষের কাছ থেকে সরাসরি সাহায্য নিন")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatScreen() {
  useLang();
  const wide = useWide();
  const rawSub = useTripo((s) => s.chatSub);
  const setChatSub = useTripo((s) => s.setChatSub);
  // On wide screens the list is always visible, so "list" means "show the Tripo conversation".
  const sub = wide && rawSub === "list" ? "ai" : rawSub;
  const back = () => setChatSub("list");
  return (
    <div className="view active" id="view-chats">
      <ChatsList sub={sub} wide={wide} open={setChatSub} />
      <AiThread active={sub === "ai"} onBack={back} />
      <ExpertThread active={sub === "expert"} onBack={back} />
    </div>
  );
}
