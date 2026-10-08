// functions/api/import-url.js
//
// Cloudflare Pages Function — POST /api/import-url
// Body: { "url": "https://..." }
// Returns: { title, artist, sections, chordChart }  (200)
//      or: { error, code }                           (4xx/5xx)
//
// Fetches the target page server-side (no browser CORS limits), then routes
// its HTML through the importer factory. All failure modes map to a stable
// `code` the client turns into a friendly message.

import { parseHtml } from "./importers/importerFactory.js";
import { ImportError } from "./importers/shared.js";

const FETCH_TIMEOUT_MS = 12000;
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB cap on fetched HTML

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function fail(code, message, status) {
  return json({ error: message, code }, status);
}

// Reject non-public hosts to avoid SSRF against internal infra.
function isDisallowedHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  return false;
}

async function handleImport(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return fail("INVALID_REQUEST", "Invalid request body.", 400);
  }

  const rawUrl = (payload?.url || "").trim();
  if (!rawUrl) {
    return fail("INVALID_URL", "No URL was provided.", 400);
  }

  // ── Validate URL ──────────────────────────────────────────────────────
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    return fail("INVALID_URL", "That doesn't look like a valid URL.", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("INVALID_URL", "Only http and https links are supported.", 400);
  }
  if (isDisallowedHost(url.hostname)) {
    return fail("INVALID_URL", "That URL can't be imported.", 400);
  }

  // ── Fetch the page ────────────────────────────────────────────────────
  let html;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        // Look like a real browser — many sites 403 default fetch agents.
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return fail(
        "SITE_UNAVAILABLE",
        `The website returned an error (${res.status}). It may be down or blocking imports.`,
        502,
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      return fail(
        "UNSUPPORTED",
        "That link isn't a web page we can read.",
        415,
      );
    }

    // Read with a size cap.
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total > MAX_BYTES ? MAX_BYTES : total);
    let offset = 0;
    for (const c of chunks) {
      if (offset + c.length > merged.length) {
        merged.set(c.subarray(0, merged.length - offset), offset);
        break;
      }
      merged.set(c, offset);
      offset += c.length;
    }
    html = new TextDecoder("utf-8").decode(merged);
  } catch (err) {
    if (err?.name === "AbortError") {
      return fail(
        "SITE_UNAVAILABLE",
        "The website took too long to respond. Please try again.",
        504,
      );
    }
    return fail(
      "SITE_UNAVAILABLE",
      "Couldn't reach that website. Check the link and try again.",
      502,
    );
  }

  // ── Parse via the importer factory ──────────────────────────────────────
  try {
    const song = parseHtml(url.hostname, html);
    if (!song.chordChart || !song.chordChart.trim()) {
      return fail(
        "NO_CHORD_DATA",
        "No chord data was found on that page.",
        422,
      );
    }
    return json(song, 200);
  } catch (err) {
    if (err instanceof ImportError) {
      const status = err.code === "NO_CHORD_DATA" ? 422 : 422;
      return fail(err.code, err.message, status);
    }
    return fail(
      "PARSE_FAILED",
      "Something went wrong reading that page. Try pasting the chords as text instead.",
      500,
    );
  }
}

// Single entry point for the route. We handle the method ourselves rather
// than relying on onRequestPost, which proved fragile in production (405s).
// POST does the import; OPTIONS answers any CORS preflight; everything else
// gets a clean 405.
export async function onRequest(context) {
  const { request } = context;
  const method = request.method.toUpperCase();

  if (method === "POST") {
    return handleImport(request);
  }

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      },
    });
  }

  return fail("INVALID_REQUEST", "Use POST to import a URL.", 405);
}
