"use client";

import { useId, useState } from "react";
import { calculateValve, stepShim, type Aim } from "@/lib/calc";
import { partsForSize } from "@/lib/catalogues";
import { mm, parseMm, signedMm } from "@/lib/format";
import { HINTS } from "@/lib/notes";
import type { ClearanceRange, Microns, ValvePosition, ValveReading } from "@/lib/types";
import { Chip } from "./ui";

/**
 * Sanity bounds, in microns. These are not tolerances — they exist to catch
 * the fat-finger cases: typing 235 when you meant 2.35, or entering the
 * clearance in the shim box. Anything outside gets a warning, never a block,
 * because it is not this app's job to tell you what you measured.
 */
const SHIM_BOUNDS = { min: 1500, max: 4000 };
const CLEARANCE_BOUNDS = { min: 0, max: 1000 };

/**
 * Laid out in the order the work happens:
 *
 *   1. Measure the gap. Most valves pass and that is the end of it.
 *   2. Only if it failed, pull the shim, measure it, get a replacement size.
 *   3. Once the new shim is in, measure the gap again and record what it
 *      really came out at.
 *
 * Steps 2 and 3 stay out of the way until they are earned, so a service where
 * everything is in tolerance is eight numbers and eight ticks.
 */
export function ValveCard({
  position,
  range,
  aim,
  catalogueIds,
  reading,
  onChange,
}: {
  position: ValvePosition;
  range: ClearanceRange;
  aim: Aim;
  catalogueIds: string[];
  reading: ValveReading | undefined;
  onChange: (reading: ValveReading) => void;
}) {
  const result = calculateValve(reading, range, aim, catalogueIds);
  const [opened, setOpened] = useState(false);

  // The shim step appears when the valve fails, when a shim has been entered
  // anyway, or when it is asked for — a valve can be in tolerance and still be
  // worth resetting if it is drifting towards the edge.
  const showShimStep =
    result.measuredInSpec === false || result.hasShim || opened;

  const parts =
    result.chosenShim !== undefined
      ? partsForSize(catalogueIds, result.chosenShim)
      : [];

  const setChosen = (um: Microns | undefined) =>
    onChange({ ...reading, chosenShim: um });

  return (
    <article className="rounded-lg border border-line bg-raised/40 p-3">
      <h4 className="mb-2 text-sm font-bold">{position.short}</h4>

      <div className="flex items-start gap-3">
        <div className="w-28 shrink-0">
          <NumberField
            label="Clearance"
            hint={HINTS.clearance}
            value={reading?.clearance}
            bounds={CLEARANCE_BOUNDS}
            boundsMessage="Clearances are well under 1 mm. Did you mean e.g. 0.12?"
            onChange={(um) => onChange({ ...reading, clearance: um })}
          />
        </div>
        <div className="min-w-0 flex-1 pt-4.5">
          <Verdict result={result} range={range} />
        </div>
      </div>

      {result.measuredInSpec === true && !showShimStep && (
        <button
          type="button"
          onClick={() => setOpened(true)}
          className="mt-2 text-[11px] font-semibold text-accent underline underline-offset-2"
        >
          change the shim anyway
        </button>
      )}

      {showShimStep && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-start gap-3">
            <div className="w-28 shrink-0">
              <NumberField
                label="Shim fitted"
                hint={HINTS.shim}
                value={reading?.shim}
                bounds={SHIM_BOUNDS}
                boundsMessage="Shims are around 2–3 mm. Did you mean e.g. 2.35?"
                onChange={(um) => onChange({ ...reading, shim: um })}
              />
            </div>
            {!result.hasShim && (
              <p className="min-w-0 flex-1 pt-5 text-[11px] leading-tight text-faint">
                Pull the shim, measure it, and enter it here for a replacement
                size.
              </p>
            )}
          </div>

          {result.complete &&
            (result.noSuitableShim && result.chosenShim === undefined ? (
              <p className="mt-3 text-sm text-bad">
                No shim in the catalogue lands this valve inside {mm(range.min)}–
                {mm(range.max)} mm. Check your measurements — a stack of{" "}
                {mm(result.stack)} mm is outside the normal range.
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-faint" title={HINTS.ideal}>
                      Ideal {mm(result.idealShim)} mm
                    </p>
                    <p className="text-[11px] text-faint">Fit this shim</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <StepButton
                      label="Thinner shim"
                      disabled={stepShim(result.chosenShim!, -1, catalogueIds) === undefined}
                      onClick={() => setChosen(stepShim(result.chosenShim!, -1, catalogueIds))}
                    >
                      −
                    </StepButton>
                    <span className="min-w-[4.5rem] text-center font-mono text-lg font-bold tabular-nums">
                      {mm(result.chosenShim)}
                    </span>
                    <StepButton
                      label="Thicker shim"
                      disabled={stepShim(result.chosenShim!, 1, catalogueIds) === undefined}
                      onClick={() => setChosen(stepShim(result.chosenShim!, 1, catalogueIds))}
                    >
                      +
                    </StepButton>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-sm text-muted" title={HINTS.newClearance}>
                    New clearance{" "}
                    <span className="font-mono font-bold text-ink tabular-nums">
                      {mm(result.newClearance)}
                    </span>{" "}
                    mm
                  </span>
                  {result.newInSpec ? (
                    <Chip tone="ok">in spec</Chip>
                  ) : (
                    <Chip tone="bad">out of spec</Chip>
                  )}
                  {result.noChange && <Chip tone="neutral">same shim back in</Chip>}
                  {result.overridden && (
                    <button
                      type="button"
                      onClick={() => setChosen(undefined)}
                      className="text-[11px] font-semibold text-accent underline underline-offset-2"
                    >
                      reset to suggested
                    </button>
                  )}
                </div>

                {!result.noChange && (
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                    {parts.map((part) => (
                      <div key={part.brand} className="flex gap-1.5">
                        <dt className="text-faint">{part.brand}</dt>
                        <dd className={part.part ? "font-mono text-muted" : "italic text-faint"}>
                          {part.part ?? "no size made"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-3 rounded-lg border border-dashed border-line p-2.5">
                  <div className="flex items-end gap-2.5">
                    <div className="w-28 shrink-0">
                      <NumberField
                        label="Confirmed gap"
                        hint={HINTS.confirmed}
                        value={reading?.confirmedClearance}
                        placeholder={mm(result.newClearance)}
                        bounds={CLEARANCE_BOUNDS}
                        boundsMessage="Clearances are well under 1 mm."
                        onChange={(um) => onChange({ ...reading, confirmedClearance: um })}
                      />
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      {result.confirmedClearance === undefined ? (
                        <p className="text-[11px] leading-tight text-faint">
                          Once the new shim is in, measure again and record what
                          you actually got.
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {result.confirmedInSpec ? (
                            <Chip tone="ok">confirmed in spec</Chip>
                          ) : (
                            <Chip tone="bad">confirmed out of spec</Chip>
                          )}
                          <span className="text-[11px] text-faint">
                            {result.confirmedDelta === 0
                              ? "exactly as predicted"
                              : `${signedMm(result.confirmedDelta)} vs predicted`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ))}
        </div>
      )}
    </article>
  );
}

/** The pass/fail on the gap alone — the only thing most valves ever need. */
function Verdict({
  result,
  range,
}: {
  result: ReturnType<typeof calculateValve>;
  range: ClearanceRange;
}) {
  if (!result.hasClearance) {
    return (
      <p className="text-[11px] leading-tight text-faint">
        Measure the gap first — {mm(range.min)}–{mm(range.max)} mm is in spec.
      </p>
    );
  }

  if (result.measuredInSpec) {
    const delta = result.targetDelta ?? 0;
    return (
      <div>
        <Chip tone="ok">good — no change needed</Chip>
        <p className="mt-1 text-[11px] leading-tight text-faint">
          {delta === 0
            ? `right on your ${mm(result.target)} mm target`
            : `${mm(Math.abs(delta))} mm ${delta > 0 ? "looser" : "tighter"} than your ${mm(result.target)} mm target`}
        </p>
      </div>
    );
  }

  const by = result.outOfSpecBy ?? 0;
  return (
    <div>
      <Chip tone="bad">
        {by < 0 ? "too tight" : "too loose"} by {mm(Math.abs(by))} mm
      </Chip>
      <p className="mt-1 text-[11px] leading-tight text-faint">
        Outside {mm(range.min)}–{mm(range.max)} mm — this shim needs to come out.
      </p>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="h-9 w-9 rounded-lg bg-raised text-lg font-bold leading-none text-ink ring-1 ring-line transition-colors hover:bg-line disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  hint,
  value,
  bounds,
  boundsMessage,
  placeholder = "—",
  onChange,
}: {
  label: string;
  hint: string;
  value: Microns | undefined;
  bounds: { min: number; max: number };
  boundsMessage: string;
  placeholder?: string;
  onChange: (um: Microns | undefined) => void;
}) {
  const id = useId();
  // Held as text so a half-typed "2." isn't rewritten under the cursor.
  const [text, setText] = useState(() => (value === undefined ? "" : mm(value)));

  // Resync when the value changes from outside this field — loading a record,
  // say. Adjusting during render rather than in an effect avoids the extra
  // render pass, and is the pattern React documents for derived state.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (parseMm(text) !== value) setText(value === undefined ? "" : mm(value));
  }

  const parsed = parseMm(text);
  const outOfBounds =
    parsed !== undefined && (parsed < bounds.min || parsed > bounds.max);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-faint" title={hint}>
        {label} <span className="text-faint/70">mm</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange(parseMm(event.target.value));
        }}
        className={`w-full rounded-lg border bg-bg px-2.5 py-2 font-mono text-base tabular-nums text-ink outline-none transition-colors placeholder:text-faint/50 focus:border-accent ${
          outOfBounds ? "border-warn" : "border-line"
        }`}
      />
      {outOfBounds && <p className="mt-1 text-[11px] text-warn">{boundsMessage}</p>}
    </div>
  );
}
