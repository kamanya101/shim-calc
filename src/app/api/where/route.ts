/**
 * Where this request came from, as the edge saw it.
 *
 * The only server-side code in the app, and it exists because a browser cannot
 * read its own request headers. Vercel stamps every request with the country,
 * region and city it resolved the caller's address to; this hands those three
 * back so a bike being created can be offered a place.
 *
 * What it emphatically is not is a fact about the motorcycle. It locates a
 * phone, at one moment, and a rider signing up in an airport or behind a VPN
 * will be told somewhere they have never ridden. That is why nothing here
 * writes anything — it answers, and the rider decides. See `Bike.country`.
 *
 * Off Vercel — localhost, or any other host — the headers are simply absent
 * and every field comes back null, which is a first-class answer rather than
 * an error. There is nothing to configure and nothing to fail.
 */

/** Vercel percent-encodes the city, so "Cape Town" arrives as "Cape%20Town". */
function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    const text = decodeURIComponent(value).trim();
    return text.length ? text : null;
  } catch {
    // A malformed escape is not worth an error page. Nothing is better than
    // a place name with a stray % in it going into somebody's record.
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const headers = request.headers;

  const country = headers.get("x-vercel-ip-country")?.trim().toUpperCase();

  return Response.json(
    {
      // Two letters or nothing, checked here as well as in sync.ts and in
      // contribute_readings. It is the one field of the three that reaches the
      // shared pool, so it is the one worth being strict about at every step.
      country: country && /^[A-Z]{2}$/.test(country) ? country : null,
      region: decode(headers.get("x-vercel-ip-country-region")),
      city: decode(headers.get("x-vercel-ip-city")),
    },
    {
      // Belt and braces. GET handlers have been dynamic by default since
      // v15.0.0-RC and reading headers keeps this one dynamic regardless, but
      // an answer about *this* request must never be replayed for another —
      // a stale location is not stale data, it is wrong data. The service
      // worker is told the same thing separately, in public/sw.js.
      headers: { "Cache-Control": "no-store" },
    },
  );
}
