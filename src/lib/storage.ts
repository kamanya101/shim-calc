"use client";

import { todayIso } from "./format";
import type { ServiceRecord } from "./types";

/**
 * Everything lives in localStorage. There is no server and no account: the
 * point of this tool is that it works on a phone in a garage with no signal,
 * and that your clearance history is yours. Backup is by export, exactly the
 * way the original was backed up by keeping the .xls files.
 */
export const RECORDS_KEY = "shim-calc/records/v1";
export const ACTIVE_KEY = "shim-calc/active/v1";
export const AIM_KEY = "shim-calc/aim/v1";

const EXPORT_VERSION = 1;

export type ExportBundle = {
  format: "shim-calc";
  version: number;
  exportedAt: string;
  records: ServiceRecord[];
};

export function newRecord(engineId: string, id = crypto.randomUUID()): ServiceRecord {
  const now = new Date().toISOString();
  return {
    id,
    engineId,
    date: todayIso(),
    readings: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertRecord(
  records: ServiceRecord[],
  record: ServiceRecord,
): ServiceRecord[] {
  const stamped = { ...record, updatedAt: new Date().toISOString() };
  const index = records.findIndex((r) => r.id === record.id);
  if (index === -1) return [stamped, ...records];
  const next = [...records];
  next[index] = stamped;
  return next;
}

export function deleteRecord(
  records: ServiceRecord[],
  id: string,
): ServiceRecord[] {
  return records.filter((r) => r.id !== id);
}

/** Newest first, by odometer where present, otherwise by date. */
export function sortRecords(records: ServiceRecord[]): ServiceRecord[] {
  return [...records].sort((a, b) => {
    if (a.odometer !== undefined && b.odometer !== undefined) {
      return b.odometer - a.odometer;
    }
    return b.date.localeCompare(a.date);
  });
}

export function buildExport(records: ServiceRecord[]): ExportBundle {
  return {
    format: "shim-calc",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    records,
  };
}

export type ImportResult =
  | { ok: true; records: ServiceRecord[]; added: number; merged: number }
  | { ok: false; error: string };

/**
 * Merge an exported bundle into the current store. Records are matched on id;
 * the one with the later updatedAt wins, so importing an older backup never
 * silently destroys newer work.
 */
export function mergeImport(
  current: ServiceRecord[],
  raw: string,
): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  const bundle = parsed as Partial<ExportBundle>;
  if (bundle?.format !== "shim-calc" || !Array.isArray(bundle.records)) {
    return { ok: false, error: "That isn't a shim calculator export file." };
  }

  const byId = new Map(current.map((r) => [r.id, r]));
  let added = 0;
  let merged = 0;

  for (const incoming of bundle.records) {
    if (!incoming?.id) continue;
    const existing = byId.get(incoming.id);
    if (!existing) {
      byId.set(incoming.id, incoming);
      added += 1;
    } else if (incoming.updatedAt > existing.updatedAt) {
      byId.set(incoming.id, incoming);
      merged += 1;
    }
  }

  return { ok: true, records: [...byId.values()], added, merged };
}

export function downloadFile(
  filename: string,
  contents: string,
  mimeType: string,
): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
