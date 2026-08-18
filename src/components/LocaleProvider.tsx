"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setFormatLocale } from "@/lib/format";
import { EN, isTranslated, loadDictionary } from "@/lib/i18n/dictionaries";
import {
  DEFAULT_LOCALE,
  type LocaleCode,
  preferredLocale,
} from "@/lib/i18n/locales";
import { translate, type Dictionary, type Vars } from "@/lib/i18n/translate";
import { localeStore } from "@/lib/stores";
import { useHydrated, useLocalStore } from "@/lib/store";

export type Translate = (key: string, vars?: Vars) => string;

type LocaleContextValue = {
  locale: LocaleCode;
  /** Null while nobody has chosen and the browser's preference is in force. */
  chosen: LocaleCode | null;
  setLocale: (code: LocaleCode) => void;
  t: Translate;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * The language everything else reads from.
 *
 * Sits outermost, above the data providers, because a screen that fails to
 * load a rider's bikes still has to be able to say so in their own language.
 *
 * There is no locale in the URL and that is deliberate. This is an installed
 * PWA behind a sign-in, so there is no search engine to serve and no link to
 * share; what sixteen URL prefixes would buy is sixteen copies of every route
 * in the service worker's cache and a broken bookmark for everyone who already
 * has it on their home screen. The language is a setting, stored beside every
 * other setting.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const chosen = useLocalStore(localeStore);
  const hydrated = useHydrated();

  /**
   * Nobody's choice means follow the phone — but only once the browser is
   * actually there. During the server render and the hydration pass there is
   * no navigator to ask, and guessing differently on the two passes is how a
   * hydration mismatch happens.
   */
  const locale: LocaleCode =
    chosen ??
    (hydrated && typeof navigator !== "undefined"
      ? preferredLocale(navigator.languages ?? [navigator.language])
      : DEFAULT_LOCALE);

  const [fetched, setFetched] = useState<{
    code: LocaleCode;
    words: Dictionary;
  }>({ code: DEFAULT_LOCALE, words: EN });

  /**
   * English until the chosen language has actually arrived, which is exactly
   * what should be on screen in the meantime — it is the fallback for every
   * missing phrase anyway, so a language still in flight shows the same words a
   * half-finished translation would.
   *
   * Derived rather than stored. A locale with no translation needs no fetch and
   * no state change at all, and expressing that as an effect that immediately
   * sets state back would be a render scheduled to undo itself.
   */
  const dictionary =
    isTranslated(locale) && fetched.code === locale ? fetched.words : EN;

  useEffect(() => {
    if (!isTranslated(locale) || fetched.code === locale) return;

    let current = true;
    loadDictionary(locale).then((words) => {
      // A rider flicking through the picker can start three fetches before the
      // first lands. Without this, the one that happens to resolve last wins
      // and the app ends up in a language nobody chose.
      if (current) setFetched({ code: locale, words });
    });
    return () => {
      current = false;
    };
  }, [locale, fetched.code]);

  /**
   * Set during render rather than in an effect, so the numbers on a screen
   * change language in the same paint as the words around them. Assigning the
   * same value twice is harmless, which is what makes this safe to do here.
   */
  setFormatLocale(locale);

  useEffect(() => {
    // What the document declares it is written in. Not decoration: CSS
    // `text-transform: uppercase` is language-aware, and this app uppercases
    // its headings — Turkish capitalises "i" as "İ", and gets it wrong unless
    // the page says it is Turkish. Screen readers pick their voice from it too.
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      chosen,
      setLocale: (code: LocaleCode) => localeStore.set(code),
      // Falls back through English before giving up, so a half-finished
      // translation shows one English phrase rather than a broken screen.
      t: (key, vars) => translate(dictionary, EN, locale, key, vars),
    }),
    [locale, chosen, dictionary],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return value;
}

/** The common case — just the words. */
export function useT(): Translate {
  return useLocale().t;
}
