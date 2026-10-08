// src/services/importUrl.js
//
// Client-side helper for the URL-import feature. Detects whether pasted
// input is a URL or plain chord text, calls the /api/import-url Cloudflare
// Function for URLs, and maps backend error codes to friendly messages.
//
// The function returns a standardized song { title, artist, sections,
// chordChart }. We expose both the metadata and a `chartText` string that
// can be fed straight into ChordNote's existing text parser — so URL and
// paste imports share one parsing path.

const API_ENDPOINT = "/api/import-url";

// Friendly fallbacks keyed by the backend `code`. The server also sends a
// human message; we prefer it, falling back to these if it's missing.
const ERROR_MESSAGES = {
  INVALID_REQUEST: "Something went wrong with the request. Please try again.",
  INVALID_URL: "That doesn't look like a valid link.",
  UNSUPPORTED: "That link isn't a web page ChordNote can read.",
  SITE_UNAVAILABLE:
    "Couldn't reach that website. It may be down or blocking imports.",
  NO_CHORD_DATA:
    "No chord chart was found on that page. Try copying the chords and pasting them as text.",
  PARSE_FAILED:
    "Couldn't read the chords from that page. Try pasting them as text instead.",
  NETWORK:
    "Network error — check your connection and try again.",
  UNKNOWN: "Unexpected error importing that URL. Please try again.",
};

/**
 * Is this input a URL we should route to the backend?
 * Only treat clear http(s) links as URLs; everything else is chord text.
 */
export function isUrl(input) {
  const t = (input || "").trim();
  if (/\s/.test(t)) return false; // URLs don't contain whitespace
  return /^https?:\/\/\S+$/i.test(t);
}

/**
 * Flatten a standardized song object into chord-chart text that the
 * existing ChordImporter text parser understands. If the chart already
 * contains the full content (the usual case), we just use it; title/artist
 * are returned separately for the preview/metadata.
 */
export function songToChartText(song) {
  return (song?.chordChart || "").trim();
}

/**
 * Import from a URL. Resolves to:
 *   { title, artist, sections, chartText }
 * Rejects with an Error whose `.message` is user-friendly and `.code` is
 * the backend code (or "NETWORK"/"UNKNOWN").
 */
export async function importFromUrl(url) {
  let res;
  try {
    res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
  } catch (_) {
    const err = new Error(ERROR_MESSAGES.NETWORK);
    err.code = "NETWORK";
    throw err;
  }

  // Detect the common "function isn't running" case: the request resolved
  // but the response isn't JSON (e.g. the dev server returned index.html
  // because /api/import-url wasn't served). This gives a clear, actionable
  // message instead of a vague failure.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const err = new Error(
      "The import service isn't responding. If you're running locally, start it with `npm run dev:functions` (plain `npm run dev` can't serve the API).",
    );
    err.code = "ENDPOINT_UNAVAILABLE";
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // fall through to generic handling below
  }

  if (!res.ok || !data || data.error) {
    const code = data?.code || "UNKNOWN";
    const message =
      data?.error || ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;
    const err = new Error(message);
    err.code = code;
    throw err;
  }

  return {
    title: data.title || "",
    artist: data.artist || "",
    sections: data.sections || [],
    musicKey: data.musicKey || "",
    capo: data.capo || "",
    bpm: data.bpm || "",
    chartText: songToChartText(data),
  };
}
