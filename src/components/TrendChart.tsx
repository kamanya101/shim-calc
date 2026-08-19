"use client";

import { useMemo, useState } from "react";
import { formatDate, formatNumber, mm, signedMm } from "@/lib/format";
import type {
  EngineSpec,
  Microns,
  ServiceRecord,
  ValvePosition,
  ValveType,
} from "@/lib/types";
import { useT } from "./LocaleProvider";
import { Card, EmptyState } from "./ui";

/**
 * Every chart here plots shim thickness — the size of the metal disc — and not
 * the gap it leaves.
 *
 * Thickness is the absolute measure. A gap is reset at every service, so it saws
 * up and down and can never add up to anything; the shim only moves when you
 * change one, and it never moves back. So these read as staircases, and the drop
 * from one end to the other is how far the valves have sunk into their seats — a
 * total no single service sheet can give you.
 *
 * There is deliberately no shaded tolerance band. Tolerances describe the gap;
 * there is no such thing as an out-of-spec shim thickness, and shading a band
 * would be inventing a rule that does not exist. Whether a service was in spec
 * is on the Sheet and the Summary, where the gaps live.
 *
 * One panel per valve rather than eight lines on one axis: eight lines would
 * force eight hues that no colourblind-safe palette can separate. Small
 * multiples need exactly one colour, so that is all this uses.
 */

const DATA = "#ff9a4d";
const W = 260;
const PAD = { top: 10, right: 10, bottom: 16, left: 34 };

type ShimPoint = {
  x: number;
  y: Microns;
  /** The shim that came out, or the one that went in. */
  kind: "found" | "set";
  label: string;
  valves: number;
};

/** Oldest first, so every chart reads left to right through time. */
function orderRecords(records: ServiceRecord[]): ServiceRecord[] {
  return [...records].sort((a, b) => {
    if (a.odometer !== undefined && b.odometer !== undefined) {
      return a.odometer - b.odometer;
    }
    return a.date.localeCompare(b.date);
  });
}

function mean(values: Microns[]): Microns {
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Shim thickness across the given valves, two points per service: the shim that
 * came out, then the one that went in. Pass one valve for its own chart, or all
 * four of a type for the average.
 */
function buildShimSteps(
  records: ServiceRecord[],
  positions: ValvePosition[],
): ShimPoint[] {
  const points: ShimPoint[] = [];

  orderRecords(records).forEach((record, index) => {
    const found: Microns[] = [];
    const set: Microns[] = [];

    for (const position of positions) {
      const reading = record.readings[position.id];
      // Thickness only, and only where it is known. Under the gap-first
      // workflow a valve that passed may never have had its shim pulled or
      // measured, and there is nothing to plot for it.
      if (reading?.shim === undefined) continue;
      found.push(reading.shim);
      set.push(reading.chosenShim ?? reading.shim);
    }

    /*
     * Every valve asked for, or none. Averaging three shims one service and
     * four the next would move the line for a reason that has nothing to do
     * with wear — and it would look exactly like wear.
     */
    if (found.length !== positions.length) return;

    const x = record.odometer ?? index;
    // Through formatNumber rather than toLocaleString, which takes no locale
    // and so follows the browser instead of the app — an Afrikaans rider was
    // getting "66,666" on these axes while the rest of the app said "66 666".
    const label = record.odometer
      ? formatNumber(record.odometer)
      : formatDate(record.date);

    points.push({ x, y: mean(found), kind: "found", label, valves: found.length });
    points.push({ x, y: mean(set), kind: "set", label, valves: set.length });
  });

  return points;
}

/** How much thinner (or thicker) the shims are now than when the record starts. */
function overallChange(points: ShimPoint[]): Microns | undefined {
  if (points.length < 2) return undefined;
  const change = points[points.length - 1].y - points[0].y;
  return change === 0 ? undefined : change;
}

export function AverageDrift({
  engine,
  records,
}: {
  engine: EngineSpec;
  records: ServiceRecord[];
}) {
  const t = useT();
  const series = useMemo(
    () =>
      (["intake", "exhaust"] as ValveType[]).map((type) => {
        const positions = engine.positions.filter((p) => p.type === type);
        // Counted off the engine rather than written as "4", so the heading
        // cannot end up promising an average over more valves than the spec
        // actually has.
        return { type, count: positions.length, points: buildShimSteps(records, positions) };
      }),
    [engine, records],
  );

  // Returning nothing left the heading above stranded over blank space, which
  // reads as a broken chart rather than an empty one.
  if (series.every((s) => s.points.length === 0)) {
    return (
      <EmptyState title={t("trend.emptyTitle")}>
        {t("trend.emptyAverage")}
      </EmptyState>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs leading-relaxed text-faint">
        {t("trend.averageCaption")}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {series.map(({ type, count, points }) => (
          <Card key={type} className="p-2.5">
            {/*
              A whole heading per valve type rather than the type dropped into
              a shared sentence. German runs the two words together as one
              compound — Einlassventile — so there is no slot to drop it into,
              and the old CSS capitalize on the injected word did not survive
              translation either.
            */}
            <h4 className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold">
              <span>
                {t(
                  type === "intake"
                    ? "trend.averageIntake"
                    : "trend.averageExhaust",
                  { count },
                )}
              </span>
              {overallChange(points) !== undefined && (
                <span className="shrink-0 font-mono font-normal text-faint">
                  {t("trend.overall", {
                    delta: signedMm(overallChange(points)),
                  })}
                </span>
              )}
            </h4>
            {points.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-faint">
                {t("trend.noneAverage")}
              </p>
            ) : (
              <ShimPanel
                points={points}
                label={t(
                  type === "intake"
                    ? "trend.allIntakeValves"
                    : "trend.allExhaustValves",
                  { count },
                )}
                height={104}
              />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({
  engine,
  records,
}: {
  engine: EngineSpec;
  records: ServiceRecord[];
}) {
  const t = useT();
  const [showTable, setShowTable] = useState(false);

  const ordered = useMemo(() => orderRecords(records), [records]);

  const series = useMemo(
    () =>
      engine.positions.map((position) => ({
        position,
        points: buildShimSteps(records, [position]),
      })),
    [engine, records],
  );

  if (series.every((s) => s.points.length === 0)) {
    return (
      <EmptyState title={t("trend.emptyTitle")}>
        {t("trend.emptyPerValve")}
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-faint">{t("trend.perValveCaption")}</p>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="shrink-0 text-[11px] font-semibold text-accent underline underline-offset-2"
        >
          {showTable ? t("trend.showCharts") : t("trend.showTable")}
        </button>
      </div>

      {showTable ? (
        <DataTable engine={engine} records={ordered} />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {series.map(({ position, points }) => (
            <Card key={position.id} className="p-2.5">
              <h4 className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold">
                <span>{t(`valve.${position.id}`)}</span>
                {overallChange(points) !== undefined && (
                  <span className="font-mono font-normal text-faint">
                    {signedMm(overallChange(points))} mm
                  </span>
                )}
              </h4>
              {points.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-faint">
                  {t("trend.nonePerValve")}
                </p>
              ) : (
                <ShimPanel
                  points={points}
                  label={t(`valve.${position.id}`)}
                  height={84}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ShimPanel({
  points,
  label,
  height,
}: {
  points: ShimPoint[];
  label: string;
  height: number;
}) {
  const t = useT();
  const values = points.map((p) => p.y);
  // Scaled to the shims themselves. There is no band to keep in frame, and the
  // whole point is to see a change of a few hundredths, so a scale wide enough
  // for every engine would flatten every one of them to a straight line.
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const padY = Math.max(25, (hi - lo) * 0.25);
  const yMin = lo - padY;
  const yMax = hi + padY;

  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);

  const plotW = W - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const sx = (x: number) =>
    PAD.left + (xMax === xMin ? plotW / 2 : ((x - xMin) / (xMax - xMin)) * plotW);
  const sy = (y: number) =>
    PAD.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="w-full"
      role="img"
      // Two points per service — one shim out, one in — so the count of
      // services is half the count of points.
      aria-label={t("trend.panelLabel", {
        label,
        count: points.length / 2,
        from: mm(points[0].y),
        to: mm(last.y),
      })}
    >
      {/* Thickest and thinnest actually recorded, so the axis states the real
          range rather than a tolerance that does not apply to a shim. */}
      {[hi, lo].map((edge) => (
        <line
          key={edge}
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={sy(edge)}
          y2={sy(edge)}
          stroke="#98a0aa"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.35}
        />
      ))}
      <text x={2} y={sy(hi) + 3} fontSize={8} fill="#6b727c">
        {mm(hi)}
      </text>
      {hi !== lo && (
        <text x={2} y={sy(lo) + 3} fontSize={8} fill="#6b727c">
          {mm(lo)}
        </text>
      )}

      <path d={path} fill="none" stroke={DATA} strokeWidth={2} strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={i}>
          {p.kind === "found" ? (
            <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill={DATA} stroke="#16181c" strokeWidth={2} />
          ) : (
            // Hollow for the shim that went in — shape, not colour, separates
            // the two, so it survives colourblindness and a greyscale printout.
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={3.6}
              fill="#16181c"
              stroke={DATA}
              strokeWidth={2}
            />
          )}
          {/*
            Four whole sentences rather than one assembled from "that came
            out" / "that went in" and an optional "(mean of n)" tail. Which of
            the four it is changes the shape of the sentence, not just a word
            in the middle of it.
          */}
          <title>
            {t(
              p.valves > 1
                ? p.kind === "found"
                  ? "trend.pointFoundMean"
                  : "trend.pointSetMean"
                : p.kind === "found"
                  ? "trend.pointFound"
                  : "trend.pointSet",
              { label: p.label, size: mm(p.y), count: p.valves },
            )}
          </title>
        </g>
      ))}

      {/* Direct-label the newest reading only, never every point. */}
      <text
        x={Math.min(sx(last.x) + 7, W - 2)}
        y={sy(last.y) - 6}
        fontSize={9}
        fontWeight={700}
        fill="#e9ebee"
        textAnchor={sx(last.x) > W - 46 ? "end" : "start"}
      >
        {mm(last.y)}
      </text>

      <text x={PAD.left} y={height - 3} fontSize={8} fill="#6b727c">
        {points[0].label}
      </text>
      {xMax !== xMin && (
        <text
          x={PAD.left + plotW}
          y={height - 3}
          fontSize={8}
          fill="#6b727c"
          textAnchor="end"
        >
          {last.label}
        </text>
      )}
    </svg>
  );
}

function DataTable({
  engine,
  records,
}: {
  engine: EngineSpec;
  records: ServiceRecord[];
}) {
  const t = useT();

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[34rem] text-left text-xs">
        <caption className="sr-only">{t("trend.tableCaption")}</caption>
        <thead>
          <tr className="border-b border-line bg-raised/50">
            <th scope="col" className="px-2.5 py-2 font-semibold">
              {t("summary.colValve")}
            </th>
            {records.map((record) => (
              <th
                key={record.id}
                scope="col"
                className="px-2.5 py-2 text-right font-semibold whitespace-nowrap"
              >
                {record.odometer
                  ? formatNumber(record.odometer)
                  : formatDate(record.date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {engine.positions.map((position) => (
            <tr key={position.id}>
              <th scope="row" className="px-2.5 py-1.5 font-medium text-muted">
                {t(`valve.${position.id}`)}
              </th>
              {records.map((record) => {
                const shim = record.readings[position.id]?.shim;
                return (
                  <td
                    key={record.id}
                    className="px-2.5 py-1.5 text-right font-mono tabular-nums"
                  >
                    {shim === undefined ? (
                      <span className="text-faint">—</span>
                    ) : (
                      mm(shim)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
