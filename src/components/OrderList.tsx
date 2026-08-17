"use client";

import { formatDate, formatOdometer, mm } from "@/lib/format";
import { modelLabel } from "@/lib/models";
import { buildShoppingList, recordToCsv, suggestFilename } from "@/lib/report";
import { downloadFile } from "@/lib/storage";
import { useRecords } from "./RecordsProvider";
import { Button, Card, EmptyState, PageHeader } from "./ui";

export function OrderList() {
  const { ready, engine, bike, active, aim, exportBundle } = useRecords();

  if (!ready) {
    return <p className="p-4 text-sm text-faint">Loading…</p>;
  }

  const lines = buildShoppingList(engine, active, aim);
  const totalShims = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <PageHeader
        title="Shims to order"
        subtitle={[
          modelLabel(bike.modelId, bike.year)
            ? `${bike.name} · ${modelLabel(bike.modelId, bike.year)}`
            : bike.name,
          formatDate(active.date),
          formatOdometer(active.odometer),
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      {lines.length === 0 ? (
        <EmptyState title="Nothing to order">
          Either no valves are measured yet, or every valve already has the
          right shim in it.
        </EmptyState>
      ) : (
        <>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {lines.map((line) => (
                <li key={line.um} className="p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-lg font-bold tabular-nums">
                      {mm(line.um)}
                      <span className="ml-1 text-xs font-medium text-faint">
                        mm
                      </span>
                    </span>
                    <span className="rounded-md bg-accent/15 px-2 py-0.5 text-sm font-bold text-accent">
                      ×{line.quantity}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted">
                    {line.valves.join(", ")}
                  </p>

                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {line.parts.map((part) => (
                      <div key={part.brand} className="flex gap-1.5">
                        <dt className="text-faint">{part.brand}</dt>
                        <dd
                          className={
                            part.part
                              ? "font-mono font-semibold text-ink"
                              : "italic text-faint"
                          }
                        >
                          {part.part ?? "no size made"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </Card>

          <p className="mt-3 text-sm text-muted">
            {totalShims} shim{totalShims === 1 ? "" : "s"} in{" "}
            {lines.length} size{lines.length === 1 ? "" : "s"}.
          </p>
        </>
      )}

      <div className="no-print mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() =>
            downloadFile(
              suggestFilename(engine, active, "csv"),
              recordToCsv(engine, active, aim, bike),
              "text/csv;charset=utf-8",
            )
          }
        >
          Export this service (CSV)
        </Button>
        <Button
          onClick={() =>
            downloadFile(
              `shim-calc-backup-${active.date}.json`,
              JSON.stringify(exportBundle(), null, 2),
              "application/json",
            )
          }
        >
          Back up everything (JSON)
        </Button>
        <Button variant="ghost" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <p className="no-print mt-3 text-[11px] leading-relaxed text-faint">
        KTM only make 0.05 mm steps from 2.30 mm up. Where a size shows no KTM
        number, the Harley-Davidson shim is the same part for this job — and
        usually cheaper.
      </p>
    </div>
  );
}
