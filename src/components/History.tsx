"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatOdometer } from "@/lib/format";
import { sheetStatus } from "@/lib/report";
import { downloadFile, sortRecords } from "@/lib/storage";
import { AccountCard } from "./AccountCard";
import { BikeTabs } from "./BikeTabs";
import { ContributionCard } from "./ContributionCard";
import { useRecords } from "./RecordsProvider";
import { AverageDrift, TrendChart } from "./TrendChart";
import { Button, Card, Chip, PageHeader } from "./ui";
import { VinGate } from "./VinGate";

export function History() {
  const router = useRouter();
  const {
    ready,
    engine,
    bike,
    bikes,
    records,
    active,
    aim,
    setActiveId,
    remove,
    duplicateAsNew,
    importJson,
    exportBundle,
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
        subtitle={
          bikes.length > 1
            ? `Services for ${bike.name}`
            : "Every service you've saved on this device"
        }
      />

      <BikeTabs />

      {/*
        The charts and the archive wait on the frame number; the account and
        backup sections below do not. Somebody who cannot yet read their
        history must still be able to reach their account and take a copy of
        their own data.
      */}
      <VinGate bike={bike} services={records.length} opens="history">

      {/*
        Charts first. The trend is what you come to this page to read; the list
        of services is the archive you dig into afterwards, and on a phone it
        was pushing the graphs below the fold entirely.
      */}
      <h2 className="mb-2 text-sm font-bold">Shim thickness over time</h2>
      <AverageDrift engine={engine} records={records} />

      <h2 className="mt-6 mb-2 text-sm font-bold">Shim thickness, valve by valve</h2>
      <TrendChart engine={engine} records={records} />

      <h2 className="mt-6 mb-2 text-sm font-bold">Services</h2>
      <div className="space-y-2">
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
                      {formatOdometer(record.odometer, bike.units)}
                    </span>
                    <span className="text-xs text-faint">
                      {formatDate(record.date)}
                    </span>
                    {isActive && <Chip tone="warn">open</Chip>}
                  </div>
                  {record.title && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {record.title}
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
                          `Delete the service at ${formatOdometer(record.odometer, bike.units)}? This can't be undone.`,
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

      </VinGate>

      <h2 className="mt-6 mb-2 text-sm font-bold">Account</h2>
      <div className="space-y-2">
        <AccountCard />
        <ContributionCard />
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold">Backup</h2>
      <p className="mb-2 text-xs leading-relaxed text-faint">
        Your services are on this device and on the server under your account.
        An export is the copy that depends on neither — keep one somewhere safe.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            downloadFile(
              `shim-calc-backup-${new Date().toISOString().slice(0, 10)}.json`,
              JSON.stringify(exportBundle(), null, 2),
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
