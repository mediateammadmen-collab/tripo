"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useAskTripo, useOpenChat } from "@/lib/tripo/hooks";
import { L, t } from "@/lib/tripo/i18n";
import { CONTENT, NEARBY_ITEMS, NEARBY_FILTERS, AGENT_QUICK_KEYS } from "@/lib/tripo/content";
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

/* ---------------- Nearby ---------------- */
export function NearbyScreen() {
  const lang = useLang();
  const ask = useAskTripo();
  const [filter, setFilter] = useState("all");
  const items = NEARBY_ITEMS.filter((item) => filter === "all" || item.category === filter);
  return (
    <div className="view active" id="view-nearby">
      <div className="mini-head">
        <span className="mini-head-title">{t("tabNearby")}</span>
        <span className="mini-head-sub" id="nearbyLocationLine">{t("nearbyLocation")}</span>
        <div className="filter-row" id="nearbyFilters" style={{ marginTop: 12, marginBottom: -2 }}>
          {NEARBY_FILTERS.map((key) => (
            <button key={key} type="button" className={"filter-chip" + (key === filter ? " active" : "")} onClick={() => setFilter(key)}>{t("filter" + cap(key))}</button>
          ))}
        </div>
      </div>
      <div className="mini-list" id="nearbyList">
        {items.map((item) => (
          <MiniCard key={item.title.en} color={item.color} tag={t("filter" + cap(item.category))} title={item.title[lang]} sub={item.sub[lang]} onClick={() => ask(moreAbout(item.title[lang]))} />
        ))}
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
