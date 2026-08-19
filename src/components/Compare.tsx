"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MODES,
  fetchPoolDistribution,
  fetchServiceIntervals,
  normaliseItem,
  riderServiceIntervals,
  riderShims,
  scopeOptions,
  type CompareMode,
  type IntervalResult,
  type OdoWindow,
  type PoolResult,
  type PoolScope,
  type PoolSide,
} from "@/lib/compare";
import { formatNumber, fromKm, mm, unitLabel } from "@/lib/format";
import { SERVICE_ITEMS } from "@/lib/serviceItems";
import type { Bike, EngineSpec, Microns, ServiceRecord, ValveType } from "@/lib/types";
import { BikeTabs } from "./BikeTabs";
import { useT } from "./LocaleProvider";
import { useRecords } from "./RecordsProvider";
import { Card, EmptyState, PageHeader } from "./ui";
import { VinGate } from "./VinGate";

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

/*
 * Two colours, because the two rows are two different claims.
 *
 * The rider's own shims stay the app's orange — it is their bike, in the colour
 * everything else of theirs is drawn in. The pool takes cyan, which sits
 * opposite orange on the wheel and so separates from it further than any other
 * hue could; against this near-black both read at full strength. It is also a
 * pairing that survives red-green colour blindness, which orange against a
 * second warm colour would not.
 *
 * The point is that a rider glancing at the picture must never have to work out
 * which row is theirs.
 */
const MINE = "#ff9a4d";
const POOL = "#3ad4e0";
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

  // This whole page is the comparison, so the gate replaces it rather than
  // wrapping part of it. It sits below every hook, so the rules of hooks still
  // hold on the render where it takes effect.
  if (!bike.vin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-5">
        <PageHeader
          title="Compare"
          subtitle={bikes.length > 1 ? bike.name : undefined}
        />
        <BikeTabs />
        <VinGate bike={bike} services={records.length} opens="comparison" />
      </div>
    );
  }

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

      <ServiceIntervals bike={bike} records={records} scope={activeScope} />

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
            style={{ backgroundColor: POOL, opacity: o }}
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
            fill={MINE}
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
              fill={MINE}
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
          fill={POOL}
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

/**
 * The serviceItems order, with the two oil grades folded into one line and the
 * two catch-alls dropped — the same shape pool_service_intervals returns, so
 * the rows line up with what comes back without any matching by hand.
 */
const INTERVAL_ITEMS = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of SERVICE_ITEMS) {
    const key = normaliseItem(item.id);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
})();

/**
 * How far everybody else gets between replacing the same things.
 *
 * The measurement, and every judgement inside it, is set out above
 * pool_service_intervals in supabase/schema.sql. The two that a reader of this
 * page needs to know are said on the page itself: the distance is only ever the
 * span a rider's own log covers, and a part is only here because somebody
 * ticked it — so this is what the riders who record a thing do, never what the
 * motorcycle needs.
 *
 * Fetched separately from the shim distribution rather than folded into it.
 * They answer different questions at different grains, the mileage window
 * applies to one and not the other, and a rider changing the window should not
 * pay for this query again.
 */
function ServiceIntervals({
  bike,
  records,
  scope,
}: {
  bike: Bike;
  records: ServiceRecord[];
  scope: PoolScope;
}) {
  const t = useT();
  const [result, setResult] = useState<IntervalResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchServiceIntervals(scope, bike).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, bike]);

  const mine = useMemo(
    () => riderServiceIntervals(records, bike),
    [records, bike],
  );

  // Offline and no-backend are already said once by the panels above, and
  // saying them twice on one screen reads as two faults rather than one. A
  // genuine error is different: this call can fail on its own — the parts side
  // of the pool is newer than the shim side — and swallowing that would leave
  // an empty space that looks like "nobody has recorded anything".
  if (!result) return null;
  if (result.state === "error") {
    return (
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-bold">Parts, and how often</h2>
        <p className="text-xs leading-relaxed text-faint">
          Could not read the parts side of the pool: {result.message}
        </p>
      </div>
    );
  }
  if (result.state !== "ok") return null;

  const units = unitLabel(bike.units);
  const rows = INTERVAL_ITEMS.map((key) => ({
    key,
    pool: result.intervals.items[key] ?? null,
    mineKm: mine.kmBetween[key] ?? null,
  })).filter((row) => row.pool?.kmBetween != null || row.mineKm != null);

  if (!rows.length) {
    return (
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-bold">Parts, and how often</h2>
        <p className="text-xs leading-relaxed text-faint">
          Nothing yet. Once a few riders have logged two services far enough
          apart and ticked what they replaced, this will show how far everybody
          gets between one chain, filter or set of pads and the next.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-bold">Parts, and how often</h2>
      <p className="mb-1 text-xs leading-relaxed text-faint">
        How far you get between replacing something, against how far everybody
        else does. Measured across the distance each log actually covers —
        oldest recorded reading to newest — never the whole odometer, because
        nobody watched the kilometres before the log started.
      </p>
      <p className="mb-3 text-xs leading-relaxed text-faint">
        {mine.spanKm >= 1000 ? (
          <>
            Yours is drawn from {mine.services} services across{" "}
            {formatNumber(fromKm(mine.spanKm, bike.units ?? "km"))} {units}.
          </>
        ) : (
          <>
            Your own figures need two services at least 1,000 km apart. Until
            then only the pool side has anything to show.
          </>
        )}
      </p>

      <Card className="divide-y divide-line p-0">
        {rows.map(({ key, pool, mineKm }) => {
          const poolKm = pool?.kmBetween ?? null;
          const peak = Math.max(mineKm ?? 0, poolKm ?? 0) || 1;
          return (
            <div key={key} className="px-2.5 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold">
                  {t(`part.${key}`)}
                </span>
                <span className="shrink-0 font-mono text-[11px] font-normal text-faint">
                  {pool?.enough
                    ? `${pool.bikes} bikes`
                    : pool
                      ? `${pool.bikes} of ${result.intervals.minBikes} bikes`
                      : "—"}
                </span>
              </div>

              <Row
                label="You"
                km={mineKm}
                peak={peak}
                units={bike.units}
                colour={MINE}
              />
              <Row
                label="The pool"
                km={pool?.enough ? poolKm : null}
                peak={peak}
                units={bike.units}
                colour={POOL}
              />
            </div>
          );
        })}
      </Card>

      <p className="mt-2 text-xs leading-relaxed text-faint">
        A part only appears here because riders tick it, so this is how often
        the people who record a thing record it — not how often it needs doing.
        The bike count beside each line is how much weight it will carry. Oil is
        counted as one job whichever grade went in, and the two catch-all
        entries are left out: they say something was done, not what, so no
        interval can be got from them.
      </p>
    </div>
  );
}

/** One side of one part: a bar drawn against the larger of the two, and the
    figure printed, because a bar alone cannot be read off. */
function Row({
  label,
  km,
  peak,
  units,
  colour,
}: {
  label: string;
  km: number | null;
  peak: number;
  units: Bike["units"];
  colour: string;
}) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] text-faint">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-sm bg-line/40">
        {km != null && (
          <span
            className="block h-full rounded-sm"
            style={{ width: `${Math.max(2, (km / peak) * 100)}%`, backgroundColor: colour }}
          />
        )}
      </span>
      <span className="w-24 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">
        {km == null ? "—" : `${formatNumber(fromKm(km, units ?? "km"))} ${unitLabel(units)}`}
      </span>
    </div>
  );
}
