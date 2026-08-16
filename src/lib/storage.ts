"use client";

import { todayIso } from "./format";
import type { Bike, ServiceRecord } from "./types";

/**
 * Everything lives in localStorage. There is no server and no account: the
 * point of this tool is that it works on a phone in a garage with no signal,
 * and that your clearance history is yours. Backup is by export, exactly the
 * way the original was backed up by keeping the .xls files.
 */
export const RECORDS_KEY = "shim-calc/records/v1";
export const BIKES_KEY = "shim-calc/bikes/v1";
export const ACTIVE_KEY = "shim-calc/active/v1";
export const ACTIVE_BIKE_KEY = "shim-calc/active-bike/v1";
export const SCHEMA_KEY = "shim-calc/schema";

/** Bumped when the stored shape changes; see migrations.ts. */
export const SCHEMA_VERSION = 2;

const EXPORT_VERSION = 2;

export type ExportBundle = {
  format: "shim-calc";
  version: number;
  exportedAt: string;
  bikes: Bike[];
  records: ServiceRecord[];
};

export function newBike(engineId: string, name: string, model?: string): Bike {
  return {
    id: crypto.randomUUID(),
    name,
    model,
    engineId,
    createdAt: new Date().toISOString(),
  };
}

export function newRecord(
  engineId: string,
  bikeId: string,
  id = crypto.randomUUID(),
): ServiceRecord {
  const now = new Date().toISOString();
  return {
    id,
    bikeId,
    engineId,
    date: todayIso(),
    readings: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertRecord(
  records: ServiceRecord[],
  record: ServiceRecord,
): ServiceRecord[] {
  const stamped = { ...record, updatedAt: new Date().toISOString() };
  const index = records.findIndex((r) => r.id === record.id);
  if (index === -1) return [stamped, ...records];
  const next = [...records];
  next[index] = stamped;
  return next;
}

export function deleteRecord(
  records: ServiceRecord[],
  id: string,
): ServiceRecord[] {
  return records.filter((r) => r.id !== id);
}

/** Newest first, by odometer where present, otherwise by date. */
export function sortRecords(records: ServiceRecord[]): ServiceRecord[] {
  return [...records].sort((a, b) => {
    if (a.odometer !== undefined && b.odometer !== undefined) {
      return b.odometer - a.odometer;
    }
    return b.date.localeCompare(a.date);
  });
}

export function recordsForBike(
  records: ServiceRecord[],
  bikeId: string,
): ServiceRecord[] {
  return records.filter((r) => r.bikeId === bikeId);
}

export function buildExport(bikes: Bike[], records: ServiceRecord[]): ExportBundle {
  return {
    format: "shim-calc",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    bikes,
    records,
  };
}

export type ImportResult =
  | {
      ok: true;
      bikes: Bike[];
      records: ServiceRecord[];
      added: number;
      merged: number;
      bikesAdded: number;
    }
  | { ok: false; error: string };

/**
 * Merge an exported bundle into the current store. Records are matched on id;
 * the one with the later updatedAt wins, so importing an older backup never
 * silently destroys newer work.
 *
 * Version 1 bundles predate bikes and carried the model on each service. They
 * are folded into a bike per distinct model so an old backup still imports.
 */
export function mergeImport(
  currentBikes: Bike[],
  currentRecords: ServiceRecord[],
  raw: string,
  engineId: string,
): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  const bundle = parsed as Partial<ExportBundle> & {
    records?: (ServiceRecord & { model?: string })[];
  };
  if (bundle?.format !== "shim-calc" || !Array.isArray(bundle.records)) {
    return { ok: false, error: "That isn't a shim calculator export file." };
  }

  const bikesById = new Map(currentBikes.map((b) => [b.id, b]));
  let bikesAdded = 0;

  for (const bike of bundle.bikes ?? []) {
    if (!bike?.id || bikesById.has(bike.id)) continue;
    bikesById.set(bike.id, bike);
    bikesAdded += 1;
  }

  // Legacy bundles: invent a bike per model so the services have a home.
  const legacyBikeByModel = new Map<string, Bike>();
  const resolveLegacyBike = (model: string | undefined): Bike => {
    const key = model ?? "";
    const existing =
      legacyBikeByModel.get(key) ??
      [...bikesById.values()].find((b) => (b.model ?? "") === key);
    if (existing) {
      legacyBikeByModel.set(key, existing);
      return existing;
    }
    const bike = newBike(engineId, model ?? "My LC8", model);
    bikesById.set(bike.id, bike);
    legacyBikeByModel.set(key, bike);
    bikesAdded += 1;
    return bike;
  };

  const recordsById = new Map(currentRecords.map((r) => [r.id, r]));
  let added = 0;
  let merged = 0;

  for (const incoming of bundle.records) {
    if (!incoming?.id) continue;
    const record: ServiceRecord = incoming.bikeId
      ? incoming
      : { ...incoming, bikeId: resolveLegacyBike(incoming.model).id };
    delete (record as { model?: string }).model;

    const existing = recordsById.get(record.id);
    if (!existing) {
      recordsById.set(record.id, record);
      added += 1;
    } else if (record.updatedAt > existing.updatedAt) {
      recordsById.set(record.id, record);
      merged += 1;
    }
  }

  return {
    ok: true,
    bikes: [...bikesById.values()],
    records: [...recordsById.values()],
    added,
    merged,
    bikesAdded,
  };
}

export function downloadFile(
  filename: string,
  contents: string,
  mimeType: string,
): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
