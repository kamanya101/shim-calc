"use client";

import { useMemo } from "react";
import { formatNumber, timeAgo } from "@/lib/format";
import { countShareable } from "@/lib/pool";
import { useLocalStore } from "@/lib/store";
import { contributionStore } from "@/lib/stores";
import { useT } from "./LocaleProvider";
import { useRecords } from "./RecordsProvider";
import { Card, Chip } from "./ui";

/**
 * What the app does with a rider's measurements, stated where they will see it.
 *
 * There is no switch here, because there is no decision. Every service that
 * gets measured joins the shared averages, and that is a property of the app
 * rather than a preference in it. Saying so plainly is the least this screen
 * can do: a rider who reads it knows exactly what is happening, which is the
 * difference between a stated policy and a quiet one.
 *
 * What it does not claim: it never calls the readings a contribution the rider
 * chose to make, and never offers a way out that does not exist. The one thing
 * they can genuinely act on — deleting a service soon enough to take it back
 * out — is the thing that gets the emphasis.
 */
export function ContributionCard() {
  const t = useT();
  const contribution = useLocalStore(contributionStore);
  const { bikes, allRecords } = useRecords();

  const counts = useMemo(
    () => countShareable(bikes, allRecords),
    [bikes, allRecords],
  );

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("pool.heading")}</p>
          <p className="mt-0.5 text-xs text-faint">{t("pool.subheading")}</p>
        </div>
        <Chip tone="neutral">
          {t("pool.readings", {
            count: counts.readings,
            formatted: formatNumber(counts.readings),
          })}
        </Chip>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {t("pool.why")}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        <strong className="text-ink">{t("pool.whatGoesLabel")}</strong>{" "}
        {t("pool.whatGoes")}{" "}
        <strong className="text-ink">{t("pool.whatDoesntLabel")}</strong>{" "}
        {t("pool.whatDoesnt")}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        <strong className="text-ink">{t("pool.retractLabel")}</strong>
        {t("pool.retract")}
      </p>

      <p className="mt-2 text-[11px] text-faint">
        {contribution.lastPushedAt
          ? t("pool.lastSent", {
              ago: timeAgo(contribution.lastPushedAt, t),
            })
          : t("pool.nothingSent")}
      </p>
    </Card>
  );
}
