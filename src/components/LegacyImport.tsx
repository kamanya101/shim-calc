"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, formatOdometer } from "@/lib/format";
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
  const { engine, bike, records, addImported, confirmImported } = useRecords();
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);

  const imported = records.filter((record) => record.source === "import");
  const tag = bikeTag(bike.name);

  const check = () => {
    setAdded(null);
    const result = parseLegacyImport(raw, engine, records);
    if (!result.ok) {
      setError(result.error);
      setParsed(null);
      return;
    }
    setError(null);
    setParsed(result.value);
  };

  const reset = () => {
    setRaw("");
    setParsed(null);
    setError(null);
  };

  const commit = () => {
    if (!parsed) return;
    const count = addImported(parsed.services);
    setAdded(count);
    setRaw("");
    setParsed(null);
  };

  const usable = parsed?.services.filter(isImportable) ?? [];
  const wrongBike = Boolean(parsed?.bikeTag && parsed.bikeTag !== tag);

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
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          rows={4}
          placeholder="Paste what the assistant gave you"
          className="w-full resize-y rounded-lg bg-bg px-3 py-2 font-mono text-xs text-ink ring-1 ring-line outline-none focus:ring-accent"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="accent" onClick={check} disabled={!raw.trim()}>
            See what is in it
          </Button>
          {(raw || parsed) && (
            <Button variant="ghost" onClick={reset}>
              Clear
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-2 rounded-lg bg-bad/10 p-2.5 text-xs leading-relaxed text-bad">
            {error}
          </p>
        )}

        {added !== null && (
          <p className="mt-2 rounded-lg bg-ok/10 p-2.5 text-xs leading-relaxed text-ok">
            {added === 0
              ? "Nothing was added — everything in that paste was either already here or had something wrong with it."
              : `Added ${added} ${added === 1 ? "service" : "services"}. Check one against the original sheet before you trust the rest.`}
          </p>
        )}

        {parsed && (
          <Preview
            parsed={parsed}
            usable={usable.length}
            wrongBike={wrongBike}
            bikeName={bike.name}
            units={bike.units}
            onCommit={commit}
          />
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

function Preview({
  parsed,
  usable,
  wrongBike,
  bikeName,
  units,
  onCommit,
}: {
  parsed: ParsedImport;
  usable: number;
  wrongBike: boolean;
  bikeName: string;
  units: "km" | "mi" | undefined;
  onCommit: () => void;
}) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-sm font-semibold">
        {usable === 0
          ? "Nothing here can be added"
          : `Adding ${usable} ${usable === 1 ? "service" : "services"} to ${bikeName}`}
      </p>

      {/*
        The wrong-bike warning outranks everything else on this panel. Every
        other problem shows itself later — a strange number on a chart, a date
        out of place — but a history filed against the wrong motorcycle looks
        entirely correct from the outside and quietly ruins both bikes' wear
        trends.
      */}
      {wrongBike && (
        <p className="mt-2 rounded-lg bg-warn/10 p-2.5 text-xs leading-relaxed text-warn">
          These are tagged &ldquo;{parsed.bikeTag}&rdquo;, which is not{" "}
          {bikeName}. If they belong to another bike, switch to it above before
          you add them.
        </p>
      )}

      {parsed.issues.map((issue, index) => (
        <p
          key={index}
          className="mt-2 rounded-lg bg-warn/10 p-2.5 text-xs leading-relaxed text-warn"
        >
          {issue.message}
        </p>
      ))}

      <ul className="mt-3 space-y-2">
        {parsed.services.map((service, index) => (
          <ServiceRow key={index} service={service} units={units} />
        ))}
      </ul>

      {usable > 0 && (
        <div className="mt-3">
          <Button variant="accent" onClick={onCommit}>
            Add {usable} {usable === 1 ? "service" : "services"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  units,
}: {
  service: ImportedService;
  units: "km" | "mi" | undefined;
}) {
  const ok = isImportable(service);
  const valves = Object.keys(service.readings).length;

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

      {service.issues.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {service.issues.map((issue, index) => (
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
