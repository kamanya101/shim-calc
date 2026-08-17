/**
 * Reading and checking a KTM frame number.
 *
 * The VIN is what lets one physical motorcycle be recognised by two people who
 * have never met — a rider and their technician, a seller and a buyer. Every
 * other identifier the app holds is invented by the app and only travels when
 * somebody hands it over. This one is stamped on the steering head, so anybody
 * standing at the bike can read it, and it survives every sale.
 *
 * What this file does NOT do is decide whether a VIN is *true*. It cannot: a
 * well-formed number for a bike somebody does not own is indistinguishable from
 * their own. That is an accepted trade. The VIN's job here is to be unique and
 * stable, and an invented one still does that job — it de-duplicates, it
 * transfers, it groups the pool correctly. The only thing it costs the person
 * who invents it is the one feature that needs truth: a future owner finding
 * the bike's history. They are cheating themselves and nobody else.
 *
 * So the checks below are deliberately structural and permissive. A rule that
 * wrongly rejects a real frame number locks a rider out of their own history,
 * which is the worst failure this app has — far worse than letting a fake one
 * through.
 */

/** A validated VIN, always stored and compared in this form. */
export type Vin = string;

/**
 * KTM Sportmotorcycle AG, Mattighofen. Every 950/990 LC8 was built there.
 *
 * This is the single rule most likely to need loosening — it is asserted from
 * documentation and one confirmed example, not from a list of every VIN KTM
 * ever issued. If a rider with a genuine LC8 is ever refused, widen this array
 * rather than weakening anything else; it is the only place the prefix is
 * decided.
 */
const KTM_WMI = ["VBK"];

/**
 * I, O and Q are excluded from every VIN by ISO 3779, precisely so they cannot
 * be confused with 1 and 0 when read off dirty metal. Their absence is a useful
 * check in itself: a number containing one has been mistyped.
 */
const VIN_ALPHABET = /^[ABCDEFGHJKLMNPRSTUVWXYZ0-9]{17}$/;

/**
 * Position 10 holds the model year, and the character set skips I, O, Q, U and
 * Z. The LC8 950/990 ran from 2003 to 2013, so anything outside that window is
 * either a mistyped character or a different motorcycle entirely.
 *
 * MODEL_YEARS in models.ts covers the same span, so any year decoded here can
 * also be picked from the dropdown. Keep the two in step: a list narrower than
 * this one would decode a genuine bike's year and then refuse to hold it.
 */
const YEAR_CHARS: Record<string, number> = {
  "3": 2003,
  "4": 2004,
  "5": 2005,
  "6": 2006,
  "7": 2007,
  "8": 2008,
  "9": 2009,
  A: 2010,
  B: 2011,
  C: 2012,
  D: 2013,
};

/**
 * Letter values for the check digit sum. J–R and S–Z restart the count, which
 * is why the numbers are not simply alphabetical.
 */
const TRANSLITERATE: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

/** Position 9 counts for nothing; it is the answer, not part of the sum. */
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Tidy up what somebody typed. Spaces, hyphens and lower case are all things
 * people reasonably produce when copying seventeen characters off a frame, and
 * none of them change which bike is meant.
 */
export function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type VinCheck =
  | { ok: false; error: string }
  | {
      ok: true;
      vin: Vin;
      /** Decoded from position 10, whether or not the app offers that year. */
      year?: number;
      /**
       * Set when the number is structurally fine but the check digit disagrees.
       *
       * Not an error. The check digit is mandatory on bikes built for North
       * America and unreliable on bikes built for anywhere else, so a failure
       * here means "worth re-reading the frame", not "this is not a VIN". It
       * did verify correctly against the one confirmed KTM example available,
       * so when it fails on a European bike it is telling you something about
       * KTM's stamping rather than about the rider.
       */
      warning?: string;
    };

/**
 * Check a frame number, and say why if it fails.
 *
 * The messages are written to be read by somebody crouched next to a bike with
 * a torch, so each one says what to do rather than what went wrong.
 */
export function checkVin(input: string): VinCheck {
  const vin = normalizeVin(input);

  if (vin.length === 0) return { ok: false, error: "Enter the frame number." };

  if (vin.length !== 17) {
    const missing = 17 - vin.length;
    return {
      ok: false,
      error:
        missing > 0
          ? `That is ${vin.length} characters — a VIN has 17, so ${missing} ${missing === 1 ? "is" : "are"} missing.`
          : `That is ${vin.length} characters — a VIN has 17.`,
    };
  }

  if (!VIN_ALPHABET.test(vin)) {
    // Naming the culprits matters: these are exactly the characters somebody
    // misreads a 1 or a 0 as, so the fix is usually obvious once pointed at.
    const bad = [...new Set(vin.split("").filter((c) => /[IOQ]/.test(c)))];
    return {
      ok: false,
      error: bad.length
        ? `A VIN never contains ${bad.join(" or ")} — that will be ${bad.map((c) => (c === "Q" ? "a 0" : c === "I" ? "a 1" : "a 0")).join(" or ")}.`
        : "A VIN is letters and numbers only.",
    };
  }

  if (!KTM_WMI.includes(vin.slice(0, 3))) {
    return {
      ok: false,
      error: `A KTM frame number starts with ${KTM_WMI.join(" or ")}. Check the first three characters.`,
    };
  }

  const year = YEAR_CHARS[vin[9]];
  if (year === undefined) {
    return {
      ok: false,
      error:
        "The 10th character should give a year between 2003 and 2013 for an LC8. Check that one again.",
    };
  }

  const expected = checkDigit(vin);
  const warning =
    expected !== null && vin[8] !== expected
      ? "That doesn't quite add up — worth re-reading the frame. Saved anyway; KTM's check digit isn't reliable outside North America."
      : undefined;

  return { ok: true, vin, year, warning };
}

/**
 * The ISO 3779 check digit: a weighted sum of the other sixteen characters,
 * modulo 11, where a remainder of 10 is written as X.
 *
 * Returns null only if a character has no value, which cannot happen for a
 * string that has already passed the alphabet test.
 */
function checkDigit(vin: string): string | null {
  let sum = 0;

  for (let i = 0; i < 17; i += 1) {
    const char = vin[i];
    const value = /\d/.test(char) ? Number(char) : TRANSLITERATE[char];
    if (value === undefined) return null;
    sum += value * WEIGHTS[i];
  }

  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
}

/**
 * The model year a VIN claims, or nothing if it does not decode.
 *
 * Kept separate from `checkVin` so a caller can offer to fill the year in
 * without re-validating, and so the decision about *whether* to fill it stays
 * with the caller — models.ts offers 2004–2012, and a genuine 2003 or 2013 bike
 * should keep its VIN rather than be forced onto a year the list does not hold.
 */
export function vinYear(vin: string): number | undefined {
  const normalized = normalizeVin(vin);
  return normalized.length === 17 ? YEAR_CHARS[normalized[9]] : undefined;
}

/**
 * Group a VIN for display: VBKV3940X8M952109 reads as "VBK V3940X 8M 952109".
 *
 * Seventeen unbroken characters are near-impossible to check by eye against a
 * frame. The breaks fall on the real boundaries — maker, model descriptor,
 * year and plant, serial — so the last block is the one that actually differs
 * between two bikes off the same line, and it is short enough to compare at a
 * glance.
 */
export function formatVin(vin: string): string {
  const v = normalizeVin(vin);
  if (v.length !== 17) return v;
  return `${v.slice(0, 3)} ${v.slice(3, 9)} ${v.slice(9, 11)} ${v.slice(11)}`;
}

/**
 * The last six characters, which are the serial number.
 *
 * Useful wherever a bike needs telling apart from another in a list without
 * printing the whole thing — a workshop with three 990 Adventures needs "…
 * 952109", not seventeen characters repeated down the screen.
 */
export function vinTail(vin: string): string {
  const v = normalizeVin(vin);
  return v.length === 17 ? v.slice(11) : v;
}
