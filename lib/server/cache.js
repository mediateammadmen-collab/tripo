// Reads from the shared place_cache table. The cache is only a speed-up, so it must never slow a look-up down:
// a slow read is given up on quickly, and if the database can't be reached it is left alone for a minute.

import { getAdmin } from "@/lib/supabase/admin";

const WAIT_MS = 1500;
const REST_MS = 60000;
let restUntil = 0;

// -> the row (with the given columns), or null if it isn't there or the database is unavailable.
export async function readCache(key, columns = "data") {
  const admin = getAdmin();
  if (!admin || Date.now() < restUntil) return null;
  try {
    const { data, error } = await admin.from("place_cache").select(columns).eq("key", key).abortSignal(AbortSignal.timeout(WAIT_MS)).maybeSingle().retry(false);
    if (error) throw error;
    return data;
  } catch (e) {
    restUntil = Date.now() + REST_MS;
    console.warn("Place cache unavailable, skipping it for a minute:", (e && e.message) || e);
    return null;
  }
}
