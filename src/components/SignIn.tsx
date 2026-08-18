"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/app";
import { requestPasswordReset, signIn, signUp } from "@/lib/auth";
import { LanguageButton } from "./LanguageButton";
import { useT } from "./LocaleProvider";
import { Button, Card } from "./ui";

type Mode = "in" | "up" | "forgot";

/**
 * The first screen a new rider sees, and the only one that needs a connection.
 *
 * An account is what lets a history follow somebody from the tablet in the
 * garage to the phone in their pocket. It is asked for once: after this the
 * device remembers, and the app opens with no signal from then on.
 *
 * Carries the language button for the same reason every sheet does, only more
 * so: this screen stands in front of the whole app, and a rider who cannot
 * read it cannot get past it to find the control anywhere else. The choice
 * they make here is the same stored setting, so it is still in force once
 * they are through.
 */
export function SignIn() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);
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
    setSent(false);

    const result =
      mode === "in"
        ? await signIn(email, password)
        : mode === "up"
          ? await signUp(email, password)
          : await requestPasswordReset(email);

    // On success the owner store changes and the gate above swaps this screen
    // for the app, so there is nothing to do here but stop. Asking for a reset
    // is the exception: nothing changes on this device until they follow the
    // link, so it has to say something.
    if (!result.ok) setError(result.error);
    else if (mode === "forgot") setSent(true);
    else if (result.needsConfirmation) setConfirm(true);
    setBusy(false);
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirm(false);
    setSent(false);
  };

  const field =
    "w-full rounded-lg bg-bg px-3 py-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-accent";

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-5">
      {/* Same shape as PageHeader on the sheets, so the globe is in the place
          a rider will go looking for it once they are inside. */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">{APP_NAME}</h1>
        <div className="shrink-0">
          <LanguageButton />
        </div>
      </div>
      <p className="mt-1 mb-5 text-sm text-muted">{t("signIn.blurb")}</p>

      {!online && (
        <Card className="mb-4 p-3">
          <p className="text-sm text-warn">{t("signIn.offline")}</p>
        </Card>
      )}

      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">
              {t("signIn.email")}
            </span>
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

          {mode !== "forgot" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">
                {t("signIn.password")}
              </span>
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
                <span className="text-[11px] text-faint">
                  {t("signIn.passwordHint")}
                </span>
              )}
            </label>
          )}

          {mode === "forgot" && (
            <p className="text-xs leading-relaxed text-faint">
              {t("signIn.forgotBlurb")}
            </p>
          )}

          {/* Still English whatever is chosen: this comes back from the auth
              server, not from the dictionaries. */}
          {error && <p className="text-sm text-bad">{error}</p>}
          {confirm && (
            <p className="text-sm text-ok">{t("signIn.confirmSent")}</p>
          )}
          {sent && <p className="text-sm text-ok">{t("signIn.resetSent")}</p>}

          <Button type="submit" variant="accent" disabled={busy}>
            {busy
              ? t("signIn.busy")
              : mode === "in"
                ? t("signIn.submitIn")
                : mode === "up"
                  ? t("signIn.submitUp")
                  : t("signIn.submitForgot")}
          </Button>
        </form>
      </Card>

      <Button
        variant="ghost"
        className="mt-3"
        onClick={() => switchTo(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? t("signIn.toSignUp") : t("signIn.toSignIn")}
      </Button>

      {/* Only offered where it makes sense: somebody halfway through creating
          an account has no password to have forgotten. */}
      {mode === "in" && (
        <button
          type="button"
          onClick={() => switchTo("forgot")}
          className="mt-1 text-xs font-semibold text-faint underline underline-offset-2 hover:text-muted"
        >
          {t("signIn.forgot")}
        </button>
      )}
    </main>
  );
}
