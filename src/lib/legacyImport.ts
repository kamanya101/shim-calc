import { CATALOGUES } from "./catalogues";
import { mm } from "./format";
import { newRecord } from "./storage";
import type {
  ClearanceRange,
  EngineSpec,
  Microns,
  ServiceRecord,
  ValveReading,
  ValveType,
} from "./types";

/**
 * Reading back what an AI assistant made of somebody's old spreadsheets.
 *
 * The rider pastes in whatever the assistant gave them; this turns it into
 * services, and — more importantly — into a list of everything that looks
 * wrong about them. Nothing here writes anything. The preview screen shows
 * what came out, the rider says yes, and only then does it reach the store.
 *
 * The whole design rests on one assumption: the text is guesswork by a machine
 * that has never seen an LC8, working from a spreadsheet nobody else can read.
 * It is treated as a claim to be checked, not as data. See importPrompt.ts for
 * the other half — the instructions that produced it.
 */

export type Severity = "error" | "warn";

export type Issue = { level: Severity; message: string };

export type ImportedService = {
  date: string;
  odometer?: number;
  title?: string;
  readings: Record<string, ValveReading>;
  issues: Issue[];
  /**
   * Already on this device, so it is shown and then left alone.
   *
   * Riders will paste the same batch twice — after a mis-tap, or because they
   * lost track of which files they had already done. Silently adding a second
   * copy of every service would be the worst possible answer to that.
   */
  duplicate: boolean;
};

export type ParsedImport = {
  /** The label the prompt asked for, used to catch a wrong-bike paste. */
  bikeTag?: string;
  services: ImportedService[];
  /** Wrong with the file as a whole rather than with any one service. */
  issues: Issue[];
};

export type ParseResult =
  | { ok: true; value: ParsedImport }
  | { ok: false; error: string };

/**
 * How far a clearance can sit outside spec and still be believable.
 *
 * A valve that is out of tolerance is the normal reason to be doing this job
 * at all, so the band has to be generous — rejecting an honest 0.36 mm exhaust
 * would throw away the very measurement the rider most wants recorded. What it
 * is looking for is the other thing: a column read out of the wrong place, or
 * a number still in millimetres. Those miss by a factor, not by a few
 * hundredths.
 *
 * Asymmetric on purpose. Intakes close up and exhausts open out as they wear,
 * and neither drifts far the other way, but the wide side can be very wide on
 * an engine nobody has checked in years.
 *
 * importPrompt.ts prints these same numbers into the instructions, so what the
 * assistant is told to check and what this refuses cannot drift apart.
 */
export function plausibleClearance(
  engine: EngineSpec,
  type: ValveType,
): ClearanceRange {
  const band = engine.clearance[type];
  const width = band.max - band.min;
  return { min: Math.max(0, band.min - width), max: band.max + width * 2 };
}

/** Every shim size the engine has a catalogue for, as a lookup. */
export function catalogueSizes(engine: EngineSpec): Set<Microns> {
  const sizes = new Set<Microns>();
  for (const id of engine.catalogues) {
    for (const size of CATALOGUES[id]?.sizes ?? []) sizes.add(size.um);
  }
  return sizes;
}

/**
 * How thick a shim can be and still be believable.
 *
 * Not the catalogue. Riders grind shims down to sit where they want inside the
 * band, and a ground shim is a real measurement of a real part — refusing it
 * would throw away the histories of exactly the people who keep the most
 * careful records. What is in the catalogue decides whether a size can be
 * *ordered*, which is a different question from whether it can be *measured*,
 * and only the second one is being asked here.
 *
 * So the bounds are wide, and they are only trying to catch the failures that
 * miss by a factor: a column read out of the wrong place, or a thickness still
 * in millimetres. Half a millimetre of slack either way does that and leaves
 * every plausible ground shim alone.
 */
export function shimBounds(engine: EngineSpec): ClearanceRange {
  const sizes = [...catalogueSizes(engine)];
  if (!sizes.length) return { min: 0, max: Number.MAX_SAFE_INTEGER };
  return {
    min: Math.min(...sizes) - 500,
    max: Math.max(...sizes) + 500,
  };
}

const READING_FIELDS = [
  "shim",
  "clearance",
  "chosenShim",
  "confirmedClearance",
] as const;

type ReadingField = (typeof READING_FIELDS)[number];

const FIELD_LABELS: Record<ReadingField, string> = {
  shim: "shim removed",
  clearance: "gap measured",
  chosenShim: "shim fitted",
  confirmedClearance: "confirmed gap",
};

const IS_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Pull the JSON out of whatever was pasted.
 *
 * Assistants put a sentence before it and an offer of further help after it
 * however firmly they are told not to, and the copy button on a code block
 * takes the fence with it. Rather than making the rider tidy that up — on a
 * phone, in a garage — this walks the text for the first balanced object and
 * ignores everything either side.
 *
 * Strings are tracked so a brace inside a title cannot end the object early,
 * which is the one way a plain brace count gets this wrong.
 */
function extractObject(raw: string): { text: string } | { error: string } {
  const start = raw.indexOf("{");
  if (start === -1) {
    return {
      error:
        "There's no data in what you pasted. Copy the block of code the assistant gave you — the one starting with a { — and try again.",
    };
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { text: raw.slice(start, i + 1) };
    }
  }

  // Ran off the end still inside the object. Nearly always the assistant hit
  // its output limit part way through, which is a fixable situation and worth
  // saying so plainly rather than reporting broken syntax.
  return {
    error:
      "That stops halfway through — the assistant probably ran out of room. Ask it for fewer services at a time and paste each answer in turn.",
  };
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Check one measurement and, if it survives, return it.
 *
 * Millimetres are the failure to catch above all others. A 2.35 that should
 * have been 2350 imports without complaint, charts as a flat line at nothing,
 * and is only noticed years later — so anything that small is refused outright
 * rather than warned about.
 */
function readValue(
  raw: unknown,
  field: ReadingField,
  label: string,
  engine: EngineSpec,
  type: ValveType,
  shims: Set<Microns>,
  issues: Issue[],
): Microns | undefined {
  if (raw === undefined || raw === null) return undefined;

  const value = asFiniteNumber(raw);
  if (value === undefined) {
    issues.push({
      level: "error",
      message: `${label}: the ${FIELD_LABELS[field]} isn't a number.`,
    });
    return undefined;
  }

  if (value < 20) {
    issues.push({
      level: "error",
      message: `${label}: the ${FIELD_LABELS[field]} came through as ${value}, which looks like millimetres. It has to be whole micrometres — 2.35 mm is 2350.`,
    });
    return undefined;
  }

  if (!Number.isInteger(value)) {
    issues.push({
      level: "error",
      message: `${label}: the ${FIELD_LABELS[field]} is ${value}, which isn't a whole number of micrometres.`,
    });
    return undefined;
  }

  if (field === "shim" || field === "chosenShim") {
    const bounds = shimBounds(engine);
    if (value < bounds.min || value > bounds.max) {
      issues.push({
        level: "error",
        message: `${label}: ${mm(value)} mm is not a thickness a shim comes in. Check that column against the sheet.`,
      });
      return undefined;
    }
    if (!shims.has(value)) {
      // Grinding only ever takes material off, so a thickness above the
      // largest size sold cannot be explained that way and is worth a
      // different sentence. Both are warnings: neither is impossible, and the
      // rider is the only one who knows which of their shims they touched.
      const stocked = Math.max(...shims);
      issues.push({
        level: "warn",
        message:
          value > stocked
            ? `${label}: ${mm(value)} mm is thicker than any shim sold for this engine. Worth checking against the sheet.`
            : `${label}: ${mm(value)} mm isn't a size anyone stocks. That's expected if you ground it down — if you didn't, it's worth checking against the sheet.`,
      });
    }
    return value;
  }

  const band = plausibleClearance(engine, type);
  if (value < band.min || value > band.max) {
    // A warning, not a refusal. It might be exactly what the engine did.
    issues.push({
      level: "warn",
      message: `${label}: the ${FIELD_LABELS[field]} is ${mm(value)} mm, a long way outside the ${mm(engine.clearance[type].min)}–${mm(engine.clearance[type].max)} mm spec. Worth checking against the sheet.`,
    });
  }
  return value;
}

function readService(
  raw: unknown,
  index: number,
  engine: EngineSpec,
  shims: Set<Microns>,
): ImportedService {
  const issues: Issue[] = [];
  const entry = (raw ?? {}) as Record<string, unknown>;

  const rawDate = typeof entry.date === "string" ? entry.date.trim() : "";
  let date = rawDate;
  if (!IS_DATE.test(rawDate) || Number.isNaN(Date.parse(`${rawDate}T00:00:00`))) {
    issues.push({
      level: "error",
      message: rawDate
        ? `The date "${rawDate}" isn't one the app can read. It needs to look like 2019-04-06.`
        : "This service has no date. Go back and ask the assistant for one — even an approximate year.",
    });
    date = "";
  }

  let odometer = asFiniteNumber(entry.odometer);
  if (
    entry.odometer !== undefined &&
    entry.odometer !== null &&
    odometer === undefined
  ) {
    issues.push({
      level: "warn",
      message: "The odometer reading wasn't a number, so it's been left blank.",
    });
  }
  if (odometer !== undefined) {
    if (odometer < 0) {
      issues.push({
        level: "warn",
        message: "The odometer reading is negative, so it's been left blank.",
      });
      odometer = undefined;
    } else {
      odometer = Math.round(odometer);
    }
  }

  const title =
    typeof entry.title === "string" && entry.title.trim()
      ? entry.title.trim()
      : undefined;

  const readings: Record<string, ValveReading> = {};
  const rawReadings = (entry.readings ?? {}) as Record<string, unknown>;
  const positions = new Map(engine.positions.map((p) => [p.id, p]));

  for (const [key, value] of Object.entries(rawReadings)) {
    const position = positions.get(key);
    if (!position) {
      issues.push({
        level: "error",
        message: `"${key}" isn't one of this engine's valves, so those readings can't be placed.`,
      });
      continue;
    }

    const source = (value ?? {}) as Record<string, unknown>;
    const reading: ValveReading = {};
    for (const field of READING_FIELDS) {
      const parsed = readValue(
        source[field],
        field,
        position.label,
        engine,
        position.type,
        shims,
        issues,
      );
      if (parsed !== undefined) reading[field] = parsed;
    }
    if (Object.keys(reading).length) readings[key] = reading;
  }

  if (!Object.keys(readings).length) {
    issues.push({
      level: "error",
      message: "There are no usable measurements in this service.",
    });
  }

  return {
    date: date || `Service ${index + 1}`,
    odometer,
    title,
    readings,
    issues,
    duplicate: false,
  };
}

/**
 * Turn pasted text into services, checked against the engine.
 *
 * `existing` is this bike's saved history, used only to spot services that are
 * already there.
 */
export function parseLegacyImport(
  raw: string,
  engine: EngineSpec,
  existing: ServiceRecord[],
): ParseResult {
  const extracted = extractObject(raw);
  if ("error" in extracted) return { ok: false, error: extracted.error };

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted.text);
  } catch {
    return {
      ok: false,
      error:
        "That isn't quite valid JSON. Copy the whole block again — it is easy to catch only part of it — or ask the assistant to send it once more.",
    };
  }

  const bundle = (parsed ?? {}) as Record<string, unknown>;

  // A backup taken out of this app carries ids, bikes and deletion markers,
  // and belongs at the other door. Naming that door is more use than saying
  // this one is wrong.
  if (bundle.format === "shim-calc") {
    return {
      ok: false,
      error:
        "That's a backup file from this app. Use “Import backup” below instead — it belongs there rather than here.",
    };
  }

  if (!Array.isArray(bundle.records) || bundle.records.length === 0) {
    return {
      ok: false,
      error:
        "There are no services in what you pasted. Check you copied the whole of the assistant's answer, and that it followed the instructions.",
    };
  }

  const issues: Issue[] = [];
  if (bundle.format !== "shim-calc-import") {
    issues.push({
      level: "warn",
      message:
        "This doesn't carry the marker the instructions asked for, so the assistant may have improvised. Read the services below carefully.",
    });
  }

  const shims = catalogueSizes(engine);
  const services = bundle.records.map((entry, index) =>
    readService(entry, index, engine, shims),
  );

  markDuplicates(services, existing);

  const bikeTag =
    typeof bundle.bike === "string" ? bundle.bike.trim() : undefined;
  return { ok: true, value: { bikeTag: bikeTag || undefined, services, issues } };
}

/**
 * Flag anything this bike already has.
 *
 * Odometer first, because two services at the same reading are the same
 * service — nobody checks the valves twice without riding in between. Dates
 * are the fallback, and a weaker one: where the sheets carried no date the
 * assistant will have guessed, and two guesses can collide by accident.
 */
function markDuplicates(
  services: ImportedService[],
  existing: ServiceRecord[],
): void {
  const odometers = new Set(
    existing.map((r) => r.odometer).filter((o): o is number => o !== undefined),
  );
  const dates = new Set(existing.map((r) => r.date));

  for (const service of services) {
    const seen =
      service.odometer !== undefined
        ? odometers.has(service.odometer)
        : dates.has(service.date);
    if (!seen) continue;
    service.duplicate = true;
    service.issues.push({
      level: "warn",
      message:
        "You already have a service at this point, so this one won't be added.",
    });
  }
}

/** Whether a service is fit to be written. */
export function isImportable(service: ImportedService): boolean {
  return !service.duplicate && !service.issues.some((i) => i.level === "error");
}

/**
 * Build the records to save.
 *
 * Ids, bike, engine and timestamps are all made here rather than read out of
 * the file. The assistant was never asked for them, because they are the
 * fields where a plausible-looking invention does real damage: one id repeated
 * across two pasted batches would have the second quietly overwrite the first,
 * and nothing on screen would ever show it happening.
 */
export function toRecords(
  services: ImportedService[],
  engine: EngineSpec,
  bikeId: string,
): ServiceRecord[] {
  return services.filter(isImportable).map((service) => ({
    ...newRecord(engine.id, bikeId),
    date: service.date,
    odometer: service.odometer,
    title: service.title,
    readings: service.readings,
    source: "import" as const,
  }));
}
