"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { LogoMark } from "@/components/shell/AppShell";
import { useTripo } from "@/lib/tripo/store";
import { useLang } from "@/lib/tripo/hooks";
import { L } from "@/lib/tripo/i18n";
import { accountsEnabled } from "@/lib/supabase/client";
import { openVoice } from "@/lib/tripo/voice";
import { LANDING_PLACES } from "@/lib/tripo/landing-places";

// A real photo from the landing set (dark tile until it loads).
function Shot({ photos, k, className = "", children, priority }) {
  const p = photos[k];
  return (
    <div className={"lx-shot " + className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p ? <img src={p.src} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} referrerPolicy="no-referrer" /> : null}
      {children}
    </div>
  );
}

const place = (k) => LANDING_PLACES.find((x) => x.key === k);

// The Tripo landing page: real travel photography, what Tripo does, and a way in.
export default function HomeScreen({ photos = {} }) {
  const lang = useLang();
  const router = useRouter();
  const profile = useTripo((s) => s.profile);
  const user = useTripo((s) => s.user);
  const setLang = useTripo((s) => s.setLang);
  const known = !!profile || !!user;

  const start = () => router.push(known ? "/chat" : accountsEnabled ? "/login?mode=signup" : "/signup");
  const talk = () => {
    useTripo.getState().setChatSub("ai");
    router.push("/chat");
    setTimeout(() => openVoice(), 350);
  };
  const ask = (text) => {
    const s = useTripo.getState();
    s.setChatSub("ai");
    router.push("/chat");
    s.sendChatMessage(text);
  };

  const steps = [
    { icon: "micRound", t: L("Ask — out loud or by typing", "জিজ্ঞাসা করুন — বলে বা লিখে"), d: L("“Plan 3 days in Sylhet for my family.” English or বাংলা, however you like to talk.", "“পরিবারের জন্য সিলেটে ৩ দিনের প্ল্যান করো।” ইংরেজি বা বাংলা, যেভাবে খুশি।") },
    { icon: "map", t: L("See it all on a live map", "লাইভ ম্যাপে সব দেখুন"), d: L("Real photos, day-by-day routes, hotels and restaurants appear while Tripo answers.", "Tripo উত্তর দিতে দিতেই আসল ছবি, দিনভিত্তিক রুট, হোটেল ও রেস্টুরেন্ট দেখা যায়।") },
    { icon: "suitcase", t: L("Save, share and go", "সেভ, শেয়ার, যাত্রা"), d: L("Keep the plan, invite your travel crew, and book flights and stays on Trip.com and Booking.com.", "প্ল্যান রাখুন, সঙ্গীদের আমন্ত্রণ জানান, আর Trip.com ও Booking.com-এ ফ্লাইট ও হোটেল বুক করুন।") },
  ];
  const features = [
    { icon: "micRound", t: L("Live voice conversation", "লাইভ ভয়েস কথোপকথন"), d: L("Talk naturally and interrupt any time. Tripo answers instantly, in English or বাংলা.", "স্বাভাবিকভাবে কথা বলুন, যখন খুশি থামান। Tripo সঙ্গে সঙ্গে ইংরেজি বা বাংলায় উত্তর দেয়।") },
    { icon: "map", t: L("Real photos on a live map", "লাইভ ম্যাপে আসল ছবি"), d: L("Every suggestion lands on the map with a real photo — no guessing what a place looks like.", "প্রতিটি সাজেশন আসল ছবিসহ ম্যাপে — জায়গাটা দেখতে কেমন তা আর আন্দাজ করতে হবে না।") },
    { icon: "pin", t: L("Explore any city", "যেকোনো শহর ঘুরে দেখুন"), d: L("The best things to do, places to eat and places to stay — Dhaka, Sylhet, Bangkok or anywhere.", "সেরা ঘোরার জায়গা, খাবার ও থাকার জায়গা — ঢাকা, সিলেট, ব্যাংকক বা যেকোনো জায়গা।") },
    { icon: "calendar", t: L("Day-by-day trip planner", "দিনভিত্তিক ট্রিপ প্ল্যানার"), d: L("Shape your plan: days, stops, notes, a calendar and a map of the whole trip.", "দিন, স্টপ, নোট, ক্যালেন্ডার আর পুরো ট্রিপের ম্যাপ দিয়ে প্ল্যান সাজান।") },
    { icon: "userPlus", t: L("Plan together", "একসাথে প্ল্যান"), d: L("Share a link and plan with friends and family, each from their own phone.", "লিংক শেয়ার করে বন্ধু ও পরিবারের সাথে যার যার ফোন থেকে প্ল্যান করুন।") },
    { icon: "receipt", t: L("Bookings in one place", "সব বুকিং এক জায়গায়"), d: L("Snap a ticket or hotel voucher — Tripo reads the details and files them with your trip.", "টিকিট বা হোটেল ভাউচারের ছবি দিন — Tripo তথ্য পড়ে আপনার ট্রিপে রেখে দেবে।") },
  ];
  const strip = ["sajek", "ratargul", "coxs", "sundarbans", "srimangal", "pokhara", "paro", "halong", "darjeeling", "ubud", "dal", "bangkok"].filter((k) => photos[k]);
  const prompts = [
    L("Where should I go this winter?", "এই শীতে কোথায় যাব?"),
    L("Plan 3 days in Sylhet for my family", "পরিবারের জন্য সিলেটে ৩ দিনের প্ল্যান করো"),
    L("Cheapest way to fly to Bangkok", "ব্যাংককে সবচেয়ে কম খরচে কীভাবে যাব"),
  ];
  const startLabel = known ? (profile && profile.name ? L("Continue as ", "চালিয়ে যান: ") + profile.name : L("Open Tripo", "Tripo খুলুন")) : L("Start planning — it's free", "প্ল্যান শুরু করুন — ফ্রি");

  return (
    <div className="lx" id="view-home">
      {/* ---------- navigation ---------- */}
      <header className="lx-nav">
        <Link href="/" className="lx-logo" aria-label="Tripo home"><LogoMark size={15} /><b>Tripo</b></Link>
        <nav className="lx-links">
          <Link href="/explore">{L("Explore", "এক্সপ্লোর")}</Link>
          <Link href="/inspiration">{L("Trip ideas", "ট্রিপ আইডিয়া")}</Link>
          <Link href="/agent">{L("Talk to Tripo", "Tripo-র সাথে কথা")}</Link>
        </nav>
        <button type="button" className="lx-lang" id="homeLangBtn" onClick={() => setLang(lang === "bn" ? "en" : "bn")}>{lang === "bn" ? "English" : "বাংলা"}</button>
        <button type="button" className="lx-navcta" onClick={start}>{known ? L("Open Tripo", "Tripo খুলুন") : L("Start free", "ফ্রি শুরু করুন")}</button>
      </header>

      {/* ---------- hero ---------- */}
      <section className="lx-hero">
        <Shot photos={photos} k="sajek" className="lx-hero-bg" priority />
        <div className="lx-hero-shade" />
        <div className="lx-hero-in">
          <div className="lx-hero-copy">
            <span className="lx-pill"><i />{L("Your AI travel agent · English & বাংলা", "আপনার AI ট্রাভেল এজেন্ট · বাংলা ও English")}</span>
            <h1 id="homeTitle">{lang === "bn" ? <>শুধু বলুন, <em>Tripo</em> পুরো ট্রিপ সাজিয়ে দেবে।</> : <>Plan your next trip <em>just by talking.</em></>}</h1>
            <p>{L("Tell Tripo where you dream of going. It answers out loud, shows real places on a live map, and builds your day-by-day plan — from Sajek to Bali.", "কোথায় যেতে চান Tripo-কে বলুন। সে মুখে উত্তর দেবে, লাইভ ম্যাপে আসল জায়গা দেখাবে, আর দিনভিত্তিক প্ল্যান বানিয়ে দেবে — সাজেক থেকে বালি পর্যন্ত।")}</p>
            <div className="lx-ctas">
              <button type="button" className="lx-btn lx-btn-y" id="homeSignup" onClick={start}>{startLabel} <Icon name="chevRight" size={18} sw={2.6} /></button>
              <button type="button" className="lx-btn lx-btn-g" id="homeTalk" onClick={talk}><span className="lx-mini-orb"><Icon name="micRound" size={14} /></span>{L("Talk to Tripo", "Tripo-র সাথে কথা বলুন")}</button>
            </div>
            <Link href="/chat" className="lx-skip" id="homeExplore" onClick={() => useTripo.getState().setChatSub("ai")}>{L("or just look around — no account needed", "অথবা অ্যাকাউন্ট ছাড়াই ঘুরে দেখুন")}</Link>
          </div>

          {/* app preview, built from real photos */}
          <div className="lx-preview" aria-label={L("Example conversation with Tripo", "Tripo-র সাথে একটি উদাহরণ কথোপকথন")}>
            <div className="lx-pv-head"><span className="lx-pv-av"><Icon name="sparkSolid" size={13} color="#FFFC00" /></span><b>Tripo</b><small>● {L("Live voice", "লাইভ ভয়েস")}</small></div>
            <div className="lx-pv-you">{L("Plan a weekend in Sylhet for the two of us 🌿", "আমাদের দুজনের জন্য সিলেটে একটা উইকেন্ড প্ল্যান করো 🌿")}</div>
            <div className="lx-pv-tripo">{L("Lovely pick! Day 1 is a boat ride through Ratargul, Day 2 the stone rivers of Jaflong. I've put them on your map.", "দারুণ পছন্দ! প্রথম দিন রাতারগুলে নৌকা ভ্রমণ, দ্বিতীয় দিন জাফলংয়ের পাথুরে নদী। ম্যাপে দিয়ে দিয়েছি।")}</div>
            <div className="lx-pv-cards">
              {[["ratargul", "1"], ["jaflong", "2"]].map(([k, n]) => (
                <div className="lx-pv-card" key={k}>
                  <Shot photos={photos} k={k} className="lx-pv-img"><span className="lx-pv-day">{L("Day ", "দিন ") + n}</span></Shot>
                  <b>{place(k).label[lang]}</b>
                  <small>{place(k).where[lang]}</small>
                </div>
              ))}
            </div>
            <div className="lx-pv-saved"><Icon name="suitcase" size={14} /> {L("Saved to My plan · 2 days", "আমার প্ল্যানে সেভ · ২ দিন")}</div>
          </div>
        </div>
      </section>

      {/* ---------- destinations ---------- */}
      {strip.length > 0 && (
        <section className="lx-sec">
          <div className="lx-sec-head">
            <h2>{L("Where travelers are going", "ভ্রমণকারীরা কোথায় যাচ্ছেন")}</h2>
            <Link href="/inspiration" className="lx-more">{L("All trip ideas →", "সব ট্রিপ আইডিয়া →")}</Link>
          </div>
          <div className="lx-strip">
            {strip.map((k) => {
              const p = place(k);
              return (
                <button type="button" key={k} className="lx-dest" onClick={() => ask(L("Suggest a trip to " + p.label.en + ", " + p.where.en, p.label.bn + " (" + p.where.bn + ") ভ্রমণের প্ল্যান সাজেস্ট করো"))}>
                  <Shot photos={photos} k={k} className="lx-dest-img" />
                  <span className="lx-dest-txt"><b>{p.label[lang]}</b><small>{p.where[lang]}</small></span>
                </button>
              );
            })}
          </div>
          <p className="lx-credit">{L("Photos: Wikipedia / Wikimedia Commons contributors", "ছবি: উইকিপিডিয়া / উইকিমিডিয়া কমন্স")}</p>
        </section>
      )}

      {/* ---------- how it works ---------- */}
      <section className="lx-sec">
        <div className="lx-sec-head"><h2>{L("From “where should I go?” to boarding pass", "“কোথায় যাব?” থেকে বোর্ডিং পাস পর্যন্ত")}</h2></div>
        <div className="lx-steps">
          {steps.map((s, i) => (
            <div className="lx-step" key={i}>
              <span className="lx-step-n">{i + 1}</span>
              <span className="lx-step-ic"><Icon name={s.icon} size={22} /></span>
              <b>{s.t}</b>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- voice band ---------- */}
      <section className="lx-voice">
        <Shot photos={photos} k="paro" className="lx-band-bg" />
        <div className="lx-band-shade" />
        <div className="lx-voice-in">
          <span className="lx-pill"><i />{L("New · Live voice", "নতুন · লাইভ ভয়েস")}</span>
          <h2>{L("Just say it. In বাংলা or English.", "শুধু বলুন। বাংলায় বা ইংরেজিতে।")}</h2>
          <p>{L("Tripo listens like a friend who knows every road — and shows you the places while it talks.", "Tripo শোনে সব পথ চেনা এক বন্ধুর মতো — আর কথা বলতে বলতেই জায়গাগুলো দেখায়।")}</p>
          <button type="button" className="lx-orb" onClick={talk} aria-label={L("Start talking to Tripo", "Tripo-র সাথে কথা বলা শুরু করুন")}>
            <span className="lx-orb-ring" /><span className="lx-orb-ring r2" />
            <span className="lx-orb-core"><Icon name="micRound" size={34} /></span>
          </button>
          <div className="lx-prompts">
            {prompts.map((p) => <button type="button" key={p} onClick={() => ask(p)}>“{p}”</button>)}
          </div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="lx-sec">
        <div className="lx-sec-head"><h2>{L("Everything for the trip, in one place", "পুরো ট্রিপের সব কিছু, এক জায়গায়")}</h2></div>
        <div className="lx-feats" id="homeFeatures">
          {features.map((f) => (
            <div className="lx-feat" key={f.t}>
              <span className="lx-feat-ic"><Icon name={f.icon} size={21} /></span>
              <b>{f.t}</b>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- final call ---------- */}
      <section className="lx-final">
        <Shot photos={photos} k="coxs" className="lx-band-bg" />
        <div className="lx-band-shade" />
        <div className="lx-final-in">
          <h2>{L("Your next trip starts with one sentence.", "আপনার পরের ট্রিপ শুরু হয় একটি বাক্য দিয়ে।")}</h2>
          <p>{L("Free to start. No credit card. Ready in a minute.", "শুরু ফ্রি। কার্ড লাগবে না। এক মিনিটেই তৈরি।")}</p>
          <div className="lx-ctas" style={{ justifyContent: "center" }}>
            <button type="button" className="lx-btn lx-btn-y" id="homeSignup2" onClick={start}>{known ? L("Open Tripo", "Tripo খুলুন") : L("Start planning — it's free", "প্ল্যান শুরু করুন — ফ্রি")} <Icon name="chevRight" size={18} sw={2.6} /></button>
            <button type="button" className="lx-btn lx-btn-g" onClick={talk}><span className="lx-mini-orb"><Icon name="micRound" size={14} /></span>{L("Talk to Tripo", "Tripo-র সাথে কথা বলুন")}</button>
          </div>
        </div>
      </section>

      <footer className="lx-foot">
        <Link href="/" className="lx-logo"><LogoMark size={14} /><b>Tripo</b></Link>
        <nav>
          <Link href="/explore">{L("Explore", "এক্সপ্লোর")}</Link>
          <Link href="/inspiration">{L("Trip ideas", "ট্রিপ আইডিয়া")}</Link>
          <Link href="/login">{L("Sign in", "সাইন ইন")}</Link>
          <Link href="/privacy">{L("Privacy", "প্রাইভেসি")}</Link>
          <Link href="/terms">{L("Terms", "শর্তাবলি")}</Link>
        </nav>
        <small>{L("Tripo suggests trips and links to Trip.com and Booking.com; bookings are made with them.", "Tripo ট্রিপ সাজেস্ট করে এবং Trip.com ও Booking.com-এর লিংক দেয়; বুকিং তাদের সাথেই হয়।")}</small>
      </footer>
    </div>
  );
}
