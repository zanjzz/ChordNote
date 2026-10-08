// src/worker/index.js
//
// Cloudflare Worker entry point. Serves the built static site (the Vite
// `dist/` output, bound as `env.ASSETS`) AND the server-side API routes.
//
// Routing:
//   POST   /api/import-url  → URL import handler
//   OPTIONS/api/import-url  → CORS preflight
//   (other method on it)    → 405
//   everything else         → static assets (SPA, with index.html fallback)

import {
  handleImportUrl,
  corsPreflight,
  methodNotAllowed,
} from "./importUrlHandler.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── API routes ────────────────────────────────────────────────────
    if (url.pathname === "/api/import-url") {
      if (request.method === "POST") return handleImportUrl(request);
      if (request.method === "OPTIONS") return corsPreflight();
      return methodNotAllowed();
    }

    // ── Static assets (the React app) ───────────────────────────────────
    // The `assets` binding handles files in dist/ and, with
    // not_found_handling = "single-page-application", serves index.html for
    // client-side routes.
    return env.ASSETS.fetch(request);
  },
};
