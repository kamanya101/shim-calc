/**
 * The notes and cell tooltips from the original "Shim calculator.xls",
 * reproduced as written — including the signature, which is how the sheet went
 * round the forums. This text is the reason it was trusted and passed on, so it
 * ships with the calculator rather than being paraphrased away.
 */

export const AUTHOR = "Kamanya";

export const NOTES: { heading: string; body: string }[] = [
  {
    heading: "Use millimetres",
    body: "All measurements must be in millimetres, e.g. 2.35",
  },
  {
    heading: "The layout mimics the engine",
    body: "Do not make the mistake of putting intake measurements in the exhaust boxes.",
  },
  {
    heading: "Where to aim inside the tolerance band",
    body: "The tolerances for 05 and later models are in a narrower band than earlier models, but, if you use these all will be good for both models. Typically, intake gaps get smaller as the valves wear, thus you may want to be towards the larger tolerance. But, exhaust gaps usually get larger due to carbon build up on the valve. Because of this, you may want to be closer to the smaller tolerance for exhausts. This way, as the clearances drift, they only drift into the tolerance band and not outside of tolerance. (thanks Pyndon) Each engine wears differently so you will only know if your settings “drift” into or out of tolerance after subsequent valve clearance checks.",
  },
  {
    heading: "KTM don't stock every size",
    body: "If your chosen size has no KTM part number, you have chosen a size not stocked by them, i.e. KTM only has shims in 0.05 increments, H/D stocks them in 0.025 increments (and often cheaper).",
  },
  {
    heading: "Your risk entirely",
    body: "Use of this calculator is for your risk entirely, don't trust my maths and second check everything you do. Think of this as a guide.",
  },
  {
    heading: "Recheck when you're done",
    body: "Recheck your tolerances once you have installed everything. If it is all good then have a beer on me, if not FYYFF.",
  },
];

export const HINTS = {
  shim: "What is the shim that you pulled out from under this bucket? Measure it to make sure and insert the measurement here in millimetres.",
  clearance:
    "What feeler gauge did you manage to get in-between the cam and the bucket? Put your measurement in here in millimetres.",
  ideal:
    "This is the shim size that would put the gap exactly on target for this valve. It is rarely a size anyone makes — the suggestion below is the nearest real one.",
  chosen:
    "The nearest shim you can actually buy. Step it up or down if you want the clearance nearer one end of the band.",
  newClearance:
    "This is the clearance you get from the shim you chose. Is it within the tolerances given for this valve? If not go one size up or down to get there.",
  confirmed:
    "Once the new shim is in, measure the gap again and put the real figure here. It is often slightly over or under the predicted one — that is normal. Recording it gives the next service an honest starting point.",
} as const;
