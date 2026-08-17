"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocalStore } from "@/lib/store";
import { bikesStore, ownerStore, recordsStore, syncStore } from "@/lib/stores";
import { reconcile, type SyncOutcome } from "@/lib/sync";
import type { Bike, ServiceRecord } from "@/lib/types";

export type SyncStatus = "idle" | "syncing" | SyncOutcome;

type SyncContextValue = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  syncNow: () => void;
};

const Ctx = createContext<SyncContextValue>({
  status: "idle",
  lastSyncedAt: null,
  syncNow: () => {},
});

export function useSync(): SyncContextValue {
  return useContext(Ctx);
}

/** Wait this long after the last keystroke before syncing an edit. */
const QUIET_MS = 2500;

/**
 * A cheap fingerprint of what is worth syncing: every row's id and the moment
 * it was last touched. Used to tell an edit apart from a re-render, and from
 * the store writes a sync itself makes — without it, applying what the server
 * sent would look like a local change and start another sync, forever.
 */
function signature(bikes: Bike[], records: ServiceRecord[]): string {
  const rows = [
    ...bikes.map((b) => `b:${b.id}@${b.updatedAt}`),
    ...records.map((r) => `r:${r.id}@${r.updatedAt}`),
  ];
  return rows.sort().join("|");
}

/**
 * Keeps the device and the server in step, in the background.
 *
 * Nothing here is on the path of anything the rider does: every screen reads
 * localStorage and paints whether this succeeds, fails or never runs at all.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const owner = useLocalStore(ownerStore);
  const bikes = useLocalStore(bikesStore);
  const records = useLocalStore(recordsStore);
  const sync = useLocalStore(syncStore);

  const [status, setStatus] = useState<SyncStatus>("idle");
  const lastSynced = useRef<string | null>(null);

  const run = useCallback(async () => {
    setStatus("syncing");
    const outcome = await reconcile();
    if (outcome === "synced") {
      lastSynced.current = signature(bikesStore.get(), recordsStore.get());
    }
    setStatus(outcome);
  }, []);

  const syncNow = useCallback(() => {
    void run();
  }, [run]);

  // Sign-in, and every later chance to catch up: regaining signal, and coming
  // back to the app after it has been in the background.
  useEffect(() => {
    if (!owner) return;

    // Deferred by a tick rather than called outright: starting the sync here
    // would set state while the effect is still running and cascade another
    // render before the app has painted. Nothing on screen is waiting for it.
    const initial = setTimeout(() => void run(), 0);

    const onOnline = () => void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [owner, run]);

  // And after an edit settles. Syncing on every keystroke would be a request
  // per digit of a clearance measurement.
  useEffect(() => {
    if (!owner) return;
    const current = signature(bikes, records);
    if (current === lastSynced.current) return;

    const timer = setTimeout(() => void run(), QUIET_MS);
    return () => clearTimeout(timer);
  }, [owner, bikes, records, run]);

  return (
    <Ctx.Provider
      value={{ status, lastSyncedAt: sync.lastSyncedAt, syncNow }}
    >
      {children}
    </Ctx.Provider>
  );
}
