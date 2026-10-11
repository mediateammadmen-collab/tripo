"use client";

// Browser connection to Supabase (accounts + each traveler's own data).
// Uses the publishable key; the database's security rules decide what a signed-in person can reach.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client = null;

// Returns the client, or null when Supabase isn't configured (the app then works in guest mode only).
export function getSupabase() {
  if (!url || !key || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export const accountsEnabled = !!(url && key);
