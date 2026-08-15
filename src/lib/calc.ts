import { availableSizes } from "./catalogues";
import type { ClearanceRange, Microns, ValveReading, ValveType } from "./types";

/**
 * Where in the tolerance band to aim when suggesting a shim.
 *
 * Note 3 of the original spreadsheet: intake gaps tend to *close up* as the
 * valves wear in, so starting near the top of the band means the engine
 * drifts down through tolerance rather than out of it. Exhausts drift the
 * other way, so they are best set near the bottom. The spreadsheet itself
 * always computed the ideal shim against the maximum and left you to read the
 * note; here the default follows the note's own advice, and you can override
 * it per section.
 */
export type Aim = "min" | "middle" | "max";

export const DEFAULT_AIM: Record<ValveType, Aim> = {
  intake: "max",
  exhaust: "min",
};

export function targetClearance(range: ClearanceRange, aim: Aim): Microns {
  if (aim === "min") return range.min;
  if (aim === "max") return range.max;
  return Math.round((range.min + range.max) / 2);
}

export function inSpec(range: ClearanceRange, clearance: Microns): boolean {
  return clearance >= range.min && clearance <= range.max;
}

export type ValveResult = {
  /** True once both measurements are present and the maths means anything. */
  complete: boolean;
  /** shim + clearance. Fixed for the valve, whatever shim you fit. */
  stack?: Microns;
  /** Was the clearance we measured actually within spec? */
  measuredInSpec?: boolean;
  /** Exact thickness that would land the clearance on target. Rarely a real size. */
  idealShim?: Microns;
  /** Nearest real shim from the catalogues, or the user's override. */
  chosenShim?: Microns;
  /** True when chosenShim came from the user rather than the suggestion. */
  overridden: boolean;
  /** Clearance you would end up with after fitting chosenShim. */
  newClearance?: Microns;
  newInSpec?: boolean;
  /** No shim in any catalogue lands inside the tolerance band. */
  noSuitableShim: boolean;
  /** Chosen shim is the one already fitted — nothing to buy. */
  noChange: boolean;
};

/**
 * The whole calculator, in three lines.
 *
 *   stack        = shim + measured clearance   (the space the cam leaves)
 *   ideal shim   = stack - target clearance
 *   new clearance = stack - fitted shim
 */
export function calculateValve(
  reading: ValveReading | undefined,
  range: ClearanceRange,
  aim: Aim,
  catalogueIds: string[],
): ValveResult {
  const shim = reading?.shim;
  const clearance = reading?.clearance;

  if (shim === undefined || clearance === undefined) {
    return { complete: false, overridden: false, noSuitableShim: false, noChange: false };
  }

  const stack = shim + clearance;
  const target = targetClearance(range, aim);
  const idealShim = stack - target;

  const sizes = availableSizes(catalogueIds);
  const suggested = suggestShim(stack, range, target, sizes);

  const overridden = reading?.chosenShim !== undefined;
  const chosenShim = reading?.chosenShim ?? suggested;

  if (chosenShim === undefined) {
    return {
      complete: true,
      stack,
      measuredInSpec: inSpec(range, clearance),
      idealShim,
      overridden: false,
      noSuitableShim: true,
      noChange: false,
    };
  }

  const newClearance = stack - chosenShim;

  return {
    complete: true,
    stack,
    measuredInSpec: inSpec(range, clearance),
    idealShim,
    chosenShim,
    overridden,
    newClearance,
    newInSpec: inSpec(range, newClearance),
    noSuitableShim: suggested === undefined,
    noChange: chosenShim === shim,
  };
}

/**
 * Pick the real shim that gets closest to target while staying in spec.
 *
 * Ties break towards the *thicker* shim, which gives the smaller clearance.
 * A slightly tight valve is quieter and more forgiving than a slightly loose
 * one, and on these engines it is the direction the exhausts want anyway.
 */
export function suggestShim(
  stack: Microns,
  range: ClearanceRange,
  target: Microns,
  sizes: Microns[],
): Microns | undefined {
  let best: Microns | undefined;
  let bestDelta = Infinity;

  for (const size of sizes) {
    const clearance = stack - size;
    if (!inSpec(range, clearance)) continue;
    const delta = Math.abs(clearance - target);
    if (delta < bestDelta || (delta === bestDelta && best !== undefined && size > best)) {
      best = size;
      bestDelta = delta;
    }
  }
  return best;
}

/** The next real size up or down from `from`, for the +/- steppers. */
export function stepShim(
  from: Microns,
  direction: 1 | -1,
  catalogueIds: string[],
): Microns | undefined {
  const sizes = availableSizes(catalogueIds);
  if (direction === 1) return sizes.find((s) => s > from);
  return [...sizes].reverse().find((s) => s < from);
}
