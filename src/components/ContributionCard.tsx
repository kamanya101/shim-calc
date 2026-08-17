"use client";

import { useMemo } from "react";
import { timeAgo } from "@/lib/format";
import { countShareable } from "@/lib/pool";
import { useLocalStore } from "@/lib/store";
import { contributionStore } from "@/lib/stores";
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
          <p className="text-sm font-semibold">Shared wear data</p>
          <p className="mt-0.5 text-xs text-faint">
            How this app builds its averages.
          </p>
        </div>
        <Chip tone="neutral">
          {counts.readings.toLocaleString()} readings
        </Chip>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        One bike&rsquo;s history is too small a sample to show how these engines
        wear. So every gap you measure joins a shared pool alongside everybody
        else&rsquo;s, and once enough has come in it becomes a comparison — how
        your engine is wearing against the average for your model.
      </p>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        <strong className="text-ink">What goes:</strong> the model and year, the
        odometer, the month, and for each valve the gap you found, the shim that
        was in it and the gap you confirmed.{" "}
        <strong className="text-ink">What doesn&rsquo;t:</strong> your name,
        your email, what you call your bike, or anything that ties a reading
        back to you — that link is deliberately missing, and it cannot be
        reconstructed later by anyone, including me.
      </p>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        <strong className="text-ink">To take a reading back out</strong>, delete
        its service within a month and it leaves the pool with it. After that
        the averages keep it, and deleting only removes it from your own
        history.
      </p>

      <p className="mt-2 text-[11px] text-faint">
        {contribution.lastPushedAt
          ? `Last sent ${timeAgo(contribution.lastPushedAt)}.`
          : "Nothing sent yet — it goes up on the next sync."}
      </p>
    </Card>
  );
}
