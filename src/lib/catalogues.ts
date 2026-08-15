import type { ShimCatalogue } from "./types";

/**
 * Transcribed from the lookup table (J1:L38) of the original
 * "Shim calculator.xls" by Kamanya.
 *
 * KTM list only the round 0.05 sizes from 2.30 up. Harley-Davidson cover the
 * same ground in 0.025 steps and are frequently cheaper, which is why the
 * original sheet carried both columns.
 */

const KTM_SIZES = [
  230, 235, 240, 245, 250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300,
].map((hundredths) => ({
  um: hundredths * 10,
  part: `600.36.035.${hundredths}`,
}));

export const KTM_CATALOGUE: ShimCatalogue = {
  id: "ktm-lc8",
  brand: "KTM",
  note: "2.30 – 3.00 mm, 0.05 mm steps",
  sizes: KTM_SIZES,
};

export const HD_CATALOGUE: ShimCatalogue = {
  id: "hd",
  brand: "Harley-Davidson",
  note: "2.025 – 3.00 mm, mostly 0.025 mm steps",
  sizes: [
    { um: 2025, part: "18624-01K" },
    { um: 2075, part: "18625-01K" },
    { um: 2125, part: "18626-01K" },
    // The original sheet records this as "18627-1K", which is one digit short
    // of every other number in the column. Corrected to match the series.
    { um: 2175, part: "18627-01K" },
    { um: 2200, part: "18670-01K" },
    { um: 2225, part: "18628-01K" },
    { um: 2250, part: "18671-01K" },
    { um: 2275, part: "18629-01K" },
    { um: 2300, part: "18672-01K" },
    { um: 2325, part: "18630-01K" },
    { um: 2350, part: "18673-01K" },
    { um: 2375, part: "18631-01K" },
    { um: 2400, part: "18674-01K" },
    { um: 2425, part: "18632-01K" },
    { um: 2450, part: "18675-01K" },
    { um: 2475, part: "18638-01K" },
    { um: 2500, part: "18676-01K" },
    { um: 2525, part: "18639-01K" },
    { um: 2550, part: "18677-01K" },
    { um: 2575, part: "18655-01K" },
    { um: 2600, part: "18678-01K" },
    { um: 2625, part: "18656-01K" },
    { um: 2650, part: "18679-01K" },
    { um: 2675, part: "18657-01K" },
    { um: 2700, part: "18680-01K" },
    { um: 2725, part: "18658-01K" },
    { um: 2750, part: "18681-01K" },
    { um: 2775, part: "18659-01K" },
    { um: 2800, part: "18682-01K" },
    { um: 2825, part: "18692-01K" },
    { um: 2850, part: "18683-01K" },
    { um: 2875, part: "18693-01K" },
    { um: 2900, part: "18684-01K" },
    { um: 2925, part: "18694-01K" },
    { um: 2950, part: "18685-01K" },
    { um: 2975, part: "18695-01K" },
    { um: 3000, part: "18686-01K" },
  ],
};

export const CATALOGUES: Record<string, ShimCatalogue> = {
  [KTM_CATALOGUE.id]: KTM_CATALOGUE,
  [HD_CATALOGUE.id]: HD_CATALOGUE,
};

export function getCatalogues(ids: string[]): ShimCatalogue[] {
  return ids.map((id) => CATALOGUES[id]).filter(Boolean);
}

/**
 * Every size obtainable from any of the given catalogues, ascending and
 * de-duplicated. A 2.35 shim is a 2.35 shim whoever boxed it.
 */
export function availableSizes(ids: string[]): number[] {
  const set = new Set<number>();
  for (const cat of getCatalogues(ids)) {
    for (const size of cat.sizes) set.add(size.um);
  }
  return [...set].sort((a, b) => a - b);
}

/** Part numbers for one size, across the catalogues the engine can use. */
export function partsForSize(
  ids: string[],
  um: number,
): { brand: string; part: string | null }[] {
  return getCatalogues(ids).map((cat) => ({
    brand: cat.brand,
    part: cat.sizes.find((s) => s.um === um)?.part ?? null,
  }));
}
