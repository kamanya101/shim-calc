"use client";

import { useState } from "react";
import { beginReauth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { downloadFile } from "@/lib/storage";
import { useAuth } from "./AuthProvider";
import { useRecords } from "./RecordsProvider";
import { useT, type Translate } from "./LocaleProvider";
import { useSync, type SyncStatus } from "./SyncProvider";
import { Button, Card, Chip, type Tone } from "./ui";

/**
 * Takes the translator rather than reaching for one, because it is not a
 * component and hooks do not belong here. The alternative — returning keys and
 * resolving them at the call site — would scatter one decision across two
 * files for no gain.
 */
function describe(
  status: SyncStatus,
  lastSyncedAt: string | null,
  t: Translate,
): { label: string; tone: Tone; detail?: string } {
  switch (status) {
    case "syncing":
      return { label: t("sync.syncing"), tone: "neutral" };
    case "synced":
      return {
        label: t("sync.syncedAgo", { ago: timeAgo(lastSyncedAt, t) }),
        tone: "ok",
      };
    case "offline":
      return {
        label: t("sync.offline"),
        tone: "warn",
        detail: t("sync.offlineDetail"),
      };
    case "auth-expired":
      return {
        label: t("sync.authExpired"),
        tone: "warn",
        detail: t("sync.authExpiredDetail"),
      };
    case "no-backend":
      return {
        label: t("sync.noBackend"),
        tone: "warn",
        detail: t("sync.noBackendDetail"),
      };
    case "error":
      return {
        label: t("sync.failed"),
        tone: "bad",
        detail: t("sync.failedDetail"),
      };
    default:
      return {
        label: t("sync.lastSyncedAgo", { ago: timeAgo(lastSyncedAt, t) }),
        tone: "neutral",
      };
  }
}

export function AccountCard() {
  const t = useT();
  const { owner, signOut } = useAuth();
  const { status, lastSyncedAt, syncNow } = useSync();
  const { exportBundle } = useRecords();
  const state = describe(status, lastSyncedAt, t);
  const [blocked, setBlocked] = useState(false);

  /**
   * Signing out erases this device's copy, so it is allowed to refuse. When
   * it does, the rider is not scolded and not stuck: they are told what is at
   * stake, handed the export, and left with the way through if they still
   * mean it.
   */
  const attemptSignOut = async () => {
    const result = await signOut();
    if (!result.ok) setBlocked(true);
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{owner.email}</p>
          <p className="mt-0.5 text-xs text-faint">{t("account.syncsHere")}</p>
        </div>
        <Chip tone={state.tone}>{state.label}</Chip>
      </div>

      {state.detail && (
        <p className="mt-2 text-xs leading-relaxed text-faint">{state.detail}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={syncNow} disabled={status === "syncing"}>
          {t("account.syncNow")}
        </Button>

        {/*
          Offered only when the session has actually expired, and separate
          from signing out on purpose: this is the way back in that keeps
          everything on the device.
        */}
        {status === "auth-expired" && (
          <Button variant="accent" onClick={beginReauth}>
            {t("account.signInAgain")}
          </Button>
        )}

        <Button variant="ghost" onClick={() => void attemptSignOut()}>
          {t("account.signOut")}
        </Button>
      </div>

      {blocked && (
        <div className="mt-3 rounded-lg border border-warn/50 bg-warn/10 p-3">
          <p className="text-xs font-semibold text-warn">
            {t("account.signOutBlocked")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t("account.signOutBlockedDetail")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              onClick={() =>
                downloadFile(
                  `shim-calc-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(exportBundle(), null, 2),
                  "application/json",
                )
              }
            >
              {t("history.exportAll")}
            </Button>
            {/*
              The way past, once they have the file. Phrased as discarding
              rather than signing out, because that is what it does.
            */}
            <Button
              variant="ghost"
              className="!text-bad"
              onClick={() => void signOut({ force: true })}
            >
              {t("account.signOutAnyway")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
