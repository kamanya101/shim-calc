"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Aim } from "@/lib/calc";
import { DEFAULT_ENGINE_ID, getEngine } from "@/lib/engines";
import { toRecords, type ImportedService } from "@/lib/legacyImport";
import { runMigrations } from "@/lib/migrations";
import { type AimSettings } from "@/lib/report";
import { useHydrated, useLocalStore } from "@/lib/store";
import {
  activeBikeStore,
  activeStore,
  aimStore,
  bikesStore,
  recordsStore,
} from "@/lib/stores";
import {
  buildExport,
  deleteBike,
  deleteRecord,
  liveBikes,
  liveRecords,
  mergeImport,
  newBike,
  newRecord,
  recordsForBike,
  sortRecords,
  upsertBike,
  upsertRecord,
  type ExportBundle,
  type ImportResult,
} from "@/lib/storage";
import type { Bike, EngineSpec, ServiceRecord, ValveType } from "@/lib/types";

/**
 * Identities for the empty state, so "no data yet" is one stable bike and one
 * stable service rather than a new pair on every render. The first edit
 * persists them and they become ordinary records.
 */
const DRAFT_BIKE_ID = "draft-bike";
const DRAFT_RECORD_ID = "draft";

// Before any store is read. An upgrade must never cost somebody their history.
runMigrations();

type RecordsContext = {
  /** False during server render and hydration — nothing data-driven paints yet. */
  ready: boolean;
  engine: EngineSpec;
  bikes: Bike[];
  bike: Bike;
  /** Services for the selected bike only. */
  records: ServiceRecord[];
  /** Every service across every bike, deleted ones excluded. */
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
  /** Write reconstructed services onto the selected bike. Returns how many. */
  addImported: (services: ImportedService[]) => number;
  /**
   * Accept the selected bike's imported services as real measurements, which
   * is what lets them into the shared averages. See `source` on ServiceRecord.
   */
  confirmImported: () => void;
  importJson: (raw: string) => ImportResult;
  /**
   * A complete backup, deletion markers included. A function rather than a
   * value so no screen can accidentally export the display lists, which have
   * the markers filtered out — importing that file would resurrect everything
   * ever deleted.
   */
  exportBundle: () => ExportBundle;
};

const Ctx = createContext<RecordsContext | null>(null);

export function useRecords(): RecordsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRecords must be used inside <RecordsProvider>");
  return ctx;
}

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const ready = useHydrated();

  /**
   * The stores hold deleted rows as markers, because sync needs them. Nothing
   * on screen ever should, so the raw arrays stay in this file: edits are
   * applied to them, and everything handed out is filtered.
   */
  const rawRecords = useLocalStore(recordsStore);
  const rawBikes = useLocalStore(bikesStore);
  const activeId = useLocalStore(activeStore);
  const activeBikeId = useLocalStore(activeBikeStore);
  const aim = useLocalStore(aimStore);

  const allRecords = useMemo(() => liveRecords(rawRecords), [rawRecords]);
  const bikes = useMemo(() => liveBikes(rawBikes), [rawBikes]);

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
    bikesStore.set([...rawBikes, bike]);
    activeBikeStore.set(bike.id);
    return bike;
  }, [bikes, rawBikes, bike]);

  const updateActive = useCallback(
    (patch: (record: ServiceRecord) => ServiceRecord) => {
      ensureBike();
      const next = patch(active);
      recordsStore.set(upsertRecord(rawRecords, next));
      if (activeId !== next.id) activeStore.set(next.id);
    },
    [rawRecords, active, activeId, ensureBike],
  );

  const updateBike = useCallback(
    (patch: Partial<Omit<Bike, "id">>) => {
      const current = ensureBike();
      bikesStore.set(upsertBike(bikesStore.get(), { ...current, ...patch }));
    },
    [ensureBike],
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
      const next = deleteBike(rawBikes, rawRecords, id);
      bikesStore.set(next.bikes);
      recordsStore.set(next.records);
      if (id === bike.id) {
        activeBikeStore.set(liveBikes(next.bikes)[0]?.id ?? null);
        activeStore.set("");
      }
    },
    [rawBikes, rawRecords, bike.id],
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
      recordsStore.set([record, ...rawRecords]);
      activeStore.set(record.id);
    },
    [allRecords, rawRecords, ensureBike],
  );

  const remove = useCallback(
    (id: string) => {
      const next = deleteRecord(rawRecords, id);
      recordsStore.set(next);
      if (id === activeId) {
        const forBike = sortRecords(recordsForBike(next, bike.id));
        activeStore.set(forBike[0]?.id ?? "");
      }
    },
    [rawRecords, activeId, bike.id],
  );

  /**
   * Everything arrives in one write rather than one per service, so a paste of
   * a dozen services is a single entry in the store and a single sync — and so
   * that a batch cannot half-land if something goes wrong part way down it.
   */
  const addImported = useCallback(
    (services: ImportedService[]): number => {
      const current = ensureBike();
      const built = toRecords(services, getEngine(current.engineId), current.id);
      if (!built.length) return 0;
      recordsStore.set([...built, ...recordsStore.get()]);
      return built.length;
    },
    [ensureBike],
  );

  const confirmImported = useCallback(() => {
    const now = new Date().toISOString();
    recordsStore.set(
      recordsStore.get().map((record) => {
        if (record.bikeId !== bike.id || record.source !== "import") return record;
        // updatedAt moves because this is an edit like any other: it is what
        // decides the winner if the same service was also touched elsewhere.
        const confirmed = { ...record, updatedAt: now };
        delete confirmed.source;
        return confirmed;
      }),
    );
  }, [bike.id]);

  const importJson = useCallback(
    (raw: string): ImportResult => {
      const result = mergeImport(rawBikes, rawRecords, raw, DEFAULT_ENGINE_ID);
      if (result.ok) {
        bikesStore.set(result.bikes);
        recordsStore.set(result.records);
        if (!activeBikeId && liveBikes(result.bikes).length) {
          activeBikeStore.set(liveBikes(result.bikes)[0].id);
        }
      }
      return result;
    },
    [rawBikes, rawRecords, activeBikeId],
  );

  const exportBundle = useCallback(
    () => buildExport(bikesStore.get(), recordsStore.get()),
    [],
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
    addImported,
    confirmImported,
    importJson,
    exportBundle,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
