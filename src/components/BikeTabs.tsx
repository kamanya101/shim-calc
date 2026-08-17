"use client";

import { useRecords } from "./RecordsProvider";

/**
 * Switch bikes without leaving the page.
 *
 * Hidden with a single bike: there is nothing to switch to, and a lone tab
 * would spend vertical space that a phone held upright cannot spare.
 *
 * Scrolls sideways rather than wrapping, so a fourth bike lengthens the strip
 * instead of pushing the content below it down the screen.
 */
export function BikeTabs() {
  const { bikes, bike, setActiveBikeId } = useRecords();

  if (bikes.length < 2) return null;

  return (
    <div
      className="no-print -mx-4 mb-4 overflow-x-auto px-4"
      // Bleeds to the screen edges so the strip reads as scrollable rather
      // than clipped, and the last tab can sit flush.
    >
      <div role="tablist" aria-label="Bikes" className="flex gap-1 border-b border-line">
        {bikes.map((b) => {
          const active = b.id === bike.id;
          return (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveBikeId(b.id)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-faint hover:text-muted"
              }`}
            >
              {b.name}
              {b.model && (
                // Real space, not a margin — a margin looks right but copies
                // and reads aloud as "Old Beast950 Adventure".
                <>
                  {" "}
                  <span className="text-[11px] font-normal opacity-70">
                    {b.model}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
