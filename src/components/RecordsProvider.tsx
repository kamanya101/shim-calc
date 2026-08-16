"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Aim } from "@/lib/calc";
import { DEFAULT_ENGINE_ID, getEngine } from "@/lib/engines";
import { DEFAULT_AIM_SETTINGS, type AimSettings } from "@/lib/report";
import { createLocalStore, useHydrated, useLocalStore } from "@/lib/store";
import {
  ACTIVE_KEY,
  AIM_KEY,
  RECORDS_KEY,
  deleteRecord,
  mergeImport,
  newRecord,
  sortRecords,
  upsertRecord,
  type ImportResult,
} from "@/lib/storage";
import type { EngineSpec, ServiceRecord, ValveType } from "@/lib/types";

/**
 * The record the app falls back to before anything has been saved. It gets a
 * fixed id so that "the empty sheet" is one identity rather than a new one per
 * render; the first edit persists it and it becomes an ordinary record.
 */
const DRAFT_ID = "draft";

const EMPTY_RECORDS: ServiceRecord[] = [];

const recordsStore = createLocalStore<ServiceRecord[]>(
  RECORDS_KEY,
  EMPTY_RECORDS,
  (raw) => (Array.isArray(raw) ? (raw as ServiceRecord[]) : null),
);

const activeStore = createLocalStore<string | null>(ACTIVE_KEY, null, (raw) =>
  typeof raw === "string" ? raw : null,
);

const aimStore = createLocalStore<AimSettings>(AIM_KEY, DEFAULT_AIM_SETTINGS, (raw) => {
  const value = raw as AimSettings | null;
  return value?.intake && value?.exhaust ? value : null;
});

type RecordsContext = {
  /** False during server render and hydration — nothing data-driven paints yet. */
  ready: boolean;
  engine: EngineSpec;
  records: ServiceRecord[];
  active: ServiceRecord;
  aim: AimSettings;
  setAim: (type: ValveType, value: Aim) => void;
  setActiveId: (id: string) => void;
  updateActive: (patch: (record: ServiceRecord) => ServiceRecord) => void;
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
  const records = useLocalStore(recordsStore);
  const activeId = useLocalStore(activeStore);
  const aim = useLocalStore(aimStore);

  // Never mutated — every edit produces a new object — so a deleted draft
  // comes back blank rather than carrying the old readings.
  const [draft] = useState(() => newRecord(DEFAULT_ENGINE_ID, DRAFT_ID));

  const active = useMemo(() => {
    const chosen = records.find((r) => r.id === activeId);
    if (chosen) return chosen;
    if (records.length) return sortRecords(records)[0];
    return draft;
  }, [records, activeId, draft]);

  const updateActive = useCallback(
    (patch: (record: ServiceRecord) => ServiceRecord) => {
      const next = patch(active);
      recordsStore.set(upsertRecord(records, next));
      if (activeId !== next.id) activeStore.set(next.id);
    },
    [records, active, activeId],
  );

  const startNew = useCallback(() => {
    const record = newRecord(DEFAULT_ENGINE_ID);
    // Almost nobody owns two LC8s. Carry the bike over from the last service
    // so it is one less thing to pick every time.
    record.model = records.length ? sortRecords(records)[0].model : undefined;
    recordsStore.set([record, ...records]);
    activeStore.set(record.id);
  }, [records]);

  /**
   * Start the next service pre-filled with the shims this one ended up
   * fitting — next time round those *are* the shims in the engine, so it
   * saves re-typing eight numbers you already know.
   */
  const duplicateAsNew = useCallback(
    (id: string) => {
      const source = records.find((r) => r.id === id);
      const record = newRecord(source?.engineId ?? DEFAULT_ENGINE_ID);
      if (source) {
        const engine = getEngine(source.engineId);
        for (const position of engine.positions) {
          const reading = source.readings[position.id];
          const fitted = reading?.chosenShim ?? reading?.shim;
          if (fitted !== undefined) record.readings[position.id] = { shim: fitted };
        }
        record.odometer = source.odometer;
        record.model = source.model;
      }
      recordsStore.set([record, ...records]);
      activeStore.set(record.id);
    },
    [records],
  );

  const remove = useCallback(
    (id: string) => {
      const next = deleteRecord(records, id);
      recordsStore.set(next);
      if (id === activeId) {
        activeStore.set(next.length ? sortRecords(next)[0].id : DRAFT_ID);
      }
    },
    [records, activeId],
  );

  const importJson = useCallback(
    (raw: string): ImportResult => {
      const result = mergeImport(records, raw);
      if (result.ok) recordsStore.set(result.records);
      return result;
    },
    [records],
  );

  const setAim = useCallback(
    (type: ValveType, value: Aim) => {
      aimStore.set({ ...aim, [type]: value });
    },
    [aim],
  );

  const value: RecordsContext = {
    ready,
    engine: getEngine(active.engineId),
    records,
    active,
    aim,
    setAim,
    setActiveId: activeStore.set,
    updateActive,
    startNew,
    duplicateAsNew,
    remove,
    importJson,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
