/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, ExpirationPlugin } from "serwist";

// Compiled to /public/sw.js by @serwist/next during production builds.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Keep the shopping list readable offline (the in-store scenario). Network
    // first so it's fresh online, but falls back to the last-seen list offline.
    {
      matcher: ({ url, request, sameOrigin }) =>
        sameOrigin &&
        request.method === "GET" &&
        url.pathname.includes("/shopping-list"),
      handler: new NetworkFirst({
        cacheName: "shopping-list",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
