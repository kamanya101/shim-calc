"use client";

import { translatedLocales } from "@/lib/i18n/dictionaries";
import { localeInfo, type LocaleCode } from "@/lib/i18n/locales";
import { useLocale } from "./LocaleProvider";

/**
 * Picking a language.
 *
 * Lists only what has actually been translated. Offering all sixteen and
 * quietly handing back English for the fourteen that are not done yet would be
 * a worse lie than not offering them — a rider who picks Greek and gets English
 * concludes the app is broken, not that Greek is still coming.
 *
 * Options are labelled in their own language, never in the current one. Somebody
 * hunting for their language is by definition someone who cannot read the one on
 * screen, so a list reading "German, Spanish, Greek" is a list they cannot use.
 *
 * Hidden entirely while English is the only option, so it does not sit there as
 * a control that does nothing.
 */
export function LanguagePicker() {
  const { locale, setLocale, t } = useLocale();
  const available = translatedLocales();

  if (available.length < 2) return null;

  const current = localeInfo(locale);

  return (
    <div className="no-print mb-3 rounded-xl border border-line bg-surface p-3">
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-faint">
          {t("language.heading")}
        </span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as LocaleCode)}
          className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          {available.map((code) => {
            const info = localeInfo(code);
            return (
              <option key={code} value={code}>
                {info.name}
                {/* Marked in the option itself rather than only beneath the
                    select, so the state is visible while choosing and not just
                    after. */}
                {info.reviewed ? "" : ` · ${t("language.unreviewedShort")}`}
              </option>
            );
          })}
        </select>
      </label>

      {!current.reviewed && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-warn">
          {t("language.unreviewed")}
        </p>
      )}
    </div>
  );
}
