"use client";

import { useEffect, useRef, useState } from "react";
import { translatedLocales } from "@/lib/i18n/dictionaries";
import { localeInfo, type LocaleCode } from "@/lib/i18n/locales";
import { useLocale } from "./LocaleProvider";

/**
 * The language control, in the header of every sheet.
 *
 * A button rather than a bare select, and at the top rather than in the footer,
 * for one reason: somebody who cannot read the app is not going to scroll to
 * the bottom of a screen they cannot read looking for a control they have no
 * word for. A globe at the top of every page is findable without reading
 * anything, which is the only kind of findable that helps here.
 *
 * Lists only what has actually been translated. Offering all sixteen and
 * quietly handing back English for the ones that are not done would be a worse
 * lie than not offering them — a rider who picks Greek and gets English
 * concludes the app is broken, not that Greek is still coming.
 *
 * Options are labelled in their own language, never in the current one. Anybody
 * hunting for their language is by definition someone who cannot read the one
 * on screen, so a list reading "German, Spanish, Greek" is a list they cannot
 * use.
 *
 * The choice itself is stored by LocaleProvider and survives closing the app,
 * reinstalling the PWA and going offline. Nothing here expires it; only picking
 * a different language changes it.
 */
export function LanguageButton() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const available = translatedLocales();
  const current = localeInfo(locale);

  // Closing on any pointer down outside, rather than on blur. A menu that
  // closes on blur eats the first tap of whatever the rider was actually
  // reaching for, which on a phone reads as the app ignoring them.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Focus lands on the language already in force, so the list opens where the
  // rider is rather than at the top of it.
  useEffect(() => {
    if (!open) return;
    const active = menu.current?.querySelector<HTMLButtonElement>(
      '[aria-checked="true"]',
    );
    (active ?? menu.current?.querySelector("button"))?.focus();
  }, [open]);

  // Nothing to choose between while English is the only language that exists,
  // so no control either. A button that opens a list of one is a promise the
  // app cannot keep yet.
  if (available.length < 2) return null;

  const choose = (code: LocaleCode) => {
    setLocale(code);
    setOpen(false);
    button.current?.focus();
  };

  /** Arrow keys walk the list; Home and End jump to its ends. */
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menu.current?.querySelectorAll<HTMLButtonElement>("button[role]") ?? [],
    );
    if (items.length === 0) return;

    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    let next: number | null = null;

    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === "ArrowUp")
      next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;

    if (next !== null) {
      event.preventDefault();
      items[next].focus();
    }
  };

  return (
    <div ref={wrapper} className="no-print relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="menu"
        aria-expanded={open}
        // Spelled out for a screen reader, which reads the label rather than
        // the globe. The endonym goes in it because that is the word the rider
        // is listening for.
        aria-label={`${t("language.change")} — ${current.name}`}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-raised focus:border-accent focus:outline-none"
      >
        <GlobeIcon />
        {/*
          The language's own name, truncated rather than dropped. On a narrow
          phone "Nederlands" would push the header apart, but hiding the name
          entirely leaves a globe that gives no clue which language is on.
        */}
        <span className="max-w-[7rem] truncate">{current.name}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label={t("language.heading")}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-1.5 max-h-[60vh] w-56 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/40"
        >
          {available.map((code) => {
            const info = localeInfo(code);
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(code)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus:outline-none ${
                  active
                    ? "bg-raised font-semibold text-accent"
                    : "text-ink hover:bg-raised focus:bg-raised"
                }`}
              >
                <span className="w-3.5 shrink-0 text-accent">
                  {active ? <CheckIcon /> : null}
                </span>
                <span className="flex-1 truncate">{info.name}</span>
                {/* Marked on the row itself rather than only under the button,
                    so the state is visible while choosing and not just after. */}
                {!info.reviewed && (
                  <span className="shrink-0 text-[10px] font-medium text-faint">
                    {t("language.unreviewedShort")}
                  </span>
                )}
              </button>
            );
          })}

          {!current.reviewed && (
            <p className="mt-1 border-t border-line px-2.5 pb-1 pt-2 text-[11px] leading-relaxed text-warn">
              {t("language.unreviewed")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-muted"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 13 4 4 10-10" />
    </svg>
  );
}
