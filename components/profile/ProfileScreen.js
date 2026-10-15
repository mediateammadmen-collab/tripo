"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import { openExpert } from "@/components/chat/ChatScreen";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useAskTripo } from "@/lib/tripo/hooks";
import { L, t } from "@/lib/tripo/i18n";
import { optLabel } from "@/lib/tripo/items";
import { initials, slug } from "@/lib/tripo/util";
import { accountsEnabled } from "@/lib/supabase/client";

export default function ProfileScreen() {
  const lang = useLang();
  const router = useRouter();
  const ask = useAskTripo();
  const p = useTripo((s) => s.profile);
  const trips = useTripo((s) => s.trips);
  const saved = useTripo((s) => s.saved);
  const friends = useTripo((s) => s.friends);
  const setLang = useTripo((s) => s.setLang);
  const setInvite = useTripo((s) => s.setInvite);
  const showTrips = useTripo((s) => s.showTrips);
  const openTripForm = useTripo((s) => s.openTripForm);
  const user = useTripo((s) => s.user);
  const sync = useTripo((s) => s.sync);
  const authReady = useTripo((s) => s.authReady);
  const syncText = {
    syncing: L("Syncing your account…", "অ্যাকাউন্ট সিঙ্ক হচ্ছে…"),
    synced: L("Your trips, saved places and chats are synced to your account.", "আপনার ট্রিপ, সেভ করা জায়গা ও চ্যাট অ্যাকাউন্টে সিঙ্ক আছে।"),
    error: L("Some changes haven't reached your account yet. They'll retry automatically.", "কিছু পরিবর্তন এখনো অ্যাকাউন্টে পৌঁছায়নি। নিজে থেকেই আবার চেষ্টা হবে।"),
    setup: L("You're signed in, but account storage isn't switched on for this site yet. Your data stays in this browser for now.", "আপনি সাইন ইন করেছেন, কিন্তু এই সাইটে অ্যাকাউন্ট স্টোরেজ এখনো চালু হয়নি। আপাতত ডেটা এই ব্রাউজারে থাকছে।"),
  }[sync];

  const places = saved.filter((x) => x.kind === "place" && x.data && x.data.name);
  const countries = new Set(places.filter((x) => x.data.country).map((x) => String(x.data.country).trim().toLowerCase())).size;
  const name = p ? p.name || "" : L("Traveler", "ভ্রমণকারী");
  const bio = p ? [(p.style || []).map((v) => optLabel("style", v)).join(" · "), p.home].filter(Boolean).join(" · ") : t("profileBio");
  const chips = p ? [].concat((p.likes || []).map((v) => optLabel("likes", v)), p.company ? [optLabel("company", p.company)] : [], p.budget ? [optLabel("budget", p.budget)] : []) : [];
  const openTrip = (id) => { showTrips("trips", id); router.push("/trips"); };
  const gridBtn = { border: "none", background: "var(--panel)", justifyContent: "center", alignItems: "center", fontWeight: 800, fontSize: 12, color: "var(--ink)", textAlign: "center" };

  return (
    <div className="view active" id="view-profile">
      <div className="ig-top">
        <div className="ig-username">
          <span>{slug((p && p.name) || "traveler").replace(/-/g, ".") + ".tripo"}</span>
          <Icon name="chevDown" size={14} sw={2.2} />
        </div>
        <button className="ig-icon-btn" id="profileSettingsBtn" aria-label="Settings" onClick={() => document.getElementById("settingsSection").scrollIntoView({ behavior: "smooth", block: "start" })}>
          <Icon name="menu" size={21} />
        </button>
      </div>

      <div className="profile-panel">
        <div className="ig-head-row">
          <div className="profile-avatar">{initials(name || "T")}</div>
          <div className="ig-stats">
            <div><span className="ig-stat-num" id="statTripsNum">{trips.length}</span><span className="ig-stat-label">{t("statTrips")}</span></div>
            <div><span className="ig-stat-num" id="statFriendsNum">{friends.length}</span><span className="ig-stat-label">{t("statFriends")}</span></div>
            <div><span className="ig-stat-num" id="statCountriesNum">{countries}</span><span className="ig-stat-label">{t("statCountries")}</span></div>
          </div>
        </div>
        <div className="profile-name">{name}</div>
        <div className="profile-sub">{bio}</div>
        <div className="pref-chips" id="prefChips">
          {chips.map((c) => <span className="pref-chip" key={c}>{c}</span>)}
          {p && p.dream ? <span className="pref-chip dream">🌍 {L("Dream: ", "স্বপ্ন: ") + p.dream}</span> : null}
        </div>

        <div className="ig-btn-row">
          <button className={"ig-btn" + (p ? "" : " primary")} id="editProfileBtn" onClick={() => router.push("/signup")}>
            {p ? L("Edit travel style", "ভ্রমণ পছন্দ এডিট") : L("Set my travel style", "ভ্রমণের ধরন ঠিক করুন")}
          </button>
          <button className="ig-btn primary" id="profileInviteBtn" onClick={() => setInvite(true)}>{t("inviteShort")}</button>
        </div>

        {places.length > 0 && (
          <div className="ig-highlights" id="highlightsRow">
            {places.slice(0, 10).map((it) => (
              <button
                key={it.id}
                type="button"
                className="ig-highlight"
                style={{ border: "none", background: "transparent", padding: 0, fontFamily: "inherit" }}
                onClick={() => ask(L("Tell me more about ", "সম্পর্কে আরও বলুন: ") + it.data.name)}
              >
                <div className="ig-highlight-ring">
                  <Photo className="ig-highlight-fill" q={{ name: it.data.name, context: it.data.country || "", kind: "place" }} caption={false} />
                </div>
                <div className="ig-highlight-label">{it.data.name}</div>
              </button>
            ))}
          </div>
        )}

        <div className="ig-tabs">
          <div className="ig-tab active"><Icon name="grid" size={20} /></div>
          <button type="button" className="ig-tab" style={{ border: "none", background: "transparent" }} aria-label={L("Saved", "সেভ করা")} onClick={() => { showTrips("saved", null); router.push("/trips"); }}>
            <Icon name="bookmark" size={20} />
          </button>
        </div>
        <div className="ig-grid" id="tripGrid">
          {trips.map((tr) => (
            <button key={tr.id} type="button" className="ig-grid-item" style={{ border: "none", overflow: "hidden", padding: 0 }} onClick={() => openTrip(tr.id)}>
              <Photo className="grid-art" q={{ name: tr.dest || tr.name, context: "", kind: "place" }} icon="suitcase" caption={false} />
              <span style={{ position: "relative", padding: 6 }}>{tr.name}</span>
            </button>
          ))}
          <button type="button" className="ig-grid-item" style={gridBtn} onClick={() => openTripForm(null, null)}>
            {trips.length ? L("+ New trip", "+ নতুন ট্রিপ") : L("+ Plan your first trip", "+ প্রথম ট্রিপ প্ল্যান করুন")}
          </button>
        </div>

        {accountsEnabled && authReady && (
          <div className="account-card" id="accountCard">
            {user ? (
              <>
                <div className="account-row">
                  <Icon name="cloud" size={18} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b id="accountEmail">{user.email}</b>
                    <span className={"account-sync " + sync}>{syncText}</span>
                  </div>
                </div>
                <button type="button" className="ig-btn" id="signOutBtn" onClick={async () => { await useTripo.getState().signOut(); router.push("/"); }}>
                  {L("Sign out", "সাইন আউট")}
                </button>
              </>
            ) : (
              <>
                <div className="account-row">
                  <Icon name="cloud" size={18} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{L("You're using Tripo as a guest", "আপনি গেস্ট হিসেবে Tripo ব্যবহার করছেন")}</b>
                    <span className="account-sync">{L("Your trips are saved only in this browser. Create a free account to keep them on every device and share them.", "আপনার ট্রিপ শুধু এই ব্রাউজারে সেভ আছে। সব ডিভাইসে রাখতে ও শেয়ার করতে ফ্রি অ্যাকাউন্ট খুলুন।")}</span>
                  </div>
                </div>
                <button type="button" className="ig-btn primary" id="signInBtn" onClick={() => router.push("/login")}>{L("Sign in or create an account", "সাইন ইন বা অ্যাকাউন্ট খুলুন")}</button>
              </>
            )}
          </div>
        )}

        <div className="settings-section" id="settingsSection">
          <div className="settings-heading">{t("settingsHeading")}</div>
          <div className="lang-toggle" role="group" aria-label="Language" id="profileLangToggle" style={{ marginBottom: 14 }}>
            <button id="langEnBtn2" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <button id="langBnBtn2" className={lang === "bn" ? "active" : ""} onClick={() => setLang("bn")}>বাং</button>
          </div>
          <div className="profile-rows">
            <button type="button" className="profile-row" id="helpRow" onClick={() => { openExpert(); router.push("/chat"); }}>
              <span>{t("rowHelp")}</span><Icon name="chevRight" size={15} />
            </button>
            <Link className="profile-row" href="/privacy"><span>{t("rowPrivacy")}</span><Icon name="chevRight" size={15} /></Link>
            <Link className="profile-row" href="/terms"><span>{t("rowTerms")}</span><Icon name="chevRight" size={15} /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
