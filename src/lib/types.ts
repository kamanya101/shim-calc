/**
 * All sizes are held as whole micrometres (um) rather than millimetres.
 * 2.35 mm is stored as 2350. Shim maths is all addition and subtraction of
 * quarter-hundredths, and floating point mm quietly turns 2.35 into
 * 2.3499999999999996 — which then fails an equality lookup against the
 * catalogue. Integers make every comparison exact.
 */
export type Microns = number;

export type ValveType = "intake" | "exhaust";

export type ClearanceRange = {
  min: Microns;
  max: Microns;
};

/** One physical valve, in the order it sits in the engine. */
export type ValvePosition = {
  id: string;
  /**
   * "Front left exhaust" — matches the wording of the original spreadsheet,
   * and names the cylinder, the side and the valve type so it reads correctly
   * with no surrounding context.
   */
  label: string;
  bank: string;
  type: ValveType;
};

export type ShimSize = {
  um: Microns;
  part: string;
};

export type ShimCatalogue = {
  id: string;
  brand: string;
  /** Shown under the brand name, e.g. "0.05 mm steps". */
  note: string;
  sizes: ShimSize[];
};

export type EngineSpec = {
  id: string;
  name: string;
  subtitle: string;
  cylinders: number;
  valvesPerCylinder: number;
  clearance: Record<ValveType, ClearanceRange>;
  /** Catalogue ids, in the order they should be offered. */
  catalogues: string[];
  positions: ValvePosition[];
};

/** What the user measured, plus the shim they settled on. */
export type ValveReading = {
  /** Thickness of the shim that came out, in microns. */
  shim?: Microns;
  /** Gap the feeler gauge fitted, in microns. */
  clearance?: Microns;
  /**
   * Shim the user chose. Undefined means "use whatever the app suggests" —
   * so the suggestion keeps tracking the measurements until it's overridden.
   */
  chosenShim?: Microns;
  /**
   * The gap actually measured after the new shim went in.
   *
   * The predicted clearance is arithmetic; this is the engine's answer, and
   * the two rarely agree exactly — shim thickness tolerance, how the bucket
   * seats, how the last measurement was taken. Recording it is what makes the
   * next service's numbers trustworthy, because it is the real starting point
   * the valve wears away from.
   */
  confirmedClearance?: Microns;
};

/**
 * A physical motorcycle. Services hang off one of these, so somebody running
 * two LC8s gets two histories and two sets of wear charts rather than one
 * incoherent one.
 *
 * Two identifiers, doing different jobs. The `id` is generated, never shown,
 * and is what the rider's own devices and any handed-over copy agree on. The
 * `vin` is stamped on the steering head, so it is the only thing two people who
 * have never met can both read off the same motorcycle — which is what makes a
 * bike recognisable to a technician, or to whoever buys it in ten years.
 *
 * The nickname is neither. It is the rider's own label, it need not be unique,
 * and nothing is ever matched on it.
 */
/** What an odometer counts in. */
export type DistanceUnit = "km" | "mi";

export type Bike = {
  id: string;
  /** "Orange one", "The Dakar". Defaults to the model. */
  name: string;
  /**
   * Which LC8, as a permanent id from models.ts — never the printed name.
   * Record-keeping for the rider; the grouping key for the shared averages.
   */
  modelId?: string;
  /**
   * Model year, from the production run only. Optional, because plenty of
   * people genuinely do not know it and refusing their service history over a
   * date would be a poor trade.
   */
  year?: number;
  /**
   * The frame number, normalised to 17 upper-case characters. See vin.ts.
   *
   * Optional in the type because a bike exists from the moment it is created
   * and the rider may not be standing next to it — they can measure and
   * calculate straight away. What waits on this is everything that needs the
   * motorcycle to be *identified*: its history, its charts, its place in the
   * shared averages.
   *
   * Held in the clear here, in the rider's own row, where it is theirs to read
   * and correct. It is never stored in the shared pool, which keys on a hash of
   * it instead, so nothing in that table can be traced back to a real machine.
   */
  vin?: string;
  /**
   * The secret this bike's pooled readings are keyed under. See pool.ts.
   *
   * It belongs to the motorcycle, not to the rider, and that is the whole
   * point. Keyed on the rider, the same physical bike measured by its owner and
   * by the workshop that services it arrives in the pool twice, counted as two
   * machines — which quietly inflates the one number the comparison has to be
   * honest about. Keyed on the bike, the token travels with any handed-over
   * copy, both pushes produce identical ids, and the second simply lands on top
   * of the first.
   *
   * Optional only for bikes saved before this existed; migrations.ts gives
   * every one of them a token, and `newBike` has issued one ever since. A bike
   * without one contributes nothing, because there is no key to file it under.
   *
   * Never displayed, and never sent anywhere except as the input to a hash.
   */
  poolToken?: string;
  /**
   * Which unit this bike's odometer is read in.
   *
   * Set per bike rather than per rider: someone can easily keep an imported
   * machine reading in miles alongside a local one in kilometres, and the
   * number on the clock is a fact about the motorcycle.
   *
   * Readings are stored exactly as they were typed, in this unit, so a rider's
   * own history never drifts through a conversion. Only the shared pool is
   * converted, and only at its edge — see pool.ts. Absent means kilometres,
   * which is what every reading saved before this existed was.
   */
  units?: DistanceUnit;
  /**
   * Where the motorcycle lives, as an ISO-3166 alpha-2 code.
   *
   * On the bike rather than on the rider, for the same reason the pool token
   * is: what a valve wears against is the dust, heat and roads the machine
   * sits in, and those stay behind when it is sold or serviced by somebody two
   * countries away.
   *
   * Suggested from where the request that created the bike came from, and only
   * ever suggested — see `detectCountry`. The rider confirms or corrects it,
   * the same way the year decoded from a VIN is offered rather than applied,
   * because the thing being located is a phone and not a motorcycle.
   *
   * Undefined is a real answer and stays one: no signal in the garage, a rider
   * who would rather not say, or any bike saved before this existed.
   */
  country?: string;
  /**
   * The place below the country, and below that again — both as the request
   * that created the bike reported them, and both correctable.
   *
   * These stay on the bike. The pool takes `country` alone: a pooled reading
   * already says model, year, month and odometer, and a city on top of that
   * would name one machine in any town holding two. What reads these for a map
   * has to aggregate them behind a minimum count.
   */
  region?: string;
  city?: string;
  engineId: string;
  createdAt: string;
  /** Bumped on every edit. Two devices reconcile by keeping the later one. */
  updatedAt: string;
  deletedAt?: string;
};

export type ServiceRecord = {
  id: string;
  bikeId: string;
  /**
   * The account that wrote this, when it was not this one.
   *
   * Absent means mine — which is every record this app has ever created, and
   * the only kind it pushes. A record with an author arrived from somebody
   * else who holds the same motorcycle, matched by frame number rather than by
   * anyone handing anything over. It is read-only here: they keep it current,
   * this device only displays it.
   *
   * An opaque account id, never an email. Sharing a bike with somebody is not
   * a reason to learn who they are — it is enough to be able to group their
   * entries together, and to hide the lot if they turn out to be typing
   * nonsense onto a machine that is not theirs.
   */
  author?: string;
  engineId: string;
  /** ISO date, no time — a service is a day, not an instant. */
  date: string;
  odometer?: number;
  title?: string;
  readings: Record<string, ValveReading>;
  /**
   * Parts replaced at this service, as permanent ids from serviceItems.ts.
   *
   * Held sorted into that file's list order — see `sortItems` — so that two
   * devices which ticked the same parts in a different sequence hold the same
   * array and sync has nothing to argue about.
   *
   * Absent means nothing was ticked, which is true of every record written
   * before this existed. That is why there is no migration for it: the empty
   * case and the not-yet-upgraded case are the same case, and both are already
   * the right answer.
   */
  items?: string[];
  /**
   * Set when this service was reconstructed from the rider's old spreadsheets
   * rather than measured into the app. See legacyImport.ts.
   *
   * It is kept because an imported reading is a different kind of thing from a
   * typed one. Somebody read a decade-old sheet, an assistant guessed which
   * column was which, and a date may have been supplied from memory. That is
   * good enough to chart a rider's own wear — which is the whole reason they
   * imported it — and not good enough to quietly become part of the averages
   * every other rider is comparing themselves against. So the pool leaves
   * these alone until the rider has looked at them and said they are right.
   *
   * Absent means typed here, which is every record written before this
   * existed. No migration: the old case and the honest case are the same case.
   */
  source?: "import";
  createdAt: string;
  updatedAt: string;
  /**
   * A deleted service is kept as a marker rather than removed outright.
   *
   * Sync reconciles two copies by keeping whichever was touched last, and that
   * only works for things that still exist. Drop a row on the phone and the
   * tablet's copy — which knows nothing of the deletion — would simply put it
   * back on the next sync. The marker is the deletion, travelling under the
   * same rule as every other edit.
   *
   * Everything that reads for display filters these out; only export and sync
   * see them.
   */
  deletedAt?: string;
};
