"use client";

import { clearLocalData, ownerStore, type Owner } from "./stores";
import { getSupabase } from "./supabase";

export type AuthResult =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; error: string };

const NO_BACKEND =
  "This copy of the app has no server configured, so signing in isn't possible.";

const OFFLINE =
  "You're offline. Signing in for the first time needs a connection — once you're in, the app works without one.";

/**
 * Record who is signed in on this device, clearing the previous rider's data
 * first if it belongs to somebody else. See `ownerStore` for why this local
 * record, rather than the live session, is what the app gates on.
 */
function adopt(owner: Owner): void {
  const previous = ownerStore.get();
  if (previous && previous.userId !== owner.userId) clearLocalData();
  ownerStore.set(owner);
}

/**
 * Supabase reports a dead connection as a TypeError from fetch, which surfaces
 * as an unhelpful "Failed to fetch". Standing in a garage is the likeliest
 * reason to see it, so say that instead.
 */
function describe(error: { message?: string } | null): string {
  const message = error?.message ?? "Something went wrong.";
  if (/fetch|network|connection/i.test(message)) return OFFLINE;
  return message;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: NO_BACKEND };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, error: OFFLINE };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, error: describe(error) };
  if (!data.user) return { ok: false, error: "That didn't work. Try again." };

  adopt({ userId: data.user.id, email: data.user.email ?? email.trim() });
  return { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: NO_BACKEND };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, error: OFFLINE };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, error: describe(error) };
  if (!data.user) return { ok: false, error: "That didn't work. Try again." };

  // With email confirmation switched on in the Supabase project, signing up
  // returns a user but no session. Nothing can be synced until they confirm,
  // so they are not signed in yet and must be told why.
  if (!data.session) return { ok: true, needsConfirmation: true };

  adopt({ userId: data.user.id, email: data.user.email ?? email.trim() });
  return { ok: true };
}

/**
 * Sign out and wipe this device.
 *
 * The data is on the server under this account, and leaving it behind on a
 * shared tablet for the next person to open would be worse than making them
 * sign in again to see it. Local sign-out happens whether or not the server
 * can be reached — being offline must not trap somebody in an account.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  try {
    await supabase?.auth.signOut();
  } catch {
    // Offline, or the token was already dead. Either way the device forgets.
  }
  clearLocalData();
  ownerStore.set(null);
}
