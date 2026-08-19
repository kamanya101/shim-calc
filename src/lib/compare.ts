"use client";

import { toKm } from "./format";
import { BIKE_MODELS } from "./models";
import { getSupabase } from "./supabase";
import type { Bike, Microns, ServiceRecord, ValvePosition, ValveType } from "./types";

/**
 * Putting one bike's shims next to everybody else's.
 *
 * The pool is sealed — see supabase/schema.sql — so nothing here reads rows.
 * It asks `pool_shim_distribution` for a shape: how many readings sit in each
 * 25-micron band, and the min, max and mean. That is all the page draws, and
 * all it is possible to get.
 *
 * The comparison is deliberately of shim *thickness*, the same quantity the
 * History charts moved to. A clearance is reset at every service and says more
 * about the last person to hold the feeler gauges than about the engine; the
 * shim is what is actually in there.
 *
 * Worth stating plainly, because the page says it too: a bike at 100,000 km
 * will be running thinner shims than the same model at 20,000, so a wide pool
 * mixes fresh engines with worn ones. This answers "am I unusual for this
 * model", not "how fast am I wearing". The second question is the trend chart.
 */

/** Which readings from the pool to stand against. */
export type PoolScope = "model" | "year" | "950" | "990" | "all";

/**
 * The three questions a rider might be asking. They differ in two ways only:
 * what is drawn for the rider, and whether the pool is every reading it holds
 * or just what each bike is running now.
 */
export type CompareMode =
  | "current-vs-average"
  | "current-vs-range"
  | "range-vs-range";

export type ModeSpec = {
  label: string;
  /** What the rider's own bar covers. */
  mine: "current" | "range";
  /** True asks the pool for one reading per valve per bike, its most recent. */
  latestOnly: boolean;
  /** Whether the mean is the headline or just a mark on the band. */
  emphasiseAverage: boolean;
  help: string;
};

export const MODES: Record<CompareMode, ModeSpec> = {
  "current-vs-average": {
    label: "What I'm running vs the average",
    mine: "current",
    latestOnly: true,
    emphasiseAverage: true,
    help: "The shims in your engine now, against the average of what everyone else is running now. One reading per valve per bike, so a rider who services often does not count more than one who does not.",
  },
  "current-vs-range": {
    label: "What I'm running vs the whole spread",
    mine: "current",
    latestOnly: false,
    emphasiseAverage: false,
    help: "The shims in your engine now, placed on the full spread of every thickness the pool has ever seen. Shows whether you sit in the crowd or out at an edge.",
  },
  "range-vs-range": {
    label: "My spread vs the whole spread",
    mine: "range",
    latestOnly: false,
    emphasiseAverage: false,
    help: "Every shim thickness recorded on this bike, against every thickness in the pool. The widest view, and the muddiest — a long history covers a lot of ground.",
  },
};

export type PoolSide = {
  readings: number;
  bikes: number;
  /** False when too few bikes matched to say anything about the shape. */
  enough: boolean;
  minBikes: number;
  min?: Microns;
  max?: Microns;
  avg?: Microns;
  /** [band lower edge in microns, how many readings in it]. */
  bins: [Microns, number][];
};

export type PoolDistribution = {
  /** The four-valve average, keyed "intake" / "exhaust". */
  byType: Partial<Record<ValveType, PoolSide>>;
  /** One valve on its own, keyed by position id. */
  byPosition: Record<string, PoolSide | undefined>;
};

const EMPTY_DISTRIBUTION: PoolDistribution = { byType: {}, byPosition: {} };

const MODEL_IDS: Record<"950" | "990", string[]> = {
  950: BIKE_MODELS.filter((m) => m.family === "950").map((m) => m.id),
  990: BIKE_MODELS.filter((m) => m.family === "990").map((m) => m.id),
};

/**
 * The label for a scope, and whether the bike can even ask for it — "this
 * model" is not a question a bike with no model set is able to pose.
 */
export function scopeOptions(
  bike: Bike,
): { scope: PoolScope; label: string; available: boolean }[] {
  return [
    {
      scope: "model",
      label: "Same model",
      available: Boolean(bike.modelId),
    },
    {
      scope: "year",
      label: "Same year",
      available: Boolean(bike.year),
    },
    { scope: "950", label: "All 950s", available: true },
    { scope: "990", label: "All 990s", available: true },
    { scope: "all", label: "Everything", available: true },
  ];
}

/**
 * A mileage window, in the bike's own unit — which is what the rider typed and
 * what they will read back. It is converted to kilometres on its way to the
 * pool and never stored in any other form.
 */
export type OdoWindow = { min?: number; max?: number };

type Filter = {
  model_ids: string[] | null;
  years: number[] | null;
  latest_only: boolean;
  odo_min_km: number | null;
  odo_max_km: number | null;
};

function buildFilter(
  scope: PoolScope,
  bike: Bike,
  latestOnly: boolean,
  window: OdoWindow,
): Filter {
  const units = bike.units ?? "km";
  const base: Filter = {
    model_ids: null,
    years: null,
    latest_only: latestOnly,
    odo_min_km: window.min === undefined ? null : toKm(window.min, units),
    odo_max_km: window.max === undefined ? null : toKm(window.max, units),
  };

  switch (scope) {
    case "model":
      return { ...base, model_ids: bike.modelId ? [bike.modelId] : null };
    case "year":
      return { ...base, years: bike.year ? [bike.year] : null };
    case "950":
      return { ...base, model_ids: MODEL_IDS[950] };
    case "990":
      return { ...base, model_ids: MODEL_IDS[990] };
    case "all":
      return base;
  }
}

export type PoolResult =
  | { state: "ok"; distribution: PoolDistribution }
  | { state: "offline" }
  | { state: "no-backend" }
  | { state: "error"; message: string };

export async function fetchPoolDistribution(
  scope: PoolScope,
  bike: Bike,
  latestOnly: boolean,
  window: OdoWindow,
): Promise<PoolResult> {
  const supabase = getSupabase();
  if (!supabase) return { state: "no-backend" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { state: "offline" };
  }

  const { data, error } = await supabase.rpc(
    "pool_shim_distribution",
    buildFilter(scope, bike, latestOnly, window),
  );

  if (error) return { state: "error", message: error.message };
  return {
    state: "ok",
    distribution: (data as PoolDistribution | null) ?? EMPTY_DISTRIBUTION,
  };
}

/** Oldest first, the same ordering the trend charts read in. */
function orderRecords(records: ServiceRecord[]): ServiceRecord[] {
  return [...records].sort((a, b) => {
    if (a.odometer !== undefined && b.odometer !== undefined) {
      return a.odometer - b.odometer;
    }
    return a.date.localeCompare(b.date);
  });
}

/**
 * The rider's own thicknesses for a set of valves.
 *
 * "current" is the last thing known to be in each valve: the shim the rider
 * chose at the most recent service that touched it, or failing that the one
 * measured there. "range" is every thickness the bike has on record.
 */
export function riderShims(
  records: ServiceRecord[],
  positions: ValvePosition[],
  which: "current" | "range",
): Microns[] {
  const ordered = orderRecords(records);
  const values: Microns[] = [];

  for (const position of positions) {
    if (which === "current") {
      let latest: Microns | undefined;
      for (const record of ordered) {
        const reading = record.readings[position.id];
        if (reading?.shim === undefined) continue;
        // A chosen shim is what went in and is still in there; the measured
        // one is what came out and has been replaced.
        latest = reading.chosenShim ?? reading.shim;
      }
      if (latest !== undefined) values.push(latest);
      continue;
    }

    for (const record of ordered) {
      const reading = record.readings[position.id];
      if (reading?.shim === undefined) continue;
      values.push(reading.shim);
      if (reading.chosenShim !== undefined) values.push(reading.chosenShim);
    }
  }

  return values;
}

/*
 * ---------------------------------------------------------------------------
 * HOW OFTEN EVERYBODY ELSE REPLACES THE SAME THINGS
 *
 * The second comparison on the page, and a different quantity from the shims
 * above: not "what am I running" but "how far do I get between chains".
 *
 * The measurement is defined in the comment above pool_service_intervals in
 * supabase/schema.sql, and the rules below have to match it exactly or the two
 * halves of the panel are not comparable. The important ones, restated:
 *
 *   * a bike's distance is its newest logged odometer minus its OLDEST, never
 *     the odometer itself;
 *   * two logged services minimum, and at least 1,000 km between them;
 *   * the two oil grades are one job;
 *   * the two catch-alls cannot yield an interval and are left out.
 * ---------------------------------------------------------------------------
 */

/** Both oil grades answer the same question: how often is the oil changed. */
const OIL_GRADES = new Set(["oil-50w", "oil-60w"]);
/** They record that something was done, not what. No interval is possible. */
const NO_INTERVAL = new Set(["engine-parts", "chassis-parts"]);
/** The id the combined oil line is filed under. Not a real serviceItems id. */
export const OIL_COMBINED = "oil";

/** Two services and a thousand kilometres, the same floor the pool applies. */
const MIN_SERVICES = 2;
const MIN_SPAN_KM = 1000;

export function normaliseItem(id: string): string | null {
  if (NO_INTERVAL.has(id)) return null;
  return OIL_GRADES.has(id) ? OIL_COMBINED : id;
}

export type IntervalSide = {
  bikes: number;
  services: number;
  enough: boolean;
  /** Kilometres between one replacement and the next. Null below the floor. */
  kmBetween: number | null;
};

export type ServiceIntervals = {
  items: Record<string, IntervalSide>;
  /** Bikes with a long enough log to have contributed a span at all. */
  bikes: number;
  minBikes: number;
};

export type IntervalResult =
  | { state: "ok"; intervals: ServiceIntervals }
  | { state: "offline" }
  | { state: "no-backend" }
  | { state: "error"; message: string };

const EMPTY_INTERVALS: ServiceIntervals = { items: {}, bikes: 0, minBikes: 3 };

export async function fetchServiceIntervals(
  scope: PoolScope,
  bike: Bike,
): Promise<IntervalResult> {
  const supabase = getSupabase();
  if (!supabase) return { state: "no-backend" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { state: "offline" };
  }

  // The same scope choice as the shims above, minus the two filters that make
  // no sense here: an interval is measured across a whole log, so narrowing to
  // a mileage window would cut the span it is measured over, and "latest only"
  // would leave one service per bike and no span at all.
  const filter = buildFilter(scope, bike, false, {});
  const { data, error } = await supabase.rpc("pool_service_intervals", {
    model_ids: filter.model_ids,
    years: filter.years,
  });

  if (error) return { state: "error", message: error.message };
  return {
    state: "ok",
    intervals: (data as ServiceIntervals | null) ?? EMPTY_INTERVALS,
  };
}

/**
 * The same figure for this bike alone, computed the pool's way.
 *
 * Imported services are excluded, because the pool excludes them until they are
 * confirmed — a rider comparing an interval drawn from their whole spreadsheet
 * against a pool that never saw it would be comparing two different things and
 * have no way of knowing.
 */
export function riderServiceIntervals(
  records: ServiceRecord[],
  bike: Bike,
): { kmBetween: Record<string, number>; services: number; spanKm: number } {
  const mine = records
    .filter(
      (record) =>
        record.bikeId === bike.id &&
        !record.deletedAt &&
        record.source !== "import" &&
        record.odometer !== undefined,
    )
    .map((record) => ({
      km: toKm(record.odometer as number, bike.units ?? "km"),
      items: record.items ?? [],
    }));

  if (mine.length < MIN_SERVICES) {
    return { kmBetween: {}, services: mine.length, spanKm: 0 };
  }

  const odos = mine.map((r) => r.km);
  const spanKm = Math.max(...odos) - Math.min(...odos);
  if (spanKm < MIN_SPAN_KM) {
    return { kmBetween: {}, services: mine.length, spanKm };
  }

  // Counted per service, so a service somehow carrying both oil grades is one
  // oil change rather than two — exactly what the pool's distinct count does.
  const ticks: Record<string, number> = {};
  for (const record of mine) {
    const seen = new Set<string>();
    for (const id of record.items) {
      const key = normaliseItem(id);
      if (key) seen.add(key);
    }
    for (const key of seen) ticks[key] = (ticks[key] ?? 0) + 1;
  }

  const kmBetween: Record<string, number> = {};
  for (const [key, n] of Object.entries(ticks)) {
    kmBetween[key] = Math.round(spanKm / n);
  }

  return { kmBetween, services: mine.length, spanKm };
}
