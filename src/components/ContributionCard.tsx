"use client";

import { useMemo } from "react";
import { timeAgo } from "@/lib/format";
import { countShareable, newContributorToken } from "@/lib/pool";
import { useLocalStore } from "@/lib/store";
import { contributionStore, isContributing } from "@/lib/stores";
import { useRecords } from "./RecordsProvider";
import { useSync } from "./SyncProvider";
import { Button, Card, Chip } from "./ui";

/**
 * Turning the shared pool on and off.
 *
 * Kept separate from the account card because it is a separate decision:
 * having an account is how a rider's own history follows them between phone
 * and tablet, and it commits them to nothing else. Rolling the two together
 * would make signing in feel like signing something.
 *
 * The wording tries to be honest about the one thing that cannot be undone.
 * Everything else here is reversible; a reading that has left is gone in the
 * sense that matters — nobody, this rider included, can point at it again once
 * their account goes. Someone deciding this deserves to read it in a sentence,
 * not to find out later.
 */
export function ContributionCard() {
  const contribution = useLocalStore(contributionStore);
  const { bikes, allRecords } = useRecords();
  const { syncNow } = useSync();

  const sharing = isContributing(contribution);
  const counts = useMemo(
    () => countShareable(bikes, allRecords),
    [bikes, allRecords],
  );

  const start = () => {
    const now = new Date().toISOString();
    contributionStore.set({
      ...contribution,
      // Kept if there already is one: re-joining after a change of mind should
      // put a rider's readings back with the ones they shared the first time,
      // not start a second bike alongside their own in the averages.
      token: contribution.token ?? newContributorToken(),
      optedInAt: contribution.optedInAt ?? now,
      withdrawnAt: null,
      updatedAt: now,
      // The keys have not changed, but the pool may have dropped rows while
      // this was off. Push everything again rather than assume.
      lastPushed: null,
    });
    syncNow();
  };

  const stop = () => {
    const now = new Date().toISOString();
    contributionStore.set({
      ...contribution,
      withdrawnAt: now,
      updatedAt: now,
    });
    syncNow();
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Shared wear data</p>
          <p className="mt-0.5 text-xs text-faint">
            Optional, and separate from your account.
          </p>
        </div>
        <Chip tone={sharing ? "ok" : "neutral"}>
          {sharing ? "Sharing" : "Not sharing"}
        </Chip>
      </div>

      {sharing ? (
        <>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            <strong className="text-ink">
              {counts.readings.toLocaleString()} readings
            </strong>{" "}
            from {counts.bikes === 1 ? "one bike" : `${counts.bikes} bikes`}
            {contribution.lastPushedAt ? (
              <>
                {" "}
                — last sent {timeAgo(contribution.lastPushedAt)}. New services
                go up on their own from now on.
              </>
            ) : (
              // Says nothing about why. It is almost always "no signal yet",
              // and a rider under a bike does not need the app speculating.
              <> — nothing has reached the pool yet. It goes up on the next sync.</>
            )}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-faint">
            Stopping ends anything further going up, and closes the comparison
            to you. What is already in the pool stays there.
          </p>
          <div className="mt-3">
            <Button variant="ghost" onClick={stop}>
              Stop sharing
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            These engines wear in a pattern, and one bike&apos;s history is too
            small a sample to see it. Share yours and it joins everybody
            else&apos;s. Once enough has come in, you&apos;ll be able to see how
            your engine compares — whether your intakes are closing up faster
            than the average for your model, or whether that one stubborn valve
            is normal.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            <strong className="text-ink">What goes:</strong> the model and year,
            the odometer, the month, and for each valve the gap you found, the
            shim that was in it and the gap you confirmed. Your{" "}
            {counts.readings > 0 ? (
              <>
                {counts.readings.toLocaleString()} existing readings go too, not
                just future ones.
              </>
            ) : (
              <>existing services go too, not just future ones.</>
            )}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            <strong className="text-ink">What doesn&apos;t:</strong> your name,
            your email, what you call your bike, or anything linking a reading
            back to you. That link is missing on purpose, and it has one
            consequence worth knowing before you decide: if you ever delete your
            account, the readings stay in the pool and nobody — me included —
            can find them again to take them out.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-faint">
            You can stop at any time, and deleting a service takes its readings
            back out of the pool while your account still exists.
          </p>
          <div className="mt-3">
            <Button variant="accent" onClick={start}>
              Share my measurements
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
