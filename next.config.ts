import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    /**
     * Stamped into the service worker's registration URL so every deploy
     * installs a fresh worker and discards the previous build's cache.
     * Vercel supplies the commit sha; local builds fall back to the build time.
     */
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? String(Date.now()),
  },
};

export default nextConfig;
