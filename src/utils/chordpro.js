// src/utils/chordpro.js
//
// Converts ChordPro-style notation into ChordNote's two-line format
// (a chord line positioned above its lyric line).
//
// ChordPro puts chords inline, in square brackets, at the exact character
// where the chord change happens:
//
//   Walk[G]ing in the [C]light of [D]God
//
// ChordNote instead keeps chords on their own line, space-aligned above the
// lyric:
//
//       G          C      D
//   Walking in the light of God
//
// It also supports {directives} like {title: ...}, {start_of_chorus}, etc.
// We map the useful ones to ChordNote conventions and drop the rest.

// A line is "ChordPro" if it has an inline [chord] with lyric text around
// it — i.e. a bracket token that is NOT the whole line (that would be a
// plain [Section] label, which ChordNote already understands).
const INLINE_CHORD_REGEX = /\[[^\]]+\]/;

/**
 * Does this text look like ChordPro? True if any line has an inline chord
 * bracket surrounded by other (non-bracket) content.
 */
export function isChordPro(text) {
  if (!text) return false;
  const lines = text.split("\n");
  return lines.some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // A whole-line [Section] label is not ChordPro.
    if (/^\[[^\]]+\]$/.test(trimmed)) return false;
    // Inline chord: a [..] with something else on the line.
    return INLINE_CHORD_REGEX.test(trimmed);
  });
}

// Map common ChordPro directives to a ChordNote section label (or null to
// drop/handle specially). Keys are lowercased directive names.
const SECTION_DIRECTIVES = {
  start_of_chorus: "Chorus",
  soc: "Chorus",
  start_of_verse: "Verse",
  sov: "Verse",
  start_of_bridge: "Bridge",
  sob: "Bridge",
  chorus: "Chorus", // {chorus} recall
};

/**
 * Convert a single ChordPro line into either:
 *   - { chordLine, lyricLine }  (inline chords present)
 *   - { lyricLine }             (plain lyric, no chords)
 * Positions each chord so its first character sits above the lyric
 * character where the bracket appeared.
 */
function convertInlineLine(line) {
  let lyric = "";
  let chordRow = "";
  let i = 0;

  while (i < line.length) {
    if (line[i] === "[") {
      const close = line.indexOf("]", i);
      if (close === -1) {
        // Unclosed bracket — treat the rest as literal lyric.
        lyric += line.slice(i);
        break;
      }
      const chord = line.slice(i + 1, close);
      // Pad the chord row with spaces up to the current lyric column,
      // then drop the chord in. If chords are tightly packed, ensure at
      // least one space between them so they don't merge.
      if (chordRow.length > lyric.length) {
        chordRow += " ";
      }
      while (chordRow.length < lyric.length) {
        chordRow += " ";
      }
      chordRow += chord;
      i = close + 1;
    } else {
      lyric += line[i];
      i += 1;
    }
  }

  const chordLine = chordRow.replace(/\s+$/, "");
  const lyricLine = lyric.replace(/\s+$/, "");
  return { chordLine, lyricLine };
}

/**
 * Full converter: ChordPro text -> ChordNote two-line text.
 * Returns the converted string. Safe to call on non-ChordPro text (it will
 * largely pass through), but callers should gate with isChordPro().
 */
export function convertChordPro(text) {
  if (!text) return text;
  const out = [];

  text.split("\n").forEach((rawLine) => {
    const line = rawLine.replace(/\r$/, "");
    const trimmed = line.trim();

    // ── Directives: {name} or {name: value} ──────────────────────────────
    const directive = trimmed.match(/^\{\s*([^:}]+?)\s*(?::\s*(.*?))?\s*\}$/);
    if (directive) {
      const name = directive[1].toLowerCase().replace(/[\s-]+/g, "_");
      const value = (directive[2] || "").trim();

      // A {section: Name} directive becomes a [Name] label. This is the
      // generic section directive many exporters use (alongside the more
      // specific {start_of_chorus} etc.).
      if ((name === "section" || name === "sec") && value) {
        out.push(`[${value}]`);
      } else if (SECTION_DIRECTIVES[name]) {
        // {start_of_chorus} and friends — fixed label. If the directive
        // also carries a value (e.g. {start_of_verse: Verse 2}), prefer it.
        out.push(`[${value || SECTION_DIRECTIVES[name]}]`);
      } else if (name === "comment" || name === "c") {
        if (value) out.push(`[${value}]`);
      }
      // All other directives (title, artist, key, tempo, end_of_*, etc.)
      // are dropped from the body.
      return;
    }

    // ── Whole-line [Section] label — keep as-is ──────────────────────────
    if (/^\[[^\]]+\]$/.test(trimmed)) {
      out.push(trimmed);
      return;
    }

    // ── Blank line ────────────────────────────────────────────────────────
    if (!trimmed) {
      out.push("");
      return;
    }

    // ── Inline chords present → split into chord + lyric lines ───────────
    if (INLINE_CHORD_REGEX.test(line)) {
      const { chordLine, lyricLine } = convertInlineLine(line);
      if (chordLine.trim()) out.push(chordLine);
      out.push(lyricLine);
      return;
    }

    // ── Plain lyric line ─────────────────────────────────────────────────
    out.push(line);
  });

  return out.join("\n");
}

/**
 * Pull metadata directives ({title}, {artist}/{subtitle}, {key}) from
 * ChordPro text. Returns { title, artist, key } (any may be "").
 */
export function extractChordProMeta(text) {
  const meta = { title: "", artist: "", key: "" };
  if (!text) return meta;

  text.split("\n").forEach((line) => {
    const m = line.trim().match(/^\{\s*([^:}]+?)\s*:\s*(.*?)\s*\}$/);
    if (!m) return;
    const name = m[1].toLowerCase().replace(/[\s-]+/g, "_");
    const value = m[2].trim();
    if (!value) return;
    if ((name === "title" || name === "t") && !meta.title) meta.title = value;
    else if (
      (name === "subtitle" || name === "st" || name === "artist") &&
      !meta.artist
    )
      meta.artist = value;
    else if (name === "key" && !meta.key) meta.key = value;
  });

  return meta;
}
