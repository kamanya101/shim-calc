"use client";

import { DEFAULT_AIM_SETTINGS, type AimSettings } from "./report";
import { createLocalStore } from "./store";
import {
  ACTIVE_BIKE_KEY,
  ACTIVE_KEY,
  AIM_KEY,
  BIKES_KEY,
  OWNER_KEY,
  RECORDS_KEY,
  SYNC_KEY,
} from "./storage";
import type { Bike, ServiceRecord } from "./types";

/**
 * The stores themselves, in one place.
 *
 * They used to be created inside RecordsProvider, which was fine while the
 * provider was the only thing that touched them. Signing in and syncing both
 * need to write the same stores, and having them reach back into a component
 * file for it would be a circular import. This is the seam.
 */

export type Owner = {
  userId: string;
  /** Shown on the account screen so you can tell whose data this is. */
  email: string;
};

export type SyncState = {
  lastSyncedAt: string | null;
};

const EMPTY_RECORDS: ServiceRecord[] = [];
const EMPTY_BIKES: Bike[] = [];
const NO_SYNC: SyncState = { lastSyncedAt: null };

export const recordsStore = createLocalStore<ServiceRecord[]>(
  RECORDS_KEY,
  EMPTY_RECORDS,
  (raw) => (Array.isArray(raw) ? (raw as ServiceRecord[]) : null),
);

export const bikesStore = createLocalStore<Bike[]>(BIKES_KEY, EMPTY_BIKES, (raw) =>
  Array.isArray(raw) ? (raw as Bike[]) : null,
);

export const activeStore = createLocalStore<string | null>(ACTIVE_KEY, null, (raw) =>
  typeof raw === "string" ? raw : null,
);

export const activeBikeStore = createLocalStore<string | null>(
  ACTIVE_BIKE_KEY,
  null,
  (raw) => (typeof raw === "string" ? raw : null),
);

export const aimStore = createLocalStore<AimSettings>(
  AIM_KEY,
  DEFAULT_AIM_SETTINGS,
  (raw) => {
    const value = raw as AimSettings | null;
    return value?.intake && value?.exhaust ? value : null;
  },
);

/**
 * Who the data above belongs to, and the app's own answer to "is anybody
 * signed in".
 *
 * Deliberately not the live Supabase session. A session expires, and refreshing
 * it needs the network — so reading the session to decide whether to show the
 * app would lock a rider out of their own history the moment they lost signal,
 * which is the one thing this tool must never do. Signing in is what writes
 * this; only signing out, or the server actively rejecting the account, clears
 * it. Everything in between is just a sync that has not happened yet.
 */
export const ownerStore = createLocalStore<Owner | null>(OWNER_KEY, null, (raw) => {
  const value = raw as Owner | null;
  return value?.userId && value?.email ? value : null;
});

export const syncStore = createLocalStore<SyncState>(SYNC_KEY, NO_SYNC, (raw) => {
  const value = raw as SyncState | null;
  return value && "lastSyncedAt" in value ? value : null;
});

/**
 * Wipe every trace of one rider's data from this device.
 *
 * Used when signing out, and when somebody signs in on a device that still
 * holds somebody else's bikes — without it the new account would adopt them
 * and, on the first sync, push them to the server as its own.
 */
export function clearLocalData(): void {
  recordsStore.set([]);
  bikesStore.set([]);
  activeStore.set(null);
  activeBikeStore.set(null);
  syncStore.set(NO_SYNC);
}
