// Tripo keeps a copy of the traveler's data in the browser so the app opens instantly and
// works for guests. When someone is signed in, lib/tripo/cloud.js keeps their account in step.

const KEYS = {
  saved: "tripo_saved_v1", // { saved, trips }
  profile: "tripo_profile_v1",
  friends: "tripo_friends_v1",
  lang: "tripo_lang_v1",
  chats: "tripo_chats_v1", // { chats, currentId }
  owner: "tripo_owner_v1", // "guest" or the account id this browser copy belongs to
  pending: "tripo_pending_v1", // changes that still need to reach the account
  places: "tripo_places_v6", // looked-up places (location, real photo)
};
const MAX_CHATS = 30;
const MAX_PLACES = 400;

function read(key, fallback) {
  try {
    const v = JSON.parse(window.localStorage.getItem(key) || "null");
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const storage = {
  loadAll() {
    const st = read(KEYS.saved, {});
    const friends = read(KEYS.friends, []);
    const ch = read(KEYS.chats, {});
    return {
      saved: Array.isArray(st.saved) ? st.saved : [],
      trips: Array.isArray(st.trips) ? st.trips : [],
      profile: read(KEYS.profile, null),
      friends: Array.isArray(friends) ? friends : [],
      lang: read(KEYS.lang, "en") === "bn" ? "bn" : "en",
      chats: Array.isArray(ch.chats) ? ch.chats : [],
      currentChatId: ch.currentId || null,
      places: read(KEYS.places, {}),
    };
  },
  saveItems(saved, trips) {
    write(KEYS.saved, { saved, trips });
  },
  saveProfile(profile) {
    write(KEYS.profile, profile);
  },
  saveFriends(friends) {
    write(KEYS.friends, friends);
  },
  saveLang(lang) {
    write(KEYS.lang, lang);
  },
  saveChats(chats, currentId) {
    write(KEYS.chats, { chats: chats.slice(0, MAX_CHATS), currentId });
  },
  savePlaces(places) {
    const keys = Object.keys(places);
    if (keys.length > MAX_PLACES) {
      const trimmed = {};
      keys.slice(-MAX_PLACES).forEach((k) => (trimmed[k] = places[k]));
      places = trimmed;
    }
    write(KEYS.places, places);
  },
  getOwner() {
    return read(KEYS.owner, "guest");
  },
  setOwner(id) {
    write(KEYS.owner, id || "guest");
  },
  getPending() {
    const p = read(KEYS.pending, []);
    return Array.isArray(p) ? p : [];
  },
  setPending(list) {
    write(KEYS.pending, list);
  },
  // Forget everything that belongs to a person (used on sign-out). Language and place look-ups stay.
  clearUserData() {
    [KEYS.saved, KEYS.profile, KEYS.friends, KEYS.chats, KEYS.pending].forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    });
    write(KEYS.owner, "guest");
  },
};
