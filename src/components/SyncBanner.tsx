"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/format";
import { useT } from "./LocaleProvider";
import { useSync } from "./SyncProvider";

/**
 * Says, on whatever screen the rider is on, that their work has not reached
 * their account.
 *
 * Until this existed the only place that fact appeared was the Account card,
 * below the charts and the service list on the History page — somewhere a
 * rider has no reason to visit. An app whose syncing had been broken for
 * weeks looked exactly like one that was working, which is how a real October
 * service came within one careless tap of being lost.
 *
 * Deliberately NOT shown when the device is simply offline. That is the normal
 * state of this app: a phone propped against a toolbox in a workshop with no
 * signal, which is the case it was built for. Nothing is wrong, nothing needs
 * doing, and a warning there would be the nagging that makes people stop
 * reading warnings at all. Losing signal is not a problem; failing to catch up
 * afterwards is, and that is a different status.
 *
 * So this speaks only when a sync was actually attempted and did not work. It
 * leads with what is at stake — the work is not backed up — rather than with
 * the chore, because "sign in again" to somebody with greasy hands under a
 * droplight is a demand, while "your last service is only on this phone" is a
 * reason.
 */
export function SyncBanner() {
  const t = useT();
  const { status, lastSyncedAt, syncNow } = useSync();
  const [hidden, setHidden] = useState(false);

  // "offline" and "no-backend" are quiet on purpose — see above. "idle",
  // "syncing" and "synced" have nothing to say.
  const speaks = status === "error" || status === "auth-expired";
  if (!speaks || hidden) return null;

  const expired = status === "auth-expired";

  return (
    <div
      // Sticky rather than fixed: it holds its place while a rider scrolls a
      // long sheet, without permanently taking height from a landscape phone.
      className="no-print sticky top-0 z-30 border-b border-warn/40 bg-warn/10 backdrop-blur"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-2.5">
        <WarnIcon />

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-warn">
            {t("syncBanner.title")}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            {expired
              ? t("syncBanner.expiredBody")
              : lastSyncedAt
                ? t("syncBanner.since", { ago: timeAgo(lastSyncedAt, t) })
                : t("syncBanner.neverBody")}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {/*
            No "sign in" button here even when the session has expired: that
            road runs through a sign-out, which erases anything not yet
            uploaded. The Account card is where that is handled, with the
            warning it needs.
          */}
          {!expired && (
            <button
              type="button"
              onClick={syncNow}
              className="text-[11px] font-semibold text-warn underline underline-offset-2"
            >
              {t("syncBanner.retry")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="text-[11px] font-medium text-faint underline underline-offset-2"
          >
            {t("syncBanner.hide")}
          </button>
        </div>
      </div>
    </div>
  );
}

function WarnIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-warn"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
