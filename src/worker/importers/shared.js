// functions/api/importers/shared.js
//
// Shared helpers for all site importers. Runs on the Cloudflare Workers
// runtime (no Node built-ins, no npm deps) — plain string/regex work only.
//
// Every importer returns a standardized song object:
//   { title: string, artist: string, sections: string[], chordChart: string }
//
// `chordChart` is the raw multi-line chord-sheet text (chords on their own
// lines above lyric lines, [Section] labels in brackets). The client feeds
// this straight into ChordNote's existing text parser, so URL import and
// paste import share one code path.

// Named HTML entities that commonly appear in scraped lyrics/chord pages.
// Typographic punctuation (smart quotes, dashes, ellipsis) is the big one —
// e.g. "I&rsquo;m" must become "I’m", not stay as a raw code.
const NAMED_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  // smart single quotes / apostrophes
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&sbquo;": "\u201A",
  // smart double quotes
  "&rdquo;": "\u201D",
  "&ldquo;": "\u201C",
  "&bdquo;": "\u201E",
  // dashes & ellipsis
  "&ndash;": "\u2013",
  "&mdash;": "\u2014",
  "&hellip;": "\u2026",
  "&minus;": "\u2212",
  // misc common ones
  "&copy;": "\u00A9",
  "&reg;": "\u00AE",
  "&trade;": "\u2122",
  "&deg;": "\u00B0",
  "&bull;": "\u2022",
  "&middot;": "\u00B7",
};

/** Decode HTML entities that commonly appear in scraped markup. */
export function decodeEntities(str = "") {
  let out = str;
  // Named entities first (case-insensitive on the name).
  out = out.replace(/&[a-z]+;/gi, (m) => {
    const key = m.toLowerCase();
    return NAMED_ENTITIES[key] !== undefined ? NAMED_ENTITIES[key] : m;
  });
  // Then numeric entities (decimal and hex).
  out = out
    .replace(/&#0*(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    );
  return out;
}

/** Strip all HTML tags from a fragment, keeping inner text. */
export function stripTags(html = "") {
  return decodeEntities(html.replace(/<[^>]*>/g, ""));
}

/** Normalize line endings and trim trailing whitespace per line. */
export function normalizeChart(text = "") {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Pull the first <title> tag's text (fallback for song title). */
export function extractTitleTag(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]).trim() : "";
}

/** Pull an Open Graph / meta property value by property name. */
export function extractMeta(html, property) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : "";
}

// Section keywords recognized as labels even when a site renders them as
// plain text (no brackets). Matched case-insensitively.
const SECTION_KEYWORDS = [
  "intro",
  "verse",
  "pre-chorus",
  "prechorus",
  "chorus",
  "post-chorus",
  "bridge",
  "interlude",
  "instrumental",
  "refrain",
  "tag",
  "vamp",
  "outro",
  "ending",
  "coda",
  "hook",
  "solo",
  "breakdown",
  "turnaround",
  "reprise",
];

// A line that is JUST a section header: a keyword, optionally a number,
// and/or a repeat marker (x3, 3x, (x2)). e.g. "Chorus", "Verse 2",
// "Chorus 1 x3", "Intro 2x", "Pre-Chorus".
const SECTION_LINE_REGEX = new RegExp(
  `^\\s*(${SECTION_KEYWORDS.join("|")})` + // keyword
    `(?:\\s*[-–—]?\\s*\\d+)?` + // optional number (Verse 2)
    `(?:\\s*\\(?\\s*(?:x\\s*\\d+|\\d+\\s*x)\\s*\\)?)?` + // optional repeat (x3 / 3x / (x2))
    `\\s*$`,
  "i",
);

/**
 * Ensure every section header line is wrapped in [brackets] exactly once,
 * so ChordNote's parser (which detects labels via /^\[.+\]$/) always sees
 * them. Lines already bracketed are normalized (trimmed, single bracket
 * pair); plain-text section headers get brackets added. Non-section lines
 * are left untouched.
 */
export function normalizeSectionLabels(text = "") {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Already bracketed — normalize to a clean single [ ... ] pair.
      const bracketed = trimmed.match(/^\[+\s*(.*?)\s*\]+$/);
      if (bracketed) {
        const inner = bracketed[1].trim();
        return inner ? `[${inner}]` : line;
      }

      // Plain-text section header — wrap it.
      if (SECTION_LINE_REGEX.test(trimmed)) {
        return `[${trimmed.replace(/\s+/g, " ")}]`;
      }

      return line;
    })
    .join("\n");
}

/**
 * Is this line a section label? A bracketed line (e.g. "[Chorus]") after
 * normalization, or a plain-text section header keyword. Used to detect
 * where the song body begins so embedded header metadata can be stripped.
 */
export function isSectionLabel(line = "") {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\[.+\]$/.test(trimmed)) return true;
  return SECTION_LINE_REGEX.test(trimmed);
}

// A single ASCII guitar/bass tablature line, e.g.
//   e|---5-7-----7-|-8-----8-2-----2-|
//   G|-----5-------5---|
// Starts with a string-name letter + a bar, then mostly dashes/digits/bars.
const TAB_LINE_REGEX = /^\s*[eADGBE]\s*\|[-0-9hpb/\\~x|().\s]{4,}$/;

/**
 * Is this chart predominantly ASCII guitar tablature rather than a
 * chord-over-lyrics sheet? ChordNote renders chord charts, not fret tabs,
 * so we detect and reject tab-heavy content. Threshold: if a meaningful
 * share of the non-empty lines look like tab staves, treat it as a tab.
 */
export function isGuitarTab(text = "") {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  const tabLines = lines.filter((l) => TAB_LINE_REGEX.test(l)).length;
  // Tab staves come in groups of ~6; even a 25% share is a strong signal.
  return tabLines >= 4 && tabLines / lines.length >= 0.25;
}

// Header/metadata lines frequently embedded at the top of chord charts:
//   "Capo: 2nd fret", "Key: G", "Tuning: E A D G B E", "Tempo: 92 BPM"
// Captured so we can both STRIP them from the body and lift useful ones
// (key, capo, tempo) into the song's meta fields.
const META_LINE_PATTERNS = [
  { field: "musicKey", re: /^\s*key\s*[:\-]\s*(.+?)\s*$/i },
  { field: "capo", re: /^\s*capo\s*[:\-]\s*(.+?)\s*$/i },
  { field: "bpm", re: /^\s*(?:tempo|bpm)\s*[:\-]\s*(.+?)\s*$/i },
  { field: null, re: /^\s*tuning\s*[:\-]\s*.+$/i }, // strip, don't store
  { field: null, re: /^\s*(?:difficulty|author|artist|song)\s*[:\-]\s*.+$/i },
];

/**
 * Pulls embedded metadata header lines out of a chord chart. Returns
 * { chart, meta } where `chart` has those lines removed and `meta` holds
 * any key/capo/bpm found (only fields not already known are filled by the
 * caller). Only strips header lines that appear BEFORE the first section
 * label or chord/lyric content, so a mid-song "Key change" note isn't
 * accidentally removed.
 */
export function extractEmbeddedMeta(text = "") {
  const lines = text.split("\n");
  const meta = {};
  const kept = [];
  let inBody = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Once we hit real content (a section label or a non-meta non-empty
    // line), stop treating lines as header metadata.
    if (!inBody && trimmed && !isSectionLabel(line)) {
      const matched = META_LINE_PATTERNS.find((p) => p.re.test(trimmed));
      if (matched) {
        if (matched.field && meta[matched.field] == null) {
          const m = trimmed.match(matched.re);
          if (m && m[1]) meta[matched.field] = m[1].trim();
        }
        continue; // strip this header line from the body
      }
      // First real content line → body starts here.
      inBody = true;
    }
    kept.push(line);
  }

  return { chart: kept.join("\n"), meta };
}

/**
 * Normalize a capo value to a short string of fret number, e.g.
 * "2nd fret" → "2", "Capo 3" → "3", "No capo" → "". Leaves already-numeric
 * values intact.
 */
export function normalizeCapo(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).toLowerCase();
  if (/no\s*capo|none/.test(s)) return "";
  const m = s.match(/\d+/);
  return m ? m[0] : "";
}

/** A consistent shape so callers never deal with undefined fields. */
export function makeSong({
  title = "",
  artist = "",
  sections = [],
  chordChart = "",
  musicKey = "",
  capo = "",
  bpm = "",
}) {
  return { title, artist, sections, chordChart, musicKey, capo, bpm };
}

/** Thrown by importers to signal a specific, user-friendly failure. */
export class ImportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // e.g. "PARSE_FAILED", "NO_CHORD_DATA"
  }
}
