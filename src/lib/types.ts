/**
 * All sizes are held as whole micrometres (um) rather than millimetres.
 * 2.35 mm is stored as 2350. Shim maths is all addition and subtraction of
 * quarter-hundredths, and floating point mm quietly turns 2.35 into
 * 2.3499999999999996 — which then fails an equality lookup against the
 * catalogue. Integers make every comparison exact.
 */
export type Microns = number;

export type ValveType = "intake" | "exhaust";

export type ClearanceRange = {
  min: Microns;
  max: Microns;
};

/** One physical valve, in the order it sits in the engine. */
export type ValvePosition = {
  id: string;
  /** "Front left exhaust" — matches the wording of the original spreadsheet. */
  label: string;
  /** "Left" — shown inside a section that already names the bank and type. */
  short: string;
  bank: string;
  type: ValveType;
};

export type ShimSize = {
  um: Microns;
  part: string;
};

export type ShimCatalogue = {
  id: string;
  brand: string;
  /** Shown under the brand name, e.g. "0.05 mm steps". */
  note: string;
  sizes: ShimSize[];
};

export type EngineSpec = {
  id: string;
  name: string;
  subtitle: string;
  cylinders: number;
  valvesPerCylinder: number;
  clearance: Record<ValveType, ClearanceRange>;
  /** Catalogue ids, in the order they should be offered. */
  catalogues: string[];
  positions: ValvePosition[];
};

/** What the user measured, plus the shim they settled on. */
export type ValveReading = {
  /** Thickness of the shim that came out, in microns. */
  shim?: Microns;
  /** Gap the feeler gauge fitted, in microns. */
  clearance?: Microns;
  /**
   * Shim the user chose. Undefined means "use whatever the app suggests" —
   * so the suggestion keeps tracking the measurements until it's overridden.
   */
  chosenShim?: Microns;
};

export type ServiceRecord = {
  id: string;
  engineId: string;
  /** ISO date, no time — a service is a day, not an instant. */
  date: string;
  odometer?: number;
  title?: string;
  readings: Record<string, ValveReading>;
  createdAt: string;
  updatedAt: string;
};
