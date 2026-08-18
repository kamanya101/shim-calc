import { LOCALES, type LocaleCode } from "./locales";
import type { Dictionary } from "./translate";
import en from "./messages/en";

/**
 * Where the words come from.
 *
 * English is imported outright: it is the fallback for every other language,
 * so it has to be in hand before anything can render, and fetching it would
 * only put a blank screen in front of the rider who needs it least.
 *
 * The rest are dynamic imports, which is what tells the bundler to split them
 * into separate files. Sixteen dictionaries in one bundle would have every
 * rider download all sixteen to read one — and this app is used at the side of
 * the road as often as at a bench, sometimes on a phone paying by the megabyte.
 *
 * The service worker caches whatever has been fetched, so a language survives
 * going offline once it has been chosen while online. Picking a new one with no
 * signal is the one thing that will not work, and it falls back to English
 * rather than failing.
 */
const LOADERS: Partial<
  Record<LocaleCode, () => Promise<{ default: Dictionary }>>
> = {
  // Filled in one language at a time. A locale with no entry here renders in
  // English — which is why the picker only offers what has actually been
  // translated, rather than listing sixteen and quietly giving thirteen of
  // them the wrong one.
  //
  // These three are machine-translated and carry `reviewed: false`, which the
  // picker shows on the row and under the button. The app's prose is not the
  // hard part; the workshop words are — shim, clearance, feeler gauge, bucket —
  // and a plausible-sounding wrong one reads as authoritative to somebody about
  // to take an engine apart. Each file lists the terms it chose, at the top, so
  // a reviewer can argue with the vocabulary before reading 150 phrases.
  af: () => import("./messages/af"),
  de: () => import("./messages/de"),
  fr: () => import("./messages/fr"),
};

export const EN: Dictionary = en;

/**
 * Which locales can actually be shown, English included, in LOCALES order.
 *
 * Ordered from LOCALES rather than from the keys above, so the picker keeps a
 * stable order however these entries happen to be typed in — a list that
 * reshuffles as languages are added is a list riders have to re-read.
 */
export function translatedLocales(): LocaleCode[] {
  return LOCALES.filter((locale) => isTranslated(locale.code)).map(
    (locale) => locale.code,
  );
}

export function isTranslated(code: LocaleCode): boolean {
  return code === "en" || code in LOADERS;
}

/**
 * Fetch a locale's words, falling back to English if it has none or if the
 * fetch fails — an offline first-run being the realistic way that happens.
 */
export async function loadDictionary(code: LocaleCode): Promise<Dictionary> {
  const loader = LOADERS[code];
  if (!loader) return en;
  try {
    const loaded = await loader();
    return loaded.default;
  } catch {
    return en;
  }
}
