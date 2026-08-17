/** Single source for the things that appear in more than one place. */

export const APP_NAME = "Kamanya's Shim Calculator";

/** Shown on the home screen under the icon, where long names get truncated. */
export const APP_SHORT_NAME = "Shim Calc";

export const APP_DESCRIPTION =
  "Work out valve shim sizes and part numbers for KTM LC8 950/990 engines, and keep a record of your clearances. Works offline.";

export const DONATE_URL = "https://paypal.me/KamanyaJ";
export const DONATE_HANDLE = "paypal.me/KamanyaJ";

/**
 * Where a password reset email lands.
 *
 * The one screen that has to work for somebody who is *not* signed in — they
 * are here precisely because they cannot get in — so the gate in AuthProvider
 * lets it through and the tab bar stays out of its way.
 */
export const RESET_PATH = "/reset";
