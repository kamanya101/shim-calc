"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/app";
import { beginRecovery, setNewPassword } from "@/lib/auth";
import { Button, Card } from "./ui";

/**
 * Setting a new password after following the link from an email.
 *
 * This screen exists because of what an account is *for* here. A rider's
 * clearance history lives under it, and without a way back in, a forgotten
 * password quietly destroys years of records that the app itself is holding
 * perfectly safely. Every other screen works with no signal; this one is the
 * exception, and it says so rather than failing silently.
 */
export function ResetPassword() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "dead">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Runs once, on arrival: the credentials are in the address the email sent
  // them to, and they are taken out of it as soon as they have been read.
  useEffect(() => {
    let cancelled = false;
    void beginRecovery().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setEmail(result.email);
        setState("ready");
      } else {
        setError(result.error);
        setState("dead");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await setNewPassword(password);
    if (result.ok) {
      // Signed in as themselves now, so send them to the app rather than back
      // to a sign-in screen they have just proved they do not need.
      router.replace("/");
      return;
    }

    setError(result.error);
    setBusy(false);
  };

  const field =
    "w-full rounded-lg bg-bg px-3 py-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-accent";

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-5">
      <h1 className="text-xl font-bold tracking-tight">{APP_NAME}</h1>

      {state === "checking" && (
        <p className="mt-3 text-sm text-faint">Checking your link…</p>
      )}

      {state === "dead" && (
        <>
          <p className="mt-1 mb-4 text-sm text-muted">
            {error ??
              "That link has expired or has already been used. Ask for a new one and it'll work."}
          </p>
          <Button variant="accent" onClick={() => router.replace("/")}>
            Back to sign in
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            Nothing has happened to your account or your records. A reset link
            is only good once, and only for an hour or so.
          </p>
        </>
      )}

      {state === "ready" && (
        <>
          <p className="mt-1 mb-5 text-sm text-muted">
            Choose a new password{email && <> for {email}</>}. You&rsquo;ll be
            signed in on this device straight afterwards, and your services will
            come down from the server on their own.
          </p>

          <Card className="p-4">
            <form onSubmit={submit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">
                  New password
                </span>
                <input
                  type="password"
                  value={password}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                />
                <span className="text-[11px] text-faint">
                  At least 8 characters.
                </span>
              </label>

              {error && <p className="text-sm text-bad">{error}</p>}

              <Button type="submit" variant="accent" disabled={busy}>
                {busy ? "Just a moment…" : "Set password and sign in"}
              </Button>
            </form>
          </Card>
        </>
      )}
    </main>
  );
}
