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

export type PoolDistribution = Partial<Record<ValveType, PoolSide>>;

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
  return { state: "ok", distribution: (data ?? {}) as PoolDistribution };
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
