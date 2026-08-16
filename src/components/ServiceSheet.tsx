"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/app";
import type { Aim } from "@/lib/calc";
import { groupsByBank } from "@/lib/engines";
import { mm, todayIso } from "@/lib/format";
import { sheetStatus } from "@/lib/report";
import type { ValveType } from "@/lib/types";
import { useRecords } from "./RecordsProvider";
import { ValveCard } from "./ValveCard";
import { Button, Card, Chip, PageHeader, Segmented } from "./ui";

const AIM_OPTIONS: { value: Aim; label: string }[] = [
  { value: "min", label: "Tight" },
  { value: "middle", label: "Middle" },
  { value: "max", label: "Loose" },
];

export function ServiceSheet() {
  const { ready, engine, active, aim, setAim, updateActive, startNew } =
    useRecords();

  if (!ready) {
    return <p className="p-4 text-sm text-faint">Loading…</p>;
  }

  const status = sheetStatus(engine, active, aim);
  const banks = groupsByBank(engine);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <PageHeader
        title={APP_NAME}
        subtitle={`${engine.name} · ${engine.subtitle}`}
        action={
          <Button variant="ghost" onClick={startNew}>
            New service
          </Button>
        }
      />

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
          <Field label="Odometer">
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
