"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatOdometer } from "@/lib/format";
import { sheetStatus } from "@/lib/report";
import { downloadFile, sortRecords } from "@/lib/storage";
import { AccountCard } from "./AccountCard";
import { BikeTabs } from "./BikeTabs";
import { ContributionCard } from "./ContributionCard";
import { LegacyImport } from "./LegacyImport";
import { useT } from "./LocaleProvider";
import { useRecords } from "./RecordsProvider";
import { AverageDrift, TrendChart } from "./TrendChart";
import { Button, Card, Chip, PageHeader } from "./ui";
import { VinGate } from "./VinGate";

export function History() {
  const t = useT();
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

  if (!ready) return <p className="p-4 text-sm text-faint">{t("common.loading")}</p>;

  const sorted = sortRecords(records);

  const handleImport = async (file: File) => {
    const result = importJson(await file.text());
    setMessage(
      result.ok
        ? t("history.imported", { added: result.added, merged: result.merged })
        : result.error,
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <PageHeader
        title={t("history.heading")}
        subtitle={
          bikes.length > 1
            ? t("history.forBike", {
                name: bike.name.trim() || t("history.thisBike"),
              })
            : t("history.allServices")
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
      <h2 className="mb-2 text-sm font-bold">{t("history.driftHeading")}</h2>
      <AverageDrift engine={engine} records={records} />

      <h2 className="mt-6 mb-2 text-sm font-bold">
        {t("history.perValveHeading")}
      </h2>
      <TrendChart engine={engine} records={records} />

      <h2 className="mt-6 mb-2 text-sm font-bold">
        {t("history.servicesHeading")}
      </h2>
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
                    {isActive && <Chip tone="warn">{t("history.open")}</Chip>}
                    {record.source === "import" && (
                      <Chip tone="neutral">{t("history.importedChip")}</Chip>
                    )}
                  </div>
                  {record.title && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {record.title}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Chip tone={status.measured === status.total ? "ok" : "neutral"}>
                      {t("sheet.measured", {
                        measured: status.measured,
                        total: status.total,
                      })}
                    </Chip>
                    {status.outOfSpec > 0 && (
                      <Chip tone="bad">
                        {t("sheet.outOfSpec", { count: status.outOfSpec })}
                      </Chip>
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
                    {t("history.nextService")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="!px-2 !py-1 !text-[11px] !text-bad"
                    onClick={() => {
                      if (
                        confirm(
                          t("history.deleteConfirm", {
                            odometer: formatOdometer(
                              record.odometer,
                              bike.units,
                            ),
                          }),
                        )
                      ) {
                        remove(record.id);
                      }
                    }}
                  >
                    {t("history.delete")}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      </VinGate>

      <h2 className="mt-6 mb-2 text-sm font-bold">
        {t("history.accountHeading")}
      </h2>
      <div className="space-y-2">
        <AccountCard />
        <ContributionCard />
      </div>

      {/*
        Outside the frame-number gate, alongside backup and for the same
        reason: a rider's own records are theirs whether or not the app can yet
        tell which motorcycle they belong to. What waits on the VIN is reading
        the history back, not getting it in.
      */}
      <LegacyImport />

      <h2 className="mt-6 mb-2 text-sm font-bold">
        {t("history.backupHeading")}
      </h2>
      <p className="mb-2 text-xs leading-relaxed text-faint">
        {t("history.backupBody")}
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
          {t("history.exportAll")}
        </Button>
        <Button variant="ghost" onClick={() => fileInput.current?.click()}>
          {t("history.importBackup")}
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
