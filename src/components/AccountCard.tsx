"use client";

import { timeAgo } from "@/lib/format";
import { useAuth } from "./AuthProvider";
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
  const state = describe(status, lastSyncedAt, t);

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
        <Button variant="ghost" onClick={() => void signOut()}>
          {t("account.signOut")}
        </Button>
      </div>
    </Card>
  );
}
