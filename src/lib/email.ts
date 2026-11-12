/**
 * Catching the email address a rider meant to type.
 *
 * This exists because of a real one. Somebody was sent the link, signed up as
 * `…@gmail.con`, waited for a confirmation email that had bounced off a
 * domain that does not exist, and reported that the app was broken. They were
 * right to: the app had told them to check their email without ever showing
 * them which address it had used.
 *
 * A wrong address is unrecoverable in a way almost nothing else here is. The
 * account cannot be confirmed, the password cannot be reset, and nothing in
 * the app can reach the person — the one copy of the problem is in an inbox
 * that was never typed correctly.
 *
 * So this suggests, and never blocks. A rider on a legitimate address one
 * letter from a common one must still be able to carry on; they are told what
 * we suspect and left to decide. Being wrong here costs a glance. Being
 * silent costs somebody their account.
 */

/**
 * Where riders actually are. The South African domains are not padding — the
 * people using this are mostly there, and `mweb.co.za` mistyped is exactly as
 * dead as `gmail.com` mistyped.
 */
const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "mweb.co.za",
  "telkomsa.net",
  "vodamail.co.za",
  "webmail.co.za",
  "absamail.co.za",
  "iafrica.com",
];

/**
 * Edit distance, with a transposition counted as one change rather than two.
 *
 * The transposition case is the point: `gmial.com` is two swapped letters and
 * the single commonest way a familiar domain comes out wrong. Plain
 * Levenshtein scores it the same as two unrelated mistakes, which would mean
 * either missing it or casting the net wide enough to annoy people.
 */
function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[rows - 1][cols - 1];
}

/**
 * The address this one was probably meant to be, or null if it looks fine.
 *
 * Returns the whole address rather than the domain, because the only useful
 * thing to put in front of somebody is the address they can accept with one
 * tap — asking them to spot the difference between two domain names is the
 * same reading task that let the mistake through in the first place.
 */
export function suggestEmail(input: string): string | null {
  const address = input.trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at <= 0 || at === address.length - 1) return null;

  const local = address.slice(0, at);
  const domain = address.slice(at + 1);

  // Already something we recognise. Nothing to say.
  if (COMMON_DOMAINS.includes(domain)) return null;

  // No dot at all is a different mistake — "@gmail" — and one worth catching,
  // but only against a domain it genuinely resembles, below.
  let best: { domain: string; score: number } | null = null;

  for (const candidate of COMMON_DOMAINS) {
    const score = distance(domain, candidate);
    if (best === null || score < best.score) best = { domain: candidate, score };
  }

  if (!best) return null;

  /*
   * Two changes allowed on a long domain, one on a short one. Without the
   * length guard, `me.com` sits two edits from a great many real addresses
   * and would start second-guessing people who typed their own correctly.
   */
  const allowed = best.domain.length >= 9 ? 2 : 1;
  if (best.score === 0 || best.score > allowed) return null;

  return `${local}@${best.domain}`;
}
