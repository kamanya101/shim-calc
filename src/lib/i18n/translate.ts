import type { LocaleCode } from "./locales";

/**
 * A message is either a plain string, or a set of forms chosen by a count.
 *
 * The forms are the CLDR plural categories, and they are not decoration. The
 * usual English shortcut — `n === 1 ? "shim" : "shims"` — is simply wrong in
 * most of the languages here. Russian, Polish and Czech each take three forms,
 * and which one applies depends on the last digit and the last two digits of
 * the number, so 1, 3 and 5 shims are three different words. Getting it wrong
 * is not a typo a reviewer catches by eye; it is the difference between the app
 * reading as written by somebody who speaks the language and not.
 *
 * `other` is required because every language has it, and it is what an
 * incomplete translation falls back to rather than showing nothing.
 */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

export type Message = string | PluralForms;

export type Dictionary = Record<string, Message>;

/** Values spliced into `{placeholders}`. */
export type Vars = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Plural rule objects are not free to build and the same handful of locales get
 * asked over and over as a screen renders. Cached per locale for the life of
 * the page.
 */
const pluralRules = new Map<string, Intl.PluralRules>();

function rulesFor(locale: LocaleCode): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules;
}

function resolve(
  message: Message,
  locale: LocaleCode,
  vars: Vars | undefined,
): string {
  if (typeof message === "string") return message;

  const count = Number(vars?.count);
  if (!Number.isFinite(count)) return message.other;

  const category = rulesFor(locale).select(count);
  return message[category] ?? message.other;
}

function interpolate(text: string, vars: Vars | undefined): string {
  if (!vars) return text;
  return text.replace(PLACEHOLDER, (whole, name: string) => {
    const value = vars[name];
    // An unknown placeholder is left standing rather than blanked. A visible
    // "{count}" on screen is a bug somebody reports; a silent empty space is a
    // bug that ships.
    return value === undefined ? whole : String(value);
  });
}

/**
 * Look a key up in the active dictionary, then in English, then give up and
 * return the key.
 *
 * The English fallback is what makes a part-finished translation shippable: a
 * language file that is missing a phrase shows that one phrase in English
 * instead of breaking the screen, so translations can land in pieces and be
 * corrected in pieces. Returning the key itself as the last resort is
 * deliberate too — a key on screen names exactly what is missing, which is
 * more use to whoever has to fix it than an empty element would be.
 */
export function translate(
  active: Dictionary,
  fallback: Dictionary,
  locale: LocaleCode,
  key: string,
  vars?: Vars,
): string {
  const message = active[key] ?? fallback[key];
  if (message === undefined) return key;
  return interpolate(resolve(message, locale, vars), vars);
}
