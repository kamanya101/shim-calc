"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False in a checkout with no .env.local. The app still runs; sync does not. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

/**
 * The Supabase client, or null when there is nothing to talk to.
 *
 * Built lazily and only in the browser: creating it reads and writes
 * localStorage to restore a session, which does not exist while the page is
 * being prerendered.
 *
 * `detectSessionInUrl` is off because sign-in is email and password. Nothing
 * ever comes back as a token in the address bar, and leaving the check on
 * would have the client inspect every URL the app is opened at — including the
 * ones the service worker serves from cache.
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "shim-calc/session/v1",
    },
  });
  return client;
}
