/**
 * The LC8 V-twins this calculator covers.
 *
 * Recorded against a service so a log makes sense years later, and so someone
 * running more than one LC8 can tell their histories apart. It does not change
 * any of the arithmetic: note 3 of the original sheet is explicit that the
 * tolerances used here are safe across the whole family, carburetted 950s
 * included.
 *
 * What a bike stores is the `id`, never the name. The names are what riders
 * read and are free to change — "990 Supermoto T" may one day read "990 SMT",
 * which is what most people call it. If the stored value were the name, that
 * one edit would split a model in two in the shared averages: readings written
 * before the change would no longer match readings written after, and neither
 * half would be complete. The id is the thing that must never move.
 *
 * `family` is stated outright rather than read off the front of the name, for
 * the same reason — grouping every 990 together should not depend on a string
 * still beginning with three particular characters.
 */

export type BikeFamily = "950" | "990";

export type BikeModel = {
  /** Permanent. Stored on the bike and in the shared pool. */
  id: string;
  /** Shown to riders. Safe to reword. */
  name: string;
  family: BikeFamily;
};

export type BikeModelGroup = {
  label: string;
  family: BikeFamily;
  models: BikeModel[];
};

export const BIKE_MODEL_GROUPS: BikeModelGroup[] = [
  {
    label: "950 — carburetted LC8, ~942 cc",
    family: "950",
    models: [
      { id: "950-adventure", name: "950 Adventure", family: "950" },
      { id: "950-adventure-s", name: "950 Adventure S", family: "950" },
      { id: "950-supermoto", name: "950 Supermoto", family: "950" },
      { id: "950-super-enduro-r", name: "950 Super Enduro R", family: "950" },
    ],
  },
  {
    label: "990 — fuel-injected LC8, ~999 cc",
    family: "990",
    models: [
      { id: "990-adventure", name: "990 Adventure", family: "990" },
      { id: "990-adventure-s", name: "990 Adventure S", family: "990" },
      { id: "990-adventure-r", name: "990 Adventure R", family: "990" },
      { id: "990-adventure-dakar", name: "990 Adventure Dakar", family: "990" },
      { id: "990-super-duke", name: "990 Super Duke", family: "990" },
      { id: "990-super-duke-r", name: "990 Super Duke R", family: "990" },
      { id: "990-supermoto", name: "990 Supermoto", family: "990" },
      { id: "990-supermoto-r", name: "990 Supermoto R", family: "990" },
      { id: "990-supermoto-t", name: "990 Supermoto T", family: "990" },
    ],
  },
];

export const BIKE_MODELS: BikeModel[] = BIKE_MODEL_GROUPS.flatMap(
  (group) => group.models,
);

export function getModel(id: string | undefined): BikeModel | undefined {
  if (!id) return undefined;
  return BIKE_MODELS.find((model) => model.id === id);
}

/** The name to print, or nothing at all if the bike has no model set. */
export function modelName(id: string | undefined): string | undefined {
  return getModel(id)?.name;
}

export function modelFamily(id: string | undefined): BikeFamily | undefined {
  return getModel(id)?.family;
}

/**
 * How a bike is described in headings: "2009 990 Adventure R", or just the
 * model where the year is not known. Nothing at all if no model is set, so
 * callers can drop it from a list of subtitle parts.
 */
export function modelLabel(
  id: string | undefined,
  year: number | undefined,
): string | undefined {
  const name = modelName(id);
  if (!name) return year ? String(year) : undefined;
  return year ? `${year} ${name}` : name;
}

/**
 * Production years of the LC8 950/990. The year is picked from this list
 * rather than typed, so the shared pool never has to cope with 1998, 20I0 or
 * a typo three digits long.
 */
export const FIRST_MODEL_YEAR = 2004;
export const LAST_MODEL_YEAR = 2012;

export const MODEL_YEARS: number[] = Array.from(
  { length: LAST_MODEL_YEAR - FIRST_MODEL_YEAR + 1 },
  (_, i) => FIRST_MODEL_YEAR + i,
);

export function isKnownYear(year: number | undefined): boolean {
  return year !== undefined && MODEL_YEARS.includes(year);
}

/**
 * Names as they were stored before models had ids, so an existing bike — or an
 * older backup file — still knows which model it is. Nothing new is ever
 * written in these terms; see migrations.ts.
 */
export const LEGACY_MODEL_NAMES: Record<string, string> = Object.fromEntries(
  BIKE_MODELS.map((model) => [model.name, model.id]),
);
