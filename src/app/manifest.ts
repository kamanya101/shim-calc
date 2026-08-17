import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/app";

/**
 * `display: standalone` is what makes the home-screen icon open the app
 * chrome-less, without a browser address bar — which is the whole point of
 * installing it rather than bookmarking it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    /**
     * Deliberately not locked to portrait. The phone's own rotation lock is the
     * rider's decision and they already know how to use it; overriding it from
     * in here only created an inconsistency, since the same app in a browser tab
     * rotated freely while the installed one refused to.
     */
    orientation: "any",
    background_color: "#0d0e10",
    theme_color: "#0d0e10",
    categories: ["utilities", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
