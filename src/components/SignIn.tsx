"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/app";
import { signIn, signUp } from "@/lib/auth";
import { Button, Card } from "./ui";

type Mode = "in" | "up";

/**
 * The first screen a new rider sees, and the only one that needs a connection.
 *
 * An account is what lets a history follow somebody from the tablet in the
 * garage to the phone in their pocket. It is asked for once: after this the
 * device remembers, and the app opens with no signal from then on.
 */
export function SignIn() {
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setConfirm(false);

    const result = mode === "in" ? await signIn(email, password) : await signUp(email, password);

    // On success the owner store changes and the gate above swaps this screen
    // for the app, so there is nothing to do here but stop.
    if (!result.ok) setError(result.error);
    else if (result.needsConfirmation) setConfirm(true);
    setBusy(false);
  };

  const field =
    "w-full rounded-lg bg-bg px-3 py-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-accent";

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-5">
      <h1 className="text-xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        Sign in once and your clearance history follows you to every device you
        use. After this the app works offline — set it up at home, use it
        wherever the bike is.
      </p>

      {!online && (
        <Card className="mb-4 p-3">
          <p className="text-sm text-warn">
            You&rsquo;re offline. Signing in for the first time needs a
            connection — everything after it doesn&rsquo;t.
          </p>
        </Card>
      )}

      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Email</span>
            <input
              type="email"
              value={email}
              required
              autoComplete="email"
              autoCapitalize="none"
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Password</span>
            <input
              type="password"
              value={password}
              required
              minLength={8}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
            {mode === "up" && (
              <span className="text-[11px] text-faint">At least 8 characters.</span>
            )}
          </label>

          {error && <p className="text-sm text-bad">{error}</p>}
          {confirm && (
            <p className="text-sm text-ok">
              Account created. Check your email for a confirmation link, then
              come back and sign in.
            </p>
          )}

          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? "Just a moment…" : mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </Card>

      <Button
        variant="ghost"
        className="mt-3"
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setError(null);
          setConfirm(false);
        }}
      >
        {mode === "in"
          ? "No account yet? Create one"
          : "Already have an account? Sign in"}
      </Button>
    </main>
  );
}
