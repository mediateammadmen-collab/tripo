// Where Tripo keeps a traveler's data. Today this is the browser's own storage;
// account sync plugs in here later without touching the rest of the app.

const KEYS = {
  saved: "tripo_saved_v1", // { saved, trips }
  profile: "tripo_profile_v1",
  friends: "tripo_friends_v1",
  lang: "tripo_lang_v1",
};

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
    return {
      saved: Array.isArray(st.saved) ? st.saved : [],
      trips: Array.isArray(st.trips) ? st.trips : [],
      profile: read(KEYS.profile, null),
      friends: Array.isArray(friends) ? friends : [],
      lang: read(KEYS.lang, "en") === "bn" ? "bn" : "en",
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
};
