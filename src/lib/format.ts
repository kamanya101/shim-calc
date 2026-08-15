import type { Microns } from "./types";

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

export function formatOdometer(km: number | undefined): string {
  if (km === undefined) return "—";
  return `${km.toLocaleString()} km`;
}
