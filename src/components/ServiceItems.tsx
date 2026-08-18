"use client";

import { SERVICE_ITEMS, sortItems } from "@/lib/serviceItems";
import { useT } from "./LocaleProvider";
import { Card } from "./ui";

/**
 * What was replaced at this service, over and above the shims.
 *
 * Sits under the valve cards because that is the order the work happens in:
 * the shims are what the sheet is for, and the oil and filters are what else
 * got done while the bike was apart. Ticking is the whole interaction — no
 * quantities, no brands, no cost. Anything more is a form to fill in, and a
 * form is what stops somebody recording the service at all.
 *
 * Real checkboxes under the styling rather than buttons pretending to be them.
 * These are twelve independent yes/no answers, which is exactly what a checkbox
 * is, and it means the list can be worked through with a keyboard and read out
 * correctly by a screen reader without any of it being described by hand.
 */
export function ServiceItems({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const ticked = new Set(items);

  const toggle = (id: string) => {
    const next = new Set(ticked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(sortItems([...next]));
  };

  return (
    <Card className="mt-5 p-3">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
          {t("items.heading")}
        </h3>
        {ticked.size > 0 && (
          <span className="text-[11px] font-semibold text-faint tabular-nums">
            {t("items.ticked", { count: ticked.size })}
          </span>
        )}
      </div>

      {/* Wrapped rather than gridded: the labels are different lengths, and a
          grid would either clip "Front Sprocket" or leave a lot of air around
          "Chain". Each one is a full-height tap target so it can be hit with a
          thumb, in gloves, next to a warm engine. */}
      <div className="flex flex-wrap gap-1.5">
        {SERVICE_ITEMS.map((item) => {
          const on = ticked.has(item.id);
          return (
            <label key={item.id} className="cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={on}
                onChange={() => toggle(item.id)}
              />
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold ring-1 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
                  on
                    ? "bg-accent/15 text-accent ring-accent/40"
                    : "bg-bg text-muted ring-line hover:bg-raised hover:text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] leading-none ${
                    on
                      ? "border-accent bg-accent text-black"
                      : "border-line bg-surface text-transparent"
                  }`}
                >
                  ✓
                </span>
                {/* Looked up rather than read off the list: the ids are
                    permanent and English, the words on screen are not. */}
                {t(`part.${item.id}`)}
              </span>
            </label>
          );
        })}
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-faint">
        {t("items.hint")}
      </p>
    </Card>
  );
}
