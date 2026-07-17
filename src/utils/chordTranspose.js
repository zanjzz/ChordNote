// src/utils/chordTranspose.js
const SHARP_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const NOTE_TO_INDEX = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  "E#": 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

/**
 * Transposes a chord by a number of semitones.
 * Preserves chord quality, extensions, and bass notes.
 * Examples:
 *   transposeChord("G", 1) → "G#"
 *   transposeChord("Am7", 2) → "Bm7"
 *   transposeChord("D/F#", -2) → "C/E"
 *   transposeChord("Cmaj7", 3) → "D#maj7"
 */
export function transposeChord(chordLine, steps) {
  if (!chordLine) return chordLine;
  if (steps === 0) return chordLine;

  // Parse the full chord structure
  // Matches: root, accidental, quality, extension, bass root, bass accidental
  const chordRegex =
    /^([A-Ga-g])([#b]?)((?:maj|min|m|M|sus|dim|dom|aug|add|no)?)((?:[#b]?\d{1,2})*)(?:\/([A-Ga-g])([#b]?))?$/;

  const match = chordRegex.exec(chordLine.trim());
  if (!match) return chordLine; // Not a recognizable chord, leave as-is

  const [, root, rootAcc, quality, extension, bassRoot, bassAcc] = match;

  // Transpose the root note
  const rootKey = root.toUpperCase() + (rootAcc || "");
  const rootIdx = NOTE_TO_INDEX[rootKey];
  if (rootIdx === undefined) return chordLine;

  const newRootIdx = (((rootIdx + steps) % 12) + 12) % 12;
  const newRoot = SHARP_NOTES[newRootIdx];

  // Build the transposed chord
  let result = newRoot;

  // Add quality (m, maj, sus, dim, etc.)
  if (quality) {
    // Handle the special cases where the quality affects the root display
    // For example, "m" in "Am" should be preserved
    result += quality;
  }

  // Add extension (7, 9, 11, 13, etc.)
  if (extension) {
    // Need to handle accidental in extension (b5, #9, etc.)
    // The extension regex already captures these, just append as-is
    result += extension;
  }

  // Add bass note if present
  if (bassRoot) {
    const bassKey = bassRoot.toUpperCase() + (bassAcc || "");
    const bassIdx = NOTE_TO_INDEX[bassKey];
    if (bassIdx !== undefined) {
      const newBassIdx = (((bassIdx + steps) % 12) + 12) % 12;
      const newBass = SHARP_NOTES[newBassIdx];
      result += `/${newBass}`;
    } else {
      // If bass note can't be transposed, preserve original
      result += `/${bassRoot}${bassAcc || ""}`;
    }
  }

  return result;
}

/**
 * Normalizes chord case (converts to standard capitalization).
 * Reuses the parse logic to ensure consistent output.
 *
 * NOTE: this only handles a SINGLE chord token (the regex is anchored
 * to the whole string with no spaces allowed). If a field can contain
 * more than one chord (e.g. "Am   G   C"), use normalizeChordLine
 * instead, or this will silently fail to match and return the string
 * completely unchanged, case and all.
 */
export function normalizeChordCase(chordLine) {
  if (!chordLine) return chordLine;

  // First, try to parse as a single chord
  const chordRegex =
    /^([A-Ga-g])([#b]?)((?:maj|min|m|M|sus|dim|dom|aug|add|no)?)((?:[#b]?\d{1,2})*)(?:\/([A-Ga-g])([#b]?))?$/;
  const match = chordRegex.exec(chordLine.trim());
  if (!match) return chordLine;

  const [, root, rootAcc, quality, extension, bassRoot, bassAcc] = match;

  // Build normalized chord
  let result = root.toUpperCase() + (rootAcc || "");
  if (quality) {
    // Special case: if quality is 'm' or 'min', keep it lowercase
    if (quality === "m" || quality === "min") {
      result += quality.toLowerCase();
    } else if (quality === "M" || quality === "maj") {
      result += "maj";
    } else {
      result += quality.toLowerCase();
    }
  }
  if (extension) {
    result += extension;
  }
  if (bassRoot) {
    result += `/${bassRoot.toUpperCase()}${bassAcc || ""}`;
  }

  return result;
}

/**
 * Normalizes case for every chord token in a line (space-separated),
 * preserving whitespace/alignment so chord-to-lyric columns stay
 * aligned. Use this instead of normalizeChordCase any time the field
 * might hold more than one chord, e.g. "Am   G   C" — normalizeChordCase
 * alone will bail out on the spaces and hand back the original string
 * untouched.
 */
export function normalizeChordLine(line) {
  if (!line) return line;

  return line
    .split(/(\s+)/)
    .map((piece) => (/^\s+$/.test(piece) ? piece : normalizeChordCase(piece)))
    .join("");
}

/**
 * Transposes a whole chord line (space-separated chords).
 */
export function transposeChordLine(line, steps) {
  if (!line) return line;
  if (steps === 0) return line;

  return line
    .split(/(\s+)/)
    .map((piece) => {
      if (/^\s+$/.test(piece)) return piece;
      return transposeChord(piece, steps);
    })
    .join("");
}

/**
 * Transposes a key name (e.g., "G", "C#", "Bb", "Am") by semitones.
 * Preserves minor mode.
 * Examples:
 *   transposeKey("G", 2) → "A"
 *   transposeKey("Am", 3) → "Cm"
 *   transposeKey("Bb", -1) → "A"
 *   transposeKey("C#m", 1) → "Dm"
 */
export function transposeKey(keyString, steps) {
  if (!keyString) return keyString;
  if (steps === 0) return keyString;

  // Parse key: root, accidental, optional minor mode
  const match = /^([A-Ga-g])([#b]?)(m?)$/i.exec(keyString.trim());
  if (!match) return keyString;

  const [, root, accidental, mode] = match;
  const rootKey = root.toUpperCase() + (accidental || "");
  const rootIdx = NOTE_TO_INDEX[rootKey];
  if (rootIdx === undefined) return keyString;

  const newRootIdx = (((rootIdx + steps) % 12) + 12) % 12;
  let newKey = SHARP_NOTES[newRootIdx];

  // Preserve minor mode
  if (mode && mode.toLowerCase() === "m") {
    newKey += "m";
  }

  return newKey;
}
