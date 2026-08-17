import type { DistanceUnit, Microns } from "./types";

/** 2350 -> "2.35". Trailing zeros beyond two decimals are dropped. */
export function mm(um: Microns | undefined, decimals = 3): string {
  if (um === undefined || Number.isNaN(um)) return "—";
  const value = um / 1000;
  return value
    .toFixed(decimals)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

/** Same, but always padded — for columns of numbers that should line up. */
export function mmFixed(um: Microns | undefined, decimals = 3): string {
  if (um === undefined || Number.isNaN(um)) return "—";
  return (um / 1000).toFixed(decimals);
}

export function signedMm(um: Microns | undefined): string {
  if (um === undefined || Number.isNaN(um)) return "—";
  return `${um > 0 ? "+" : ""}${mm(um)}`;
}

/**
 * Parse what someone types into microns.
 *
 * Accepts millimetres with either separator ("2.35" or "2,35" — the original
 * sheets were saved on a comma-decimal locale), and is deliberately tolerant
 * of a bare "235" style entry being wrong, which the caller range-checks.
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
  return d.toLocaleDateString(undefined, {
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

/** "5 min ago". Rough on purpose — nothing here turns on the exact minute. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "not yet";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 90) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
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
  return `${reading.toLocaleString()} ${unitLabel(units)}`;
}
