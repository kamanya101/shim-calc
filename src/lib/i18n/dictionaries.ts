import type { LocaleCode } from "./locales";
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
  // Phase 2 fills this in, one language at a time. A locale with no entry
  // here renders in English — which is why the picker only offers what has
  // actually been translated, rather than listing sixteen and quietly giving
  // fourteen of them the wrong one.
};

export const EN: Dictionary = en;

/** Which locales can actually be shown, English included, in LOCALES order. */
export function translatedLocales(): LocaleCode[] {
  return ["en", ...(Object.keys(LOADERS) as LocaleCode[])];
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
