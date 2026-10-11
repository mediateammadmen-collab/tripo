"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Scene } from "@/components/ui/Scene";
import { LogoMark } from "@/components/shell/AppShell";
import { useTripo } from "@/lib/tripo/store";
import { useLang, useOpenChat } from "@/lib/tripo/hooks";
import { L } from "@/lib/tripo/i18n";

const T0 = 0.3, STEP = 0.75;
const delay = (n) => ({ animationDelay: (T0 + n * STEP).toFixed(2) + "s" });

// Example conversation on the landing page: from a plan to a booking.
function Demo() {
  const days = [
    L("Arrive · sunset in Seminyak", "পৌঁছানো · সেমিনিয়াকে সূর্যাস্ত"),
    L("Ubud rice terraces & temples", "উবুদের ধানক্ষেত ও মন্দির"),
    L("Day trip to Nusa Penida", "নুসা পেনিদা ডে ট্রিপ"),
    L("Beach morning · fly home", "সকালে সৈকত · বাড়ি ফেরা"),
  ];
  return (
    <div className="lp-demo" id="homeDemo" aria-label="Example conversation with Tripo">
      <div className="lp-demo-head">
        <span className="av"><Icon name="sparkSolid" size={14} color="#FFFC00" /></span>
        <div><b>Tripo</b><small>● {L("Planning your trip", "আপনার ট্রিপ প্ল্যান হচ্ছে")}</small></div>
      </div>
      <div className="lp-steps">
        <span className="lp-s on">1 · {L("Plan", "প্ল্যান")}</span><i />
        <span className="lp-s" style={delay(3)} data-a="1">2 · {L("Book", "বুকিং")}</span><i />
        <span className="lp-s" style={delay(5)} data-a="1">3 · {L("Go", "যাত্রা")}</span>
      </div>
      <div className="lp-b u" style={delay(0)}>{L("Plan 4 days in Bali for 2 of us, mid-range budget 🌴", "আমরা ২ জন, মাঝারি বাজেটে বালিতে ৪ দিনের প্ল্যান 🌴")}</div>
      <div className="lp-card" style={delay(1)}>
        <div className="lp-card-top">
          <Scene className="lp-thumb" scene="island" name="bali-landing" />
          <div><b>{L("Bali · 4 days", "বালি · ৪ দিন")}</b><small>{L("2 travelers · mid-range", "২ জন · মাঝারি বাজেট")}</small></div>
        </div>
        {days.map((x, k) => (
          <div className="lp-day" key={k}><span>{L("D", "দিন ") + (k + 1)}</span>{x}</div>
        ))}
      </div>
      <div className="lp-book" style={delay(2)}>
        <div className="lp-ic">✈️</div>
        <div className="lp-bk-main"><b>DAC → DPS</b><small>{L("Best value · 1 stop via Kuala Lumpur", "সেরা মূল্য · কুয়ালালামপুর হয়ে ১ স্টপ")}</small></div>
        <span className="lp-bk-btn">{L("Book on Trip.com", "Trip.com-এ বুক")}</span>
      </div>
      <div className="lp-book" style={delay(3)}>
        <Scene className="lp-ic img" scene="hotel" name="bali-hotel-landing" />
        <div className="lp-bk-main"><b>{L("4★ hotel in Seminyak", "সেমিনিয়াকে ৪★ হোটেল")}</b><small>{L("Near the beach · $$", "সৈকতের কাছে · $$")}</small></div>
        <span className="lp-bk-btn">{L("Book on Booking.com", "Booking.com-এ বুক")}</span>
      </div>
      <div className="lp-saved" style={delay(4.4)}>✓ {L("Trip saved to My plan · ready to go", "ট্রিপ আমার প্ল্যানে সেভ হয়েছে · যাত্রার জন্য তৈরি")}</div>
    </div>
  );
}

export default function HomeScreen() {
  const lang = useLang();
  const router = useRouter();
  const openChat = useOpenChat();
  const ready = useTripo((s) => s.ready);
  const profile = useTripo((s) => s.profile);
  const setLang = useTripo((s) => s.setLang);
  const has = !!profile;

  // Returning travelers go straight to their chats.
  useEffect(() => {
    if (ready && profile && !window.location.hash.includes("home")) router.replace("/chat");
  }, [ready, profile, router]);

  const steps = [
    [L("Before you go", "যাওয়ার আগে"), L("Ideas that fit your style and budget, a day-by-day plan, and what to pack.", "আপনার ধরন ও বাজেট মিলিয়ে আইডিয়া, দিনভিত্তিক প্ল্যান, আর কী গোছাবেন।"), ""],
    [L("Book with confidence", "নিশ্চিন্তে বুকিং"), L("Compare flights on Trip.com and hotels on Booking.com, right from the chat.", "চ্যাট থেকেই Trip.com-এ ফ্লাইট আর Booking.com-এ হোটেল তুলনা করুন।"), ""],
    [L("While you travel", "ভ্রমণের সময়"), L("What to do now, where to eat, how to get around, and what to do when plans change.", "এখন কী করবেন, কোথায় খাবেন, কীভাবে যাবেন, আর প্ল্যান বদলালে কী করবেন।"), ""],
    [L("A real person, when you need one", "দরকার হলে আসল মানুষ"), L("Our travel experts help 1-to-1 with custom trips, group bookings and problems.", "কাস্টম ট্রিপ, গ্রুপ বুকিং বা সমস্যায় আমাদের ট্রাভেল এক্সপার্টরা সরাসরি সাহায্য করেন।"), "agent"],
  ];
  const trust = [L("🎙 Talk or type", "🎙 বলুন বা লিখুন"), "🇧🇩 বাংলা + English", L("🧳 Your plan, saved & downloadable", "🧳 আপনার প্ল্যান, সেভ ও ডাউনলোড"), L("💸 Free to start", "💸 শুরু ফ্রি")];
  const signupLabel = L("Sign up — it's free", "সাইন আপ — ফ্রি");

  return (
    <div className="app">
      <div className="view active" id="view-home">
        <div className="home-scroll" id="homeScroll">
          <section className="lp-hero">
            <svg className="lp-routes" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true">
              <path d="M-20 340 C 120 200, 260 390, 380 230 S 560 110, 640 160" fill="none" stroke="#FFFC00" strokeOpacity=".3" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d="M-30 110 C 90 50, 210 160, 330 80 S 520 30, 650 60" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <Icon name="plane" size={34} color="#FFFC00" className="lp-plane" />
            <div className="lp-top">
              <div className="lp-brand"><LogoMark size={14} />Tripo</div>
              <button type="button" className="lp-lang" id="homeLangBtn" onClick={() => setLang(lang === "bn" ? "en" : "bn")}>{lang === "bn" ? "English" : "বাংলা"}</button>
            </div>
            <div className="lp-hero-grid">
              <div className="lp-hero-copy">
                <span className="lp-kicker" id="homeKicker">{L("Your AI travel agent", "আপনার AI ট্রাভেল এজেন্ট")}</span>
                <h1 id="homeTitle">
                  {lang === "bn" ? <>যেখানেই যান, <em>যা দরকার সব</em></> : <>Everything you need, <em>wherever you travel</em></>}
                </h1>
                <p id="homeSub">
                  {L("Tripo is your travel agent from the first idea to the flight home. It plans with you, helps you book, and guides you on the road — just ask, any time.", "প্রথম আইডিয়া থেকে বাড়ি ফেরার ফ্লাইট পর্যন্ত Tripo আপনার ট্রাভেল এজেন্ট। আপনার সাথে প্ল্যান করে, বুকিংয়ে সাহায্য করে, আর ভ্রমণের পথে গাইড করে — যখন খুশি জিজ্ঞাসা করুন।")}
                </p>
                <div className="lp-ctas">
                  <button type="button" className={"lp-cta" + (has ? " ghostish" : "")} id="homeSignup" onClick={() => router.push("/signup")}>
                    {has ? L("Redo my travel profile", "ট্রাভেল প্রোফাইল আবার করুন") : signupLabel}
                  </button>
                  {has && (
                    <button type="button" className="lp-cta dark" id="homeContinue" onClick={openChat}>
                      {L("Continue as ", "চালিয়ে যান: ") + profile.name + " →"}
                    </button>
                  )}
                  {!has && (
                    <button type="button" className="lp-ghost" id="homeExplore" onClick={openChat}>{L("Explore first", "আগে ঘুরে দেখুন")}</button>
                  )}
                </div>
                <div className="lp-note" id="homeNote">{L("Free to start · no password · ready in a minute", "শুরু ফ্রি · পাসওয়ার্ড লাগবে না · এক মিনিটেই তৈরি")}</div>
              </div>
              <Demo />
            </div>
          </section>
          <section className="lp-body">
            <h2 id="homeJourneyTitle">{L("One agent for your whole trip", "পুরো ট্রিপের জন্য একজন এজেন্ট")}</h2>
            <div className="lp-journey" id="homeJourney">
              {steps.map((st) => (
                <div className={"lp-step " + st[2]} key={st[0]}><b>{st[0]}</b><span>{st[1]}</span></div>
              ))}
            </div>
            <div className="lp-trust" id="homeTrust">
              {trust.map((x) => <span key={x}>{x}</span>)}
            </div>
            <div className="lp-final">
              <div>
                <b id="homeFinalTitle">{L("Your travel agent is one tap away.", "আপনার ট্রাভেল এজেন্ট এক ট্যাপ দূরে।")}</b>
                <span id="homeFinalSub">{L("Tell Tripo how you like to travel — it takes about a minute.", "কীভাবে ভ্রমণ করতে ভালোবাসেন Tripo-কে বলুন — মাত্র এক মিনিট।")}</span>
              </div>
              <button type="button" className="lp-cta" id="homeSignup2" onClick={() => (has ? openChat() : router.push("/signup"))}>
                {has ? L("Open Tripo →", "Tripo খুলুন →") : signupLabel}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
