import { calculateValve, DEFAULT_AIM, type Aim } from "./calc";
import { partsForSize } from "./catalogues";
import { mmFixed } from "./format";
import type { EngineSpec, Microns, ServiceRecord, ValveType } from "./types";

export type AimSettings = Record<ValveType, Aim>;

export const DEFAULT_AIM_SETTINGS: AimSettings = { ...DEFAULT_AIM };

export type ShoppingLine = {
  um: Microns;
  quantity: number;
  /** Which valves want this size, by label. */
  valves: string[];
  parts: { brand: string; part: string | null }[];
};

/**
 * Which shims actually need buying, aggregated by size.
 *
 * A valve whose chosen shim is the one already in it needs nothing — the
 * original sheet listed all eight regardless and left you to spot the
 * duplicates, which is how you end up ordering a shim you already own.
 */
export function buildShoppingList(
  engine: EngineSpec,
  record: ServiceRecord,
  aim: AimSettings,
): ShoppingLine[] {
  const bySize = new Map<Microns, ShoppingLine>();

  for (const position of engine.positions) {
    const result = calculateValve(
      record.readings[position.id],
      engine.clearance[position.type],
      aim[position.type],
      engine.catalogues,
    );
    if (!result.complete || result.chosenShim === undefined || result.noChange) {
      continue;
    }

    const existing = bySize.get(result.chosenShim);
    if (existing) {
      existing.quantity += 1;
      existing.valves.push(position.label);
    } else {
      bySize.set(result.chosenShim, {
        um: result.chosenShim,
        quantity: 1,
        valves: [position.label],
        parts: partsForSize(engine.catalogues, result.chosenShim),
      });
    }
  }

  return [...bySize.values()].sort((a, b) => a.um - b.um);
}

export type SheetStatus = {
  measured: number;
  total: number;
  outOfSpec: number;
  needShims: number;
  problems: number;
};

export function sheetStatus(
  engine: EngineSpec,
  record: ServiceRecord,
  aim: AimSettings,
): SheetStatus {
  let measured = 0;
  let outOfSpec = 0;
  let needShims = 0;
  let problems = 0;

  for (const position of engine.positions) {
    const result = calculateValve(
      record.readings[position.id],
      engine.clearance[position.type],
      aim[position.type],
      engine.catalogues,
    );
    if (!result.complete) continue;
    measured += 1;
    if (result.measuredInSpec === false) outOfSpec += 1;
    if (!result.noChange && result.chosenShim !== undefined) needShims += 1;
    if (result.noSuitableShim || result.newInSpec === false) problems += 1;
  }

  return {
    measured,
    total: engine.positions.length,
    outOfSpec,
    needShims,
    problems,
  };
}

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A flat sheet of one service, for spreadsheets and for the record. */
export function recordToCsv(
  engine: EngineSpec,
  record: ServiceRecord,
  aim: AimSettings,
): string {
  const rows: (string | number | undefined)[][] = [
    ["Engine", engine.name + " " + engine.subtitle],
    ["Date", record.date],
    ["Odometer (km)", record.odometer],
    ["Title", record.title],
    [],
    [
      "Valve",
      "Type",
      "Spec min (mm)",
      "Spec max (mm)",
      "Shim fitted (mm)",
      "Clearance measured (mm)",
      "In spec",
      "Ideal shim (mm)",
      "Shim to fit (mm)",
      "New clearance (mm)",
      "New in spec",
      "Action",
      ...engine.catalogues.map((id) => `Part (${id})`),
    ],
  ];

  for (const position of engine.positions) {
    const range = engine.clearance[position.type];
    const reading = record.readings[position.id];
    const result = calculateValve(
      reading,
      range,
      aim[position.type],
      engine.catalogues,
    );
    const parts =
      result.chosenShim !== undefined
        ? partsForSize(engine.catalogues, result.chosenShim)
        : [];

    rows.push([
      position.label,
      position.type,
      mmFixed(range.min),
      mmFixed(range.max),
      reading?.shim !== undefined ? mmFixed(reading.shim) : "",
      reading?.clearance !== undefined ? mmFixed(reading.clearance) : "",
      result.measuredInSpec === undefined ? "" : result.measuredInSpec ? "yes" : "NO",
      result.idealShim !== undefined ? mmFixed(result.idealShim) : "",
      result.chosenShim !== undefined ? mmFixed(result.chosenShim) : "",
      result.newClearance !== undefined ? mmFixed(result.newClearance) : "",
      result.newInSpec === undefined ? "" : result.newInSpec ? "yes" : "NO",
      !result.complete ? "not measured" : result.noChange ? "no change" : "fit new shim",
      ...engine.catalogues.map(
        (id) => parts.find((p) => p.brand === catalogueBrand(id))?.part ?? "",
      ),
    ]);
  }

  const shopping = buildShoppingList(engine, record, aim);
  if (shopping.length) {
    rows.push([], ["Shims to order"], ["Size (mm)", "Qty", "For", "Parts"]);
    for (const line of shopping) {
      rows.push([
        mmFixed(line.um),
        line.quantity,
        line.valves.join("; "),
        line.parts
          .map((p) => `${p.brand}: ${p.part ?? "not available"}`)
          .join("; "),
      ]);
    }
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function catalogueBrand(id: string): string {
  return id === "ktm-lc8" ? "KTM" : id === "hd" ? "Harley-Davidson" : id;
}

export function suggestFilename(
  engine: EngineSpec,
  record: ServiceRecord,
  extension: string,
): string {
  const parts = ["shims", engine.name.toLowerCase().replace(/\s+/g, "-"), record.date];
  if (record.odometer !== undefined) parts.push(`${record.odometer}km`);
  return `${parts.join("-")}.${extension}`;
}
