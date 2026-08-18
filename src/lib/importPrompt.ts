import { CATALOGUES } from "./catalogues";
import { plausibleClearance } from "./legacyImport";
import type { EngineSpec, Microns } from "./types";

/**
 * The instructions a rider hands to an AI assistant, along with their old
 * spreadsheets, so that what comes back is something this app can read.
 *
 * Generated from the engine spec and the catalogues rather than written out as
 * a block of text, because every number in it — the valve keys, the tolerances,
 * the shim sizes — has to agree exactly with what legacyImport.ts will accept.
 * A hand-kept copy would be correct on the day it was written and wrong the
 * first time an engine was added, and the rider would never know: they would
 * simply be told their file was invalid by an app that had told them what to
 * ask for.
 *
 * Written for no particular assistant. Riders have Claude, ChatGPT, Grok and
 * whatever else, on free tiers with different limits on what they can open and
 * how much they can write back, so nothing here names a tool, assumes a file
 * can be read, or assumes the whole answer arrives in one go.
 */

/**
 * Millimetres for the prompt, always with a dot.
 *
 * Deliberately not `mm` from format.ts. That one renders 2,35 for most of
 * Europe, which is right on screen and wrong here: this text is read by a
 * machine that will be copying the numbers into JSON, where a comma is a
 * separator. The rider's language is not the JSON's language.
 */
function plainMm(um: Microns): string {
  return String(um / 1000);
}

/**
 * A short label for the bike, so a paste can be checked against the bike it is
 * being pasted into.
 *
 * The nickname and not the frame number, which never goes near any of this.
 * The VIN is the one identifier that ties a real machine to somebody who has
 * never met its owner, and it is the input to this bike's pool key — putting it
 * in a prompt would post it into a third party's chat history to solve a
 * problem a nickname solves just as well. This only has to be unique among the
 * bikes in one rider's app.
 */
export function bikeTag(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    // Strips the accents that NFD has just split off, so "Orange Ténéré"
    // tags as "orange-tenere" rather than losing the letters they sat on.
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "my-bike";
}

/** The nearest size anyone actually sells, for the worked example. */
function nearestSize(sizes: Microns[], target: Microns): Microns {
  return sizes.reduce((best, size) =>
    Math.abs(size - target) < Math.abs(best - target) ? size : best,
  );
}

/**
 * A worked example, arithmetically true for whichever engine this is.
 *
 * A filled-in record carries far more than a description of one does, and it
 * carries it to the weaker models too — which is the whole audience this has
 * to survive. It shows an exhaust that failed and was shimmed, and an intake
 * that was measured and left alone, because that mixture is what nearly every
 * real service looks like and it is the part riders' sheets are least likely
 * to have recorded consistently.
 */
function workedExample(engine: EngineSpec, sizes: Microns[]): string {
  const exhaust = engine.positions.find((p) => p.type === "exhaust");
  const intake = engine.positions.find((p) => p.type === "intake");
  if (!exhaust || !intake) return "";

  const band = engine.clearance.exhaust;
  const shim = nearestSize(sizes, Math.round((sizes[0] + sizes[sizes.length - 1]) / 2));
  const measured = band.max + 10;
  const stack = shim + measured;
  const chosen = nearestSize(sizes, stack - Math.round((band.min + band.max) / 2));
  const confirmed = stack - chosen + 5;

  const intakeBand = engine.clearance.intake;
  const intakeGap = Math.round((intakeBand.min + intakeBand.max) / 2);

  return [
    "{",
    '  "format": "shim-calc-import",',
    '  "version": 1,',
    '  "bike": "BIKE-TAG",',
    '  "records": [',
    "    {",
    '      "date": "2019-04-06",',
    '      "odometer": 45210,',
    '      "title": "From 45210shimfound.xls",',
    '      "readings": {',
    `        "${exhaust.id}": { "shim": ${shim}, "clearance": ${measured},`,
    `                     "chosenShim": ${chosen}, "confirmedClearance": ${confirmed} },`,
    `        "${intake.id}": { "clearance": ${intakeGap} }`,
    "      }",
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

export function buildImportPrompt(engine: EngineSpec, tag: string): string {
  const sizes = [
    ...new Set(
      engine.catalogues.flatMap((id) =>
        (CATALOGUES[id]?.sizes ?? []).map((s) => s.um),
      ),
    ),
  ].sort((a, b) => a - b);

  const step = sizes
    .slice(1)
    .reduce((min, size, i) => Math.min(min, size - sizes[i]), Infinity);

  const keys = engine.positions
    .map((p) => `  ${p.id.padEnd(10)} ${p.label}`)
    .join("\n");

  const bands = (["intake", "exhaust"] as const).map((type) => {
    const spec = engine.clearance[type];
    const wide = plausibleClearance(engine, type);
    return `  - ${type === "intake" ? "an intake" : "an exhaust"} clearance is between ${wide.min} and ${wide.max} (spec is ${spec.min}-${spec.max})`;
  });

  return `I'm importing my motorcycle valve-service history into an app called the
Shim Calculator. I'm giving you my old spreadsheets. Turn them into JSON
that I can paste into the app.

The bike: ${engine.name}, ${engine.subtitle}, ${engine.cylinders * engine.valvesPerCylinder} valves.

START BY ASKING ME THESE TWO THINGS, and wait for my answers before you
convert anything. You cannot work either of them out reliably from the
files, and getting one wrong gets it wrong for every service:

  1. HOW DID I RECORD THE ODOMETER READING? Every service needs one and
     it is the field most likely to be missing. It might be in a cell in
     the sheet, in the filename, in a folder name, in a tab name, written
     on paper beside the computer, or nowhere at all. Ask me. If you also
     have a guess from looking at my files, say what it is so I can just
     confirm it - but ask rather than assume, and if I say it is nowhere,
     leave the field out and I will type them in myself.

  2. HOW MANY FILES MAKE UP ONE SERVICE? Some people save one file per
     service. Some save two - a "before" and an "after" - or several.
     Some keep a whole history in one sheet with a tab or a block per
     service. Work out what you can from the files, then tell me what you
     think and let me confirm before you merge or split anything.

Ask about anything else you are unsure of at the same time, so I can
answer the lot in one go.

WHAT TO PRODUCE - one JSON code block, nothing else:

${workedExample(engine, sizes).replace("BIKE-TAG", tag)}

One record per service. Nothing else: no ids, no bike details, no
timestamps. The app fills those in itself.

Leave "bike" exactly as it is above. It's the label that tells the app
which of my motorcycles these services belong to.

THE ${engine.positions.length} VALVE KEYS - use these exactly:
${keys}

Old sheets write these all sorts of ways: "FL EX", "1 Left Ex",
"front exh left". Map them onto the keys above. If you can't tell which
valve a column is, ask me.

THE FOUR NUMBERS PER VALVE, all optional:
  shim                 the shim that came out
  clearance            the gap measured before anything was changed
  chosenShim           the shim that went in
  confirmedClearance   the gap measured after it went in

Most services have only "clearance" for most valves, because a valve
that's in tolerance is left alone. That is normal. Don't fill the gaps.

UNITS: my sheets are in millimetres; the file is in whole micrometres.
${plainMm(sizes[Math.floor(sizes.length / 2)])} mm becomes ${sizes[Math.floor(sizes.length / 2)]}. 0.13 mm becomes 130. Always a whole
number, never a decimal, and never a comma.

SANITY CHECKS - if a converted number fails one of these then you've
misread a column or a unit, so tell me rather than writing it:
  - a shim is roughly between ${sizes[0] - 300} and ${sizes[sizes.length - 1]}. Stock sizes step
    in ${step}s, but plenty of riders grind their shims thinner to sit where
    they want in the band, so a thickness that is not a multiple of ${step} can
    be perfectly real. Copy what the sheet says, and never round one to
    the nearest stock size.
${bands.join("\n")}

ODOMETER: once I have answered question 1, record it exactly as I keep
it. Don't convert between kilometres and miles, and don't round it.

Never invent a reading, and never carry one service's reading over to
another. If a particular service has none, leave the field out and say
which ones - the app asks me for those, and typing in three is a great
deal better than three quiet guesses.

IF MY FILES CAME FROM THE ORIGINAL SHIM CALCULATOR SPREADSHEET, and many
of them did, they look like this and you should read them this way:

  - There is a block per valve pair, headed "Left Ex. / Right Ex." or
    "Left Int. / Right Int.", under "Front Cylinder" and again under
    "Rear Cylinder".
  - Inside each block, only two rows are measurements: "Shim" is the
    shim that was in there, "Gap" is the clearance. Ignore "Ideal shim
    size", "Order size shim" and "New Tolerance" entirely - the sheet
    calculated those, and where a measurement was left blank they hold
    nonsense like -2.389. Never copy a negative number.
  - Ignore the tall table of sizes and part numbers down the right-hand
    side. That is the shim catalogue the sheet looked things up in, not
    anybody's readings.
  - The sheet has no field for the odometer and no field for the date,
    which is why question 1 above matters: whatever I did about those, I
    did outside the file.
  - If it turns out I saved a "before" and an "after" file for a single
    service, the before one holds "shim" and "clearance" and the after
    one holds "chosenShim" and "confirmedClearance", and the two become
    one record. Don't assume that is what I did - it is one way of many,
    and question 2 above is what settles it.

DATE: "YYYY-MM-DD", and I need one for every service. If a file has no
date, ask me. If I don't know, use your best guess and put "date
approximate" in the title so I can see which ones to fix later.

RULES:
  - Never invent a reading. If a number isn't in my files, leave the
    field out. A thin history is fixable; a made-up one isn't.
  - Ask before you guess. If a column, a filename or an abbreviation is
    ambiguous, ask me. One question that settles all the files is worth
    more than ten wrong records.
  - Don't summarise or explain. Once I've answered your questions,
    reply with the JSON block and nothing else.

IF YOU CAN'T OPEN MY FILES: say so, and I'll open each sheet in Excel,
save it as CSV (File > Save As > CSV) and paste the text in instead.

IF THERE ARE TOO MANY FILES: tell me how many you can take at once.
I'll give them to you in batches and paste each answer into the app in
turn - it merges them.
`;
}
