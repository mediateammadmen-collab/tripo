"use client";

// Reading and writing a signed-in traveler's data in Supabase.
// Every function throws on failure; the store decides what to do (retry later, show a notice).

import { getSupabase } from "@/lib/supabase/client";

const sb = () => {
  const c = getSupabase();
  if (!c) throw new Error("accounts_not_configured");
  return c;
};
const check = ({ data, error }) => {
  if (error) {
    const e = new Error(error.message || "cloud_error");
    // 42P01 / PGRST205: the tables from supabase/schema.sql have not been created yet
    e.code = error.code === "42P01" || error.code === "PGRST205" ? "no_tables" : error.code || "cloud_error";
    throw e;
  }
  return data;
};

// A trip in the app carries a few fields that live in their own database columns.
const META = ["owner", "shareId", "shareMode", "role", "members"];
function tripToRow(trip) {
  const data = { ...trip };
  META.forEach((k) => delete data[k]);
  return data;
}
function rowToTrip(row, uid) {
  return {
    ...row.data,
    id: row.id,
    owner: row.owner,
    shareId: row.share_id || null,
    shareMode: row.share_mode || "off",
    role: row.owner === uid ? "owner" : "member",
  };
}

export const cloud = {
  // Everything that belongs to this account (plus trips shared with it).
  async pull(uid) {
    const c = sb();
    const [profile, saved, trips, chats] = await Promise.all([
      c.from("profiles").select("data").eq("user_id", uid).maybeSingle(),
      c.from("saved_items").select("id,data").order("updated_at", { ascending: false }),
      c.from("trips").select("id,owner,data,share_id,share_mode,updated_at").order("updated_at", { ascending: false }),
      c.from("chats").select("id,title,data,updated_at").order("updated_at", { ascending: false }).limit(30),
    ]);
    const p = check(profile);
    return {
      account: p ? p.data || {} : null, // { profile, friends }
      saved: check(saved).map((r) => ({ ...r.data, id: r.id })),
      trips: check(trips).map((r) => rowToTrip(r, uid)),
      chats: check(chats).map((r) => ({ ...r.data, id: r.id, title: r.title, updatedAt: new Date(r.updated_at).getTime() })),
    };
  },

  async pullTrips(uid) {
    const rows = check(await sb().from("trips").select("id,owner,data,share_id,share_mode,updated_at").order("updated_at", { ascending: false }));
    return rows.map((r) => rowToTrip(r, uid));
  },

  async saveAccount(uid, data) {
    check(await sb().from("profiles").upsert({ user_id: uid, data, updated_at: new Date().toISOString() }));
  },

  async upsertSaved(uid, item) {
    check(await sb().from("saved_items").upsert({ id: item.id, user_id: uid, data: item, updated_at: new Date().toISOString() }));
  },
  async deleteSaved(id) {
    check(await sb().from("saved_items").delete().eq("id", id));
  },

  // Owners write the whole row; people who joined a shared trip may only change its contents.
  async upsertTrip(uid, trip) {
    const data = tripToRow(trip);
    if (trip.owner && trip.owner !== uid) {
      check(await sb().from("trips").update({ data }).eq("id", trip.id));
      return;
    }
    check(
      await sb().from("trips").upsert({
        id: trip.id,
        owner: uid,
        data,
        share_id: trip.shareId || null,
        share_mode: trip.shareMode || "off",
        updated_at: new Date().toISOString(),
      })
    );
  },
  async deleteTrip(id) {
    check(await sb().from("trips").delete().eq("id", id));
  },

  async upsertChat(uid, chat) {
    const { id, title, updatedAt, ...data } = chat;
    check(await sb().from("chats").upsert({ id, user_id: uid, title: title || "", data, updated_at: new Date(updatedAt || Date.now()).toISOString() }));
  },
  async deleteChat(id) {
    check(await sb().from("chats").delete().eq("id", id));
  },

  // Planning together
  async joinTrip(shareId, name) {
    return check(await sb().rpc("join_trip", { p_share_id: shareId, p_name: name || "" }));
  },
  async members(tripId) {
    return check(await sb().from("trip_members").select("user_id,name,joined_at").eq("trip_id", tripId).order("joined_at"));
  },
  async leaveTrip(tripId, uid) {
    check(await sb().from("trip_members").delete().eq("trip_id", tripId).eq("user_id", uid));
  },
};
