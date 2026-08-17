"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildContribution, newContributorToken } from "./pool";
import {
  bikesStore,
  contributionStore,
  ownerStore,
  recordsStore,
  syncStore,
  type Contribution,
} from "./stores";
import { getSupabase } from "./supabase";
import type { Bike, ServiceRecord, ValveReading } from "./types";

/**
 * Reconciling a device with the server.
 *
 * There is no operation log and no outbox. A rider has a handful of bikes and
 * a few dozen services — a few kilobytes — so every sync pulls the lot, merges
 * it against what is on the device, and pushes back whatever the device knows
 * better. That makes a sync idempotent and order-independent: interrupt it
 * halfway, run it twice, run it from three devices at once, and the next one
 * still lands on the same answer.
 *
 * The merge rule is the one the app already used for importing a backup —
 * whichever copy was touched last wins, per row. Deletions travel as markers
 * so they compete on the same terms; see `deletedAt` on ServiceRecord.
 */

export type SyncOutcome =
  | "synced"
  | "offline"
  | "signed-out"
  | "auth-expired"
  | "no-backend"
  | "error";

type BikeRow = {
  user_id: string;
  id: string;
  name: string;
  model_id: string | null;
  year: number | null;
  engine_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RecordRow = {
  user_id: string;
  id: string;
  bike_id: string;
  engine_id: string;
  date: string;
  odometer: number | null;
  title: string | null;
  readings: Record<string, ValveReading>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const toBike = (row: BikeRow): Bike => ({
  id: row.id,
  name: row.name,
  modelId: row.model_id ?? undefined,
  year: row.year ?? undefined,
  engineId: row.engine_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

const toBikeRow = (bike: Bike, userId: string): BikeRow => ({
  user_id: userId,
  id: bike.id,
  name: bike.name,
  model_id: bike.modelId ?? null,
  year: bike.year ?? null,
  engine_id: bike.engineId,
  created_at: bike.createdAt,
  updated_at: bike.updatedAt,
  deleted_at: bike.deletedAt ?? null,
});

const toRecord = (row: RecordRow): ServiceRecord => ({
  id: row.id,
  bikeId: row.bike_id,
  engineId: row.engine_id,
  date: row.date,
  odometer: row.odometer ?? undefined,
  title: row.title ?? undefined,
  readings: row.readings ?? {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

const toRecordRow = (record: ServiceRecord, userId: string): RecordRow => ({
  user_id: userId,
  id: record.id,
  bike_id: record.bikeId,
  engine_id: record.engineId,
  date: record.date,
  odometer: record.odometer ?? null,
  title: record.title ?? null,
  readings: record.readings ?? {},
  created_at: record.createdAt,
  updated_at: record.updatedAt,
  deleted_at: record.deletedAt ?? null,
});

/**
 * Merge two sides by id, keeping whichever row was touched last, and report
 * which of the merged rows the server does not already have in that state.
 */
function merge<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
): { merged: T[]; toPush: T[] } {
  const byId = new Map<string, T>();
  const remoteById = new Map(remote.map((row) => [row.id, row]));

  for (const row of remote) byId.set(row.id, row);
  for (const row of local) {
    const existing = byId.get(row.id);
    if (!existing || row.updatedAt > existing.updatedAt) byId.set(row.id, row);
  }

  const merged = [...byId.values()];
  const toPush = merged.filter((row) => {
    const server = remoteById.get(row.id);
    return !server || row.updatedAt > server.updatedAt;
  });

  return { merged, toPush };
}

/** Writing an unchanged array would re-render every screen for nothing. */
function commit<T>(
  store: { get: () => T[]; set: (value: T[]) => void },
  next: T[],
): void {
  if (JSON.stringify(store.get()) !== JSON.stringify(next)) store.set(next);
}

const isNetworkError = (message: string): boolean =>
  /fetch|network|connection|timeout/i.test(message);

let inFlight: Promise<SyncOutcome> | null = null;

/**
 * Run a reconcile, or join the one already running.
 *
 * Sync is triggered from several places at once — sign-in, regaining signal,
 * returning to the tab, finishing an edit — and they routinely coincide.
 * Overlapping runs would race each other's writes to the same stores.
 */
export function reconcile(): Promise<SyncOutcome> {
  inFlight ??= run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(): Promise<SyncOutcome> {
  const supabase = getSupabase();
  if (!supabase) return "no-backend";

  const owner = ownerStore.get();
  if (!owner) return "signed-out";

  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";

  // Reading the session refreshes an expired token when there is signal. A
  // missing session here means the refresh token itself is finished — the one
  // case where the rider genuinely has to sign in again. The app keeps working
  // either way; only syncing stops.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return "auth-expired";

  const userId = sessionData.session.user.id;

  try {
    const [bikeResult, recordResult] = await Promise.all([
      supabase.from("bikes").select("*").eq("user_id", userId),
      supabase.from("service_records").select("*").eq("user_id", userId),
    ]);

    if (bikeResult.error) throw bikeResult.error;
    if (recordResult.error) throw recordResult.error;

    const bikes = merge(
      bikesStore.get(),
      (bikeResult.data as BikeRow[]).map(toBike),
    );
    const records = merge(
      recordsStore.get(),
      (recordResult.data as RecordRow[]).map(toRecord),
    );

    // Bikes go up first: a service row points at a bike, and a server that has
    // the service but not its bike is a state no reader should ever see.
    if (bikes.toPush.length) {
      const { error } = await supabase
        .from("bikes")
        .upsert(bikes.toPush.map((bike) => toBikeRow(bike, userId)), {
          onConflict: "user_id,id",
        });
      if (error) throw error;
    }

    if (records.toPush.length) {
      const { error } = await supabase
        .from("service_records")
        .upsert(records.toPush.map((record) => toRecordRow(record, userId)), {
          onConflict: "user_id,id",
        });
      if (error) throw error;
    }

    commit(bikesStore, bikes.merged);
    commit(recordsStore, records.merged);

    // Contributing to the pool is a separate, optional thing, and it runs after
    // the rider's own data is safely up. Its failures are swallowed on purpose:
    // a pool that is unreachable — or tables that have not been created yet —
    // must not report a rider's own history as failing to sync, when it just
    // did. Nothing is lost either way; the next reconcile tries again.
    try {
      await syncContributions(supabase, userId);
    } catch {
      // Deliberately silent. See above.
    }

    syncStore.set({ lastSyncedAt: new Date().toISOString() });
    return "synced";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return isNetworkError(message) ? "offline" : "error";
  }
}

type ContributorRow = {
  user_id: string;
  token: string;
  updated_at: string;
};

/**
 * Send the pool what it does not have.
 *
 * There is no consent to reconcile — measurements go up because the app is
 * being used — so the only thing that has to agree across a rider's devices is
 * the token, and it agrees by never changing. Once the server has issued one
 * it is never overwritten, even by a device that has generated its own. Two
 * devices first syncing at the same time would otherwise each insist on their
 * own, and every reading pushed under the loser would be stranded: still in
 * the pool, still counted, but looking like a different motorcycle. A token is
 * an identity, not an opinion.
 */
async function syncContributions(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const local = contributionStore.get();

  const { data, error } = await supabase
    .from("contributors")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  let server = data as ContributorRow | null;

  if (!server) {
    const row: ContributorRow = {
      user_id: userId,
      token: local.token ?? newContributorToken(),
      updated_at: new Date().toISOString(),
    };
    const insert = await supabase.from("contributors").insert(row);
    if (insert.error) {
      // Another device got there first with its own token. Theirs stands.
      const retry = await supabase
        .from("contributors")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (retry.error) throw retry.error;
      server = retry.data as ContributorRow | null;
    } else {
      server = row;
    }
    if (!server) return;
  }

  const next: Contribution = { ...local, token: server.token };

  // A different token means different keys for every reading, so nothing this
  // device believes it has already sent applies any more.
  if (local.token !== server.token) {
    next.lastPushed = null;
    next.lastPushedAt = null;
  }

  const payload = await buildContribution(
    server.token,
    bikesStore.get(),
    recordsStore.get(),
  );

  if (payload.signature !== next.lastPushed) {
    const { error: pushError } = await supabase.rpc("contribute_readings", {
      readings: payload.readings,
      retract: payload.retract,
    });
    if (pushError) throw pushError;
    next.lastPushed = payload.signature;
    next.lastPushedAt = new Date().toISOString();
  }

  next.shared = payload.readings.length;

  if (JSON.stringify(local) !== JSON.stringify(next)) contributionStore.set(next);
}
