"use client";

import { DEFAULT_ENGINE_ID } from "./engines";
import { LEGACY_MODEL_NAMES } from "./models";
import {
  ACTIVE_BIKE_KEY,
  BIKES_KEY,
  RECORDS_KEY,
  SCHEMA_KEY,
  SCHEMA_VERSION,
  newBike,
} from "./storage";
import type { Bike, ServiceRecord } from "./types";

/**
 * Brings stored data up to the current shape.
 *
 * People have this installed with real services in it, so an upgrade must
 * never be the reason someone loses their clearance history. Runs once per
 * page load, before anything reads the stores, and does nothing at all once
 * the stored version matches.
 */
export function runMigrations(): void {
  if (typeof window === "undefined") return;

  let version = 0;
  try {
    version = Number(window.localStorage.getItem(SCHEMA_KEY) ?? "0") || 0;
  } catch {
    return;
  }

  if (version >= SCHEMA_VERSION) return;

  try {
    if (version < 2) migrateToBikes();
    if (version < 3) migrateToSyncable();
    if (version < 4) migrateToModelIds();
    window.localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  } catch {
    // A failed migration must not take the app down with it. Leaving the
    // version unset means it will be retried next load rather than silently
    // treating half-migrated data as current.
  }
}

/**
 * Version 2 introduced bikes. Before it, each service carried its own model
 * string and there was no way to tell one motorcycle from another.
 *
 * Services are grouped by the model recorded on them, and each distinct model
 * becomes a bike — the best guess available, and right for the overwhelmingly
 * common case of one bike. Anyone who really had two of the same model can
 * split them afterwards; nothing is thrown away either way.
 */
function migrateToBikes(): void {
  const rawRecords = window.localStorage.getItem(RECORDS_KEY);
  if (!rawRecords) return;

  const records = JSON.parse(rawRecords) as (ServiceRecord & {
    model?: string;
  })[];
  if (!Array.isArray(records) || records.length === 0) return;
  if (records.every((record) => record.bikeId)) return;

  const existingBikes = readBikes();
  const bikes: Bike[] = [...existingBikes];
  const byModel = new Map<string, Bike>();

  for (const bike of bikes) byModel.set(bike.modelId ?? "", bike);

  const migrated = records.map((record) => {
    if (record.bikeId) return record;

    const model = record.model;
    const key = LEGACY_MODEL_NAMES[model ?? ""] ?? "";
    let bike = byModel.get(key);
    if (!bike) {
      bike = newBike(record.engineId ?? DEFAULT_ENGINE_ID, model ?? "My LC8", key || undefined);
      byModel.set(key, bike);
      bikes.push(bike);
    }

    const next = { ...record, bikeId: bike.id };
    delete next.model;
    return next;
  });

  window.localStorage.setItem(BIKES_KEY, JSON.stringify(bikes));
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(migrated));

  if (bikes.length > 0 && !window.localStorage.getItem(ACTIVE_BIKE_KEY)) {
    window.localStorage.setItem(ACTIVE_BIKE_KEY, JSON.stringify(bikes[0].id));
  }
}

/**
 * Version 3 is the one that makes the data syncable.
 *
 * Bikes gained an `updatedAt`, because reconciling two devices means asking
 * which copy was touched last and a bike previously could not answer. Anything
 * already stored is stamped with its creation time — it has not been edited
 * since, as far as anyone can tell, and dating it earlier than any subsequent
 * change is the safe direction to be wrong in.
 *
 * Deletion markers need no migration: no marker means not deleted, which is
 * true of everything written before this version.
 */
function migrateToSyncable(): void {
  const bikes = readBikes();
  if (bikes.length === 0) return;

  const stamped = bikes.map((bike) =>
    bike.updatedAt ? bike : { ...bike, updatedAt: bike.createdAt },
  );
  window.localStorage.setItem(BIKES_KEY, JSON.stringify(stamped));
}

/**
 * Version 4 swapped the printed model name on a bike for a permanent id, so
 * that rewording an entry in the model list can never split one model into two
 * in the shared averages. See models.ts.
 *
 * A name that is not on the list resolves to no model at all rather than being
 * carried across as an invented id — better an empty field the rider can fill
 * in from a dropdown than a value nothing else will ever match.
 */
function migrateToModelIds(): void {
  const bikes = readBikes() as (Bike & { model?: string })[];
  if (bikes.length === 0) return;

  const migrated = bikes.map((bike) => {
    if (!("model" in bike)) return bike;
    const next: Bike & { model?: string } = {
      ...bike,
      modelId: bike.modelId ?? LEGACY_MODEL_NAMES[bike.model ?? ""],
    };
    delete next.model;
    return next;
  });

  window.localStorage.setItem(BIKES_KEY, JSON.stringify(migrated));
}

function readBikes(): Bike[] {
  try {
    const raw = window.localStorage.getItem(BIKES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Bike[]) : [];
  } catch {
    return [];
  }
}
