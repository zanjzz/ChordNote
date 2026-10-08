// functions/api/importers/importerFactory.js
//
// Routes a URL's HTML to the right importer by domain. Add a new site by
// writing a module that exports { canHandle(hostname), parse(html) } and
// registering it in SITE_IMPORTERS below — no changes needed anywhere else.

import ultimateGuitar from "./ultimateGuitarImporter.js";
import generic from "./genericImporter.js";
import { normalizeSectionLabels } from "./shared.js";
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

  // If the fetched chart is ChordPro, convert it to the two-line format
  // and lift any {title}/{artist} directives when the importer didn't
  // already find them.
  if (isChordPro(chart)) {
    const meta = extractChordProMeta(chart);
    if (!title && meta.title) title = meta.title;
    if (!artist && meta.artist) artist = meta.artist;
    chart = convertChordPro(chart);
  }

  // Always normalize section labels to consistent [brackets].
  chart = normalizeSectionLabels(chart);

  return { ...song, title, artist, chordChart: chart };
}
