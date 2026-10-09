// functions/api/importers/importerFactory.js
//
// Routes a URL's HTML to the right importer by domain. Add a new site by
// writing a module that exports { canHandle(hostname), parse(html) } and
// registering it in SITE_IMPORTERS below — no changes needed anywhere else.

import ultimateGuitar from "./ultimateGuitarImporter.js";
import generic from "./genericImporter.js";
import {
  normalizeSectionLabels,
  isGuitarTab,
  extractEmbeddedMeta,
  normalizeCapo,
  ImportError,
} from "./shared.js";
import { isChordPro, convertChordPro, extractChordProMeta } from "./chordpro.js";

// Dedicated, domain-specific importers, checked in order. The generic
// importer is always the final fallback and is NOT in this list.
const SITE_IMPORTERS = [ultimateGuitar];

/**
 * Pick the importer for a hostname. Falls back to the generic importer.
 * @param {string} hostname e.g. "tabs.ultimate-guitar.com"
 */
export function getImporter(hostname) {
  for (const importer of SITE_IMPORTERS) {
    try {
      if (importer.canHandle(hostname)) return importer;
    } catch (_) {
      // A misbehaving canHandle shouldn't break routing.
    }
  }
  return generic;
}

/**
 * Parse HTML into a standardized song using the importer for `hostname`,
 * then apply shared post-processing (consistent [Section] bracketing) so
 * every importer — current and future — benefits automatically.
 * @returns {{title,artist,sections,chordChart}}
 */
export function parseHtml(hostname, html) {
  const importer = getImporter(hostname);
  const song = importer.parse(html);

  let chart = song.chordChart || "";
  let title = song.title || "";
  let artist = song.artist || "";
  let musicKey = song.musicKey || "";
  let capo = song.capo || "";
  let bpm = song.bpm || "";

  // Reject ASCII guitar/bass tablature — ChordNote renders chord-over-lyric
  // charts, not fret tabs, so importing a tab produces unusable garbage.
  if (isGuitarTab(chart)) {
    throw new ImportError(
      "UNSUPPORTED_TAB",
      "That looks like a guitar tab (fret tablature), which ChordNote can't import. Try a chords page instead.",
    );
  }

  // If the fetched chart is ChordPro, convert it to the two-line format
  // and lift any {title}/{artist}/{key} directives when the importer
  // didn't already find them.
  if (isChordPro(chart)) {
    const meta = extractChordProMeta(chart);
    if (!title && meta.title) title = meta.title;
    if (!artist && meta.artist) artist = meta.artist;
    if (!musicKey && meta.key) musicKey = meta.key;
    chart = convertChordPro(chart);
  }

  // Strip embedded header metadata (Capo:/Key:/Tuning:/Tempo:) out of the
  // chart body so it doesn't land in the lyrics, and lift useful values
  // into meta when the importer didn't already provide them.
  const { chart: strippedChart, meta: embedded } = extractEmbeddedMeta(chart);
  chart = strippedChart;
  if (!musicKey && embedded.musicKey) musicKey = embedded.musicKey;
  if (!capo && embedded.capo) capo = embedded.capo;
  if (!bpm && embedded.bpm) bpm = embedded.bpm;

  // Normalize capo ("2nd fret" → "2", "No capo" → "").
  capo = normalizeCapo(capo);

  // Always normalize section labels to consistent [brackets].
  chart = normalizeSectionLabels(chart);

  return { ...song, title, artist, musicKey, capo, bpm, chordChart: chart };
}
