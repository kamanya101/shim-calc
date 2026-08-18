/**
 * The parts that get replaced at a service, over and above the shims.
 *
 * Ticked on the sheet and stored with the record, so a log years later says
 * what was actually done rather than only what was measured.
 *
 * What a record stores is the `id`, never the label — the same rule as
 * models.ts, and for the same reason. The labels are what riders read and are
 * free to reword; "Front Pads" may one day read "Front brake pads". If the
 * stored value were the label, that one edit would split a part in two in any
 * shared figure, and neither half would be complete.
 *
 * Free text is deliberately not offered. Let riders type the part and one
 * writes "plugs", the next "Spark Plugs", the third "sparkplugs" — three
 * unrelated entries as far as anything counting them is concerned, so one solid
 * answer from sixty riders becomes three shaky ones from twenty. A fixed list
 * is what makes "how often does everyone else change this" answerable at all.
 *
 * Order is the order they appear on the sheet, and is the canonical order a
 * record's ticks are stored in — see `sortItems`.
 */

export type ServiceItem = {
  /** Permanent. Stored on the record. */
  id: string;
  /** Shown to riders. Safe to reword. */
  label: string;
};

export const SERVICE_ITEMS: ServiceItem[] = [
  { id: "oil-50w", label: "Oil 50W" },
  { id: "oil-60w", label: "Oil 60W" },
  { id: "air-filter", label: "Air Filter" },
  { id: "oil-filter", label: "Oil Filter" },
  { id: "coolant", label: "Coolant" },
  // Brake Pads sits alongside Front Pads and Rear Pads deliberately, and is
  // not to be collapsed into them. They overlap -- one rider ticks the general
  // one, another ticks both specific ones, for the same job -- which will make
  // any pooled count of pad changes read low until it is reconciled. Andrew
  // was asked and kept all three: riders record the work the way they think
  // about it, and a list that argues with them is a list they stop filling in.
  { id: "brake-pads", label: "Brake Pads" },
  { id: "chain", label: "Chain" },
  { id: "front-sprocket", label: "Front Sprocket" },
  { id: "rear-sprocket", label: "Rear Sprocket" },
  { id: "front-pads", label: "Front Pads" },
  { id: "rear-pads", label: "Rear Pads" },
  { id: "battery", label: "Battery" },
  { id: "clutch-plates", label: "Clutch Plates" },
  // The two catch-alls, last because that is what they are. They record that
  // something was done, not what — so unlike everything above them they can
  // never yield a "how often does everyone else" figure, and are not meant to.
  // What was actually replaced goes in the service note.
  { id: "engine-parts", label: "Engine Parts" },
  { id: "chassis-parts", label: "Chassis Parts" },
];

const ORDER = new Map(SERVICE_ITEMS.map((item, index) => [item.id, index]));

const LABELS = new Map(SERVICE_ITEMS.map((item) => [item.id, item.label]));

/**
 * A stored id turned back into something readable, falling back to the id
 * itself for anything this build does not recognise.
 *
 * That fallback matters because records sync. A rider on an older build will
 * pull a record ticked with a part added after their copy shipped, and showing
 * them "battery" is a good deal better than showing them nothing — which would
 * quietly misreport what was done to their own motorcycle.
 */
export function itemLabel(id: string): string {
  return LABELS.get(id) ?? id;
}

/**
 * Ticks in list order, unknown ids last, in the order they arrived.
 *
 * Stored ticks are held sorted so that ticking the chain and then the battery
 * produces the same array as ticking the battery and then the chain. Sync
 * decides what to push by comparing the record it holds against the server's,
 * and two arrays that differ only in order are a change by that comparison —
 * enough to have two devices push at each other in turn, forever, over a
 * difference that is not one.
 */
export function sortItems(ids: string[]): string[] {
  const unknown = SERVICE_ITEMS.length;
  return [...new Set(ids)].sort(
    (a, b) => (ORDER.get(a) ?? unknown) - (ORDER.get(b) ?? unknown),
  );
}
