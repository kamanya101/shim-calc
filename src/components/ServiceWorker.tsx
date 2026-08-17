"use client";

import { useEffect } from "react";

/**
 * Registers the offline cache. This is the difference between a web page and a
 * tool you can rely on in a garage with a steel roof and no signal.
 *
 * The build id in the URL is load-bearing: it makes sw.js byte-different on
 * every deploy, which is what triggers the browser to install a new worker and
 * throw away the previous build's cache. Without it a deploy could leave people
 * on an old version indefinitely.
 */
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register(`/sw.js?v=${BUILD_ID}`).catch(() => {
        // An unavailable cache is not worth interrupting anyone over — the app
        // still works, it just won't survive going offline.
      });
    };

    // When a new worker takes over an already-controlled page, the code running
    // is the old build. Reload once to pick up the new one. Guarding on a
    // pre-existing controller matters: on a first visit the worker claims the
    // page immediately, and reloading then would be a pointless flash.
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange,
      );
    }

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
