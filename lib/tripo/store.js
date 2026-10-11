"use client";

// The app's shared state: language, profile, saved items, trips, friends, the AI chat
// and which dialogs are open. Components subscribe with useTripo(selector).

import { create } from "zustand";
import { L, t, setLangValue } from "./i18n";
import { storage } from "./storage";
import { uid, clean, nowTime, addDays, ymd } from "./util";
import { cityToIata, runtime } from "./travel";
import { itemKey, profileLine } from "./items";
import { HUMAN_RE, FLIGHT_RE, HOTEL_RE, extractReply, buildTurns, shownNote, askAI } from "./ai";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let toastTimer = null;
let blockSeq = 0;
const block = (b) => ({ id: "b" + ++blockSeq, ...b });

function applyHome(profile) {
  if (profile && profile.home) {
    runtime.HOME_CITY = profile.home;
    runtime.HOME_IATA = profile.homeIata || cityToIata(profile.home) || runtime.HOME_IATA;
  }
}

export const useTripo = create((set, get) => ({
  /* ---------------- basics ---------------- */
  ready: false, // true once the browser's saved data has been loaded
  lang: "en",
  profile: null,
  saved: [], // {id, key, kind: place|flight|hotel, data, tripId, savedAt}
  trips: [], // {id, name, dest, start, end, itinerary, createdAt}
  friends: [], // {id, name}

  init() {
    if (get().ready) return;
    const d = storage.loadAll();
    setLangValue(d.lang);
    applyHome(d.profile);
    document.documentElement.lang = d.lang;
    set({ ready: true, lang: d.lang, profile: d.profile, saved: d.saved, trips: d.trips, friends: d.friends });
  },

  setLang(l) {
    const lang = l === "bn" ? "bn" : "en";
    setLangValue(lang);
    storage.saveLang(lang);
    document.documentElement.lang = lang;
    set({ lang });
  },

  saveProfile(profile) {
    applyHome(profile);
    storage.saveProfile(profile);
    set({ profile });
  },

  /* ---------------- toast ---------------- */
  toast: null, // {id, text, actionLabel, action}
  showToast(text, actionLabel, action) {
    clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), text, actionLabel: actionLabel || "", action: action || null } });
    toastTimer = setTimeout(() => set({ toast: null }), actionLabel ? 4200 : 2200);
  },
  hideToast() {
    clearTimeout(toastTimer);
    set({ toast: null });
  },

  /* ---------------- dialogs ---------------- */
  drawerOpen: false,
  inviteOpen: false,
  tripPickerItemId: null,
  tripForm: null, // {tripId, pending}
  setDrawer: (drawerOpen) => set({ drawerOpen }),
  setInvite: (inviteOpen) => set({ inviteOpen }),
  openTripPicker: (itemId) => set({ tripPickerItemId: itemId }),
  closeTripPicker: () => set({ tripPickerItemId: null }),
  openTripForm: (tripId, pending) => set({ tripForm: { tripId: tripId || null, pending: pending || null } }),
  closeTripForm: () => set({ tripForm: null }),

  /* ---------------- saved items + trips ---------------- */
  _persistItems() {
    storage.saveItems(get().saved, get().trips);
  },
  findByKey(key) {
    return get().saved.find((x) => x.key === key) || null;
  },
  toggleSave(kind, d) {
    const key = itemKey(kind, d);
    const ex = get().findByKey(key);
    if (ex) {
      set({ saved: get().saved.filter((x) => x.id !== ex.id) });
      get()._persistItems();
      get().showToast(L("Removed from saved", "সেভ থেকে সরানো হয়েছে"));
      return;
    }
    const it = { id: uid("s_"), key, kind, data: clean(d), tripId: null, savedAt: Date.now() };
    set({ saved: [it, ...get().saved] });
    get()._persistItems();
    get().showToast(L("Saved to My plan ✓", "আমার প্ল্যানে সেভ হয়েছে ✓"), L("Add to trip", "ট্রিপে যোগ করুন"), () =>
      get().openTripPicker(it.id)
    );
  },
  dropItem(id) {
    set({ saved: get().saved.filter((x) => x.id !== id) });
    get()._persistItems();
  },
  assignItem(id, tripId) {
    set({ saved: get().saved.map((x) => (x.id === id ? { ...x, tripId: tripId || null } : x)) });
    get()._persistItems();
  },
  // Creates or updates a trip from the trip form. Returns the trip.
  submitTrip({ name, dest, start, end }) {
    const form = get().tripForm || {};
    const pending = form.pending || {};
    if (!name) name = dest ? dest + L(" trip", " ট্রিপ") : L("My trip", "আমার ট্রিপ");
    if (start && end && end < start) end = start;
    let tr;
    if (form.tripId) {
      tr = { ...get().trips.find((x) => x.id === form.tripId), name, dest, start, end };
      set({ trips: get().trips.map((x) => (x.id === tr.id ? tr : x)) });
    } else {
      tr = { id: uid("t_"), name, dest, start, end, itinerary: pending.itinerary || null, createdAt: Date.now() };
      let saved = get().saved;
      if (pending.assignItem) saved = saved.map((x) => (x.id === pending.assignItem ? { ...x, tripId: tr.id } : x));
      if (pending.assignKeys)
        saved = saved.map((x) => (pending.assignKeys.indexOf(x.key) >= 0 && !x.tripId ? { ...x, tripId: tr.id } : x));
      set({ trips: [tr, ...get().trips], saved });
    }
    get()._persistItems();
    set({ tripForm: null });
    return { trip: tr, isNew: !form.tripId };
  },
  dropTrip(id) {
    set({
      trips: get().trips.filter((x) => x.id !== id),
      saved: get().saved.map((x) => (x.tripId === id ? { ...x, tripId: null } : x)),
    });
    get()._persistItems();
  },

  /* ---------------- trips screen ---------------- */
  tripsTab: "trips", // trips | saved
  openTripId: null,
  showTrips: (tab, tripId) => set({ tripsTab: tab || "trips", openTripId: tripId || null }),

  /* ---------------- friends ---------------- */
  addFriend(name) {
    const friends = [...get().friends, { id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), name }];
    storage.saveFriends(friends);
    set({ friends });
  },
  removeFriend(id) {
    const friends = get().friends.filter((x) => x.id !== id);
    storage.saveFriends(friends);
    set({ friends });
  },

  /* ---------------- chat ---------------- */
  chatSub: "list", // list | ai | expert   (which pane of the Chats screen is open)
  setChatSub: (chatSub) => set({ chatSub }),
  blocks: [], // what the chat shows: messages, cards, chips…
  history: [], // what the AI is sent: {role, content, display}
  aiBusy: false,
  greeted: false,

  _push(b) {
    const nb = block(b);
    set({ blocks: [...get().blocks, nb] });
    return nb.id;
  },
  _remove(id) {
    set({ blocks: get().blocks.filter((b) => b.id !== id) });
  },
  removeBlock(id) {
    get()._remove(id);
  },
  _msg(role, text) {
    return get()._push({ t: "msg", role, text, time: nowTime() });
  },
  _handoff() {
    get()._push({ t: "handoff" });
  },

  ensureGreeting() {
    if (get().greeted) return;
    set({ greeted: true });
    const p = get().profile;
    get()._msg(
      "assistant",
      p && p.name
        ? L(
            "Hi **" + p.name + "**! 👋 Where would you like to go next? I'll keep it matched to your travel style.\nAsk me anything, or tap an idea below.",
            "হাই **" + p.name + "**! 👋 এরপর কোথায় যেতে চান? আপনার পছন্দ মিলিয়ে সাজেস্ট করব।\nযা খুশি জিজ্ঞাসা করুন, বা নিচে থেকে বেছে নিন।"
          )
        : t("greeting")
    );
    setTimeout(() => get()._push({ t: "chips" }), 200);
  },

  // A quick-chip category (Flight, Stay, Nearby…): answered instantly, without the AI.
  async categoryTap(key) {
    get()._msg("user", t("tabs." + key));
    const typing = get()._push({ t: "typing" });
    await wait(450);
    get()._remove(typing);
    get()._msg("assistant", t("resultsIntro." + key));
    if (key === "flights") get()._push({ t: "flight", f: {} });
    else if (key === "stay") get()._push({ t: "hotel", h: {} });
    else get()._push({ t: "cards", key });
  },

  // Sends a traveler message. Resolves with { reply, cards } once Tripo has answered.
  async sendChatMessage(text) {
    text = String(text || "").trim();
    if (!text) return null;
    if (get().aiBusy) {
      get().showToast(L("One moment, Tripo is still answering…", "একটু অপেক্ষা করুন, Tripo উত্তর দিচ্ছে…"));
      return null;
    }
    const s = get();
    s._msg("user", text);
    const pushHist = (m) => set({ history: [...get().history, m] });
    const popHist = () => set({ history: get().history.slice(0, -1) });
    pushHist({ role: "user", content: text });

    if (HUMAN_RE.test(text)) {
      const typingH = s._push({ t: "typing" });
      await wait(400);
      s._remove(typingH);
      const m = L("Of course! A real person from our team can help you 1-to-1 👇", "অবশ্যই! আমাদের টিমের একজন মানুষ আপনাকে সরাসরি সাহায্য করবে 👇");
      s._msg("assistant", m);
      s._handoff();
      pushHist({ role: "assistant", content: m, display: m });
      return { reply: m, cards: true };
    }

    set({ aiBusy: true });
    const typing = s._push({ t: "typing" });
    try {
      const data0 = await askAI(buildTurns(get().history, get().profile));
      const data = data0 && typeof data0 === "object" ? data0 : { reply: String(data0 || "") };
      const reply = data.reply || L("Here's what I found:", "এই যে পেলাম:");
      s._remove(typing);
      s._msg("assistant", reply);
      pushHist({ role: "assistant", content: reply + shownNote(data), display: reply });

      const places = Array.isArray(data.places) ? data.places : [];
      const dest = (data.hotel && data.hotel.city) || (data.flight && data.flight.to_city) || (places[0] && places[0].name) || "";
      const steps = [];
      if (places.filter((p) => p && p.name).length) steps.push({ t: "places", places });
      if (Array.isArray(data.itinerary) && data.itinerary.length) steps.push({ t: "itin", items: data.itinerary, dest });
      if (data.flight && typeof data.flight === "object") steps.push({ t: "flight", f: data.flight });
      else if (FLIGHT_RE.test(text) && !data.hotel) steps.push({ t: "flight", f: {} });
      if (data.hotel && typeof data.hotel === "object") steps.push({ t: "hotel", h: data.hotel });
      if (data.handoff) steps.push({ t: "handoff" });
      const cards = steps.length > 0;
      if (Array.isArray(data.suggestions) && data.suggestions.length) steps.push({ t: "sugg", list: data.suggestions });
      steps.forEach((b, i) => setTimeout(() => get()._push(b), 160 * (i + 1)));
      return { reply, cards };
    } catch (e) {
      s._remove(typing);
      const code = e && e.code;
      const partialText = e && e.text ? extractReply(e.text) : "";
      let m;
      if (partialText) {
        m = partialText;
        s._msg("assistant", m);
        pushHist({ role: "assistant", content: m, display: m });
        s._push({ t: "sugg", list: [text] });
        return { reply: m, cards: false };
      }
      popHist();
      if (code === "rate_limited") {
        m = L("Lots of questions at once! Give me a few seconds and tap to try again.", "একসাথে অনেক প্রশ্ন! কয়েক সেকেন্ড পর আবার চেষ্টা করুন।");
        s._msg("assistant", m);
        s._push({ t: "sugg", list: [text] });
      } else if (code === "unavailable" && (FLIGHT_RE.test(text) || HOTEL_RE.test(text))) {
        // The AI can't be reached: still give a working search card.
        const flight = FLIGHT_RE.test(text);
        m = t(flight ? "resultsIntro.flights" : "resultsIntro.stay");
        s._msg("assistant", m);
        s._push(flight ? { t: "flight", f: {} } : { t: "hotel", h: {} });
      } else {
        m = L("Oops, I got a bit lost there. Tap to try again 🙏", "দুঃখিত, একটু সমস্যা হলো। আবার চেষ্টা করতে ট্যাপ করুন 🙏");
        s._msg("assistant", m);
        s._push({ t: "sugg", list: [text] });
      }
      return { reply: m, cards: false };
    } finally {
      set({ aiBusy: false });
    }
  },

  // After sign-up: a welcome plus destinations picked for this traveler.
  async personalWelcome(isNew) {
    const s = get();
    const p = get().profile || {};
    set({ greeted: true });
    s._msg(
      "assistant",
      isNew
        ? L("Welcome to Tripo, **" + p.name + "**! 🎉 From now on, everything I suggest is matched to your style, budget and interests.", "Tripo-তে স্বাগতম, **" + p.name + "**! 🎉 এখন থেকে আমার সব সাজেশন আপনার ধরন, বাজেট ও পছন্দ অনুযায়ী।")
        : L("Profile updated, **" + p.name + "**! I'll use your new preferences from now on.", "প্রোফাইল আপডেট হয়েছে, **" + p.name + "**! এখন থেকে নতুন পছন্দ অনুযায়ী সাজেস্ট করব।")
    );
    set({
      history: [
        ...get().history,
        { role: "user", content: "(I just finished my Tripo profile.)" },
        { role: "assistant", content: "Welcome! I'll personalize everything.", display: L("Welcome, ", "স্বাগতম, ") + p.name + "!" },
      ],
    });
    const typing = s._push({ t: "typing" });
    try {
      const data = await askAI([
        {
          role: "user",
          content:
            profileLine(p) +
            "Today is " + ymd(new Date()) + ".\nSuggest 6 destinations this traveler would love, mixing easy nearby trips and bigger ones" +
            (p.dream ? " (you may include their dream destination)" : "") +
            ", matching their budget.\n" +
            'Reply with ONE JSON object only: {"intro": string, "places": [{"name","country","scene","tagline","best_time"}], "suggestions": [string]}\n' +
            "intro: one friendly sentence (max 25 words) explaining why these fit them. scene is one of beach, mountain, city, temple, desert, forest, island, oldtown, river, snow. tagline max 8 words and say why it suits them. suggestions: 3 short follow-ups written as the traveler (max 5 words).\n" +
            L("Write in English.", "Write intro, tagline, best_time and suggestions in Bangla."),
        },
      ]);
      s._remove(typing);
      if (data && data.intro) {
        s._msg("assistant", data.intro);
        set({ history: [...get().history, { role: "assistant", content: data.intro + shownNote(data), display: data.intro }] });
      }
      if (data && Array.isArray(data.places)) setTimeout(() => get()._push({ t: "places", places: data.places }), 150);
      if (data && Array.isArray(data.suggestions)) setTimeout(() => get()._push({ t: "sugg", list: data.suggestions }), 320);
    } catch {
      s._remove(typing);
      s._msg("assistant", L("Ask me anything — where to go, flights, hotels or a full plan.", "যা খুশি জিজ্ঞাসা করুন — কোথায় যাবেন, ফ্লাইট, হোটেল বা পুরো প্ল্যান।"));
      s._push({ t: "sugg", list: [L("Plan a weekend trip", "উইকেন্ড ট্রিপ প্ল্যান"), L("Find flights", "ফ্লাইট খুঁজুন")] });
    }
  },

  // "Save this plan as a trip" from an itinerary card.
  saveItineraryAsTrip(items, dest) {
    const start = addDays(21);
    const endD = new Date(start);
    endD.setDate(endD.getDate() + items.length - 1);
    get().openTripForm(null, {
      dest: dest || "",
      name: (dest ? dest + " · " : "") + items.length + L("-day trip", "-দিনের ট্রিপ"),
      start,
      end: ymd(endD),
      itinerary: clean(items),
    });
  },
}));
