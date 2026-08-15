"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store read through `useSyncExternalStore`.
 *
 * Reading localStorage in an effect and calling setState is the obvious
 * approach and the wrong one: it double-renders, and React has an API built
 * for exactly this — an external source of truth with a different value on the
 * server than on the client. Going through the proper channel also gets
 * cross-tab sync for nothing, via the `storage` event.
 */
export type LocalStore<T> = {
  subscribe: (onChange: () => void) => () => void;
  get: () => T;
  getServer: () => T;
  set: (value: T) => void;
};

export function createLocalStore<T>(
  key: string,
  serverValue: T,
  revive: (raw: unknown) => T | null,
): LocalStore<T> {
  let cache: T = serverValue;
  let loaded = false;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const read = (): T => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return serverValue;
      return revive(JSON.parse(raw)) ?? serverValue;
    } catch {
      // Corrupt or unreadable storage falls back to the default rather than
      // taking the whole app down.
      return serverValue;
    }
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      const onStorage = (event: StorageEvent) => {
        if (event.key !== key) return;
        loaded = false;
        emit();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    get() {
      // Must return a stable reference between calls or React re-renders
      // forever, hence the cache rather than reading storage every time.
      if (!loaded) {
        cache = read();
        loaded = true;
      }
      return cache;
    },
    getServer() {
      return serverValue;
    },
    set(value) {
      cache = value;
      loaded = true;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Private mode, or the quota is full. The in-memory value still
        // updates, so the session keeps working — it just won't persist.
      }
      emit();
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

const NOOP_UNSUBSCRIBE = () => {};
const subscribeNothing = () => NOOP_UNSUBSCRIBE;

/** False during server render and the hydration pass, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
