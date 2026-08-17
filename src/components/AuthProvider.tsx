"use client";

import { createContext, useCallback, useContext } from "react";
import { usePathname } from "next/navigation";
import { RESET_PATH } from "@/lib/app";
import { signOut as signOutUser } from "@/lib/auth";
import { useHydrated, useLocalStore } from "@/lib/store";
import { ownerStore, type Owner } from "@/lib/stores";
import { SignIn } from "./SignIn";

type AuthContextValue = {
  owner: Owner;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Shows the app to whoever is signed in on this device, and the sign-in screen
 * to everybody else.
 *
 * The gate reads the local record of who signed in, never the live session —
 * see `ownerStore`. Somebody who signed in at home and is now under a bike with
 * no signal is still signed in, and everything works; the only thing an expired
 * token stops is syncing.
 *
 * Client-side on purpose. Doing this in middleware would make every route
 * dynamic, and the service worker can only cache what prerenders — the app
 * would stop opening offline, which is the whole point of it.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const owner = useLocalStore(ownerStore);
  const pathname = usePathname();

  const signOut = useCallback(async () => {
    await signOutUser();
  }, []);

  // The prerendered HTML cannot know who is signed in — localStorage does not
  // exist yet. Painting the sign-in screen and then swapping it for the app a
  // moment later would flash on every single launch, so hold until hydration
  // has read the answer.
  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-faint">Loading…</p>
      </div>
    );
  }

  // The reset screen has to be reachable by somebody who cannot sign in —
  // that is the entire point of it — so the gate does not apply. It provides
  // no auth context, and nothing on it asks for one.
  if (pathname === RESET_PATH) return <>{children}</>;

  if (!owner) return <SignIn />;

  return <Ctx.Provider value={{ owner, signOut }}>{children}</Ctx.Provider>;
}
