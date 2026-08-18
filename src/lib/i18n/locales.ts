/**
 * The languages the LC8 was sold into.
 *
 * Chosen by where KTM actually sold these motorcycles between 2003 and 2013,
 * weighted for a big adventure twin rather than for KTM's off-road business:
 * the USA, Germany and France were the three largest markets at launch, and
 * Australia, New Zealand and South Africa carry far more of these bikes than
 * their populations suggest.
 *
 * Afrikaans is the one that is not there on sales volume. It is there because
 * the riders this app has are South African, and a real user outranks a
 * theoretical one.
 *
 * `name` is the endonym — what the language calls itself. A picker that lists
 * "German" is no use to somebody who is looking for "Deutsch", because the
 * whole reason they are in the picker is that they do not read the language it
 * is currently written in.
 */

export type LocaleCode =
  | "en"
  | "de"
  | "es"
  | "fr"
  | "it"
  | "pt"
  | "nl"
  | "pl"
  | "cs"
  | "ru"
  | "ja"
  | "af"
  | "sv"
  | "el"
  | "tr"
  | "da";

export type Locale = {
  code: LocaleCode;
  /** What the language calls itself. Shown in the picker. */
  name: string;
  /** What English calls it. Only for the app's own notes and this file. */
  english: string;
  /**
   * Whether a rider who speaks it has checked the wording.
   *
   * False on everything translated but unreviewed, which the picker says out
   * loud. The vocabulary here is workshop vocabulary — shim, clearance, feeler
   * gauge, bucket — and a plausible-sounding wrong word is worse than an
   * obviously foreign one, because it reads as authoritative to somebody about
   * to take an engine apart. Saying so is the honest position until a native
   * speaker who rides one of these has been through it.
   */
  reviewed: boolean;
};

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALES: Locale[] = [
  { code: "en", name: "English", english: "English", reviewed: true },
  { code: "de", name: "Deutsch", english: "German", reviewed: false },
  { code: "es", name: "Español", english: "Spanish", reviewed: false },
  { code: "fr", name: "Français", english: "French", reviewed: false },
  { code: "it", name: "Italiano", english: "Italian", reviewed: false },
  { code: "pt", name: "Português", english: "Portuguese", reviewed: false },
  { code: "nl", name: "Nederlands", english: "Dutch", reviewed: false },
  { code: "pl", name: "Polski", english: "Polish", reviewed: false },
  { code: "cs", name: "Čeština", english: "Czech", reviewed: false },
  { code: "ru", name: "Русский", english: "Russian", reviewed: false },
  { code: "ja", name: "日本語", english: "Japanese", reviewed: false },
  { code: "af", name: "Afrikaans", english: "Afrikaans", reviewed: false },
  { code: "sv", name: "Svenska", english: "Swedish", reviewed: false },
  { code: "el", name: "Ελληνικά", english: "Greek", reviewed: false },
  { code: "tr", name: "Türkçe", english: "Turkish", reviewed: false },
  { code: "da", name: "Dansk", english: "Danish", reviewed: false },
];

const BY_CODE = new Map(LOCALES.map((locale) => [locale.code, locale]));

export function isLocaleCode(value: string): value is LocaleCode {
  return BY_CODE.has(value as LocaleCode);
}

export function localeInfo(code: LocaleCode): Locale {
  return BY_CODE.get(code) ?? LOCALES[0];
}

/**
 * The best of the languages the browser asks for, or English.
 *
 * Matched on the primary subtag only: a phone set to "pt-BR" or "de-AT" wants
 * Portuguese and German, and there is nothing to gain here by holding out for
 * the regional variant this app does not have. Ordered by the browser's own
 * preference list, so somebody who reads three languages gets their first.
 */
export function preferredLocale(requested: readonly string[]): LocaleCode {
  for (const tag of requested) {
    const primary = tag.toLowerCase().split("-")[0];
    if (isLocaleCode(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
