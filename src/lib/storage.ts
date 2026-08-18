"use client";

import { todayIso } from "./format";
import { LEGACY_MODEL_NAMES } from "./models";
import { newPoolToken } from "./pool";
import type { Bike, ServiceRecord } from "./types";

/**
 * Everything lives in localStorage, and it stays that way even with an account.
 * The point of this tool is that it works on a phone in a garage with no
 * signal: nothing on screen waits on the network, because the device holds the
 * whole truth. An account adds a copy on the server that the device reconciles
 * with when there is signal — see sync.ts — and export is still the backup,
 * exactly the way the original was backed up by keeping the .xls files.
 */
export const RECORDS_KEY = "shim-calc/records/v1";
export const BIKES_KEY = "shim-calc/bikes/v1";
export const ACTIVE_KEY = "shim-calc/active/v1";
export const ACTIVE_BIKE_KEY = "shim-calc/active-bike/v1";
export const AIM_KEY = "shim-calc/aim/v1";

/**
 * Which language the app is shown in. Null until somebody chooses, which is
 * not the same as English: an unset value means "follow the phone", and
 * storing "en" the moment the app first renders would freeze a German rider
 * into English because their first visit happened before they found the
 * picker.
 */
export const LOCALE_KEY = "shim-calc/locale/v1";
export const SCHEMA_KEY = "shim-calc/schema";

/**
 * Which account the data in the stores above belongs to.
 *
 * Without this, signing in as somebody else on a shared tablet would inherit
 * the previous rider's bikes and then push them up to the new account. The
 * stores are wiped when this does not match whoever just signed in.
 */
export const OWNER_KEY = "shim-calc/owner/v1";

/** Last successful reconcile, for the status line. Never a correctness input. */
export const SYNC_KEY = "shim-calc/sync/v1";

/**
 * Bookkeeping for the pool push — what went up last, so an unchanged pool is
 * never re-sent. The keys themselves belong to each bike now, not to the
 * rider; see `poolToken` on Bike. Account-scoped like everything above, so it
 * is wiped when somebody else signs in on the same device.
 */
export const CONTRIBUTION_KEY = "shim-calc/contribution/v1";

/** Bumped when the stored shape changes; see migrations.ts. */
export const SCHEMA_VERSION = 5;

const EXPORT_VERSION = 4;

export type ExportBundle = {
  format: "shim-calc";
  version: number;
  exportedAt: string;
  bikes: Bike[];
  records: ServiceRecord[];
};

export function newBike(engineId: string, name: string, modelId?: string): Bike {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    modelId,
    engineId,
    // Issued once, at birth, and never reissued. Everything this bike ever
    // contributes to the pool is keyed under it, so a second token would not
    // correct anything — it would split one motorcycle's history in two.
    poolToken: newPoolToken(),
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertBike(bikes: Bike[], bike: Bike): Bike[] {
  const stamped = { ...bike, updatedAt: new Date().toISOString() };
  const index = bikes.findIndex((b) => b.id === bike.id);
  if (index === -1) return [...bikes, stamped];
  const next = [...bikes];
  next[index] = stamped;
  return next;
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

/**
 * Mark a service deleted. See `deletedAt` on ServiceRecord for why this is a
 * marker and not a removal; `updatedAt` moves too, so a deletion competes with
 * a concurrent edit on the same footing and the later action wins.
 */
export function deleteRecord(
  records: ServiceRecord[],
  id: string,
): ServiceRecord[] {
  const now = new Date().toISOString();
  return records.map((r) =>
    r.id === id ? { ...r, deletedAt: now, updatedAt: now } : r,
  );
}

/**
 * Deleting a bike deletes its services with it. Marking the bike alone would
 * leave its services live but unreachable, and they would come back the moment
 * somebody recreated a bike with the same id on another device.
 */
export function deleteBike(
  bikes: Bike[],
  records: ServiceRecord[],
  id: string,
): { bikes: Bike[]; records: ServiceRecord[] } {
  const now = new Date().toISOString();
  return {
    bikes: bikes.map((b) =>
      b.id === id ? { ...b, deletedAt: now, updatedAt: now } : b,
    ),
    records: records.map((r) =>
      r.bikeId === id && !r.deletedAt
        ? { ...r, deletedAt: now, updatedAt: now }
        : r,
    ),
  };
}

/** Everything not deleted. What the interface is allowed to see. */
export function liveBikes(bikes: Bike[]): Bike[] {
  return bikes.filter((b) => !b.deletedAt);
}

export function liveRecords(records: ServiceRecord[]): ServiceRecord[] {
  return records.filter((r) => !r.deletedAt);
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
  return records.filter((r) => r.bikeId === bikeId && !r.deletedAt);
}

/**
 * A backup is the raw stores, deletion markers and all. Exporting only the
 * live rows would make importing an old backup resurrect everything deleted
 * since — the same trap tombstones exist to avoid on the server side.
 */
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
    bikes?: (Omit<Bike, "updatedAt"> & {
      updatedAt?: string;
      /** Bundles before version 4 stored the printed model name. */
      model?: string;
    })[];
    records?: (ServiceRecord & { model?: string })[];
  };
  if (bundle?.format !== "shim-calc" || !Array.isArray(bundle.records)) {
    return { ok: false, error: "That isn't a shim calculator export file." };
  }

  const bikesById = new Map(currentBikes.map((b) => [b.id, b]));
  let bikesAdded = 0;

  for (const raw of bundle.bikes ?? []) {
    if (!raw?.id) continue;
    // Bundles written before version 3 have no updatedAt; treating them as
    // last touched when they were created makes them lose to anything newer,
    // which is the right way round for an old backup.
    const bike: Bike = {
      ...raw,
      updatedAt: raw.updatedAt ?? raw.createdAt,
      // Before version 4 the model was the printed name. An unrecognised name
      // resolves to nothing rather than being kept as a stray id.
      modelId: raw.modelId ?? LEGACY_MODEL_NAMES[raw.model ?? ""],
    };
    delete (bike as { model?: string }).model;
    const existing = bikesById.get(bike.id);
    if (!existing) {
      bikesById.set(bike.id, bike);
      bikesAdded += 1;
    } else if (bike.updatedAt > existing.updatedAt) {
      bikesById.set(bike.id, bike);
    }
  }

  // Legacy bundles: invent a bike per model so the services have a home.
  const legacyBikeByModel = new Map<string, Bike>();
  const resolveLegacyBike = (model: string | undefined): Bike => {
    const modelId = LEGACY_MODEL_NAMES[model ?? ""];
    const key = modelId ?? "";
    const existing =
      legacyBikeByModel.get(key) ??
      [...bikesById.values()].find((b) => (b.modelId ?? "") === key);
    if (existing) {
      legacyBikeByModel.set(key, existing);
      return existing;
    }
    const bike = newBike(engineId, model ?? "My LC8", modelId);
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
