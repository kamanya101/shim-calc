"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Aim } from "@/lib/calc";
import { DEFAULT_ENGINE_ID, getEngine } from "@/lib/engines";
import { runMigrations } from "@/lib/migrations";
import { DEFAULT_AIM_SETTINGS, type AimSettings } from "@/lib/report";
import { createLocalStore, useHydrated, useLocalStore } from "@/lib/store";
import {
  ACTIVE_BIKE_KEY,
  ACTIVE_KEY,
  BIKES_KEY,
  RECORDS_KEY,
  deleteRecord,
  mergeImport,
  newBike,
  newRecord,
  recordsForBike,
  sortRecords,
  upsertRecord,
  type ImportResult,
} from "@/lib/storage";
import type { Bike, EngineSpec, ServiceRecord, ValveType } from "@/lib/types";

const AIM_KEY = "shim-calc/aim/v1";

/**
 * Identities for the empty state, so "no data yet" is one stable bike and one
 * stable service rather than a new pair on every render. The first edit
 * persists them and they become ordinary records.
 */
const DRAFT_BIKE_ID = "draft-bike";
const DRAFT_RECORD_ID = "draft";

// Before any store is read. An upgrade must never cost somebody their history.
runMigrations();

const EMPTY_RECORDS: ServiceRecord[] = [];
const EMPTY_BIKES: Bike[] = [];

const recordsStore = createLocalStore<ServiceRecord[]>(
  RECORDS_KEY,
  EMPTY_RECORDS,
  (raw) => (Array.isArray(raw) ? (raw as ServiceRecord[]) : null),
);

const bikesStore = createLocalStore<Bike[]>(BIKES_KEY, EMPTY_BIKES, (raw) =>
  Array.isArray(raw) ? (raw as Bike[]) : null,
);

const activeStore = createLocalStore<string | null>(ACTIVE_KEY, null, (raw) =>
  typeof raw === "string" ? raw : null,
);

const activeBikeStore = createLocalStore<string | null>(
  ACTIVE_BIKE_KEY,
  null,
  (raw) => (typeof raw === "string" ? raw : null),
);

const aimStore = createLocalStore<AimSettings>(AIM_KEY, DEFAULT_AIM_SETTINGS, (raw) => {
  const value = raw as AimSettings | null;
  return value?.intake && value?.exhaust ? value : null;
});

type RecordsContext = {
  /** False during server render and hydration — nothing data-driven paints yet. */
  ready: boolean;
  engine: EngineSpec;
  bikes: Bike[];
  bike: Bike;
  /** Services for the selected bike only. */
  records: ServiceRecord[];
  /** Every service across every bike — for backups, which must be complete. */
  allRecords: ServiceRecord[];
  active: ServiceRecord;
  aim: AimSettings;
  setAim: (type: ValveType, value: Aim) => void;
  setActiveId: (id: string) => void;
  setActiveBikeId: (id: string) => void;
  updateActive: (patch: (record: ServiceRecord) => ServiceRecord) => void;
  updateBike: (patch: Partial<Omit<Bike, "id">>) => void;
  addBike: () => void;
  removeBike: (id: string) => void;
  startNew: () => void;
  duplicateAsNew: (id: string) => void;
  remove: (id: string) => void;
  importJson: (raw: string) => ImportResult;
};

const Ctx = createContext<RecordsContext | null>(null);

export function useRecords(): RecordsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRecords must be used inside <RecordsProvider>");
  return ctx;
}

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const ready = useHydrated();
  const allRecords = useLocalStore(recordsStore);
  const bikes = useLocalStore(bikesStore);
  const activeId = useLocalStore(activeStore);
  const activeBikeId = useLocalStore(activeBikeStore);
  const aim = useLocalStore(aimStore);

  // Never mutated — every edit produces new objects — so a deleted draft comes
  // back blank rather than carrying the old readings.
  const [draftBike] = useState<Bike>(() => ({
    ...newBike(DEFAULT_ENGINE_ID, "My LC8"),
    id: DRAFT_BIKE_ID,
  }));
  const [draftRecord] = useState(() =>
    newRecord(DEFAULT_ENGINE_ID, DRAFT_BIKE_ID, DRAFT_RECORD_ID),
  );

  const bike = useMemo(
    () => bikes.find((b) => b.id === activeBikeId) ?? bikes[0] ?? draftBike,
    [bikes, activeBikeId, draftBike],
  );

  const records = useMemo(
    () => recordsForBike(allRecords, bike.id),
    [allRecords, bike.id],
  );

  const active = useMemo(() => {
    const chosen = records.find((r) => r.id === activeId);
    if (chosen) return chosen;
    if (records.length) return sortRecords(records)[0];
    return bike.id === DRAFT_BIKE_ID
      ? draftRecord
      : newRecord(bike.engineId, bike.id, `${DRAFT_RECORD_ID}-${bike.id}`);
  }, [records, activeId, bike, draftRecord]);

  /** Persist the draft bike alongside whatever else is being written. */
  const ensureBike = useCallback((): Bike => {
    if (bikes.some((b) => b.id === bike.id)) return bike;
    bikesStore.set([...bikes, bike]);
    activeBikeStore.set(bike.id);
    return bike;
  }, [bikes, bike]);

  const updateActive = useCallback(
    (patch: (record: ServiceRecord) => ServiceRecord) => {
      ensureBike();
      const next = patch(active);
      recordsStore.set(upsertRecord(allRecords, next));
      if (activeId !== next.id) activeStore.set(next.id);
    },
    [allRecords, active, activeId, ensureBike],
  );

  const updateBike = useCallback(
    (patch: Partial<Omit<Bike, "id">>) => {
      const current = ensureBike();
      const next = { ...current, ...patch };
      bikesStore.set(
        bikes.some((b) => b.id === next.id)
          ? bikes.map((b) => (b.id === next.id ? next : b))
          : [...bikes, next],
      );
    },
    [bikes, ensureBike],
  );

  const addBike = useCallback(() => {
    ensureBike();
    const created = newBike(DEFAULT_ENGINE_ID, `Bike ${bikes.length + 1}`);
    bikesStore.set([...bikesStore.get(), created]);
    activeBikeStore.set(created.id);
    activeStore.set("");
  }, [bikes.length, ensureBike]);

  const removeBike = useCallback(
    (id: string) => {
      const remaining = bikes.filter((b) => b.id !== id);
      bikesStore.set(remaining);
      recordsStore.set(allRecords.filter((r) => r.bikeId !== id));
      if (id === bike.id) {
        activeBikeStore.set(remaining[0]?.id ?? null);
        activeStore.set("");
      }
    },
    [bikes, allRecords, bike.id],
  );

  const startNew = useCallback(() => {
    const current = ensureBike();
    const record = newRecord(current.engineId, current.id);
    recordsStore.set([record, ...recordsStore.get()]);
    activeStore.set(record.id);
  }, [ensureBike]);

  /**
   * Start the next service pre-filled with the shims this one ended up
   * fitting — next time round those *are* the shims in the engine, so it
   * saves re-typing eight numbers you already know.
   */
  const duplicateAsNew = useCallback(
    (id: string) => {
      const source = allRecords.find((r) => r.id === id);
      const current = ensureBike();
      const record = newRecord(
        source?.engineId ?? current.engineId,
        source?.bikeId ?? current.id,
      );
      if (source) {
        const engine = getEngine(source.engineId);
        for (const position of engine.positions) {
          const reading = source.readings[position.id];
          const fitted = reading?.chosenShim ?? reading?.shim;
          if (fitted !== undefined) record.readings[position.id] = { shim: fitted };
        }
        record.odometer = source.odometer;
      }
      recordsStore.set([record, ...allRecords]);
      activeStore.set(record.id);
    },
    [allRecords, ensureBike],
  );

  const remove = useCallback(
    (id: string) => {
      const next = deleteRecord(allRecords, id);
      recordsStore.set(next);
      if (id === activeId) {
        const forBike = sortRecords(recordsForBike(next, bike.id));
        activeStore.set(forBike[0]?.id ?? "");
      }
    },
    [allRecords, activeId, bike.id],
  );

  const importJson = useCallback(
    (raw: string): ImportResult => {
      const result = mergeImport(bikes, allRecords, raw, DEFAULT_ENGINE_ID);
      if (result.ok) {
        bikesStore.set(result.bikes);
        recordsStore.set(result.records);
        if (!activeBikeId && result.bikes.length) {
          activeBikeStore.set(result.bikes[0].id);
        }
      }
      return result;
    },
    [bikes, allRecords, activeBikeId],
  );

  const setAim = useCallback(
    (type: ValveType, value: Aim) => {
      aimStore.set({ ...aim, [type]: value });
    },
    [aim],
  );

  const value: RecordsContext = {
    ready,
    engine: getEngine(bike.engineId),
    bikes: bikes.length ? bikes : [draftBike],
    bike,
    records,
    allRecords,
    active,
    aim,
    setAim,
    setActiveId: activeStore.set,
    setActiveBikeId: activeBikeStore.set,
    updateActive,
    updateBike,
    addBike,
    removeBike,
    startNew,
    duplicateAsNew,
    remove,
    importJson,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
