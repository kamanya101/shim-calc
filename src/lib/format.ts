import type { DistanceUnit, Microns } from "./types";

/**
 * Which language's number and date conventions to print in.
 *
 * Held at module level and set by LocaleProvider rather than threaded through
 * every call. There are around seventy places in this app that print a
 * measurement, and passing a locale into each of them would be seventy chances
 * to forget one — which, in an app whose entire job is small precise numbers,
 * is a worse failure than the impurity here. There is only ever one language
 * on screen at a time, so a module-level value is the truth rather than a
 * convenient lie.
 *
 * It is set during the provider's render, before any child prints anything, so
 * a language change and the numbers it governs land in the same paint.
 */
let activeLocale = "en";

export function setFormatLocale(code: string): void {
  activeLocale = code;
}

/**
 * Number formatters are expensive to construct and these are built on nearly
 * every cell of a service sheet, so they are kept per locale and shape.
 */
const numberFormats = new Map<string, Intl.NumberFormat>();

function formatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${activeLocale}:${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(activeLocale, options);
    numberFormats.set(key, format);
  }
  return format;
}

/** A plain number in the active language: 1234 -> "1,234", or "1.234". */
export function formatNumber(value: number): string {
  return formatter({}).format(value);
}

/**
 * 2350 -> "2.35", or "2,35" in most of Europe.
 *
 * The decimal comma is not cosmetic here. Every language this app is
 * translated into except English, Japanese and Afrikaans writes it that way, so
 * a German rider reading "2.35" off the screen and "2,35" off the KTM manual on
 * the bench has to stop and work out whether they are the same number. They
 * are, and the app should not be the reason anybody wonders.
 *
 * Reading them back in is already safe: parseMm has always taken either.
 */
export function mm(um: Microns | undefined, decimals = 3): string {
  if (um === undefined || Number.isNaN(um)) return "—";
  return formatter({
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(um / 1000);
}

/** Same, but always padded — for columns of numbers that should line up. */
export function mmFixed(um: Microns | undefined, decimals = 3): string {
  if (um === undefined || Number.isNaN(um)) return "—";
  return formatter({
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(um / 1000);
}

export function signedMm(um: Microns | undefined): string {
  if (um === undefined || Number.isNaN(um)) return "—";
  // Through Intl rather than by prefixing a "+", so that languages which write
  // their signs differently get their own convention rather than English's.
  return formatter({
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    signDisplay: "exceptZero",
  }).format(um / 1000);
}

/**
 * Parse what someone types into microns.
 *
 * Accepts millimetres with either separator ("2.35" or "2,35" — the original
 * sheets were saved on a comma-decimal locale), and is deliberately tolerant
 * of a bare "235" style entry being wrong, which the caller range-checks.
 *
 * Both are taken in every language, not just the ones that write commas. A
 * rider working in German on a phone with an English keyboard will type
 * whichever the keyboard puts under their thumb, and being strict about it
 * would reject a number that is not wrong.
 */
export function parseMm(input: string): Microns | undefined {
  const cleaned = input.trim().replace(",", ".");
  if (cleaned === "") return undefined;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return undefined;
  return Math.round(value * 1000);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(activeLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * "5 min ago". Rough on purpose — nothing here turns on the exact minute.
 *
 * Takes its words rather than holding them, because the plural of "day"
 * is a language's business and not this function's. See translate.ts for why
 * that is not the fussiness it looks like.
 */
export function timeAgo(
  iso: string | null,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (!iso) return t("time.never");
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 90) return t("time.justNow");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("time.minutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("time.hours", { count: hours });
  const days = Math.round(hours / 24);
  return t("time.days", { count: days });
}

/**
 * Odometers, and the one conversion in the app.
 *
 * A reading was unitless until the shared pool started comparing bikes against
 * each other, at which point it had to stop being: 60,000 miles and 60,000
 * kilometres are the same number and sixty per cent apart, and mixing them
 * would not fail, it would just quietly produce wrong averages forever.
 *
 * So the pool stores kilometres and nothing else, and these two functions are
 * the only places a reading changes unit. A rider's own history is never put
 * through them — it stays exactly as typed, in the bike's own unit — so the
 * rounding here can only ever affect a number on its way to or from the pool.
 */
const KM_PER_MILE = 1.609344;

export function toKm(reading: number, units: DistanceUnit): number {
  return units === "mi" ? Math.round(reading * KM_PER_MILE) : reading;
}

export function fromKm(km: number, units: DistanceUnit): number {
  return units === "mi" ? Math.round(km / KM_PER_MILE) : km;
}

export function unitLabel(units: DistanceUnit | undefined): string {
  return units === "mi" ? "mi" : "km";
}

/**
 * Takes the unit rather than assuming one. It is required, not optional, so
 * that adding a place a mileage is printed cannot silently print a bare number
 * again.
 */
export function formatOdometer(
  reading: number | undefined,
  units: DistanceUnit | undefined,
): string {
  if (reading === undefined) return "—";
  return `${formatter({}).format(reading)} ${unitLabel(units)}`;
}
