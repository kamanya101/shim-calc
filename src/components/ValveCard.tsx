"use client";

import { useId, useState } from "react";
import { calculateValve, stepShim, type Aim } from "@/lib/calc";
import { partsForSize } from "@/lib/catalogues";
import { mm, parseMm, signedMm } from "@/lib/format";
import type { ClearanceRange, Microns, ValvePosition, ValveReading } from "@/lib/types";
import { useT } from "./LocaleProvider";
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
  const t = useT();
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
      {/* The full name, not just the side. Held vertically a phone shows one
          card at a time, and nobody should have to scroll back to a section
          heading to remember which valve they are typing into. */}
      {/* Keyed by the valve's permanent id rather than by its English name, so
          renaming a valve on screen cannot silently orphan a translation. */}
      <h4 className="mb-2 text-sm font-bold">{t(`valve.${position.id}`)}</h4>

      <div className="flex items-start gap-3">
        <div className="w-28 shrink-0">
          <NumberField
            label={t("valve.clearanceLabel")}
            hint={t("valve.hintClearance")}
            value={reading?.clearance}
            bounds={CLEARANCE_BOUNDS}
            boundsMessage={t("valve.clearanceBounds")}
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
          {t("valve.changeAnyway")}
        </button>
      )}

      {showShimStep && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-start gap-3">
            <div className="w-28 shrink-0">
              <NumberField
                label={t("valve.shimLabel")}
                hint={t("valve.hintShim")}
                value={reading?.shim}
                bounds={SHIM_BOUNDS}
                boundsMessage={t("valve.shimBounds")}
                onChange={(um) => onChange({ ...reading, shim: um })}
              />
            </div>
            {!result.hasShim && (
              <p className="min-w-0 flex-1 pt-5 text-[11px] leading-tight text-faint">
                {t("valve.pullShim")}
              </p>
            )}
          </div>

          {result.complete &&
            (result.noSuitableShim && result.chosenShim === undefined ? (
              <p className="mt-3 text-sm text-bad">
                {t("valve.noSuitableShim", {
                  min: mm(range.min),
                  max: mm(range.max),
                  stack: mm(result.stack),
                })}
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-medium text-faint"
                      title={t("valve.hintIdeal")}
                    >
                      {t("valve.ideal", { size: mm(result.idealShim) })}
                    </p>
                    <p className="text-[11px] text-faint">
                      {t("valve.fitThis")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <StepButton
                      label={t("valve.thinner")}
                      disabled={stepShim(result.chosenShim!, -1, catalogueIds) === undefined}
                      onClick={() => setChosen(stepShim(result.chosenShim!, -1, catalogueIds))}
                    >
                      −
                    </StepButton>
                    <span className="min-w-[4.5rem] text-center font-mono text-lg font-bold tabular-nums">
                      {mm(result.chosenShim)}
                    </span>
                    <StepButton
                      label={t("valve.thicker")}
                      disabled={stepShim(result.chosenShim!, 1, catalogueIds) === undefined}
                      onClick={() => setChosen(stepShim(result.chosenShim!, 1, catalogueIds))}
                    >
                      +
                    </StepButton>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span
                    className="text-sm text-muted"
                    title={t("valve.hintNewClearance")}
                  >
                    {withNumber(
                      t("valve.newClearance"),
                      <span className="font-mono font-bold text-ink tabular-nums">
                        {mm(result.newClearance)}
                      </span>,
                    )}
                  </span>
                  {result.newInSpec ? (
                    <Chip tone="ok">{t("valve.inSpec")}</Chip>
                  ) : (
                    <Chip tone="bad">{t("valve.outOfSpec")}</Chip>
                  )}
                  {result.noChange && (
                    <Chip tone="neutral">{t("valve.sameShimBack")}</Chip>
                  )}
                  {result.overridden && (
                    <button
                      type="button"
                      onClick={() => setChosen(undefined)}
                      className="text-[11px] font-semibold text-accent underline underline-offset-2"
                    >
                      {t("valve.resetSuggested")}
                    </button>
                  )}
                </div>

                {!result.noChange && (
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                    {parts.map((part) => (
                      <div key={part.brand} className="flex gap-1.5">
                        <dt className="text-faint">{part.brand}</dt>
                        <dd className={part.part ? "font-mono text-muted" : "italic text-faint"}>
                          {part.part ?? t("valve.noSizeMade")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-3 rounded-lg border border-dashed border-line p-2.5">
                  <div className="flex items-end gap-2.5">
                    <div className="w-28 shrink-0">
                      <NumberField
                        label={t("valve.confirmedLabel")}
                        hint={t("valve.hintConfirmed")}
                        value={reading?.confirmedClearance}
                        placeholder={mm(result.newClearance)}
                        bounds={CLEARANCE_BOUNDS}
                        boundsMessage={t("valve.confirmedBounds")}
                        onChange={(um) => onChange({ ...reading, confirmedClearance: um })}
                      />
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      {result.confirmedClearance === undefined ? (
                        <p className="text-[11px] leading-tight text-faint">
                          {t("valve.confirmPrompt")}
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {result.confirmedInSpec ? (
                            <Chip tone="ok">{t("valve.confirmedInSpec")}</Chip>
                          ) : (
                            <Chip tone="bad">
                              {t("valve.confirmedOutOfSpec")}
                            </Chip>
                          )}
                          <span className="text-[11px] text-faint">
                            {result.confirmedDelta === 0
                              ? t("valve.exactlyPredicted")
                              : t("valve.vsPredicted", {
                                  delta: signedMm(result.confirmedDelta),
                                })}
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

/**
 * Splices a value into a message where that value has to be styled apart from
 * the words around it.
 *
 * Splitting on the placeholder rather than interpolating keeps the whole
 * sentence in the dictionary, so a language is free to put the number
 * somewhere English does not — which is the entire reason these are sentences
 * with placeholders and not labels glued to values.
 */
function withNumber(message: string, value: React.ReactNode) {
  const [before, after = ""] = message.split("{value}");
  return (
    <>
      {before}
      {value}
      {after}
    </>
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
  const t = useT();

  if (!result.hasClearance) {
    return (
      <p className="text-[11px] leading-tight text-faint">
        {t("valve.measureFirst", {
          min: mm(range.min),
          max: mm(range.max),
        })}
      </p>
    );
  }

  if (result.measuredInSpec) {
    const delta = result.targetDelta ?? 0;
    const target = mm(result.target);
    return (
      <div>
        <Chip tone="ok">{t("valve.good")}</Chip>
        <p className="mt-1 text-[11px] leading-tight text-faint">
          {/* Three separate sentences rather than one with "looser"/"tighter"
              dropped into the middle. Which word it is changes the grammar
              around it in several of these languages. */}
          {delta === 0
            ? t("valve.onTarget", { target })
            : t(
                delta > 0 ? "valve.looserThanTarget" : "valve.tighterThanTarget",
                { delta: mm(Math.abs(delta)), target },
              )}
        </p>
      </div>
    );
  }

  const by = result.outOfSpecBy ?? 0;
  return (
    <div>
      <Chip tone="bad">
        {t(by < 0 ? "valve.tooTightBy" : "valve.tooLooseBy", {
          by: mm(Math.abs(by)),
        })}
      </Chip>
      <p className="mt-1 text-[11px] leading-tight text-faint">
        {t("valve.outsideRange", { min: mm(range.min), max: mm(range.max) })}
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
