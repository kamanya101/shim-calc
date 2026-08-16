"use client";

import { DEFAULT_ENGINE_ID } from "./engines";
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

  for (const bike of bikes) byModel.set(bike.model ?? "", bike);

  const migrated = records.map((record) => {
    if (record.bikeId) return record;

    const model = record.model;
    const key = model ?? "";
    let bike = byModel.get(key);
    if (!bike) {
      bike = newBike(record.engineId ?? DEFAULT_ENGINE_ID, model ?? "My LC8", model);
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
