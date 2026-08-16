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
  /** The gap has been measured. Enough on its own to pass or fail the valve. */
  hasClearance: boolean;
  /** The fitted shim has been measured — only needed once a change is on. */
  hasShim: boolean;
  /** Both present, so a replacement shim can be worked out. */
  complete: boolean;
  /** The clearance being aimed for, given the tight/middle/loose preference. */
  target?: Microns;
  /**
   * How far outside tolerance, signed: negative is too tight, positive too
   * loose. Undefined when the valve is in spec.
   */
  outOfSpecBy?: Microns;
  /** Measured minus target. Positive means looser than you like to run it. */
  targetDelta?: Microns;
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
  /** Gap actually measured after fitting, if it has been checked. */
  confirmedClearance?: Microns;
  confirmedInSpec?: boolean;
  /**
   * Measured minus predicted. Positive means it came out looser than the
   * maths said it would.
   */
  confirmedDelta?: Microns;
};

/**
 * The whole calculator, in three lines.
 *
 *   stack        = shim + measured clearance   (the space the cam leaves)
 *   ideal shim   = stack - target clearance
 *   new clearance = stack - fitted shim
 *
 * Evaluated in the order the job is actually done. The gap gets measured with
 * the engine still together, and most of the time it is fine and nothing else
 * needs doing — so the verdict is returned from the clearance alone, and the
 * shim only matters once the valve has failed and the shim is coming out.
 */
export function calculateValve(
  reading: ValveReading | undefined,
  range: ClearanceRange,
  aim: Aim,
  catalogueIds: string[],
): ValveResult {
  const shim = reading?.shim;
  const clearance = reading?.clearance;
  const target = targetClearance(range, aim);

  const hasClearance = clearance !== undefined;
  const hasShim = shim !== undefined;

  const base: ValveResult = {
    hasClearance,
    hasShim,
    complete: hasClearance && hasShim,
    target,
    overridden: false,
    noSuitableShim: false,
    noChange: false,
  };

  if (clearance === undefined) return base;

  const measuredInSpec = inSpec(range, clearance);
  const verdict: ValveResult = {
    ...base,
    measuredInSpec,
    targetDelta: clearance - target,
    outOfSpecBy: measuredInSpec
      ? undefined
      : clearance < range.min
        ? clearance - range.min
        : clearance - range.max,
  };

  // In spec or not, without the fitted shim there is nothing further to work
  // out — and if the valve passed, there is nothing further worth working out.
  if (shim === undefined) return verdict;

  const stack = shim + clearance;
  const idealShim = stack - target;

  const sizes = availableSizes(catalogueIds);
  const suggested = suggestShim(stack, range, target, sizes);

  const overridden = reading?.chosenShim !== undefined;
  const chosenShim = reading?.chosenShim ?? suggested;

  if (chosenShim === undefined) {
    return {
      ...verdict,
      complete: true,
      stack,
      idealShim,
      noSuitableShim: true,
    };
  }

  const newClearance = stack - chosenShim;
  const confirmedClearance = reading?.confirmedClearance;

  return {
    ...verdict,
    complete: true,
    stack,
    idealShim,
    chosenShim,
    overridden,
    newClearance,
    newInSpec: inSpec(range, newClearance),
    noSuitableShim: suggested === undefined,
    noChange: chosenShim === shim,
    confirmedClearance,
    confirmedInSpec:
      confirmedClearance === undefined ? undefined : inSpec(range, confirmedClearance),
    confirmedDelta:
      confirmedClearance === undefined ? undefined : confirmedClearance - newClearance,
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
