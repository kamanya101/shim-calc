"use client";

import { RESET_PATH } from "./app";
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

const LINK_DEAD =
  "That link has expired or has already been used. Ask for a new one and it'll work.";

/**
 * Send somebody a link to set a new password.
 *
 * The reply is the same whether or not the address has an account behind it.
 * Saying "no account with that email" would turn this box into a way of asking
 * the server which of a list of riders is registered, and it helps nobody who
 * is genuinely locked out — they know which address they used.
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: NO_BACKEND };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, error: OFFLINE };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    // Built from wherever the app is actually running, so the same code works
    // on localhost and in production. Both have to be listed as permitted
    // redirects in the Supabase project, or the link lands nowhere.
    redirectTo: `${window.location.origin}${RESET_PATH}`,
  });
  if (error) return { ok: false, error: describe(error) };
  return { ok: true };
}

export type RecoveryResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * Turn the link somebody just followed into a signed-in-enough session.
 *
 * The client is deliberately built with `detectSessionInUrl` off — see
 * supabase.ts, it would otherwise inspect every address the app is opened at,
 * including the ones served from the offline cache. So the one screen that
 * genuinely does arrive with credentials in its address reads them itself.
 *
 * Two shapes are accepted because the two sign-in flows Supabase can be
 * configured with deliver them differently: tokens in the part after the `#`,
 * or a single code in the query string. Which one arrives is a project
 * setting, not something this app controls, so it copes with either.
 */
export async function beginRecovery(): Promise<RecoveryResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: NO_BACKEND };

  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);

  const stated = fragment.get("error_description") ?? query.get("error_description");
  if (stated) return { ok: false, error: stated };

  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  const code = query.get("code");

  let email: string | undefined;

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { ok: false, error: describe(error) };
    email = data.user?.email;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, error: describe(error) };
    email = data.user?.email;
  } else {
    // No credentials in the address. Either the link was mangled, or this is a
    // reload after they were already taken out of it below — in which case the
    // session from the first pass is still good and the form still works.
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { ok: false, error: LINK_DEAD };
    email = data.session.user.email;
  }

  // Take the credentials out of the address bar. They are usable until they
  // are spent, and a URL gets reloaded, shared, screenshotted and left in
  // history — none of which should be enough to take over an account.
  window.history.replaceState(null, "", window.location.pathname);

  return { ok: true, email: email ?? "" };
}

/**
 * Set the new password, and treat it as signing in — which it is. Somebody
 * doing this is on a device that has probably never seen their account, and
 * making them type a password they invented ninety seconds ago would be a
 * pointless last hurdle.
 */
export async function setNewPassword(password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: NO_BACKEND };

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: describe(error) };
  if (!data.user) return { ok: false, error: LINK_DEAD };

  adopt({ userId: data.user.id, email: data.user.email ?? "" });
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
