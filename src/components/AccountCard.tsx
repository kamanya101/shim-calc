"use client";

import { useAuth } from "./AuthProvider";
import { useSync, type SyncStatus } from "./SyncProvider";
import { Button, Card, Chip, type Tone } from "./ui";

function timeAgo(iso: string | null): string {
  if (!iso) return "not yet";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 90) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function describe(
  status: SyncStatus,
  lastSyncedAt: string | null,
): { label: string; tone: Tone; detail?: string } {
  switch (status) {
    case "syncing":
      return { label: "Syncing…", tone: "neutral" };
    case "synced":
      return { label: `Synced ${timeAgo(lastSyncedAt)}`, tone: "ok" };
    case "offline":
      return {
        label: "Offline",
        tone: "warn",
        detail: "Your changes are saved here and will go up when you have signal.",
      };
    case "auth-expired":
      return {
        label: "Sign in again",
        tone: "warn",
        detail:
          "You've been signed in on this device long enough that the server wants a fresh sign-in. Nothing is lost — your records are here, and they'll sync once you do.",
      };
    case "no-backend":
      return {
        label: "No server",
        tone: "warn",
        detail: "This copy has no sync configured. Export is your backup.",
      };
    case "error":
      return {
        label: "Sync failed",
        tone: "bad",
        detail: "Your records are safe on this device. Try again in a moment.",
      };
    default:
      return { label: `Last synced ${timeAgo(lastSyncedAt)}`, tone: "neutral" };
  }
}

export function AccountCard() {
  const { owner, signOut } = useAuth();
  const { status, lastSyncedAt, syncNow } = useSync();
  const state = describe(status, lastSyncedAt);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{owner.email}</p>
          <p className="mt-0.5 text-xs text-faint">
            Your services sync to this account.
          </p>
        </div>
        <Chip tone={state.tone}>{state.label}</Chip>
      </div>

      {state.detail && (
        <p className="mt-2 text-xs leading-relaxed text-faint">{state.detail}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={syncNow} disabled={status === "syncing"}>
          Sync now
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </Card>
  );
}
