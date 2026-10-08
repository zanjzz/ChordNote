// functions/api/importers/ultimateGuitarImporter.js
//
// Ultimate Guitar renders chords client-side from a big JSON blob embedded
// in the page: <div class="js-store" data-content="...escaped JSON...">.
// We extract that blob, parse it, and pull the tab content. UG wraps chords
// in [ch]...[/ch] and sections in [tab]...[/tab] markers, which we convert
// to ChordNote's plain-text convention.
//
// Best-effort: UG actively changes markup and blocks bots, so this can
// break. When it does, the error surfaces cleanly to the user.

import { makeSong, decodeEntities, normalizeChart, ImportError } from "./shared.js";

export function canHandle(hostname) {
  return /(^|\.)ultimate-guitar\.com$/i.test(hostname);
}

function stripUGMarkup(tab) {
  return (
    tab
      // [ch]G[/ch] -> G  (chord markers)
      .replace(/\[\/?ch\]/gi, "")
      // [tab] ... [/tab] wrap aligned chord/lyric blocks — drop the markers
      .replace(/\[\/?tab\]/gi, "")
  );
}

export function parse(html) {
  const m = html.match(/data-content=["']([\s\S]*?)["']\s*>/i);
  if (!m) {
    throw new ImportError(
      "PARSE_FAILED",
      "Couldn't read the Ultimate Guitar page. It may have changed format — try pasting the chords as text instead.",
    );
  }

  let store;
  try {
    store = JSON.parse(decodeEntities(m[1]));
  } catch (_) {
    throw new ImportError(
      "PARSE_FAILED",
      "Couldn't parse the Ultimate Guitar data. Try pasting the chords as text instead.",
    );
  }

  // Navigate the known shape, tolerating structure changes.
  const page = store?.store?.page?.data || store?.page?.data || {};
  const tabView = page.tab_view || {};
  const meta = page.tab || {};

  const content =
    tabView?.wiki_tab?.content ||
    tabView?.content ||
    "";

  if (!content) {
    throw new ImportError(
      "NO_CHORD_DATA",
      "That Ultimate Guitar page doesn't contain chord data (it may be a video or Pro tab).",
    );
  }

  const chordChart = normalizeChart(stripUGMarkup(decodeEntities(content)));

  return makeSong({
    title: meta.song_name || "",
    artist: meta.artist_name || "",
    chordChart,
  });
}

export default { canHandle, parse };
