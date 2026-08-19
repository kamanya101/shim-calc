/**
 * Build 260 fictitious LC8 owners, the bikes they keep, and the services they
 * have logged — as a population, not as a list of readings.
 *
 * Nothing here talks to a server: it writes members.json, which push.mjs then
 * feeds through the app's own sign-up, sync and pool code.
 *
 * WHAT CHANGED FROM THE FIRST CUT
 *
 * The first version gave every account exactly one bike and every bike a full
 * history, which is a tidy dataset and a population that cannot exist. Riders
 * own two bikes; riders create an entry and never log a service; a workshop
 * holds a customer's machine alongside its own. Each of those is a code path
 * the app has, and none of them were being exercised. So:
 *
 *   260 accounts   85% one bike, 10% two, 5% three          -> 312 bikes
 *   312 bikes      60% carry services, 40% carry none
 *   302 machines   the other 10 bikes are a second account's
 *                  copy of a machine already here, same frame number
 *
 * The 40% with nothing logged are not padding. A bike with no services is the
 * state every rider passes through on the day they join, and it is the state
 * the VIN gate, the empty History and the empty Compare all have to answer for.
 */
import { writeFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";

// Seeded so a re-run reproduces the same riders exactly. Changing this number
// reshuffles every email, uuid and token in the file — which is why a half-
// finished seeding run has to be cleared from the database before a re-run,
// rather than resumed against a regenerated file.
let state = 20260819;
const rnd = () => {
  state |= 0; state = (state + 0x6D2B79F5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + rnd() * (hi - lo);
const int = (lo, hi) => Math.floor(between(lo, hi + 1));
const chance = (p) => rnd() < p;
/** Box-Muller, for wear rates that cluster near zero with a tail. */
const gauss = (mean, sd) => {
  const u = Math.max(rnd(), 1e-9);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
};
/** Pareto on 0..1: most mass near 0, a long thin tail towards 1. */
const pareto01 = (alpha) => Math.min(1, (Math.pow(1 - rnd() * 0.999, -1 / alpha) - 1) / 6);
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ACCOUNTS = 260;

const ENGINE = "ktm-lc8-950-990";
const POSITIONS = [
  ["f-ex-l", "exhaust"], ["f-ex-r", "exhaust"], ["f-in-l", "intake"], ["f-in-r", "intake"],
  ["r-in-l", "intake"], ["r-in-r", "intake"], ["r-ex-l", "exhaust"], ["r-ex-r", "exhaust"],
].map(([id, type]) => ({ id, type }));

// engines.ts: intake 100-150 um, exhaust 250-300 um.
const SPEC = {
  intake: { min: 100, max: 150, mid: 125 },
  exhaust: { min: 250, max: 300, mid: 275 },
};

// catalogues.ts tops out at 3.000 mm; 0.025 steps are the Harley column.
const SHIM_MIN = 2125, SHIM_MAX = 3000, SHIM_STEP = 25;
const step25 = (v) =>
  Math.min(SHIM_MAX, Math.max(SHIM_MIN, Math.round(v / SHIM_STEP) * SHIM_STEP));

const MODELS = [
  ["950-adventure", "950"], ["950-adventure-s", "950"], ["950-supermoto", "950"],
  ["950-super-enduro-r", "950"], ["990-adventure", "990"], ["990-adventure-s", "990"],
  ["990-adventure-r", "990"], ["990-adventure-dakar", "990"], ["990-super-duke", "990"],
  ["990-super-duke-r", "990"], ["990-supermoto", "990"], ["990-supermoto-r", "990"],
  ["990-supermoto-t", "990"],
].map(([id, family]) => ({ id, family }));

// Production years, kept inside what a VIN can decode (2003-2013).
const YEARS = { "950": [2003, 2009], "990": [2006, 2013] };
const YEAR_CHAR = {
  2003: "3", 2004: "4", 2005: "5", 2006: "6", 2007: "7", 2008: "8",
  2009: "9", 2010: "A", 2011: "B", 2012: "C", 2013: "D",
};
const VIN_ALPHABET = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
const TRANS = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** A structurally valid KTM frame number whose check digit actually verifies. */
function makeVin(year) {
  const body = Array.from({ length: 17 }, () => pick(VIN_ALPHABET.split("")));
  "VBK".split("").forEach((c, i) => { body[i] = c; });
  body[9] = YEAR_CHAR[year];
  body[10] = pick(["M", "U"]);
  for (let i = 11; i < 17; i++) body[i] = String(int(0, 9));
  body[8] = "0";
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = body[i];
    sum += (/\d/.test(ch) ? Number(ch) : TRANS[ch]) * WEIGHTS[i];
  }
  const r = sum % 11;
  body[8] = r === 10 ? "X" : String(r);
  return body.join("");
}

const FIRST = ["Jan", "Pieter", "Andre", "Morne", "Hendrik", "Willem", "Riaan", "Kobus", "Deon", "Francois", "Stefan", "Marius", "Ruan", "Gerhard", "Anton", "Dawid", "Tobias", "Lukas", "Christo", "Wynand", "Bernard", "Jaco", "Ivan", "Thys", "Nico", "Ewald", "Hugo", "Cobus", "Danie", "Louis", "Sean", "Craig", "Grant", "Trevor", "Neil", "Bruce", "Duncan", "Gavin", "Keith", "Ryan", "Mateus", "Tiaan", "Werner", "Barend", "Corne", "Reinhardt", "Schalk", "Hannes", "Fanie", "Gideon"];
const LAST = ["Vermeulen", "Bothma", "Kruger", "Nel", "Steyn", "Fourie", "Venter", "Grobler", "Olivier", "Swanepoel", "Coetzee", "Pretorius", "Joubert", "Erasmus", "Lombard", "Naude", "Roux", "Buys", "Muller", "Viljoen", "Barnard", "Cronje", "Delport", "Ferreira", "Gouws", "Human", "Jordaan", "Kotze", "Labuschagne", "Meyer", "Odendaal", "Potgieter", "Rossouw", "Schoeman", "Theron", "Uys", "Visser", "Wessels", "Zietsman", "Bezuidenhout", "Marais", "Louw", "Smit", "Terblanche", "Engelbrecht", "Greeff", "Hattingh", "Jacobs", "Kemp", "Lategan"];
const NICKNAMES = ["The Orange One", "Bakkie", "Donkey", "Ou Grootjie", "Rusty", "The Mule", "Bokkie", "Big Bird", "Tangerine", "Katvis", "Pumba", "Sputnik", "Skollie", "The Beast", "Ambulance", "Rooibok", "Duiwel", "Kalahari", "Nommer Twee", "Orange Crush"];
const TITLES = ["Valve check", "Annual service", "Shim service", "Pre-trip check", "Valve clearance check", "Top-end service", "Winter service", "Valve check + coolant", "Chain, oil, valves", "Shims before Namibia"];

const iso = (d) => d.toISOString();
const isoDate = (d) => d.toISOString().slice(0, 10);
const dateAt = (yearFloat) => {
  const y = Math.floor(yearFloat);
  return new Date(Date.UTC(y, 0, 1) + (yearFloat - y) * 365.25 * 86400000);
};

const KM_PER_MILE = 1.609344;
const fromKm = (km, units) => (units === "mi" ? Math.round(km / KM_PER_MILE) : km);

// ------------------------------------------------------------------- parts --

/**
 * The tick-list, in the order serviceItems.ts declares it.
 *
 * Stored ticks must be in list order — sortItems() in the app holds them that
 * way so that two devices ticking the same parts in different sequences do not
 * read as a difference and push at each other forever. The seeder writes rows
 * the app will later sync against, so it has to obey the same rule; a copy of
 * the order is kept here rather than imported because this file is deliberately
 * offline, and the ordering is asserted against the app's own list at the end.
 */
const ITEM_ORDER = [
  "oil-50w", "oil-60w", "air-filter", "oil-filter", "coolant", "chain",
  "front-sprocket", "rear-sprocket", "front-pads", "rear-pads", "battery",
  "clutch-plates", "engine-parts", "chassis-parts",
];
const ITEM_RANK = new Map(ITEM_ORDER.map((id, i) => [id, i]));
const sortItems = (ids) =>
  [...new Set(ids)].sort((a, b) => ITEM_RANK.get(a) - ITEM_RANK.get(b));

/**
 * Which oil went in, decided by the odometer at that service rather than by the
 * bike's model year.
 *
 * A high-mileage LC8 gets the thicker 60 weight; a low-mileage one gets 50.
 * Driving it off the reading at the time, not off the bike, means a machine
 * that has covered 140,000 km shows 50W early in its log and 60W later — which
 * is what actually happens, and it gives anything counting oil grades a real
 * transition to find rather than a label stamped on the whole history.
 *
 * The 12% either side is riders who have their own view about it, which is most
 * of them. Without that, "oil grade by mileage" would come back as a clean step
 * function, and no question worth asking has a clean step function for an
 * answer.
 */
const THICK_FROM_KM = 60000;
function oilGrade(odoKm) {
  const thick = odoKm >= THICK_FROM_KM;
  return chance(0.88) === thick ? "oil-60w" : "oil-50w";
}

/**
 * What else was replaced at this service.
 *
 * Almost every valve service is done with the engine open and the tank off, so
 * the oil and both filters go in at the same time — those three are the norm
 * and everything else is occasional. Chain and sprockets are drawn together
 * because nobody fits a chain to worn sprockets.
 */
function serviceItemsFor(odoKm) {
  const ticks = [];
  if (chance(0.92)) ticks.push(oilGrade(odoKm));
  if (chance(0.86)) ticks.push("oil-filter");
  if (chance(0.81)) ticks.push("air-filter");
  if (chance(0.16)) ticks.push("coolant");
  if (chance(0.22)) {
    ticks.push("chain");
    if (chance(0.55)) ticks.push("front-sprocket");
    if (chance(0.5)) ticks.push("rear-sprocket");
  } else {
    if (chance(0.05)) ticks.push("front-sprocket");
    if (chance(0.05)) ticks.push("rear-sprocket");
  }
  if (chance(0.19)) ticks.push("front-pads");
  if (chance(0.11)) ticks.push("rear-pads");
  if (chance(0.07)) ticks.push("battery");
  if (chance(0.04)) ticks.push("clutch-plates");
  if (chance(0.05)) ticks.push("engine-parts");
  if (chance(0.04)) ticks.push("chassis-parts");
  return sortItems(ticks);
}

// --------------------------------------------------------------- machines ---

/**
 * 302 distinct motorcycles. Ten of them will be held by a second account as
 * well, which is what takes the bike count to 312 without inventing eleven
 * more engines.
 */
const MACHINES = 302;
const BIKES = 312;

const machines = [];
for (let i = 0; i < MACHINES; i++) {
  const model = MODELS[i % MODELS.length];
  const [y0, y1] = YEARS[model.family];
  machines.push({
    modelId: model.id,
    family: model.family,
    year: int(y0, y1),
    interval: serviceInterval(),
  });
}

// Exact proportions, assigned by shuffling rather than by rolling dice each
// time, so 50% really is 151 bikes and not "about that".
const order = shuffle(machines.map((_, i) => i));
const band = (n) => order.splice(0, n);
band(15).forEach((i) => { machines[i].odoKm = Math.round(between(1200, 9800)); });
band(121).forEach((i) => { machines[i].odoKm = Math.round(10000 + pareto01(1.6) * 29000); });
band(151).forEach((i) => { machines[i].odoKm = Math.round(40000 + pareto01(1.3) * 79000); });
band(15).forEach((i) => { machines[i].odoKm = Math.round(120000 + pareto01(1.4) * 100000); });

shuffle(machines.map((_, i) => i)).slice(0, 151).forEach((i) => { machines[i].units = "mi"; });
machines.forEach((m) => { m.units ??= "km"; });
shuffle(machines.map((_, i) => i)).slice(0, 242).forEach((i) => { machines[i].hasVin = true; });

// -------------------------------------------------------------- geography ---

/**
 * Where each bike lives.
 *
 * A property of the motorcycle, not of the reading — same reasoning as the
 * pool token: the bike is the thing that sits in one country's dust and heat,
 * so it is stamped once and carried onto everything that bike contributes.
 *
 * The shape follows adventure-bike sales rather than population: South Africa
 * and Australia carry far more LC8s per head than the raw market numbers would
 * put there, because that is where the riding is. ZA at 53 and AU at 22 out of
 * 312 is a deliberate over-weight and was confirmed as the intended shape.
 *
 * It is also deliberately lumpy, straddling the min_bikes = 3 threshold in
 * pool_shim_distribution so both paths get exercised:
 *
 *   4 countries at 22+     comfortably shown
 *  11 countries at 3-15    shown, some only just
 *  17 countries at 1-2     suppressed at country level
 *
 * Asia (6 bikes) and South America (7) have NO country reaching 3, so the
 * continent tier is the only thing that can answer for them. That is the
 * fallback's test case, and it is why those two are shaped that way.
 */
const COUNTRY_PLAN = [
  ["ZA", "Africa", 53], ["NA", "Africa", 7], ["BW", "Africa", 6],
  ["ZW", "Africa", 2], ["KE", "Africa", 1], ["MZ", "Africa", 1],

  ["DE", "Europe", 39], ["GB", "Europe", 32], ["AT", "Europe", 15],
  ["FR", "Europe", 10], ["ES", "Europe", 7], ["NL", "Europe", 6],
  ["IT", "Europe", 6], ["SE", "Europe", 5], ["CH", "Europe", 2],
  ["PT", "Europe", 1], ["PL", "Europe", 1],

  ["US", "North America", 35], ["CA", "North America", 10], ["MX", "North America", 2],

  ["AU", "Oceania", 22], ["NZ", "Oceania", 5],

  ["JP", "Asia", 2], ["TH", "Asia", 1], ["IN", "Asia", 1],
  ["AE", "Asia", 1], ["MY", "Asia", 1],

  ["BR", "South America", 2], ["AR", "South America", 2], ["CL", "South America", 1],
  ["PE", "South America", 1], ["UY", "South America", 1],
];

/**
 * Region and city, for the countries that have enough bikes to be worth
 * splitting. Everywhere else gets a country and nothing finer.
 *
 * These stay on the rider's own bike row and never reach the pool. A pooled
 * reading already carries model, year, month and odometer; add a city and it
 * names one machine in any town holding two, which is the single thing
 * pooled_readings exists never to do.
 */
const PLACES = {
  ZA: [["Gauteng", "Johannesburg"], ["Gauteng", "Pretoria"], ["Western Cape", "Cape Town"],
       ["KwaZulu-Natal", "Durban"], ["North West", "Rustenburg"], ["Eastern Cape", "Gqeberha"],
       ["Free State", "Bloemfontein"], ["Mpumalanga", "Nelspruit"]],
  AU: [["New South Wales", "Sydney"], ["Victoria", "Melbourne"], ["Queensland", "Brisbane"],
       ["Western Australia", "Perth"], ["South Australia", "Adelaide"],
       ["Tasmania", "Hobart"], ["Northern Territory", "Alice Springs"]],
  DE: [["Bayern", "Munchen"], ["Nordrhein-Westfalen", "Koln"], ["Baden-Wurttemberg", "Stuttgart"],
       ["Berlin", "Berlin"], ["Hessen", "Frankfurt"], ["Niedersachsen", "Hannover"]],
  GB: [["England", "London"], ["England", "Manchester"], ["England", "Bristol"],
       ["Scotland", "Edinburgh"], ["Scotland", "Inverness"], ["Wales", "Cardiff"]],
  US: [["California", "Los Angeles"], ["Texas", "Austin"], ["Colorado", "Denver"],
       ["Arizona", "Phoenix"], ["Washington", "Seattle"], ["Utah", "Moab"],
       ["Montana", "Bozeman"], ["North Carolina", "Asheville"]],
  AT: [["Wien", "Wien"], ["Tirol", "Innsbruck"], ["Salzburg", "Salzburg"], ["Steiermark", "Graz"]],
  FR: [["Ile-de-France", "Paris"], ["Occitanie", "Toulouse"], ["Provence-Alpes-Cote d'Azur", "Marseille"],
       ["Auvergne-Rhone-Alpes", "Lyon"]],
  CA: [["British Columbia", "Vancouver"], ["Alberta", "Calgary"], ["Ontario", "Toronto"],
       ["Quebec", "Montreal"]],
  ES: [["Madrid", "Madrid"], ["Catalunya", "Barcelona"], ["Andalucia", "Malaga"]],
  IT: [["Lombardia", "Milano"], ["Lazio", "Roma"], ["Toscana", "Firenze"]],
  NL: [["Noord-Holland", "Amsterdam"], ["Zuid-Holland", "Rotterdam"], ["Gelderland", "Arnhem"]],
  SE: [["Stockholm", "Stockholm"], ["Vastra Gotaland", "Goteborg"], ["Skane", "Malmo"]],
  NA: [["Khomas", "Windhoek"], ["Erongo", "Swakopmund"]],
  BW: [["South-East", "Gaborone"], ["North-West", "Maun"]],
  NZ: [["Auckland", "Auckland"], ["Canterbury", "Christchurch"], ["Otago", "Queenstown"]],
};

/**
 * THE PLANTED SIGNAL — the known answer this dataset can be checked against.
 *
 * Two countries wear measurably faster than the rest. Every valve on a bike in
 * one of them has its drift rate multiplied, so the effect is in the data
 * rather than sprinkled on afterwards:
 *
 *   ZA  x 1.12   (+12% clearance movement per 1,000 km)  53 bikes
 *   AU  x 1.08   (+8%)                                   22 bikes
 *
 * Everywhere else is x 1.00. Both samples sit well clear of min_bikes, so a
 * working comparison must surface ZA as the fastest and AU as second. If it
 * does not, the comparison is wrong — not the data.
 *
 * It reads back attenuated, and that is not a bug: a faster-wearing valve hits
 * the spec limit sooner and gets a shim change, and intervals containing a shim
 * change have to be excluded from any clean wear measurement. The fastest wear
 * systematically removes its own evidence, so a correct comparison will always
 * understate a real geographic effect.
 */
const WEAR_MULTIPLIER = { ZA: 1.12, AU: 1.08 };

// Dealt out exactly rather than rolled, so the counts above are the counts you
// get. 30 bikes (10%) are left with none, standing in for a rider who joined
// with no signal or waved the suggestion away; those count towards the global
// figures and nothing else.
const forCountry = shuffle(machines.map((_, i) => i));
forCountry.splice(0, MACHINES - COUNTRY_PLAN.reduce((n, [, , k]) => n + k, 0));
for (const [code, continent, n] of COUNTRY_PLAN) {
  for (const i of forCountry.splice(0, n)) {
    machines[i].country = code;
    machines[i].continent = continent;
  }
}
if (forCountry.length) throw new Error(`${forCountry.length} bikes left over`);

/**
 * Region and city are offered by the edge and confirmed by the rider, so a
 * fair share of bikes carry a country and nothing finer: the rider dismissed
 * the suggestion, or joined with no signal and typed only what they knew.
 */
for (const m of machines) {
  const places = PLACES[m.country];
  if (places && chance(0.82)) {
    const [region, city] = pick(places);
    m.region = region;
    m.city = city;
  }
}

/**
 * The year this rider started writing their numbers down.
 *
 * Take-up rises linearly from 10% in 2011 — when the spreadsheet first went
 * round the forum — to everybody now. Modelled as a start year rather than as
 * a coin flip per service: somebody who keeps a log keeps it, and flipping per
 * service would shred every history into ones and twos.
 */
const startedLogging = () => {
  const u = rnd();
  return u <= 0.1 ? 2011 : 2011 + ((u - 0.1) / 0.9) * (2026.6 - 2011);
};

// ------------------------------------------------------------------ history --

/**
 * How often this owner pulls the cams.
 *
 * Most follow the book at roughly 7,000 km. A fair number are keener and do it
 * every 5,000. A handful race the thing and check after every event, which is
 * why their logs are long and their numbers barely move: at 1,500 km a valve
 * has worn well under a micron, so what varies between their services is the
 * feeler gauge, not the engine.
 */
function serviceInterval() {
  const u = rnd();
  if (u < 0.04) return { km: between(900, 2400), kind: "race" };
  if (u < 0.30) return { km: between(4600, 5400), kind: "keen" };
  return { km: between(6400, 7600), kind: "book" };
}

/** Every valve service this bike has ever had, logged or not. */
function serviceEvents(m) {
  const age = Math.max(1.2, 2026.63 - m.year);
  const events = [];
  let odo = 1000;                       // the 1,000 km warranty check
  while (odo <= m.odoKm && events.length < 400) {
    const yearFloat = m.year + 0.45 + (odo / m.odoKm) * age * between(0.92, 1.05);
    events.push({ odoKm: Math.round(odo), yearFloat: Math.min(yearFloat, 2026.6) });
    odo += m.interval.km * between(0.88, 1.12);
  }
  return events;
}

function startingClearance(type) {
  const s = SPEC[type];
  if (chance(0.18)) return Math.round(between(s.min - 25, s.max + 25));
  return Math.round(between(s.min + 5, s.max - 5));
}

/** Shim spread: pareto, sitting low in the range with a tail to 3.00 mm. */
const startingShim = () => step25(2200 + pareto01(1.5) * 800);

function newValves(country) {
  // The planted signal. Applied to the magnitude, so a faster country moves
  // further in whichever direction that valve was already going rather than
  // having its direction changed.
  const harsh = WEAR_MULTIPLIER[country] ?? 1;
  const valves = {};
  for (const p of POSITIONS) {
    const drift = p.type === "intake"
      ? -Math.abs(gauss(0.42, 0.34))
      : Math.abs(gauss(0.20, 0.26)) * (chance(0.12) ? -0.4 : 1);
    valves[p.id] = {
      shim: startingShim(),
      clearance: startingClearance(p.type),
      rate: (Math.max(-1.5, Math.min(1.1, drift)) * harsh) / 1000,   // um per km
      moved: 0,
      lastOdo: 0,
    };
  }
  return valves;
}

/** Measure one valve at one service, adjusting the shim if it is out of spec. */
function measure(v, type, odoKm) {
  v.clearance += v.rate * (odoKm - v.lastOdo);
  v.lastOdo = odoKm;

  const spec = SPEC[type];
  // What the feeler gauge said, which is not quite what the gap is. Deliberately
  // not fed back into v.clearance: reading error must not accumulate into the
  // engine's true state, or a bike checked twenty times would wander off on
  // measurement noise alone.
  const measured = Math.round(v.clearance + gauss(0, 2.5));
  const shimIn = v.shim;
  let chosenShim, confirmedClearance;

  if (measured < spec.min || measured > spec.max) {
    // Cumulative shim movement is capped at 0.5 mm over the bike's life.
    const wanted = step25(shimIn + (measured - spec.mid));
    const room = Math.max(0, 500 - Math.abs(v.moved));
    const delta = Math.sign(wanted - shimIn) * Math.min(Math.abs(wanted - shimIn), room);
    const next = step25(shimIn + delta);
    if (next !== shimIn) {
      v.moved += next - shimIn;
      v.shim = next;
      v.clearance = measured - (next - shimIn) + gauss(0, 3);
      chosenShim = next;
      confirmedClearance = Math.round(v.clearance);
    }
  } else if (chance(0.3)) {
    confirmedClearance = measured + Math.round(gauss(0, 2));   // rechecked, left alone
  }

  return {
    shim: shimIn,
    clearance: measured,
    ...(chosenShim === undefined ? {} : { chosenShim }),
    ...(confirmedClearance === undefined ? {} : { confirmedClearance }),
  };
}

/**
 * Walk a bike's whole life, and return only the services that were logged.
 * The unlogged ones still happen and the shims still move, which is why a
 * rider who started logging in 2019 shows a plausible starting point rather
 * than a factory-fresh one.
 */
function history(events, logged, country) {
  const valves = newValves(country);
  const services = [];

  for (const event of events) {
    const isLogged = logged.includes(event);
    const readings = {};
    for (const p of POSITIONS) {
      const reading = measure(valves[p.id], p.type, event.odoKm);
      if (!isLogged) continue;
      if (chance(0.03)) continue;       // a valve the rider never got to
      readings[p.id] = reading;
    }
    if (isLogged && Object.keys(readings).length) {
      const when = dateAt(event.yearFloat);
      services.push({ odoKm: event.odoKm, date: isoDate(when), at: iso(when), readings });
    }
  }
  return { services, valves };
}

// ---------------------------------------------------------- who logs what ---

/**
 * 60% of bikes carry services; 40% carry none at all.
 *
 * Which 40% is not a free choice. A bike that has covered 150,000 km and has
 * nothing logged is a rider who joined and never came back, and there are some
 * of those — but weighting the empty ones towards low mileage puts most of them
 * where they actually belong, on machines whose owners have only just started.
 */
const SHARED = 10;                            // workshop copies, all of which log
const LOGGING = Math.round(BIKES * 0.6);      // 187 bikes carrying services
const EMPTY = MACHINES - (LOGGING - SHARED);  // so 125 of the 302 own bikes are bare

const plans = machines.map((m) => {
  const events = serviceEvents(m);
  const from = startedLogging();
  let eligible = events.filter((e) => e.yearFloat >= from);
  if (!eligible.length) {
    const last = events[events.length - 1];
    last.yearFloat = between(2025.2, 2026.6);
    eligible = [last];
  }
  return { m, events, eligible, want: 0 };
});

// Rank by a mileage-weighted coin: low-mileage bikes are likelier to be the
// empty ones, without making it a rule that every new bike is empty.
const emptyRank = plans
  .map((p, i) => ({ i, k: p.m.odoKm * between(0.35, 1.9) }))
  .sort((a, b) => a.k - b.k);
const empties = new Set(emptyRank.slice(0, EMPTY).map((e) => e.i));

// Of the bikes that do log, 10% carry one service and 10% carry ten, the rest
// on a pareto curve — ranked by how much history the bike can actually support,
// which is driven by mileage. A machine that has only covered 12,000 km cannot
// show ten services however keen its owner.
const loggers = plans
  .map((p, i) => ({ i, k: Math.min(p.events.length, 10) * 1000 + p.m.odoKm }))
  .filter((e) => !empties.has(e.i))
  .sort((a, b) => a.k - b.k);
const tenth = Math.round(loggers.length * 0.1);
loggers.forEach((entry, rank) => {
  const plan = plans[entry.i];
  const share = rank / Math.max(1, loggers.length - 1);
  let want;
  if (rank < tenth) want = 1;
  else if (rank >= loggers.length - tenth) want = 10;
  else want = Math.max(2, Math.min(9, Math.round(2 + pareto01(1.1) * 5 + share * 3)));
  plan.want = Math.max(1, Math.min(want, plan.events.length));
});

// ------------------------------------------------------------------ people --

const used = new Set();
function person() {
  for (;;) {
    const first = pick(FIRST), last = pick(LAST);
    const email = `${first}.${last}${int(2, 99)}@seed.invalid`.toLowerCase();
    if (used.has(email)) continue;
    used.add(email);
    return { name: `${first} ${last}`, email, password: `Seed-${randomBytes(6).toString("hex")}` };
  }
}

const title = (id) => id.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/**
 * Build one bike and its services from a machine plan.
 *
 * `source: "import"` marks a history typed in from an old spreadsheet rather
 * than recorded in the app. pool.ts folds that marker into the same branch as a
 * deleted bike, so those readings are actively RETRACTED from the pool until
 * the rider confirms them — which makes it the one invariant here with a sharp
 * edge, and worth having in the data: import a history, the pool must not move.
 * It is applied to the OLDEST services of a log, because that is what somebody
 * transcribing a paper book actually produces.
 */
function buildBike(plan, { imported = false } = {}) {
  const { m, events, eligible, want } = plan;
  const bikeId = randomUUID();
  const bike = {
    id: bikeId,
    name: chance(0.45) ? pick(NICKNAMES) : title(m.modelId),
    modelId: m.modelId,
    year: m.year,
    ...(m.hasVin ? { vin: makeVin(m.year) } : {}),
    poolToken: randomBytes(32).toString("hex"),
    units: m.units,
    country: m.country ?? null,
    region: m.region ?? null,
    city: m.city ?? null,
    engineId: ENGINE,
  };

  if (!want) return { bike, records: [], valves: newValves(m.country) };

  const logged = (eligible.length >= want ? eligible : events).slice(-want);
  const { services, valves } = history(events, logged, m.country);

  // How many of the oldest entries were transcribed rather than recorded.
  const importCount = imported ? Math.min(services.length, int(1, Math.max(1, Math.ceil(services.length / 2)))) : 0;

  const records = services.map((s, i) => ({
    id: randomUUID(),
    bikeId,
    engineId: ENGINE,
    date: s.date,
    odometer: fromKm(s.odoKm, m.units),
    ...(chance(0.5) ? { title: pick(TITLES) } : {}),
    items: serviceItemsFor(s.odoKm),
    ...(i < importCount ? { source: "import" } : {}),
    readings: s.readings,
    createdAt: s.at,
    updatedAt: s.at,
  }));

  return { bike, records, valves };
}

// ------------------------------------------------------- accounts and bikes --

/**
 * How the 312 bikes sit across 260 accounts.
 *
 * Dealt exactly: 13 accounts hold three, 26 hold two, the remaining 221 hold
 * one. Multi-bike owners are the reason the app has a bike switcher at all, and
 * until now nothing in the seed data had more than one.
 */
const THREE = Math.round(ACCOUNTS * 0.05);   // 13
const TWO   = Math.round(ACCOUNTS * 0.10);   // 26
const ONE   = ACCOUNTS - THREE - TWO;        // 221

const slots = [
  ...Array(THREE).fill(3),
  ...Array(TWO).fill(2),
  ...Array(ONE).fill(1),
];
shuffle(slots);
if (slots.reduce((a, b) => a + b, 0) !== BIKES) {
  throw new Error(`slots total ${slots.reduce((a, b) => a + b, 0)}, expected ${BIKES}`);
}

// Ten machines are held by a second account as well — the workshop case, and
// the whole reason claim_machine and records_for_vin exist. Chosen from bikes
// that have a frame number and a history worth pulling.
const sharedFrom = new Set();
const built = plans.map((plan, i) => ({
  i,
  ...buildBike(plan, { imported: chance(0.05) }),
}));
for (const b of built) {
  if (sharedFrom.size >= SHARED) break;
  if (b.bike.vin && b.records.length >= 2) sharedFrom.add(b.i);
}

/**
 * The workshop's copy: the same physical machine, a different account, its own
 * bike id and its own pool token. The token stays un-converged on purpose —
 * making the two agree is claim_machine's job at sync time, and pre-converging
 * it here would quietly test nothing.
 */
function workshopCopy(source) {
  const plan = plans[source.i];
  const m = plan.m;
  const bikeId = randomUUID();
  const units = chance(0.5) ? "km" : "mi";
  let odoKm = m.odoKm + Math.round(between(1500, 7000));
  const valves = source.valves;
  const records = [];
  for (let i = 0, n = int(1, 2); i < n; i++) {
    const readings = {};
    for (const p of POSITIONS) readings[p.id] = measure(valves[p.id], p.type, odoKm);
    const when = dateAt(between(2025.6, 2026.6));
    records.push({
      id: randomUUID(),
      bikeId,
      engineId: ENGINE,
      date: isoDate(when),
      odometer: fromKm(odoKm, units),
      title: pick(["Customer bike - valve service", "Workshop valve check", "Shim service (customer)"]),
      items: serviceItemsFor(odoKm),
      readings,
      createdAt: iso(when),
      updatedAt: iso(when),
    });
    odoKm += Math.round(between(6200, 7800));
  }
  return {
    sharesFrame: source.bike.vin,
    bike: {
      id: bikeId,
      name: `Customer - ${m.family}`,
      modelId: m.modelId,
      year: m.year,
      vin: source.bike.vin,
      poolToken: randomBytes(32).toString("hex"),
      units,
      country: source.bike.country,       // same machine, same dust
      region: source.bike.region,
      city: source.bike.city,
      engineId: ENGINE,
    },
    records,
  };
}

const copies = [...sharedFrom].map((i) => workshopCopy(built.find((b) => b.i === i)));

// 302 machines plus 10 workshop copies is exactly the 312 the slots ask for, so
// every bike is dealt and every account gets the number it was allotted.
const units = shuffle([...built, ...copies]);
if (units.length !== BIKES) throw new Error(`${units.length} bikes for ${BIKES} slots`);

/**
 * A workshop copy must never land on the account that already owns the machine,
 * or the whole point of it — two accounts, one frame number — is lost. Rare
 * enough to fix by looking further down the pile rather than by reshuffling.
 */
const members = [];
for (const n of slots) {
  const who = person();
  const bikes = [], records = [];
  for (let k = 0; k < n; k++) {
    let at = 0;
    while (at < units.length
           && units[at].bike.vin
           && bikes.some((b) => b.vin === units[at].bike.vin)) at++;
    if (at >= units.length) at = 0;
    const [taken] = units.splice(at, 1);
    bikes.push(taken.bike);
    records.push(...taken.records);
  }
  members.push({ ...who, bikes, records });
}
if (units.length) throw new Error(`${units.length} bikes left undealt`);

// Timestamps on the bike itself, taken from the history it carries.
for (const x of members) {
  for (const b of x.bikes) {
    const mine = x.records.filter((r) => r.bikeId === b.id);
    b.createdAt = mine[0]?.createdAt ?? new Date(Date.UTC(2026, 7, int(1, 18))).toISOString();
    b.updatedAt = mine[mine.length - 1]?.updatedAt ?? b.createdAt;
  }
}

writeFileSync("members.json", JSON.stringify(members, null, 1));

// ------------------------------------------------------------------- report --

const allBikes = members.flatMap((x) => x.bikes);
const services = members.reduce((n, x) => n + x.records.length, 0);
const readings = members.reduce(
  (n, x) => n + x.records.reduce((k, r) => k + Object.keys(r.readings).length, 0), 0);
const perBike = allBikes.map((b) =>
  members.find((x) => x.bikes.includes(b)).records.filter((r) => r.bikeId === b.id).length);
const imported = members.reduce((n, x) => n + x.records.filter((r) => r.source === "import").length, 0);

console.log(`accounts   ${members.length}`);
console.log(`  1 bike   ${members.filter((x) => x.bikes.length === 1).length}`);
console.log(`  2 bikes  ${members.filter((x) => x.bikes.length === 2).length}`);
console.log(`  3 bikes  ${members.filter((x) => x.bikes.length === 3).length}`);
console.log(`bikes      ${allBikes.length}   with vin ${allBikes.filter((b) => b.vin).length}   in miles ${allBikes.filter((b) => b.units === "mi").length}`);
console.log(`  with services ${perBike.filter((n) => n > 0).length}   empty ${perBike.filter((n) => n === 0).length}  (${Math.round(100 * perBike.filter((n) => n > 0).length / allBikes.length)}% logging)`);
console.log(`  shared frame numbers ${copies.length}`);
console.log(`services   ${services}    readings ${readings}    marked import ${imported}`);
const logged = perBike.filter((n) => n > 0);
console.log(`per bike   1 service: ${logged.filter((c) => c === 1).length}   10 services: ${logged.filter((c) => c === 10).length}   mean ${(services / Math.max(1, logged.length)).toFixed(1)}`);

// ------------------------------------------------------------------- parts ---

const tick = {};
for (const x of members) for (const r of x.records) for (const id of r.items ?? []) tick[id] = (tick[id] ?? 0) + 1;
console.log("\nparts ticked, share of services");
for (const id of ITEM_ORDER) {
  const n = tick[id] ?? 0;
  console.log(`  ${id.padEnd(16)} ${String(n).padStart(5)}  ${(100 * n / services).toFixed(1)}%`);
}

// The oil-grade split is the one the brief asks for by name, so it gets checked
// rather than assumed: thick oil should dominate above the threshold and thin
// below it.
let thickAbove = 0, aboveN = 0, thickBelow = 0, belowN = 0;
for (const x of members) {
  for (const b of x.bikes) {
    const toKm = b.units === "mi" ? KM_PER_MILE : 1;
    for (const r of x.records.filter((r) => r.bikeId === b.id)) {
      const km = (r.odometer ?? 0) * toKm;
      const thick = (r.items ?? []).includes("oil-60w");
      const thin = (r.items ?? []).includes("oil-50w");
      if (!thick && !thin) continue;
      if (km >= THICK_FROM_KM) { aboveN++; if (thick) thickAbove++; }
      else { belowN++; if (thick) thickBelow++; }
    }
  }
}
console.log(`\noil grade by odometer  (threshold ${THICK_FROM_KM.toLocaleString()} km)`);
console.log(`  at or above   60W on ${(100 * thickAbove / Math.max(1, aboveN)).toFixed(0)}% of ${aboveN} services`);
console.log(`  below         60W on ${(100 * thickBelow / Math.max(1, belowN)).toFixed(0)}% of ${belowN} services`);

// ------------------------------------------------------------- geography ----

const byCountry = {}, byContinent = {};
const CONTINENT = Object.fromEntries(COUNTRY_PLAN.map(([c, k]) => [c, k]));
// Owners only. The workshop copies hold a second copy of a machine that is
// already counted, and inherit its country — counting them again would
// overstate those countries by one bike each.
const sharedVins = new Set(copies.map((c) => c.sharesFrame));
const seenVin = new Set();
for (const b of allBikes) {
  if (b.vin && sharedVins.has(b.vin)) {
    if (seenVin.has(b.vin)) continue;
    seenVin.add(b.vin);
  }
  const c = b.country ?? "(none)";
  byCountry[c] = (byCountry[c] ?? 0) + 1;
  const k = CONTINENT[c] ?? "(none)";
  byContinent[k] = (byContinent[k] ?? 0) + 1;
}

console.log("\nbikes per continent");
for (const [k, n] of Object.entries(byContinent).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(15)} ${String(n).padStart(3)}`);
}
console.log("\nbikes per country");
const rows = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);
console.log("  " + rows.map(([c, n]) => `${c}:${n}`).join("  "));
console.log(`  shown at country level (>=3): ${rows.filter(([c, n]) => c !== "(none)" && n >= 3).length}`);
console.log(`  suppressed  (<3):             ${rows.filter(([c, n]) => c !== "(none)" && n < 3).length}`);
const withPlace = allBikes.filter((b) => b.city).length;
console.log(`  carrying region + city:       ${withPlace} of ${allBikes.length}`);

// Does the planted signal actually show?
//
// Measured the way pool.ts says the pool is meant to be read: two CONSECUTIVE
// services on the same valve with no shim change between them, so the whole
// difference is wear. First-to-last is worthless here — a shim change resets
// the gap to mid-spec, which erases exactly the accumulated movement being
// looked for, and buries the signal under how often each owner services.
const TYPE_OF = Object.fromEntries(POSITIONS.map((p) => [p.id, p.type]));
const wear = {};
for (const x of members) {
  for (const b of x.bikes) {
    const c = b.country ?? "(none)";
    const toKm = b.units === "mi" ? KM_PER_MILE : 1;
    const mine = x.records.filter((r) => r.bikeId === b.id);
    for (let i = 1; i < mine.length; i++) {
      const prev = mine[i - 1], next = mine[i];
      const km = (next.odometer - prev.odometer) * toKm;
      if (km < 2000) continue;              // too short: read noise swamps it
      for (const [p, before] of Object.entries(prev.readings)) {
        const after = next.readings[p];
        // Untouched between the two: no size was chosen, and the shim that came
        // out the second time is the one that went in the first.
        if (!after || before.chosenShim !== undefined || after.shim !== before.shim) continue;
        // Signed, not absolute, with intakes flipped so that "moved away from
        // where it started" is positive for both valve types. Absolute values
        // rectify the +/-2.5 um of read noise into a positive floor of roughly
        // 0.5 um per 1000 km, which is the same size as the wear being measured
        // and hides the whole effect. Signed, the noise averages to nothing.
        const delta = after.clearance - before.clearance;
        (wear[c] ??= []).push((TYPE_OF[p] === "intake" ? -delta : delta) / (km / 1000));
      }
    }
  }
}
const ranked_wear = Object.entries(wear)
  .filter(([, a]) => a.length >= 20)
  .map(([c, a]) => [c, a.reduce((x, y) => x + y, 0) / a.length, a.length])
  .sort((a, b) => b[1] - a[1]);
const plain = Object.entries(wear)
  .filter(([c]) => !WEAR_MULTIPLIER[c])
  .flatMap(([, a]) => a);
const baseline = plain.reduce((x, y) => x + y, 0) / plain.length;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

console.log(`\nplanted-signal check   baseline ${baseline.toFixed(3)} um per 1000 km, n=${plain.length}`);
for (const [c, want] of Object.entries(WEAR_MULTIPLIER)) {
  const got = wear[c] ? mean(wear[c]) : NaN;
  console.log(`  ${c}  planted x${want}   measured x${(got / baseline).toFixed(3)}   (${got.toFixed(3)}, n=${wear[c]?.length ?? 0})`);
}
const big = ranked_wear.filter(([, , n]) => n >= 300).map(([c]) => c);
console.log(`  rank among countries with n>=300: ${big.join(" > ")}`);
