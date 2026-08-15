"use client";

import { useEffect } from "react";

/**
 * Registers the offline cache. This is the difference between a web page and a
 * tool you can rely on in a garage with a steel roof and no signal.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // An unavailable cache is not worth interrupting anyone over — the app
        // still works, it just won't survive going offline.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
