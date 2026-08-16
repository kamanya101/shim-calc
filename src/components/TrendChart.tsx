"use client";

import { useMemo, useState } from "react";
import { inSpec } from "@/lib/calc";
import { formatDate, mm } from "@/lib/format";
import type { ClearanceRange, EngineSpec, ServiceRecord } from "@/lib/types";
import { Card, EmptyState } from "./ui";

/**
 * One small panel per valve rather than eight series on a single axis.
 *
 * Eight lines sharing one set of axes is unreadable and forces eight hues that
 * no colourblind-safe palette can separate. Small multiples need exactly one
 * data colour, and the shaded tolerance band does the work of saying whether a
 * point is good — position against the band, not hue. Out-of-spec points are
 * additionally drawn as diamonds, so the status never rests on colour alone.
 */

const DATA = "#ff9a4d";
const W = 260;
const H = 84;
const PAD = { top: 10, right: 10, bottom: 16, left: 34 };

type Point = {
  x: number;
  clearance: number;
  label: string;
  inSpec: boolean;
};

export function TrendChart({
  engine,
  records,
}: {
  engine: EngineSpec;
  records: ServiceRecord[];
}) {
  const [showTable, setShowTable] = useState(false);

  // Oldest first, so the line reads left to right through time.
  const ordered = useMemo(
    () =>
      [...records].sort((a, b) => {
        if (a.odometer !== undefined && b.odometer !== undefined) {
          return a.odometer - b.odometer;
        }
        return a.date.localeCompare(b.date);
      }),
    [records],
  );

  const series = useMemo(() => {
    return engine.positions.map((position) => {
      const range = engine.clearance[position.type];
      const points: Point[] = [];
      ordered.forEach((record, index) => {
        const clearance = record.readings[position.id]?.clearance;
        if (clearance === undefined) return;
        points.push({
          // Use odometer where every record has one; otherwise fall back to
          // service order so the chart still works for undated records.
          x: record.odometer ?? index,
          clearance,
          label: record.odometer
            ? record.odometer.toLocaleString()
            : formatDate(record.date),
          inSpec: inSpec(range, clearance),
        });
      });
      return { position, range, points };
    });
  }, [engine, ordered]);

  const anyData = series.some((s) => s.points.length >= 2);

  if (!anyData) {
    return (
      <EmptyState title="Not enough history yet">
        Save at least two services with clearances measured and this will chart
        how each valve is drifting.
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-faint">
          Measured clearance over time. The shaded band is the tolerance;
          diamonds fell outside it.
        </p>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="shrink-0 text-[11px] font-semibold text-accent underline underline-offset-2"
        >
          {showTable ? "show charts" : "show table"}
        </button>
      </div>

      {showTable ? (
        <DataTable engine={engine} records={ordered} />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {series.map(({ position, range, points }) => (
            <Card key={position.id} className="p-2.5">
              <h4 className="mb-1 text-xs font-semibold">{position.label}</h4>
              <Panel points={points} range={range} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({
  points,
  range,
}: {
  points: Point[];
  range: ClearanceRange;
}) {
  if (points.length === 0) {
    return <p className="py-4 text-center text-[11px] text-faint">no readings</p>;
  }

  const values = points.map((p) => p.clearance);
  // Always show the whole tolerance band plus a little air, so panels for the
  // same valve type share a comparable scale.
  const lo = Math.min(range.min, ...values);
  const hi = Math.max(range.max, ...values);
  const padY = Math.max(10, (hi - lo) * 0.15);
  const yMin = lo - padY;
  const yMax = hi + padY;

  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const sx = (x: number) =>
    PAD.left + (xMax === xMin ? plotW / 2 : ((x - xMin) / (xMax - xMin)) * plotW);
  const sy = (y: number) =>
    PAD.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.clearance).toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Clearance from ${mm(points[0].clearance)} to ${mm(last.clearance)} mm; tolerance ${mm(range.min)} to ${mm(range.max)} mm`}
    >
      {/* Tolerance band — the reference region every point is judged against. */}
      <rect
        x={PAD.left}
        y={sy(range.max)}
        width={plotW}
        height={Math.max(1, sy(range.min) - sy(range.max))}
        fill="#98a0aa"
        opacity={0.14}
      />
      <line
        x1={PAD.left}
        x2={PAD.left + plotW}
        y1={sy(range.max)}
        y2={sy(range.max)}
        stroke="#98a0aa"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.5}
      />
      <line
        x1={PAD.left}
        x2={PAD.left + plotW}
        y1={sy(range.min)}
        y2={sy(range.min)}
        stroke="#98a0aa"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.5}
      />

      <text x={2} y={sy(range.max) + 3} fontSize={8} fill="#6b727c">
        {mm(range.max)}
      </text>
      <text x={2} y={sy(range.min) + 3} fontSize={8} fill="#6b727c">
        {mm(range.min)}
      </text>

      {points.length > 1 && (
        <path d={path} fill="none" stroke={DATA} strokeWidth={2} strokeLinejoin="round" />
      )}

      {points.map((p, i) => {
        const cx = sx(p.x);
        const cy = sy(p.clearance);
        return (
          <g key={i}>
            {p.inSpec ? (
              <circle cx={cx} cy={cy} r={4} fill={DATA} stroke="#16181c" strokeWidth={2} />
            ) : (
              // Diamond: shape carries the status so it survives colourblindness,
              // greyscale printing and forced-colors mode.
              <rect
                x={cx - 4.5}
                y={cy - 4.5}
                width={9}
                height={9}
                transform={`rotate(45 ${cx} ${cy})`}
                fill={DATA}
                stroke="#16181c"
                strokeWidth={2}
              />
            )}
            <title>
              {`${p.label}: ${mm(p.clearance)} mm${p.inSpec ? "" : " — out of spec"}`}
            </title>
          </g>
        );
      })}

      {/* Direct-label the newest reading only, never every point. */}
      <text
        x={Math.min(sx(last.x) + 7, W - 2)}
        y={sy(last.clearance) - 6}
        fontSize={9}
        fontWeight={700}
        fill="#e9ebee"
        textAnchor={sx(last.x) > W - 46 ? "end" : "start"}
      >
        {mm(last.clearance)}
      </text>

      <text x={PAD.left} y={H - 3} fontSize={8} fill="#6b727c">
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text x={PAD.left + plotW} y={H - 3} fontSize={8} fill="#6b727c" textAnchor="end">
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
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[34rem] text-left text-xs">
        <caption className="sr-only">
          Measured valve clearance in millimetres for each service
        </caption>
        <thead>
          <tr className="border-b border-line bg-raised/50">
            <th scope="col" className="px-2.5 py-2 font-semibold">
              Valve
            </th>
            {records.map((record) => (
              <th
                key={record.id}
                scope="col"
                className="px-2.5 py-2 text-right font-semibold whitespace-nowrap"
              >
                {record.odometer
                  ? record.odometer.toLocaleString()
                  : formatDate(record.date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {engine.positions.map((position) => {
            const range = engine.clearance[position.type];
            return (
              <tr key={position.id}>
                <th scope="row" className="px-2.5 py-1.5 font-medium text-muted">
                  {position.label}
                </th>
                {records.map((record) => {
                  const value = record.readings[position.id]?.clearance;
                  const ok = value !== undefined && inSpec(range, value);
                  return (
                    <td
                      key={record.id}
                      className="px-2.5 py-1.5 text-right font-mono tabular-nums"
                    >
                      {value === undefined ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <span className={ok ? "" : "font-bold"}>
                          {mm(value)}
                          {!ok && <span className="ml-1 text-bad">!</span>}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
