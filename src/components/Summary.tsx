"use client";

import { formatDate, formatOdometer, mm, signedMm } from "@/lib/format";
import { modelLabel } from "@/lib/models";
import { buildSummary, recordToCsv, suggestFilename, type SummaryRow } from "@/lib/report";
import { downloadFile } from "@/lib/storage";
import { useT } from "./LocaleProvider";
import { useRecords } from "./RecordsProvider";
import { Button, Card, Chip, PageHeader } from "./ui";

/**
 * The service record as you'd want to read it back in three years: what was in
 * the engine when you opened it, and what was in it when you closed it.
 */
export function Summary() {
  const t = useT();
  const { ready, engine, bike, active, aim } = useRecords();

  if (!ready) return <p className="p-4 text-sm text-faint">{t("common.loading")}</p>;

  const rows = buildSummary(engine, active, aim);
  const anyFound = rows.some((r) => r.measured);
  const anyConfirmed = rows.some((r) => r.confirmedClearance !== undefined);
  const drifted = rows.filter(
    (r) => r.confirmedDelta !== undefined && r.confirmedDelta !== 0,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <PageHeader
        title={t("summary.heading")}
        subtitle={[
          modelLabel(bike.modelId, bike.year)
            ? `${bike.name} · ${modelLabel(bike.modelId, bike.year)}`
            : bike.name,
          formatDate(active.date),
          active.odometer !== undefined
            ? formatOdometer(active.odometer, bike.units)
            : null,
          active.title,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      {!anyFound ? (
        <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
          {t("summary.empty")}
        </p>
      ) : (
        <>
          <Section
            title={t("summary.foundHeading")}
            caption={t("summary.foundCaption")}
          >
            <Table
              head={[
                t("summary.colValve"),
                t("summary.colShim"),
                t("summary.colGap"),
                "",
              ]}
              rows={rows.map((row) => ({
                key: row.position.id,
                cells: [
                  t(`valve.${row.position.id}`),
                  mm(row.foundShim),
                  mm(row.foundClearance),
                ],
                chip:
                  row.foundInSpec === undefined ? null : row.foundInSpec ? (
                    <Chip tone="ok">{t("valve.inSpec")}</Chip>
                  ) : (
                    <Chip tone="bad">
                      {t(
                        row.foundClearance! < row.range.min
                          ? "summary.tight"
                          : "summary.loose",
                      )}
                    </Chip>
                  ),
              }))}
            />
          </Section>

          <Section
            title={t("summary.setHeading")}
            caption={
              anyConfirmed
                ? t("summary.setCaptionConfirmed")
                : t("summary.setCaptionPredicted")
            }
          >
            <Table
              head={[
                t("summary.colValve"),
                t("summary.colShim"),
                anyConfirmed ? t("summary.colGap") : t("summary.colPredicted"),
                "",
              ]}
              rows={rows.map((row) => ({
                key: row.position.id,
                cells: [
                  t(`valve.${row.position.id}`),
                  row.leftAlone
                    ? "—"
                    : mm(row.setShim) + (row.noChange ? " ↺" : ""),
                  row.leftAlone
                    ? mm(row.foundClearance)
                    : row.confirmedClearance !== undefined
                      ? mm(row.confirmedClearance)
                      : row.predictedClearance !== undefined
                        ? `(${mm(row.predictedClearance)})`
                        : "—",
                ],
                chip: row.leftAlone ? (
                  <Chip tone="ok">{t("summary.leftAlone")}</Chip>
                ) : row.confirmedClearance !== undefined ? (
                  row.confirmedInSpec ? (
                    <Chip tone="ok">{t("summary.confirmed")}</Chip>
                  ) : (
                    <Chip tone="bad">{t("valve.outOfSpec")}</Chip>
                  )
                ) : row.predictedClearance !== undefined ? (
                  <Chip tone="neutral">{t("summary.predicted")}</Chip>
                ) : null,
              }))}
            />
            <p className="mt-2 text-[11px] text-faint">
              {t("summary.legend")}
            </p>
          </Section>

          {drifted.length > 0 && (
            <Card className="mt-5 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
                {t("summary.driftHeading")}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-faint">
                {t("summary.driftBody")}
              </p>
              <ul className="mt-2 space-y-1">
                {drifted.map((row) => (
                  <li
                    key={row.position.id}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span className="text-muted">
                      {t(`valve.${row.position.id}`)}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {signedMm(row.confirmedDelta)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="no-print mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() =>
                downloadFile(
                  suggestFilename(engine, active, "csv"),
                  recordToCsv(engine, active, aim),
                  "text/csv;charset=utf-8",
                )
              }
            >
              {t("order.exportCsv")}
            </Button>
            <Button variant="ghost" onClick={() => window.print()}>
              {t("order.print")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="text-sm font-bold">{title}</h2>
      <p className="mb-2 text-xs text-faint">{caption}</p>
      {children}
    </section>
  );
}

type TableRow = {
  key: string;
  cells: string[];
  chip: React.ReactNode;
};

function Table({ head, rows }: { head: string[]; rows: TableRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-line bg-raised/50">
            {head.map((label, i) => (
              <th
                key={label + i}
                scope="col"
                className={`px-2.5 py-2 font-semibold ${i > 0 && i < 3 ? "text-right" : ""}`}
              >
                {label}
                {i > 0 && i < 3 && (
                  // Explicit space, not just a margin — otherwise this copies
                  // and reads aloud as "Shimmm".
                  <> <span className="font-normal text-faint">mm</span></>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="px-2.5 py-1.5 font-medium text-muted">
                {row.cells[0]}
              </th>
              <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                {row.cells[1]}
              </td>
              <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                {row.cells[2]}
              </td>
              <td className="px-2.5 py-1.5">{row.chip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { SummaryRow };
