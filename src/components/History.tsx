"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatOdometer } from "@/lib/format";
import { sheetStatus } from "@/lib/report";
import { buildExport, downloadFile, sortRecords } from "@/lib/storage";
import { useRecords } from "./RecordsProvider";
import { TrendChart } from "./TrendChart";
import { Button, Card, Chip, PageHeader } from "./ui";

export function History() {
  const router = useRouter();
  const {
    ready,
    engine,
    records,
    active,
    aim,
    setActiveId,
    remove,
    duplicateAsNew,
    importJson,
  } = useRecords();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!ready) return <p className="p-4 text-sm text-faint">Loading…</p>;

  const sorted = sortRecords(records);

  const handleImport = async (file: File) => {
    const result = importJson(await file.text());
    setMessage(
      result.ok
        ? `Imported — ${result.added} new, ${result.merged} updated.`
        : result.error,
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <PageHeader
        title="History"
        subtitle="Every service you've saved on this device"
      />

      <div className="mb-5 space-y-2">
        {sorted.map((record) => {
          const status = sheetStatus(engine, record, aim);
          const isActive = record.id === active.id;
          return (
            <Card
              key={record.id}
              className={isActive ? "ring-1 ring-accent" : ""}
            >
              <div className="flex items-start justify-between gap-2 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(record.id);
                    router.push("/");
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-semibold">
                      {formatOdometer(record.odometer)}
                    </span>
                    <span className="text-xs text-faint">
                      {formatDate(record.date)}
                    </span>
                    {isActive && <Chip tone="warn">open</Chip>}
                  </div>
                  {(record.model || record.title) && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[record.model, record.title].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Chip tone={status.measured === status.total ? "ok" : "neutral"}>
                      {status.measured}/{status.total} measured
                    </Chip>
                    {status.outOfSpec > 0 && (
                      <Chip tone="bad">{status.outOfSpec} out of spec</Chip>
                    )}
                  </div>
                </button>

                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button
                    variant="ghost"
                    className="!px-2 !py-1 !text-[11px]"
                    onClick={() => {
                      duplicateAsNew(record.id);
                      router.push("/");
                    }}
                  >
                    Next service
                  </Button>
                  <Button
                    variant="ghost"
                    className="!px-2 !py-1 !text-[11px] !text-bad"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete the service at ${formatOdometer(record.odometer)}? This can't be undone.`,
                        )
                      ) {
                        remove(record.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-2 text-sm font-bold">Wear over time</h2>
      <TrendChart engine={engine} records={records} />

      <h2 className="mt-6 mb-2 text-sm font-bold">Backup</h2>
      <p className="mb-2 text-xs leading-relaxed text-faint">
        Records live in this browser only — clearing site data or losing the
        phone loses them. Export now and again, and keep the file somewhere
        safe.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            downloadFile(
              `shim-calc-backup-${new Date().toISOString().slice(0, 10)}.json`,
              JSON.stringify(buildExport(records), null, 2),
              "application/json",
            )
          }
        >
          Export all
        </Button>
        <Button variant="ghost" onClick={() => fileInput.current?.click()}>
          Import backup
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImport(file);
            event.target.value = "";
          }}
        />
      </div>
      {message && <p className="mt-2 text-xs text-muted">{message}</p>}
    </div>
  );
}
