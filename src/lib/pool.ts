"use client";

import { getEngine } from "./engines";
import type { Bike, ServiceRecord } from "./types";

/**
 * Turning one rider's service history into anonymous readings for the pool.
 *
 * A pooled reading is one valve at one service: what the gap measured, what
 * shim was under it, and enough about the bike — model, year, odometer — to
 * put the number in context. It is a copy, not a view: see the note at the
 * bottom of supabase/schema.sql for why the pool cannot be computed from the
 * rider's own tables and must outlive the account that fed it.
 *
 * The hard part is that the useful figure is not the gap, it is the *wear* —
 * how far the gap moved between two services on the same valve of the same
 * engine. Getting that out of the pool means readings from one bike have to be
 * recognisable as a set, while nothing about them says whose bike it is.
 *
 * That is what the keys below do. Each is a SHA-256 of the rider's secret
 * contributor token joined to an id the app already has. A hash is one-way:
 * the same inputs always produce the same 64 characters, and there is no way
 * back from the characters to the inputs. So:
 *
 *   * every reading from one bike carries the same bike_key, and they group;
 *   * nothing can be joined back to a person, because the join would need a
 *     token that lives only in that rider's own row;
 *   * re-sending a service produces the identical id, so a push can be
 *     repeated as often as it likes and never duplicates a reading;
 *   * when the account goes, the token goes with it, the keys can never be
 *     recomputed, and the readings stand as orphans. That is the intended end
 *     state, and it is deliberately irreversible.
 *
 * Note what is *not* recorded: no exact service date (the month is plenty for
 * a wear rate, and the day would make a reading easy to line up with somebody
 * saying what they did last Tuesday), no bike nickname, no free-text title.
 */

export type PooledReading = {
  /** hash(token, service + valve). Stable, so pushing twice overwrites. */
  id: string;
  /** hash(token, bike). Readings from one motorcycle share this. */
  bike_key: string;
  /** hash(token, service). The eight valves of one service share this. */
  service_key: string;
  model_id: string | null;
  year: number | null;
  engine_id: string;
  position_id: string;
  valve_type: string;
  /** "2026-08". Deliberately not the day. */
  month: string | null;
  odometer: number | null;
  /** The shim that was in there, where it was measured. */
  shim: number | null;
  /** The gap that was found. The reading everything else hangs off. */
  clearance: number;
  /**
   * The size the rider explicitly picked, and only that.
   *
   * Not the app's suggestion, and not a guess at what was fitted from the fact
   * that a confirmed gap exists — a rider may equally have rechecked a valve
   * they left alone. An invented figure here would be indistinguishable from a
   * measured one later, which is exactly the kind of rot a shared dataset
   * cannot recover from. Where nothing was chosen this stays empty, and the
   * cleanest wear signal of all is still readable: two services, same valve, no
   * shim change between them, so the whole difference is wear.
   */
  chosen_shim: number | null;
  /** The gap measured after the work, where it was checked. */
  confirmed_clearance: number | null;
  created_at: string;
  updated_at: string;
};

export type ContributionPayload = {
  readings: PooledReading[];
  /**
   * Ids to remove: valves of a deleted service, and valves whose measurement
   * has been cleared. Sent every time rather than remembered — deleting an id
   * that was never there costs nothing, and it keeps this stateless in the same
   * way sync itself is stateless.
   */
  retract: string[];
  /** Fingerprint of the two above, so an unchanged pool is never re-pushed. */
  signature: string;
};

const encoder = new TextEncoder();

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** hash(token + what kind of thing this is + its id). */
function poolKey(token: string, kind: string, id: string): Promise<string> {
  return sha256(`${token}:${kind}:${id}`);
}

/**
 * A fresh contributor token: 32 random bytes.
 *
 * Long enough that the ids derived from it cannot be guessed, which is what
 * stops anybody naming — and so retracting — a reading that is not theirs.
 */
export function newContributorToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** "2026-08-14" → "2026-08". Anything unexpected contributes nothing. */
function month(date: string): string | null {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : null;
}

/**
 * Build everything this device would contribute, from the raw stores.
 *
 * Raw, deletion markers included: a service the rider has since deleted is how
 * this knows to take its readings back out again.
 */
export async function buildContribution(
  token: string,
  bikes: Bike[],
  records: ServiceRecord[],
): Promise<ContributionPayload> {
  const bikeById = new Map(bikes.map((bike) => [bike.id, bike]));
  const readings: PooledReading[] = [];
  const retract: string[] = [];

  for (const record of records) {
    const bike = bikeById.get(record.bikeId);
    const engine = getEngine(record.engineId);
    // A service whose bike has been deleted goes too. The bike is the thing
    // that was sold or written off; leaving its services in the pool while it
    // is gone from the app would be a state the rider cannot see or correct.
    const gone = Boolean(record.deletedAt) || !bike || Boolean(bike.deletedAt);

    const serviceKey = gone ? "" : await poolKey(token, "service", record.id);
    const bikeKey = gone || !bike ? "" : await poolKey(token, "bike", bike.id);

    for (const position of engine.positions) {
      const id = await poolKey(token, "reading", `${record.id}:${position.id}`);
      const reading = record.readings[position.id];

      if (gone || reading?.clearance === undefined) {
        retract.push(id);
        continue;
      }

      readings.push({
        id,
        bike_key: bikeKey,
        service_key: serviceKey,
        model_id: bike?.modelId ?? null,
        year: bike?.year ?? null,
        engine_id: record.engineId,
        position_id: position.id,
        valve_type: position.type,
        month: month(record.date),
        odometer: record.odometer ?? null,
        shim: reading.shim ?? null,
        clearance: reading.clearance,
        chosen_shim: reading.chosenShim ?? null,
        confirmed_clearance: reading.confirmedClearance ?? null,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      });
    }
  }

  const signature = await sha256(JSON.stringify({ readings, retract }));
  return { readings, retract, signature };
}

/**
 * What the consent card counts: measured valves, and the bikes they came from.
 *
 * Worked out from the live stores rather than from the last push, so the card
 * can say what *would* go up before anything ever has.
 */
export function countShareable(
  bikes: Bike[],
  records: ServiceRecord[],
): { readings: number; bikes: number } {
  const live = new Set(
    bikes.filter((bike) => !bike.deletedAt).map((bike) => bike.id),
  );
  const contributing = new Set<string>();
  let readings = 0;

  for (const record of records) {
    if (record.deletedAt || !live.has(record.bikeId)) continue;
    const measured = Object.values(record.readings).filter(
      (reading) => reading?.clearance !== undefined,
    ).length;
    if (measured === 0) continue;
    readings += measured;
    contributing.add(record.bikeId);
  }

  return { readings, bikes: contributing.size };
}
