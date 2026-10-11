// Server-only connection to Supabase with the secret key (full access).
// Import this only from route handlers and server components — never from "use client" files.

import { createClient } from "@supabase/supabase-js";

let admin = null;

export function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!admin) {
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}
