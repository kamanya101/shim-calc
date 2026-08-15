# Shim Calculator

A valve-shim calculator and clearance logbook for **KTM LC8 950/990** V-twins.
Installs to a phone home screen and works with no signal.

It is a rebuild of Kamanya's long-serving `Shim calculator.xls`, which has been
passed around the ADVrider community for years. The arithmetic, the tolerances,
the shim catalogues and the notes all come from that spreadsheet.

## The maths

```
stack          = shim fitted + clearance measured
new clearance  = stack − new shim
ideal shim     = stack − clearance you want
```

`stack` is the space the cam leaves above the valve. It doesn't change when you
swap shims, which is the whole trick.

## What it adds over the spreadsheet

- Suggests the nearest shim you can actually buy, instead of making you scroll
  to one by hand.
- Aggregates the order list by size with quantities, and leaves out valves that
  already have the right shim in them.
- Says "no size made" where KTM don't stock a size, rather than showing `0`.
- Keeps a history keyed to date and odometer, and charts how each valve drifts
  between services.
- Works offline, on a phone, in a garage.

## Data

Nothing leaves the device. Records live in `localStorage`; back them up with
**Export all** on the History screen. There is no account and no server.

## Development

```bash
npm install
npm run dev
```

`npm run build` produces a fully static export — every route prerenders, so the
service worker in `public/sw.js` can cache the lot.

## Adding another engine

`src/lib/engines.ts` holds `EngineSpec`s and `src/lib/catalogues.ts` holds shim
catalogues. An engine declares its cylinder count, valves per cylinder, its
intake/exhaust tolerances and which catalogues it can draw on; the sheet, the
order list and the charts are all generated from that. Adding a single or an
inline four is data, not code.

## Disclaimer

Use of this calculator is at your own risk entirely. Check the maths, check your
measurements, and recheck your clearances once everything is back together.
