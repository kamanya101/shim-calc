/**
 * The LC8 V-twins this calculator covers.
 *
 * Recorded against a service so a log makes sense years later, and so someone
 * running more than one LC8 can tell their histories apart. It does not change
 * any of the arithmetic: note 3 of the original sheet is explicit that the
 * tolerances used here are safe across the whole family, carburetted 950s
 * included.
 */

export type BikeModelGroup = {
  label: string;
  models: string[];
};

export const BIKE_MODEL_GROUPS: BikeModelGroup[] = [
  {
    label: "950 — carburetted LC8, ~942 cc",
    models: [
      "950 Adventure",
      "950 Adventure S",
      "950 Supermoto",
      "950 Super Enduro R",
    ],
  },
  {
    label: "990 — fuel-injected LC8, ~999 cc",
    models: [
      "990 Adventure",
      "990 Adventure S",
      "990 Adventure R",
      "990 Adventure Dakar",
      "990 Super Duke",
      "990 Super Duke R",
      "990 Supermoto",
      "990 Supermoto R",
      "990 Supermoto T",
    ],
  },
];

export const BIKE_MODELS: string[] = BIKE_MODEL_GROUPS.flatMap(
  (group) => group.models,
);

export function isKnownModel(model: string | undefined): boolean {
  return model !== undefined && BIKE_MODELS.includes(model);
}
