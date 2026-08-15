import type { MetadataRoute } from "next";

/**
 * `display: standalone` is what makes the home-screen icon open the app
 * chrome-less, without a browser address bar — which is the whole point of
 * installing it rather than bookmarking it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shim Calculator — KTM LC8",
    short_name: "Shim Calc",
    description:
      "Valve shim sizes, part numbers and clearance records for KTM LC8 950/990 engines. Works offline.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
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
