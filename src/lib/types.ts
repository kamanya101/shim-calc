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
  /**
   * "Front left exhaust" — matches the wording of the original spreadsheet,
   * and names the cylinder, the side and the valve type so it reads correctly
   * with no surrounding context.
   */
  label: string;
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
  /**
   * The gap actually measured after the new shim went in.
   *
   * The predicted clearance is arithmetic; this is the engine's answer, and
   * the two rarely agree exactly — shim thickness tolerance, how the bucket
   * seats, how the last measurement was taken. Recording it is what makes the
   * next service's numbers trustworthy, because it is the real starting point
   * the valve wears away from.
   */
  confirmedClearance?: Microns;
};

/**
 * A physical motorcycle. Services hang off one of these, so somebody running
 * two LC8s gets two histories and two sets of wear charts rather than one
 * incoherent one.
 *
 * The id is generated and never shown. The rider identifies the bike by a
 * nickname, which is all that is needed to tell their own bikes apart — a VIN
 * or a registration would be a chore to type and would put personal data into
 * a record that has no business holding any.
 */
/** What an odometer counts in. */
export type DistanceUnit = "km" | "mi";

export type Bike = {
  id: string;
  /** "Orange one", "The Dakar". Defaults to the model. */
  name: string;
  /**
   * Which LC8, as a permanent id from models.ts — never the printed name.
   * Record-keeping for the rider; the grouping key for the shared averages.
   */
  modelId?: string;
  /**
   * Model year, from the production run only. Optional, because plenty of
   * people genuinely do not know it and refusing their service history over a
   * date would be a poor trade.
   */
  year?: number;
  /**
   * Which unit this bike's odometer is read in.
   *
   * Set per bike rather than per rider: someone can easily keep an imported
   * machine reading in miles alongside a local one in kilometres, and the
   * number on the clock is a fact about the motorcycle.
   *
   * Readings are stored exactly as they were typed, in this unit, so a rider's
   * own history never drifts through a conversion. Only the shared pool is
   * converted, and only at its edge — see pool.ts. Absent means kilometres,
   * which is what every reading saved before this existed was.
   */
  units?: DistanceUnit;
  engineId: string;
  createdAt: string;
  /** Bumped on every edit. Two devices reconcile by keeping the later one. */
  updatedAt: string;
  deletedAt?: string;
};

export type ServiceRecord = {
  id: string;
  bikeId: string;
  engineId: string;
  /** ISO date, no time — a service is a day, not an instant. */
  date: string;
  odometer?: number;
  title?: string;
  readings: Record<string, ValveReading>;
  createdAt: string;
  updatedAt: string;
  /**
   * A deleted service is kept as a marker rather than removed outright.
   *
   * Sync reconciles two copies by keeping whichever was touched last, and that
   * only works for things that still exist. Drop a row on the phone and the
   * tablet's copy — which knows nothing of the deletion — would simply put it
   * back on the next sync. The marker is the deletion, travelling under the
   * same rule as every other edit.
   *
   * Everything that reads for display filters these out; only export and sync
   * see them.
   */
  deletedAt?: string;
};
