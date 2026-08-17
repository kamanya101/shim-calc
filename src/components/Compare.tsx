"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MODES,
  fetchPoolDistribution,
  riderShims,
  scopeOptions,
  type CompareMode,
  type OdoWindow,
  type PoolResult,
  type PoolScope,
  type PoolSide,
} from "@/lib/compare";
import { mm, unitLabel } from "@/lib/format";
import type { EngineSpec, Microns, ServiceRecord, ValveType } from "@/lib/types";
import { BikeTabs } from "./BikeTabs";
import { useRecords } from "./RecordsProvider";
import { Card, EmptyState, PageHeader } from "./ui";

/**
 * Where this bike sits among all the others.
 *
 * The picture is one horizontal scale of shim thickness with two things drawn
 * on it: the pool below, shaded by how many readings sit at each size, and this
 * bike above on the identical scale. Parallel is the whole point — a rider
 * should be able to drop a line straight down from their own shims into the
 * crowd and see where they land.
 *
 * A heat map rather than a plain bar because a range on its own lies by
 * omission. "2.4 to 2.9" sounds like the middle is 2.65, when the truth may be
 * that almost everything is bunched at 2.45 and a single outlier is holding the
 * top end open. Shading by count is what puts that back.
 */

const DATA = "#ff9a4d";
const W = 260;
const PAD = 8;
/** 25 microns, the real step between shims, so the scale never implies sizes
    that cannot be bought. */
const STEP = 25;

export function Compare() {
  const { ready, engine, bike, bikes, records } = useRecords();
  const [mode, setMode] = useState<CompareMode>("current-vs-range");
  const [scope, setScope] = useState<PoolScope>("model");
  const [loaded, setLoaded] = useState<{ key: string; result: PoolResult } | null>(
    null,
  );
  // Named for what it is rather than `window`, which would shadow the global.
  const [odoWindow, setOdoWindow] = useState<OdoWindow>({});

  const spec = MODES[mode];
  const scopes = useMemo(() => scopeOptions(bike), [bike]);

  /*
   * Switching to a bike with no model set leaves "Same model" selected but
   * unanswerable. Corrected while rendering rather than by writing the choice
   * back — a bike that has a model again should return to it, and an effect
   * that overwrote the state would have thrown that away.
   */
  const activeScope = useMemo(() => {
    const chosen = scopes.find((option) => option.scope === scope);
    return chosen?.available ? scope : "all";
  }, [scopes, scope]);

  // What the panels below would have to be showing to be up to date. Comparing
  // it against what actually arrived is what makes "loading" a derived fact
  // rather than a flag that has to be set and unset correctly at both ends.
  const requestKey = `${bike.id}:${activeScope}:${spec.latestOnly}:${odoWindow.min ?? ""}:${odoWindow.max ?? ""}`;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    // Typing "100000" into a mileage box is six keystrokes and would otherwise
    // be six round trips, five of them for windows the rider never meant.
    const timer = setTimeout(() => {
      fetchPoolDistribution(activeScope, bike, spec.latestOnly, odoWindow).then(
        (next) => {
          if (!cancelled) setLoaded({ key: requestKey, result: next });
        },
      );
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, bike, activeScope, spec.latestOnly, odoWindow, requestKey]);

  const result = loaded?.result ?? null;
  const loading = ready && loaded?.key !== requestKey;

  if (!ready) return <p className="p-4 text-sm text-faint">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <PageHeader
        title="Compare"
        subtitle={
          bikes.length > 1
            ? `${bike.name} against the shared pool`
            : "Your shims against everyone else's"
        }
      />

      <BikeTabs />

      <h2 className="mb-2 text-sm font-bold">What to compare</h2>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(Object.keys(MODES) as CompareMode[]).map((key) => (
          <Choice
            key={key}
            label={MODES[key].label}
            active={key === mode}
            onClick={() => setMode(key)}
          />
        ))}
      </div>
      <p className="mb-4 text-xs leading-relaxed text-faint">{spec.help}</p>

      <h2 className="mb-2 text-sm font-bold">Who to compare against</h2>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {scopes.map((option) => (
          <Choice
            key={option.scope}
            label={option.label}
            active={option.scope === activeScope}
            disabled={!option.available}
            title={
              option.available
                ? undefined
                : "This bike has no model or year set, so there is nothing to match on."
            }
            onClick={() => setScope(option.scope)}
          />
        ))}
      </div>

      {/*
        The pool holds kilometres and only kilometres. These two boxes are read
        and written in this bike's own unit, converted on the way to the query
        and never stored converted, so a rider in miles types miles, reads
        miles, and still lands on the same readings as everybody else.
      */}
      <h2 className="mb-2 text-sm font-bold">
        Mileage window ({unitLabel(bike.units)})
      </h2>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <OdoInput
          label="From"
          value={odoWindow.min}
          onChange={(min) => setOdoWindow((w) => ({ ...w, min }))}
        />
        <OdoInput
          label="To"
          value={odoWindow.max}
          onChange={(max) => setOdoWindow((w) => ({ ...w, max }))}
        />
        {(odoWindow.min !== undefined || odoWindow.max !== undefined) && (
          <button
            type="button"
            onClick={() => setOdoWindow({})}
            className="text-[11px] font-semibold text-accent underline underline-offset-2"
          >
            any mileage
          </button>
        )}
      </div>
      <p className="mb-4 text-xs leading-relaxed text-faint">
        Leave both blank to compare against every mileage. Narrowing to
        something near your own reading is the fairest comparison — a fresh
        engine and a worn one are not running the same shims, and neither is
        wrong. Readings with no odometer recorded drop out once a window is set.
      </p>

      <Panels
        engine={engine}
        records={records}
        mine={spec.mine}
        emphasiseAverage={spec.emphasiseAverage}
        result={result}
        loading={loading}
      />

      {/*
        Said on the page rather than kept quiet: a wide pool mixes engines at
        20,000 km with engines at 120,000, and thinner shims are the expected
        end of a long life rather than a fault. This answers "am I unusual",
        not "how fast am I wearing" — that one is the History chart.
      */}
      <p className="mt-6 text-xs leading-relaxed text-faint">
        Shim thickness falls as valves sink into their seats, so a high-mileage
        engine sits lower than a fresh one of the same model. A wide pool mixes
        the two. This tells you whether you are unusual for the model, not how
        fast you are wearing — History is where the wear rate lives.
      </p>
    </div>
  );
}

function OdoInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-faint">
      {label}
      <input
        type="text"
        inputMode="numeric"
        placeholder="any"
        value={value ?? ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          onChange(digits === "" ? undefined : Number(digits));
        }}
        className="w-24 rounded-lg border border-line bg-bg px-2 py-1.5 font-mono text-sm tabular-nums text-ink outline-none placeholder:text-faint/50 focus:border-accent"
      />
    </label>
  );
}

function Choice({
  label,
  active,
  disabled,
  title,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-line text-faint hover:text-muted"
      } ${disabled ? "cursor-not-allowed opacity-40 hover:text-faint" : ""}`}
    >
      {label}
    </button>
  );
}

function Panels({
  engine,
  records,
  mine,
  emphasiseAverage,
  result,
  loading,
}: {
  engine: EngineSpec;
  records: ServiceRecord[];
  mine: "current" | "range";
  emphasiseAverage: boolean;
  result: PoolResult | null;
  loading: boolean;
}) {
  const series = useMemo(
    () =>
      (["intake", "exhaust"] as ValveType[]).map((type) => ({
        type,
        count: engine.positions.filter((p) => p.type === type).length,
        values: riderShims(
          records,
          engine.positions.filter((p) => p.type === type),
          mine,
        ),
      })),
    [engine, records, mine],
  );

  // One panel per valve, in the engine's own order, so a rider reading down
  // this page meets the valves in the same order as on the sheet and in the
  // trend charts.
  const perValve = useMemo(
    () =>
      engine.positions.map((position) => ({
        position,
        values: riderShims(records, [position], mine),
      })),
    [engine, records, mine],
  );

  if (loading && !result) {
    return <p className="py-6 text-center text-sm text-faint">Reading the pool…</p>;
  }

  if (!result) return null;

  if (result.state === "offline") {
    return (
      <EmptyState title="No signal">
        The pool lives on the server, so this is the one screen that needs a
        connection. Everything else in the app works offline.
      </EmptyState>
    );
  }

  if (result.state === "no-backend") {
    return (
      <EmptyState title="No pool configured">
        This build has no server behind it, so there is nothing to compare
        against.
      </EmptyState>
    );
  }

  if (result.state === "error") {
    return (
      <EmptyState title="Could not read the pool">{result.message}</EmptyState>
    );
  }

  const any = series.some((s) => result.distribution.byType[s.type]?.readings);
  if (!any) {
    return (
      <EmptyState title="Nothing in the pool yet">
        Once a few riders have recorded the thickness of the shims they pulled,
        this will show how yours compare.
      </EmptyState>
    );
  }

  return (
    <div className={loading ? "opacity-50 transition-opacity" : undefined}>
      <h2 className="mb-2 text-sm font-bold">All four together</h2>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {series.map(({ type, count, values }) => (
          <Card key={type} className="p-2.5">
            <h4 className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold">
              <span>
                All {count} <span className="capitalize">{type}</span> Valves
              </span>
              <SampleSize side={result.distribution.byType[type]} />
            </h4>
            <ComparePanel
              side={result.distribution.byType[type]}
              mine={values}
              emphasiseAverage={emphasiseAverage}
              label={type}
            />
          </Card>
        ))}
      </div>
      <Legend />

      {/*
        The combined panels above can hide the thing worth finding. Four valves
        averaged together sit comfortably in the crowd while one of them is out
        on its own at the thin end — which is exactly the valve worth knowing
        about. Same scale, same reading, one valve at a time.
      */}
      <h2 className="mt-6 mb-2 text-sm font-bold">Valve by valve</h2>
      <p className="mb-2 text-xs leading-relaxed text-faint">
        Each valve against the same valve on every other bike. An average can
        sit in the middle of the crowd while one valve underneath it is out at
        an edge on its own.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {perValve.map(({ position, values }) => (
          <Card key={position.id} className="p-2.5">
            <h4 className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold">
              <span>{position.label}</span>
              <SampleSize side={result.distribution.byPosition[position.id]} />
            </h4>
            <ComparePanel
              side={result.distribution.byPosition[position.id]}
              mine={values}
              emphasiseAverage={emphasiseAverage}
              label={position.label}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}

function SampleSize({ side }: { side?: PoolSide }) {
  if (!side?.readings) return null;
  return (
    <span className="shrink-0 font-mono font-normal text-faint">
      {side.readings} from {side.bikes} {side.bikes === 1 ? "bike" : "bikes"}
    </span>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex items-center gap-2 text-[11px] text-faint">
      <span>Fewer</span>
      <span className="flex h-2.5 flex-1 max-w-[140px] overflow-hidden rounded-sm">
        {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
          <span
            key={o}
            className="flex-1"
            style={{ backgroundColor: DATA, opacity: o }}
          />
        ))}
      </span>
      <span>more readings at that thickness</span>
    </div>
  );
}

function ComparePanel({
  side,
  mine,
  emphasiseAverage,
  label,
}: {
  side?: PoolSide;
  mine: Microns[];
  emphasiseAverage: boolean;
  label: string;
}) {
  if (!side?.readings) {
    return (
      <p className="py-5 text-center text-[11px] text-faint">
        nothing pooled for these valves yet
      </p>
    );
  }

  if (!side.enough) {
    return (
      <p className="py-5 text-center text-[11px] leading-relaxed text-faint">
        {side.bikes} {side.bikes === 1 ? "bike has" : "bikes have"} contributed
        here. A spread needs at least {side.minBikes} before it describes
        anything but one motorcycle.
      </p>
    );
  }

  const poolMin = side.min ?? 0;
  const poolMax = side.max ?? 0;
  const values = [poolMin, poolMax, ...mine];
  const lo = Math.min(...values) - STEP;
  const hi = Math.max(...values) + STEP * 2;

  const height = 96;
  const plotW = W - PAD * 2;
  const sx = (v: number) => PAD + ((v - lo) / (hi - lo)) * plotW;
  /** A band covers its own 25 microns, so it is drawn as a width, not a point. */
  const bandW = (plotW / (hi - lo)) * STEP;

  const peak = Math.max(...side.bins.map(([, n]) => n), 1);

  const mineLo = mine.length ? Math.min(...mine) : undefined;
  const mineHi = mine.length ? Math.max(...mine) : undefined;

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="w-full"
      role="img"
      aria-label={
        mineLo !== undefined && mineHi !== undefined
          ? `${label}: this bike from ${mm(mineLo)} to ${mm(mineHi)} mm, the pool from ${mm(poolMin)} to ${mm(poolMax)} mm across ${side.bikes} bikes`
          : `${label}: the pool from ${mm(poolMin)} to ${mm(poolMax)} mm across ${side.bikes} bikes, with nothing recorded on this bike`
      }
    >
      <text x={PAD} y={9} fontSize={8} fill="#6b727c">
        This bike
      </text>

      {mineLo !== undefined && mineHi !== undefined ? (
        <>
          {/* The span first, then a mark per valve, so four valves sitting on
              one size still read as four and not as a single point. */}
          <rect
            x={sx(mineLo)}
            y={16}
            width={Math.max(sx(mineHi) - sx(mineLo) + bandW, bandW)}
            height={12}
            rx={2}
            fill={DATA}
            opacity={0.32}
          />
          {mine.map((v, i) => (
            <rect
              key={`${v}-${i}`}
              x={sx(v)}
              y={16}
              width={bandW}
              height={12}
              rx={1}
              fill={DATA}
            />
          ))}
        </>
      ) : (
        <text x={PAD} y={26} fontSize={8} fill="#6b727c">
          no shim thickness recorded on this bike
        </text>
      )}

      <text x={PAD} y={44} fontSize={8} fill="#6b727c">
        The pool
      </text>

      {side.bins.map(([edge, n]) => (
        <rect
          key={edge}
          x={sx(edge)}
          y={50}
          width={bandW}
          height={18}
          fill={DATA}
          opacity={0.15 + 0.85 * (n / peak)}
        />
      ))}

      {/* The mean, marked on the band rather than printed beside it — the
          whole point is that it may sit nowhere near the middle. */}
      {side.avg !== undefined && (
        <>
          <line
            x1={sx(side.avg) + bandW / 2}
            x2={sx(side.avg) + bandW / 2}
            y1={emphasiseAverage ? 14 : 48}
            y2={70}
            stroke="#e8eaed"
            strokeWidth={emphasiseAverage ? 1.5 : 1}
            strokeDasharray={emphasiseAverage ? undefined : "2 2"}
          />
          <text
            x={sx(side.avg) + bandW / 2}
            y={78}
            fontSize={8}
            fill="#98a0aa"
            textAnchor="middle"
          >
            avg {mm(side.avg)}
          </text>
        </>
      )}

      <text x={PAD} y={92} fontSize={8} fill="#6b727c">
        {mm(poolMin)}
      </text>
      <text x={W - PAD} y={92} fontSize={8} fill="#6b727c" textAnchor="end">
        {mm(poolMax)} mm
      </text>
    </svg>
  );
}
