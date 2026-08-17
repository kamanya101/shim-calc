"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_NAME } from "@/lib/app";
import type { Aim } from "@/lib/calc";
import { groupsByBank } from "@/lib/engines";
import { mm, todayIso, unitLabel } from "@/lib/format";
import { BIKE_MODEL_GROUPS, MODEL_YEARS, modelLabel } from "@/lib/models";
import { sheetStatus } from "@/lib/report";
import type { Bike, DistanceUnit, ValveType } from "@/lib/types";
import { checkVin, formatVin } from "@/lib/vin";
import { useRecords } from "./RecordsProvider";
import { ValveCard } from "./ValveCard";
import { Button, Card, Chip, PageHeader, Segmented } from "./ui";

const AIM_OPTIONS: { value: Aim; label: string }[] = [
  { value: "min", label: "Tight" },
  { value: "middle", label: "Middle" },
  { value: "max", label: "Loose" },
];

export function ServiceSheet() {
  const {
    ready,
    engine,
    bike,
    bikes,
    records,
    active,
    aim,
    setAim,
    setActiveBikeId,
    updateActive,
    updateBike,
    addBike,
    removeBike,
    startNew,
  } = useRecords();

  if (!ready) {
    return <p className="p-4 text-sm text-faint">Loading…</p>;
  }

  const status = sheetStatus(engine, active, aim);
  const banks = groupsByBank(engine);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <PageHeader
        title={APP_NAME}
        subtitle={[
          modelLabel(bike.modelId, bike.year),
          `${engine.name} · ${engine.subtitle}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <Button variant="ghost" onClick={startNew}>
            New service
          </Button>
        }
      />

      <Card className="mb-3 p-3">
        {/*
          Stacked on a phone held upright; all four across from 640px up, which
          includes a phone in landscape — that is where the saved rows matter
          most, since there is barely 250px of usable height once the browser
          chrome and the tab bar have taken their share.
        */}
        {/* Units is sized to its content rather than taking a fifth equal
            column, so Bike / Name / Model / Year keep the widths they were
            given when they were fitted onto one row. */}
        <div className="grid gap-2.5 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <Field label="Bike">
            <div className="flex items-stretch gap-1.5">
              <select
                value={bike.id}
                onChange={(e) => setActiveBikeId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
              >
                {bikes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {modelLabel(b.modelId, b.year)
                      ? ` — ${modelLabel(b.modelId, b.year)}`
                      : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addBike}
                aria-label="Add another bike"
                title="Add another bike"
                className="shrink-0 rounded-lg bg-raised px-3 text-lg font-bold leading-none text-ink ring-1 ring-line transition-colors hover:bg-line"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="Name">
            <input
              type="text"
              placeholder="e.g. Orange one"
              value={bike.name}
              onChange={(e) => updateBike({ name: e.target.value })}
              className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none placeholder:text-faint/50 focus:border-accent"
            />
          </Field>

          <Field label="Model">
            <select
              value={bike.modelId ?? ""}
              onChange={(e) => updateBike({ modelId: e.target.value || undefined })}
              className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Choose…</option>
              {BIKE_MODEL_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field label="Year">
            <select
              value={bike.year ?? ""}
              onChange={(e) =>
                updateBike({ year: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              {/* Optional, and says so: plenty of people do not know the year
                  of a bike they bought second-hand, and refusing their service
                  history over it would be a poor trade. */}
              <option value="">Not sure</option>
              {MODEL_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </Field>

          {/*
            Set on the bike, not on the rider: an imported machine reading in
            miles can sit happily beside a local one in kilometres, and the
            unit is a fact about the motorcycle.

            It matters beyond the label. The shared pool stores kilometres and
            only kilometres, because 60,000 miles and 60,000 km are the same
            number and sixty per cent apart — mixing them would not fail, it
            would quietly produce wrong averages forever. This is what tells
            the pool which one it is being handed.
          */}
          <Field label="Units">
            <select
              value={bike.units ?? "km"}
              onChange={(e) =>
                updateBike({ units: e.target.value as DistanceUnit })
              }
              className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="km">km</option>
              <option value="mi">mi</option>
            </select>
          </Field>
        </div>

        {/* Out of the label so the three columns sit level; prefixed so it is
            still obvious which field it belongs to. */}
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          Name — unique to this bike… for those who are greedy/wise and have more
          than one
        </p>

        {/* Keyed on the bike so switching bikes reloads the field rather than
            leaving the previous machine's number sitting in it. */}
        <VinField key={bike.id} bike={bike} updateBike={updateBike} />

        {bikes.length > 1 && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  `Delete "${bike.name}" and all ${records.length} of its services? This can't be undone.`,
                )
              ) {
                removeBike(bike.id);
              }
            }}
            className="mt-2 text-[11px] font-semibold text-bad underline underline-offset-2"
          >
            remove this bike
          </button>
        )}
      </Card>

      <Card className="mb-4 p-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Date">
            <input
              type="date"
              value={active.date || todayIso()}
              onChange={(e) =>
                updateActive((r) => ({ ...r, date: e.target.value }))
              }
              className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
            />
          </Field>
          <Field label={`Odometer (${unitLabel(bike.units)})`}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 47504"
              value={active.odometer ?? ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, "");
                updateActive((r) => ({
                  ...r,
                  odometer: digits === "" ? undefined : Number(digits),
                }));
              }}
              className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 font-mono text-sm tabular-nums text-ink outline-none placeholder:text-faint/50 focus:border-accent"
            />
          </Field>
        </div>
        <div className="mt-2.5">
          <Field label="Note (optional)">
            <input
              type="text"
              placeholder="e.g. found — before adjustment"
              value={active.title ?? ""}
              onChange={(e) =>
                updateActive((r) => ({ ...r, title: e.target.value || undefined }))
              }
              className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none placeholder:text-faint/50 focus:border-accent"
            />
          </Field>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <Chip tone={status.measured === status.total ? "ok" : "neutral"}>
          {status.measured}/{status.total} measured
        </Chip>
        {status.good > 0 && <Chip tone="ok">{status.good} good</Chip>}
        {status.outOfSpec > 0 && (
          <Chip tone="bad">{status.outOfSpec} out of spec</Chip>
        )}
        {status.needShims > 0 && (
          <Chip tone="warn">{status.needShims} need shims</Chip>
        )}
        {status.needShims > 0 && (
          <Link
            href="/order"
            className="font-semibold text-accent underline underline-offset-2"
          >
            see order list
          </Link>
        )}
      </div>

      <Card className="mb-5 p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
            Aim inside the band
          </h3>
          <Link
            href="/notes"
            className="text-[11px] font-semibold text-accent underline underline-offset-2"
          >
            why?
          </Link>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {(["intake", "exhaust"] as ValveType[]).map((type) => (
            <div key={type} className="flex items-center gap-2">
              <span className="text-xs capitalize text-muted">{type}</span>
              <Segmented
                label={`Aim for ${type}`}
                value={aim[type]}
                options={AIM_OPTIONS}
                onChange={(value) => setAim(type, value)}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-5">
        {banks.map((bank) => (
          <Card key={bank.bank} className="overflow-hidden">
            <h2 className="border-b border-line bg-raised/50 px-3 py-2 text-sm font-bold">
              {bank.bank}
            </h2>
            <div className="space-y-4 p-3">
              {bank.groups.map((group) => {
                const range = engine.clearance[group.type];
                return (
                  <div key={group.key}>
                    <div className="mb-2 flex items-baseline gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-accent">
                        {group.type}
                      </h3>
                      <span className="font-mono text-[11px] text-faint tabular-nums">
                        {mm(range.min)} – {mm(range.max)} mm
                      </span>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {group.positions.map((position) => (
                        <ValveCard
                          key={position.id}
                          position={position}
                          range={range}
                          aim={aim[group.type]}
                          catalogueIds={engine.catalogues}
                          reading={active.readings[position.id]}
                          onChange={(reading) =>
                            updateActive((r) => ({
                              ...r,
                              readings: { ...r.readings, [position.id]: reading },
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-faint">
        Saved on this device as you type. Use of this calculator is at your own
        risk — check everything before you build it up.
      </p>
    </div>
  );
}

/**
 * The frame number, and the one field in here that is not just record-keeping.
 *
 * A nickname tells this rider's bikes apart. The VIN tells *everybody's* bikes
 * apart, which is why the history, the charts and the shared comparison all
 * wait on it: none of them can be trusted until the app knows which physical
 * motorcycle it is looking at.
 *
 * The bike holds a VIN only while the field holds a valid one. Committing a
 * half-typed number would leave a bike identified by something that is not an
 * identifier — and, because everything downstream keys on it, would put
 * readings into the shared pool under a machine that does not exist. So an
 * incomplete entry clears it, and what is on screen and what is stored never
 * disagree.
 */
function VinField({
  bike,
  updateBike,
}: {
  bike: Bike;
  updateBike: (patch: Partial<Omit<Bike, "id">>) => void;
}) {
  const [draft, setDraft] = useState(bike.vin ?? "");
  const typed = draft.trim();
  const check = typed ? checkVin(typed) : null;

  const commit = (next: string) => {
    // Upper case as they type: a VIN has no lower case, and seeing it in the
    // form it will be stored in is what lets somebody check it against the
    // frame. Spaces and hyphens are left alone until it is read — people group
    // seventeen characters to keep their place, and stripping them mid-word
    // moves the cursor out from under them.
    const raw = next.toUpperCase();
    setDraft(raw);

    const trimmed = raw.trim();
    if (!trimmed) {
      updateBike({ vin: undefined });
      return;
    }
    const result = checkVin(trimmed);
    updateBike({ vin: result.ok ? result.vin : undefined });
  };

  const borderClass = !check
    ? "border-line focus:border-accent"
    : check.ok
      ? "border-ok/50 focus:border-ok"
      : "border-bad/50 focus:border-bad";

  return (
    <div className="mt-3 border-t border-line pt-3">
      <label className="block">
        <span className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-[11px] font-medium text-faint">
          <span>Frame number (VIN)</span>
          <span className="font-normal">17 characters, on the steering head</span>
        </span>
        <input
          type="text"
          // Phones default to sentence case and helpfully "correct" a VIN into
          // a word. Both are switched off, and the keyboard is asked to start
          // in caps.
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="VBK…"
          value={draft}
          onChange={(e) => commit(e.target.value)}
          // Room for the spaces people type while keeping their place, without
          // letting a paste of something else entirely through.
          maxLength={25}
          className={`w-full rounded-lg border bg-bg px-2.5 py-2 font-mono text-sm tracking-[0.12em] text-ink outline-none placeholder:tracking-normal placeholder:text-faint/50 ${borderClass}`}
        />
      </label>

      {!check && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
          Opens this bike&rsquo;s history, its charts and the shared comparison —
          and is how a workshop, or whoever owns it next, finds the machine
          again. The pool only ever sees a scrambled version, never the number.
        </p>
      )}

      {check && !check.ok && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-bad">
          {check.error}
        </p>
      )}

      {check?.ok && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-mono text-[11px] text-ok">
            ✓ {formatVin(check.vin)}
          </p>
          {check.year !== undefined && bike.year !== check.year && (
            // Offered, never applied. The frame says what the factory called
            // it; a rider who has been told otherwise gets to keep their
            // answer, and silently overwriting a field they filled in is the
            // fastest way to make them distrust everything else here.
            <button
              type="button"
              onClick={() => updateBike({ year: check.year })}
              className="rounded-md bg-raised px-2 py-0.5 text-[11px] font-semibold text-accent ring-1 ring-line transition-colors hover:bg-line"
            >
              Set year to {check.year}
            </button>
          )}
        </div>
      )}

      {check?.ok && check.warning && (
        <p className="mt-1 text-[11px] leading-relaxed text-warn">
          {check.warning}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}
