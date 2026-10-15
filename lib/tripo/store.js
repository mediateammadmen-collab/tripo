"use client";

// The app's shared state: account, language, profile, saved items, trips, conversations,
// looked-up places and which dialogs are open. Components subscribe with useTripo(selector).
//
// Data is kept in the browser (lib/tripo/storage.js). When someone is signed in, every change
// is also written to their account (lib/tripo/cloud.js), and their account is loaded on sign-in.

import { create } from "zustand";
import { L, t, setLangValue } from "./i18n";
import { storage } from "./storage";
import { cloud } from "./cloud";
import { getSupabase } from "@/lib/supabase/client";
import { uid, clean, nowTime, addDays, ymd } from "./util";
import { cityToIata, runtime } from "./travel";
import { itemKey, profileLine } from "./items";
import { makeTripItem, normalizeData, itineraryToTrip, canEditTrip } from "./trips";
import { placeKey } from "./places";
import { HUMAN_RE, FLIGHT_RE, HOTEL_RE, extractReply, buildTurns, shownNote, askAI } from "./ai";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let toastTimer = null;
let authWired = false;
const block = (b) => ({ id: uid("b"), ...b });

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
  saved: [], // {id, key, kind: place|flight|hotel, data, savedAt}
  trips: [], // see lib/tripo/trips.js
  friends: [], // {id, name}

  init() {
    if (get().ready) return;
    const d = storage.loadAll();
    const norm = normalizeData(d.saved, d.trips);
    if (norm.changed) storage.saveItems(norm.saved, norm.trips);
    setLangValue(d.lang);
    applyHome(d.profile);
    document.documentElement.lang = d.lang;
    set({ ready: true, lang: d.lang, profile: d.profile, saved: norm.saved, trips: norm.trips, friends: d.friends, chats: d.chats, placeInfo: d.places || {} });
    get().loadFixedPhotos();
    const cur = d.currentChatId && d.chats.find((c) => c.id === d.currentChatId);
    if (cur) set({ chatId: cur.id, blocks: cur.blocks || [], history: cur.history || [], greeted: true });
    get()._wireAuth();
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
    get()._syncAccount();
  },

  /* ---------------- account ---------------- */
  user: null, // {id, email}
  authReady: false, // true once we know whether someone is signed in
  sync: "guest", // guest | syncing | synced | error | setup (database tables missing)
  recovery: false, // true after opening a "reset password" link

  _wireAuth() {
    const sb = getSupabase();
    if (!sb || authWired) {
      if (!sb) set({ authReady: true });
      return;
    }
    authWired = true;
    sb.auth.onAuthStateChange((event, session) => {
      // Supabase asks that no other Supabase calls run inside this callback, so defer the work.
      setTimeout(() => {
        if (event === "PASSWORD_RECOVERY") set({ recovery: true });
        const u = session && session.user ? { id: session.user.id, email: session.user.email || "" } : null;
        const cur = get().user;
        if (u && (!cur || cur.id !== u.id)) get()._signedIn(u);
        else if (!u && cur) get()._signedOut();
        if (!get().authReady) set({ authReady: true });
      }, 0);
    });
  },

  async _signedIn(user) {
    set({ user, sync: "syncing" });
    const owner = storage.getOwner();
    try {
      if (owner !== "guest" && owner !== user.id) {
        // This browser holds someone else's copy: drop it before loading this account.
        storage.clearUserData();
        set({ profile: null, saved: [], trips: [], friends: [], chats: [], chatId: null, blocks: [], history: [], greeted: false });
      }
      if (owner === user.id) await get()._flushPending();
      const remote = await cloud.pull(user.id);
      const s = get();
      const adopt = owner !== user.id; // guest data made before signing in joins the account
      const merge = (rem, loc) => {
        const ids = new Set(rem.map((x) => x.id));
        const extra = adopt ? loc.filter((x) => !ids.has(x.id)) : [];
        return { all: rem.concat(extra), extra };
      };
      const sv = merge(remote.saved, s.saved);
      const tr = merge(remote.trips, s.trips.filter((x) => !x.owner));
      const ch = merge(remote.chats, s.chats);
      const account = remote.account || {};
      const profile = account.profile || (adopt ? s.profile : null) || null;
      const friends = Array.isArray(account.friends) ? account.friends : adopt ? s.friends : [];
      const norm = normalizeData(sv.all, tr.all);
      applyHome(profile);
      set({ saved: norm.saved, trips: norm.trips, profile, friends, chats: ch.all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) });
      storage.setOwner(user.id);
      get()._persistLocal();
      // Upload what only existed in this browser.
      const jobs = [];
      sv.extra.forEach((x) => jobs.push(cloud.upsertSaved(user.id, x)));
      tr.extra.forEach((x) => jobs.push(cloud.upsertTrip(user.id, x)));
      ch.extra.forEach((x) => jobs.push(cloud.upsertChat(user.id, x)));
      if (!remote.account && (profile || friends.length)) jobs.push(cloud.saveAccount(user.id, { profile, friends }));
      await Promise.all(jobs);
      set({ sync: "synced" });
    } catch (e) {
      console.warn("Tripo sync:", e && e.message);
      set({ sync: e && e.code === "no_tables" ? "setup" : "error" });
    }
  },

  _signedOut() {
    // If this browser's copy was never linked to the account (sync not set up), it is the only copy: keep it.
    if (storage.getOwner() === "guest") {
      set({ user: null, sync: "guest", recovery: false, trips: get().trips.filter((x) => !x.owner) });
      return;
    }
    storage.clearUserData();
    set({ user: null, sync: "guest", profile: null, saved: [], trips: [], friends: [], chats: [], chatId: null, blocks: [], history: [], greeted: false, recovery: false });
  },

  async signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    if (get().user) get()._signedOut();
  },

  _persistLocal() {
    const s = get();
    storage.saveItems(s.saved, s.trips);
    storage.saveProfile(s.profile);
    storage.saveFriends(s.friends);
    storage.saveChats(s.chats, s.chatId);
  },

  // Runs a cloud write for a signed-in traveler; if it fails, remembers it and retries on next sign-in.
  _cloud(kind, id, op, fn) {
    const u = get().user;
    if (!u || get().sync === "setup") return;
    fn(u.id)
      .then(() => {
        if (get().sync === "error") set({ sync: "synced" });
      })
      .catch((e) => {
        console.warn("Tripo sync:", e && e.message);
        const pending = storage.getPending().filter((p) => !(p.kind === kind && p.id === id));
        pending.push({ kind, id, op });
        storage.setPending(pending);
        set({ sync: "error" });
      });
  },
  async _flushPending() {
    const u = get().user;
    const pending = storage.getPending();
    if (!u || !pending.length) return;
    const s = get();
    const left = [];
    for (const p of pending) {
      try {
        if (p.kind === "saved") {
          const it = s.saved.find((x) => x.id === p.id);
          if (p.op === "delete" || !it) await cloud.deleteSaved(p.id);
          else await cloud.upsertSaved(u.id, it);
        } else if (p.kind === "trip") {
          const tr = s.trips.find((x) => x.id === p.id);
          if (p.op === "leave") await cloud.leaveTrip(p.id, u.id);
          else if (p.op === "delete" || !tr) await cloud.deleteTrip(p.id);
          else await cloud.upsertTrip(u.id, tr);
        } else if (p.kind === "chat") {
          const ch = s.chats.find((x) => x.id === p.id);
          if (p.op === "delete" || !ch) await cloud.deleteChat(p.id);
          else await cloud.upsertChat(u.id, ch);
        } else if (p.kind === "account") {
          await cloud.saveAccount(u.id, { profile: s.profile, friends: s.friends });
        }
      } catch {
        left.push(p);
      }
    }
    storage.setPending(left);
  },
  _syncAccount() {
    get()._cloud("account", "me", "upsert", (id) => cloud.saveAccount(id, { profile: get().profile, friends: get().friends }));
  },
  // Picks up changes other people made to shared trips.
  async refreshTrips() {
    const u = get().user;
    if (!u || get().sync !== "synced") return;
    try {
      const remote = await cloud.pullTrips(u.id);
      const norm = normalizeData(get().saved, remote);
      set({ trips: norm.trips });
      storage.saveItems(get().saved, norm.trips);
    } catch {}
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
  tripPicker: null, // {kind, data}: the thing being added to a trip
  tripForm: null, // {tripId, pending}
  shareTripId: null,
  placeSheet: null, // {key, kind, name, data, query}: place details panel
  setDrawer: (drawerOpen) => set({ drawerOpen }),
  setInvite: (inviteOpen) => set({ inviteOpen }),
  openTripPicker: (kind, data) => set({ tripPicker: { kind, data } }),
  closeTripPicker: () => set({ tripPicker: null }),
  openTripForm: (tripId, pending) => set({ tripForm: { tripId: tripId || null, pending: pending || null } }),
  closeTripForm: () => set({ tripForm: null }),
  openShare: (shareTripId) => set({ shareTripId }),
  closeShare: () => set({ shareTripId: null }),
  openPlace: (placeSheet) => set({ placeSheet }),
  closePlace: () => set({ placeSheet: null }),

  /* ---------------- saved items ---------------- */
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
      get()._cloud("saved", ex.id, "delete", () => cloud.deleteSaved(ex.id));
      get().showToast(L("Removed from saved", "সেভ থেকে সরানো হয়েছে"));
      return;
    }
    const it = { id: uid("s_"), key, kind, data: clean(d), savedAt: Date.now() };
    set({ saved: [it, ...get().saved] });
    get()._persistItems();
    get()._cloud("saved", it.id, "upsert", (id) => cloud.upsertSaved(id, it));
    get().showToast(L("Saved to My plan ✓", "আমার প্ল্যানে সেভ হয়েছে ✓"), L("Add to trip", "ট্রিপে যোগ করুন"), () => get().openTripPicker(kind, it.data));
  },
  dropItem(id) {
    set({ saved: get().saved.filter((x) => x.id !== id) });
    get()._persistItems();
    get()._cloud("saved", id, "delete", () => cloud.deleteSaved(id));
  },

  /* ---------------- trips ---------------- */
  // Applies a change to one trip, then saves it (browser + account).
  _updateTrip(id, fn) {
    const cur = get().trips.find((x) => x.id === id);
    if (!cur || !canEditTrip(cur)) return null;
    const next = { ...fn(cur), updatedAt: Date.now() };
    set({ trips: get().trips.map((x) => (x.id === id ? next : x)) });
    get()._persistItems();
    get()._cloud("trip", id, "upsert", (u) => cloud.upsertTrip(u, next));
    return next;
  },
  // Creates or updates a trip from the trip form. Returns { trip, isNew }.
  submitTrip({ name, dest, start, end, travelers, budget }) {
    const form = get().tripForm || {};
    const pending = form.pending || {};
    if (!name) name = dest ? dest + L(" trip", " ট্রিপ") : L("My trip", "আমার ট্রিপ");
    if (start && end && end < start) end = start;
    const fields = { name, dest, start, end, travelers: travelers || 1, budget: budget || "" };
    let tr;
    if (form.tripId) {
      tr = get()._updateTrip(form.tripId, (x) => ({ ...x, ...fields }));
    } else {
      const items = (pending.items || []).slice();
      if (pending.add) items.push(makeTripItem(pending.add.kind, pending.add.data));
      tr = { id: uid("t_"), ...fields, items, itinerary: pending.itinerary || null, receipts: [], createdAt: Date.now(), updatedAt: Date.now() };
      set({ trips: [tr, ...get().trips] });
      get()._persistItems();
      get()._cloud("trip", tr.id, "upsert", (u) => cloud.upsertTrip(u, tr));
    }
    set({ tripForm: null });
    return { trip: tr, isNew: !form.tripId };
  },
  dropTrip(id) {
    const tr = get().trips.find((x) => x.id === id);
    set({ trips: get().trips.filter((x) => x.id !== id) });
    get()._persistItems();
    if (tr && tr.role === "member") get()._cloud("trip", id, "leave", (u) => cloud.leaveTrip(id, u));
    else get()._cloud("trip", id, "delete", () => cloud.deleteTrip(id));
  },
  // Adds a place, hotel, flight or custom stop to a trip. Returns false if it was already there.
  addToTrip(tripId, kind, data, day) {
    const key = itemKey(kind, data || {});
    const tr = get().trips.find((x) => x.id === tripId);
    if (!tr) return false;
    if ((tr.items || []).some((it) => it.key === key && (it.day || null) === (day || null))) return false;
    get()._updateTrip(tripId, (x) => ({ ...x, items: [...(x.items || []), makeTripItem(kind, data, day)] }));
    return true;
  },
  removeTripItem(tripId, itemId) {
    get()._updateTrip(tripId, (x) => ({ ...x, items: (x.items || []).filter((it) => it.id !== itemId) }));
  },
  setItemDay(tripId, itemId, day) {
    get()._updateTrip(tripId, (x) => {
      const it = (x.items || []).find((i) => i.id === itemId);
      if (!it) return x;
      // moving to another day puts it at the end of that day
      return { ...x, items: (x.items || []).filter((i) => i.id !== itemId).concat([{ ...it, day: day || null }]) };
    });
  },
  setItemNote(tripId, itemId, note) {
    get()._updateTrip(tripId, (x) => ({ ...x, items: (x.items || []).map((i) => (i.id === itemId ? { ...i, note: String(note || "").slice(0, 300) } : i)) }));
  },
  // dir: -1 = earlier in the day, +1 = later
  moveTripItem(tripId, itemId, dir) {
    get()._updateTrip(tripId, (x) => {
      const items = (x.items || []).slice();
      const i = items.findIndex((it) => it.id === itemId);
      if (i < 0) return x;
      const day = items[i].day || null;
      let j = i + dir;
      while (j >= 0 && j < items.length && (items[j].day || null) !== day) j += dir;
      if (j < 0 || j >= items.length) return x;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...x, items };
    });
  },
  setDay(tripId, n, patch) {
    get()._updateTrip(tripId, (x) => {
      const it = Array.isArray(x.itinerary) ? x.itinerary.slice() : [];
      while (it.length < n) it.push({ day: it.length + 1, title: "", plan: "" });
      it[n - 1] = { ...it[n - 1], day: n, ...patch };
      return { ...x, itinerary: it };
    });
  },
  addDay(tripId) {
    get()._updateTrip(tripId, (x) => {
      const it = Array.isArray(x.itinerary) ? x.itinerary.slice() : [];
      const used = (x.items || []).reduce((m, i) => Math.max(m, i.day || 0), 0);
      const n = Math.max(it.length, used, x.dayCount || 0, 1) + 1;
      return { ...x, dayCount: n };
    });
  },
  addReceipt(tripId, receipt) {
    get()._updateTrip(tripId, (x) => ({ ...x, receipts: [{ id: uid("r_"), addedAt: Date.now(), ...receipt }, ...(x.receipts || [])] }));
  },
  removeReceipt(tripId, receiptId) {
    get()._updateTrip(tripId, (x) => ({ ...x, receipts: (x.receipts || []).filter((r) => r.id !== receiptId) }));
  },
  // Sharing: "off", "view" (anyone with the link can look) or "edit" (signed-in friends can join and plan).
  setShare(tripId, mode) {
    return get()._updateTrip(tripId, (x) => ({ ...x, shareMode: mode, shareId: x.shareId || uid("").replace(/[^a-z0-9]/g, "") + Math.random().toString(36).slice(2, 10) }));
  },
  async joinTrip(shareId) {
    const u = get().user;
    if (!u) throw new Error("sign_in");
    const p = get().profile;
    const tripId = await cloud.joinTrip(shareId, (p && p.name) || (u.email || "").split("@")[0]);
    await get().refreshTrips();
    return tripId;
  },

  /* ---------------- trips screen ---------------- */
  tripsTab: "trips", // trips | saved | calendar
  openTripId: null,
  showTrips: (tab, tripId) => set({ tripsTab: tab || "trips", openTripId: tripId || null }),

  /* ---------------- friends ---------------- */
  addFriend(name) {
    const friends = [...get().friends, { id: uid("f_"), name }];
    storage.saveFriends(friends);
    set({ friends });
    get()._syncAccount();
  },
  removeFriend(id) {
    const friends = get().friends.filter((x) => x.id !== id);
    storage.saveFriends(friends);
    set({ friends });
    get()._syncAccount();
  },

  /* ---------------- looked-up places (map pins, photos) ---------------- */
  placeInfo: {}, // key -> { ok, lat, lng, photo, desc, title, url } | { ok:false } | { loading:true }
  mapFocus: null, // key of the place the map should fly to
  mapOpen: false, // phone: the full-screen map
  setMapFocus: (mapFocus) => set({ mapFocus }),
  setMapOpen: (mapOpen) => set({ mapOpen }),
  // Looks up any places we don't know yet. queries: [{name, context, kind}]
  // Photos for the built-in trip ideas arrive in one request; until then those cards wait instead of looking up one by one.
  fixedPhotos: null,
  async loadFixedPhotos() {
    let places = {};
    try {
      const res = await fetch("/api/places/fixed");
      if (res.ok) places = (await res.json()).places || {};
    } catch {}
    set({ fixedPhotos: places });
  },

  async resolvePlaces(queries) {
    const info = get().placeInfo;
    const need = [];
    const seen = new Set();
    (queries || []).forEach((q) => {
      const key = placeKey(q);
      if (!q.name || info[key] || seen.has(key)) return;
      seen.add(key);
      need.push({ ...q, key });
    });
    if (!need.length) return;
    const loading = {};
    need.forEach((q) => (loading[q.key] = { loading: true }));
    set({ placeInfo: { ...get().placeInfo, ...loading } });
    const done = {};
    const ask = async (batch, fast) => {
      const res = await fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fast, places: batch.map(({ name, context, kind }) => ({ name, context, kind })) }) });
      const data = res.ok ? await res.json() : { places: [] };
      batch.forEach((q, k) => (done[q.key] = (data.places && data.places[k]) || { ok: false }));
      set({ placeInfo: { ...get().placeInfo, ...done } });
    };
    try {
      // Small groups side by side, so each card fills in as soon as its own place is ready:
      // first where it is (the pin appears), then the photo if that took longer to find.
      const groups = [];
      for (let i = 0; i < need.length; i += 4) groups.push(need.slice(i, i + 4));
      await Promise.all(groups.map(async (g) => {
        await ask(g, true);
        const later = g.filter((q) => done[q.key] && done[q.key].photoPending);
        if (later.length) await ask(later, false);
      }));
    } catch {
      need.forEach((q) => { if (!done[q.key]) done[q.key] = null; });
    }
    // Failed look-ups are forgotten so they can be tried again later.
    const next = { ...get().placeInfo };
    Object.keys(done).forEach((k) => { if (done[k] == null) delete next[k]; else next[k] = done[k]; });
    need.forEach((q) => { if (next[q.key] && (next[q.key].loading || next[q.key].photoPending)) delete next[q.key]; });
    set({ placeInfo: next });
    const keep = {};
    // Only remember finished look-ups that found a photo; the rest are tried again next visit.
    Object.keys(next).forEach((k) => { if (!next[k].loading && next[k].photo) keep[k] = next[k]; });
    storage.savePlaces(keep);
  },

  /* ---------------- conversations ---------------- */
  chatSub: "list", // list | ai | expert   (which pane of the Chats screen is open)
  setChatSub: (chatSub) => set({ chatSub }),
  chats: [], // saved conversations: {id, title, blocks, history, updatedAt}
  chatId: null, // the open conversation
  blocks: [], // what the chat shows: messages, cards, chips…
  history: [], // what the AI is sent: {role, content, display}
  aiBusy: false,
  greeted: false,

  // Stores the open conversation (once the traveler has said something).
  _saveChat() {
    const s = get();
    const firstUser = s.history.find((m) => m.role === "user" && !/^\(I just finished/.test(m.content));
    if (!firstUser) return;
    const id = s.chatId || uid("c_");
    const chat = {
      id,
      title: firstUser.content.replace(/\s+/g, " ").slice(0, 60),
      blocks: s.blocks.filter((b) => b.t !== "typing"),
      history: s.history.slice(-40),
      updatedAt: Date.now(),
    };
    const chats = [chat, ...s.chats.filter((c) => c.id !== id)];
    set({ chats, chatId: id });
    storage.saveChats(chats, id);
    get()._cloud("chat", id, "upsert", (u) => cloud.upsertChat(u, chat));
  },
  newChat() {
    if (get().aiBusy) return;
    set({ chatId: null, blocks: [], history: [], greeted: false, mapFocus: null });
    storage.saveChats(get().chats, null);
    get().ensureGreeting();
  },
  openChat(id) {
    if (get().aiBusy) return;
    const c = get().chats.find((x) => x.id === id);
    if (!c) return;
    set({ chatId: id, blocks: c.blocks || [], history: c.history || [], greeted: true, chatSub: "ai", mapFocus: null });
    storage.saveChats(get().chats, id);
  },
  deleteChat(id) {
    const chats = get().chats.filter((c) => c.id !== id);
    const wasOpen = get().chatId === id;
    set({ chats });
    if (wasOpen) get().newChat();
    storage.saveChats(chats, wasOpen ? null : get().chatId);
    get()._cloud("chat", id, "delete", () => cloud.deleteChat(id));
  },

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
  // Used by live voice, which adds to the conversation as the traveler and Tripo talk.
  pushBlock(b) {
    return get()._push(b);
  },
  updateBlock(id, patch) {
    set({ blocks: get().blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  },
  pushHistory(m) {
    set({ history: [...get().history, m] });
  },
  saveChat() {
    get()._saveChat();
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
    const save = (delay) => setTimeout(() => get()._saveChat(), delay || 0);

    if (HUMAN_RE.test(text)) {
      const typingH = s._push({ t: "typing" });
      await wait(400);
      s._remove(typingH);
      const m = L("Of course! A real person from our team can help you 1-to-1 👇", "অবশ্যই! আমাদের টিমের একজন মানুষ আপনাকে সরাসরি সাহায্য করবে 👇");
      s._msg("assistant", m);
      s._handoff();
      pushHist({ role: "assistant", content: m, display: m });
      save();
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
      if (Array.isArray(data.itinerary) && data.itinerary.length) steps.push({ t: "itin", items: data.itinerary, dest: data.destination || dest });
      if (data.flight && typeof data.flight === "object") steps.push({ t: "flight", f: data.flight });
      else if (FLIGHT_RE.test(text) && !data.hotel) steps.push({ t: "flight", f: {} });
      if (data.hotel && typeof data.hotel === "object") steps.push({ t: "hotel", h: data.hotel });
      if (data.handoff) steps.push({ t: "handoff" });
      const cards = steps.length > 0;
      if (Array.isArray(data.suggestions) && data.suggestions.length) steps.push({ t: "sugg", list: data.suggestions });
      if (cards) set({ mapFocus: null }); // let the map move to the new suggestions
      steps.forEach((b, i) => setTimeout(() => get()._push(b), 160 * (i + 1)));
      save(160 * (steps.length + 1));
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
        save();
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

  // After the travel-style questions: a welcome plus destinations picked for this traveler.
  async personalWelcome(isNew) {
    const s = get();
    const p = get().profile || {};
    set({ chatId: null, blocks: [], history: [], greeted: true, mapFocus: null });
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
            'Reply with ONE JSON object only: {"intro": string, "places": [{"name","city","country","scene","tagline","best_time"}], "suggestions": [string]}\n' +
            "intro: one friendly sentence (max 25 words) explaining why these fit them. scene is one of beach, mountain, city, temple, desert, forest, island, oldtown, river, snow. tagline max 8 words and say why it suits them. suggestions: 3 short follow-ups written as the traveler (max 5 words).\n" +
            L("Write in English.", "Write intro, tagline, best_time and suggestions in Bangla. Keep place and country names in English."),
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

  // "Save this plan as a trip" from an itinerary card: days and their named places come along.
  saveItineraryAsTrip(items, dest) {
    const start = addDays(21);
    const endD = new Date(start);
    endD.setDate(endD.getDate() + items.length - 1);
    const plan = itineraryToTrip(items, dest);
    get().openTripForm(null, {
      dest: dest || "",
      name: (dest ? dest + " · " : "") + items.length + L("-day trip", "-দিনের ট্রিপ"),
      start,
      end: ymd(endD),
      itinerary: plan.itinerary,
      items: plan.items,
    });
  },
}));
