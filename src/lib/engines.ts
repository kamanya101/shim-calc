import type { EngineSpec, ValvePosition } from "./types";

/**
 * The order of `positions` is the order they are drawn on screen, and it
 * deliberately mimics the engine — front cylinder's exhausts at the front,
 * both intakes facing each other inside the V, rear cylinder's exhausts at
 * the back. Note 2 of the original spreadsheet is emphatic about this: the
 * layout is what stops you putting an intake measurement in an exhaust box.
 */
function v(
  id: string,
  label: string,
  short: string,
  bank: string,
  type: "intake" | "exhaust",
): ValvePosition {
  return { id, label, short, bank, type };
}

export const KTM_LC8: EngineSpec = {
  id: "ktm-lc8-950-990",
  name: "KTM LC8",
  subtitle: "950 / 990 V-twin",
  cylinders: 2,
  valvesPerCylinder: 4,
  clearance: {
    intake: { min: 100, max: 150 },
    exhaust: { min: 250, max: 300 },
  },
  catalogues: ["ktm-lc8", "hd"],
  positions: [
    v("f-ex-l", "Front left exhaust", "Left", "Front cylinder", "exhaust"),
    v("f-ex-r", "Front right exhaust", "Right", "Front cylinder", "exhaust"),
    v("f-in-l", "Front left intake", "Left", "Front cylinder", "intake"),
    v("f-in-r", "Front right intake", "Right", "Front cylinder", "intake"),
    v("r-in-l", "Rear left intake", "Left", "Rear cylinder", "intake"),
    v("r-in-r", "Rear right intake", "Right", "Rear cylinder", "intake"),
    v("r-ex-l", "Rear left exhaust", "Left", "Rear cylinder", "exhaust"),
    v("r-ex-r", "Rear right exhaust", "Right", "Rear cylinder", "exhaust"),
  ],
};

export const ENGINES: EngineSpec[] = [KTM_LC8];

export const DEFAULT_ENGINE_ID = KTM_LC8.id;

export function getEngine(id: string): EngineSpec {
  return ENGINES.find((e) => e.id === id) ?? KTM_LC8;
}

/**
 * Positions grouped into the blocks the sheet draws, preserving order.
 * Consecutive positions sharing a bank and a valve type form one block.
 */
export type ValveGroup = {
  key: string;
  bank: string;
  type: "intake" | "exhaust";
  positions: ValvePosition[];
};

export function groupPositions(engine: EngineSpec): ValveGroup[] {
  const groups: ValveGroup[] = [];
  for (const pos of engine.positions) {
    const last = groups[groups.length - 1];
    if (last && last.bank === pos.bank && last.type === pos.type) {
      last.positions.push(pos);
    } else {
      groups.push({
        key: `${pos.bank}-${pos.type}`,
        bank: pos.bank,
        type: pos.type,
        positions: [pos],
      });
    }
  }
  return groups;
}

/** Banks in draw order, each holding its groups. */
export function groupsByBank(engine: EngineSpec) {
  const banks: { bank: string; groups: ValveGroup[] }[] = [];
  for (const group of groupPositions(engine)) {
    const last = banks[banks.length - 1];
    if (last && last.bank === group.bank) last.groups.push(group);
    else banks.push({ bank: group.bank, groups: [group] });
  }
  return banks;
}
