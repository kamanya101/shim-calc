"use client";

import { DEFAULT_AIM_SETTINGS, type AimSettings } from "./report";
import { createLocalStore } from "./store";
import {
  ACTIVE_BIKE_KEY,
  ACTIVE_KEY,
  AIM_KEY,
  BIKES_KEY,
  CONTRIBUTION_KEY,
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

/**
 * Whether this rider contributes to the shared pool.
 *
 * Having an account and feeding the pool are two separate decisions, so this is
 * its own record rather than a flag on the owner. It is also the only place the
 * contributor token lives on the device — the value every pooled reading of
 * theirs is keyed under; see pool.ts.
 */
export type Contribution = {
  token: string | null;
  /** When sharing was first agreed to. Null means it never was. */
  optedInAt: string | null;
  /** Set when sharing is turned off. What is already pooled stays pooled. */
  withdrawnAt: string | null;
  /**
   * When the two fields above last changed. Merged with the server copy the
   * same way every other row is: later wins. Empty until the rider decides
   * anything, so a device that has never been asked can never overrule one
   * that has.
   */
  updatedAt: string;
  /** Fingerprint of the last payload the server accepted. */
  lastPushed: string | null;
  lastPushedAt: string | null;
  /** Readings in that payload, for the card to report. */
  shared: number;
};

const EMPTY_RECORDS: ServiceRecord[] = [];
const EMPTY_BIKES: Bike[] = [];
const NO_SYNC: SyncState = { lastSyncedAt: null };

const NO_CONTRIBUTION: Contribution = {
  token: null,
  optedInAt: null,
  withdrawnAt: null,
  updatedAt: "",
  lastPushed: null,
  lastPushedAt: null,
  shared: 0,
};

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

export const contributionStore = createLocalStore<Contribution>(
  CONTRIBUTION_KEY,
  NO_CONTRIBUTION,
  (raw) => {
    const value = raw as Partial<Contribution> | null;
    if (!value || typeof value !== "object") return null;
    // Filled out rather than validated field by field: a stored copy written
    // by an older build is worth keeping for the one thing that matters in it,
    // which is the token. Losing that would orphan readings this rider is
    // still contributing and start them a second, parallel set.
    return { ...NO_CONTRIBUTION, ...value };
  },
);

/** Opted in, and not since turned off. */
export function isContributing(contribution: Contribution): boolean {
  return Boolean(
    contribution.token && contribution.optedInAt && !contribution.withdrawnAt,
  );
}

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
  // The contributor token belongs to the account, not the device. Leaving it
  // behind would key the next rider's readings to the last rider's token and
  // silently merge two people's bikes into one in the averages.
  contributionStore.set(NO_CONTRIBUTION);
}
