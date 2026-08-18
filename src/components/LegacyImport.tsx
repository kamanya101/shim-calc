"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, formatOdometer, unitLabel } from "@/lib/format";
import { bikeTag } from "@/lib/importPrompt";
import {
  isImportable,
  parseLegacyImport,
  type ImportedService,
  type ParsedImport,
} from "@/lib/legacyImport";
import { useRecords } from "./RecordsProvider";
import { Button, Card, Chip } from "./ui";

/**
 * The other end of the Notes instructions: the rider pastes back whatever the
 * assistant gave them, and this shows them what it amounts to before any of it
 * is written.
 *
 * Everything here is arranged around the fact that the text is a guess. It is
 * checked hard, the guesses that failed are named in full, and the rider gets
 * the last word — including on whether any of it is ever good enough to join
 * the shared averages.
 */
export function LegacyImport() {
  const {
    engine,
    bike,
    bikes,
    bikeSaved,
    records,
    setActiveBikeId,
    updateBike,
    addImported,
    confirmImported,
  } = useRecords();
  const [raw, setRaw] = useState("");
  const [services, setServices] = useState<ImportedService[] | null>(null);
  const [fileIssues, setFileIssues] = useState<ParsedImport["issues"]>([]);
  const [pastedTag, setPastedTag] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [newName, setNewName] = useState("");

  const imported = records.filter((record) => record.source === "import");

  /**
   * No motorcycle to file these against yet — either nothing has been saved,
   * or what was saved never got a name.
   *
   * Both are stopped here rather than only the first. Somebody importing ten
   * years of history is exactly the person likely to end up with a second
   * bike, and two of them called nothing at all is a mess that has to be
   * untangled service by service afterwards.
   */
  const unnamed = !bikeSaved || !bike.name.trim();

  const check = () => {
    setAdded(null);
    const result = parseLegacyImport(raw, engine, records);
    if (!result.ok) {
      setError(result.error);
      setServices(null);
      return;
    }
    setError(null);
    setServices(result.value.services);
    setFileIssues(result.value.issues);
    setPastedTag(result.value.bikeTag);
  };

  const reset = () => {
    setRaw("");
    setServices(null);
    setFileIssues([]);
    setPastedTag(undefined);
    setError(null);
  };

  const setOdometer = (index: number, odometer: number | undefined) => {
    setServices((current) =>
      current
        ? current.map((service, i) =>
            i === index ? { ...service, odometer } : service,
          )
        : current,
    );
  };

  const commit = () => {
    if (!services) return;
    const count = addImported(services);
    setAdded(count);
    reset();
  };

  const usable = services?.filter(isImportable) ?? [];
  const wrongBike = Boolean(pastedTag && pastedTag !== bikeTag(bike.name));

  return (
    <>
      <h2 className="mt-6 mb-2 text-sm font-bold">
        Bring in your old spreadsheets
      </h2>
      <p className="mb-2 text-xs leading-relaxed text-faint">
        Hand the instructions on the{" "}
        <Link href="/notes" className="text-accent underline">
          Notes
        </Link>{" "}
        screen to an AI assistant along with your old files, then paste its
        answer here. Nothing is saved until you have seen what it found.
      </p>

      <Card className="p-3">
        {/*
          Which motorcycle comes first, before the paste box, and it is a
          choice rather than something inferred. A history filed against the
          wrong bike looks entirely correct from the outside and quietly ruins
          two sets of wear trends — and the rider is the only one who can
          actually tell them apart.
        */}
        {unnamed ? (
          <div>
            <h3 className="text-sm font-semibold">
              Name your bike before you start
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              These services have to belong to a motorcycle. Give it whatever
              you call it — you can add more bikes later, and nothing is ever
              matched on the name.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="The orange one"
                className="min-w-0 flex-1 rounded-lg bg-bg px-3 py-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-accent"
              />
              <Button
                variant="accent"
                disabled={!newName.trim()}
                onClick={() => {
                  updateBike({ name: newName.trim() });
                  setNewName("");
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">
              Which bike are these for?
            </span>
            <select
              value={bike.id}
              onChange={(event) => setActiveBikeId(event.target.value)}
              className="w-full rounded-lg bg-bg px-3 py-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-accent"
            >
              {bikes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {!unnamed && (
          <>
            <textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              rows={4}
              placeholder="Paste what the assistant gave you"
              className="mt-3 w-full resize-y rounded-lg bg-bg px-3 py-2 font-mono text-xs text-ink ring-1 ring-line outline-none focus:ring-accent"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="accent" onClick={check} disabled={!raw.trim()}>
                See what is in it
              </Button>
              {(raw || services) && (
                <Button variant="ghost" onClick={reset}>
                  Clear
                </Button>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="mt-2 rounded-lg bg-bad/10 p-2.5 text-xs leading-relaxed text-bad">
            {error}
          </p>
        )}

        {added !== null && (
          <p className="mt-2 rounded-lg bg-ok/10 p-2.5 text-xs leading-relaxed text-ok">
            {added === 0
              ? "Nothing was added — everything in that paste was either already here or had something wrong with it."
              : `Added ${added} ${added === 1 ? "service" : "services"} to ${bike.name}. Check one against the original sheet before you trust the rest.`}
          </p>
        )}

        {services && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-sm font-semibold">
              {usable.length === 0
                ? "Nothing here can be added yet"
                : `Adding ${usable.length} ${usable.length === 1 ? "service" : "services"} to ${bike.name}`}
            </p>

            {wrongBike && (
              <p className="mt-2 rounded-lg bg-warn/10 p-2.5 text-xs leading-relaxed text-warn">
                These are tagged &ldquo;{pastedTag}&rdquo;, which is not{" "}
                {bike.name}. If they belong to another bike, choose it above
                before you add them.
              </p>
            )}

            {fileIssues.map((issue, index) => (
              <p
                key={index}
                className="mt-2 rounded-lg bg-warn/10 p-2.5 text-xs leading-relaxed text-warn"
              >
                {issue.message}
              </p>
            ))}

            <ul className="mt-3 space-y-2">
              {services.map((service, index) => (
                <ServiceRow
                  key={index}
                  service={service}
                  units={bike.units}
                  onOdometer={(value) => setOdometer(index, value)}
                />
              ))}
            </ul>

            {usable.length > 0 && (
              <div className="mt-3">
                <Button variant="accent" onClick={commit}>
                  Add {usable.length}{" "}
                  {usable.length === 1 ? "service" : "services"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {imported.length > 0 && (
        <Card className="mt-2 p-3">
          <h3 className="text-sm font-semibold">
            {imported.length} imported{" "}
            {imported.length === 1 ? "service" : "services"}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            These are on your charts and in your own history already. They are
            held back from the shared averages, because nobody measured them
            into the app — an assistant read them off a spreadsheet. Once you
            have checked them against your sheets, they can join the rest.
          </p>
          <div className="mt-2">
            <Button
              onClick={() => {
                if (
                  confirm(
                    `Confirm ${imported.length} imported ${imported.length === 1 ? "service" : "services"} on ${bike.name} as real measurements?`,
                  )
                ) {
                  confirmImported();
                }
              }}
            >
              I have checked these
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

function ServiceRow({
  service,
  units,
  onOdometer,
}: {
  service: ImportedService;
  units: "km" | "mi" | undefined;
  onOdometer: (value: number | undefined) => void;
}) {
  const ok = isImportable(service);
  const valves = Object.keys(service.readings).length;
  const blocked = service.issues.some((issue) => issue.level === "error");
  // The odometer complaint answers itself the moment the rider types one in.
  const shown = service.issues.filter(
    (issue) => issue.field !== "odometer" || service.odometer === undefined,
  );

  return (
    <li
      className={`rounded-lg border p-2.5 ${
        ok ? "border-line bg-bg" : "border-line bg-bg opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-semibold">
          {formatOdometer(service.odometer, units)}
        </span>
        <span className="text-xs text-faint">{formatDate(service.date)}</span>
        {ok ? (
          <Chip tone="ok">
            {valves} {valves === 1 ? "valve" : "valves"}
          </Chip>
        ) : service.duplicate ? (
          <Chip tone="neutral">already here</Chip>
        ) : (
          <Chip tone="bad">not added</Chip>
        )}
      </div>

      {service.title && (
        <p className="mt-0.5 truncate text-xs text-muted">{service.title}</p>
      )}

      {/*
        Offered whenever the reading is missing and the service is otherwise
        sound. There is no point asking somebody to remember an odometer for a
        service that is going to be thrown out for having its clearances in
        millimetres.
      */}
      {service.odometer === undefined && !blocked && !service.duplicate && (
        <label className="mt-1.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">
            Odometer ({unitLabel(units)})
          </span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="49000"
            onChange={(event) => {
              const value = Number(event.target.value);
              onOdometer(
                event.target.value.trim() === "" ||
                  !Number.isFinite(value) ||
                  value < 0
                  ? undefined
                  : Math.round(value),
              );
            }}
            className="w-28 rounded-lg bg-surface px-2 py-1 text-sm text-ink ring-1 ring-line outline-none focus:ring-accent"
          />
        </label>
      )}

      {shown.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {shown.map((issue, index) => (
            <li
              key={index}
              className={`text-xs leading-relaxed ${
                issue.level === "error" ? "text-bad" : "text-warn"
              }`}
            >
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
