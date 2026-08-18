"use client";

/**
 * Asking the server where this device appears to be.
 *
 * Used once, when a bike is being created, to fill in a place the rider can
 * then correct. Everything about this is best-effort by design: the app's
 * whole promise is that it works in a garage with no signal, so a bike must be
 * creatable whether or not this ever answers.
 *
 * The answer is about a phone, not a motorcycle. See /api/where.
 */

export type DetectedPlace = {
  /** ISO-3166 alpha-2, upper case. */
  country?: string;
  region?: string;
  city?: string;
};

/**
 * Long enough for a slow connection, short enough that nobody notices it fail.
 *
 * This sits between a rider tapping "add a bike" and being able to type, so
 * the cost of waiting is paid by every rider while the benefit only lands for
 * the ones who are online. Two seconds is the point where a guess stops being
 * worth the wait.
 */
const TIMEOUT_MS = 2000;

/**
 * The answer, once it is worth keeping, and the request that is fetching it.
 *
 * A device does not move between one bike being added and the next, so asking
 * again on every bike switch would spend a rider's data to be told the same
 * thing. Only a real answer is remembered: a lookup that failed because the
 * phone was in a garage must not freeze "nowhere" in for the rest of the
 * session, when signal five minutes later would have answered properly.
 */
let known: DetectedPlace | null = null;
let inFlight: Promise<DetectedPlace> | null = null;

export function detectPlace(): Promise<DetectedPlace> {
  if (known) return Promise.resolve(known);
  inFlight ??= ask()
    .then((place) => {
      if (place.country || place.region || place.city) known = place;
      return place;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function ask(): Promise<DetectedPlace> {
  // No signal is the common case in the place this app is used, and it is not
  // worth a network attempt that the browser will spend its own time failing.
  if (typeof navigator !== "undefined" && !navigator.onLine) return {};

  try {
    const response = await fetch("/api/where", {
      // Belt to the service worker's braces: even with /api/ excluded there,
      // an intermediary that decided to cache this would be handing one
      // rider's location to whatever they create next.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return {};

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return {};

    const { country, region, city } = data as Record<string, unknown>;
    const text = (value: unknown): string | undefined =>
      typeof value === "string" && value.trim().length ? value.trim() : undefined;

    const code = text(country)?.toUpperCase();
    return {
      country: code && /^[A-Z]{2}$/.test(code) ? code : undefined,
      region: text(region),
      city: text(city),
    };
  } catch {
    // Offline, timed out, not deployed to Vercel, or the route is not there
    // yet. All of them mean the same thing to a rider: no suggestion, type it
    // yourself if you want it. None of them is worth an error on screen.
    return {};
  }
}

/** "Cape Town, WC, ZA" — whichever parts are known, coarsest last. */
export function placeLabel(place: DetectedPlace): string {
  return [place.city, place.region, place.country].filter(Boolean).join(", ");
}
