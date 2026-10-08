// functions/api/importers/genericImporter.js
//
// Fallback importer for any site not matched by a dedicated module.
// Strategy: most simple chord pages put the whole chart inside a <pre>
// block (and often wrap chords in <span>/<b> tags). We take the largest
// <pre>, strip tags, and treat that as the chord chart. Title/artist come
// from Open Graph or the <title> tag.

import {
  makeSong,
  stripTags,
  normalizeChart,
  extractTitleTag,
  extractMeta,
  ImportError,
} from "./shared.js";

function splitTitleArtist(raw) {
  // Common patterns: "Song - Artist", "Artist - Song Chords", "Song by Artist"
  if (!raw) return { title: "", artist: "" };
  let s = raw.replace(/\s*(chords|tab|lyrics)\s*$/i, "").trim();

  let m = s.match(/^(.*?)\s+by\s+(.*)$/i);
  if (m) return { title: m[1].trim(), artist: m[2].trim() };

  m = s.match(/^(.*?)\s*[-–—]\s*(.*)$/);
  if (m) return { title: m[1].trim(), artist: m[2].trim() };

  return { title: s, artist: "" };
}

export function canHandle() {
  // The generic importer is the catch-all; the factory only calls it last.
  return true;
}

export function parse(html) {
  // Collect every <pre> block, pick the one with the most newlines
  // (the actual chart, not a code snippet or footer).
  const preBlocks = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)].map(
    (m) => m[1],
  );

  let best = "";
  let bestScore = -1;
  for (const block of preBlocks) {
    const text = normalizeChart(stripTags(block));
    const score = (text.match(/\n/g) || []).length;
    if (score > bestScore && text.trim()) {
      best = text;
      bestScore = score;
    }
  }

  if (!best || bestScore < 1) {
    throw new ImportError(
      "NO_CHORD_DATA",
      "Couldn't find a chord chart on that page. Try copying the chords and pasting them as text instead.",
    );
  }

  const rawTitle = extractMeta(html, "og:title") || extractTitleTag(html);
  const { title, artist } = splitTitleArtist(rawTitle);

  return makeSong({ title, artist, chordChart: best });
}

export default { canHandle, parse };
