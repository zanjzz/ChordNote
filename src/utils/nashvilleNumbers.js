// src/utils/nashvilleNumbers.js
//
// Converts letter chords (G, Am7, D/F#, ...) into Nashville Number System
// notation (5, 6m7, 2/#4, ...) or Roman Numeral notation (V, vi7, ii/#4, ...)
// relative to a given song key.
//
// This is intentionally display-only: it never mutates the stored chord
// data, it just renders a translated string when asked. Tokens it can't
// confidently parse as a chord (performance annotations like "(fade)",
// "x4", "N.C.") are passed through unchanged.

const NOTE_TO_SEMITONE = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

// Semitone offset from the key root -> nearest diatonic scale degree,
// using the accidentals musicians conventionally use for borrowed/chromatic
// chords in the Nashville Number System.
const DEGREE_MAP = {
  0: { degree: 1, accidental: "" },
  1: { degree: 2, accidental: "b" },
  2: { degree: 2, accidental: "" },
  3: { degree: 3, accidental: "b" },
  4: { degree: 3, accidental: "" },
  5: { degree: 4, accidental: "" },
  6: { degree: 4, accidental: "#" },
  7: { degree: 5, accidental: "" },
  8: { degree: 6, accidental: "b" },
  9: { degree: 6, accidental: "" },
  10: { degree: 7, accidental: "b" },
  11: { degree: 7, accidental: "" },
};

// Same token shape ChordImporter.jsx already validates chords against,
// but with capture groups so we can pull the pieces apart.
const CHORD_TOKEN_REGEX =
  /^([A-G])([#b]?)((?:maj|min|m|M|sus|dim|dom|aug|add|no)?)((?:[#b]?\d{1,2})*)(?:\/([A-G])([#b]?))?$/;

function noteSemitone(letter, accidental) {
  const key = accidental ? `${letter}${accidental}` : letter;
  if (NOTE_TO_SEMITONE[key] != null) return NOTE_TO_SEMITONE[key];
  let base = NOTE_TO_SEMITONE[letter];
  if (accidental === "#") base += 1;
  if (accidental === "b") base -= 1;
  return ((base % 12) + 12) % 12;
}

// Parses just the leading root note of a key string ("G", "Am", "C#", "Bbm")
// and returns its semitone (0-11), or null if it can't be parsed.
export function parseKeySemitone(keyString) {
  if (!keyString) return null;
  const match = /^([A-G])([#b]?)/i.exec(keyString.trim());
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = match[2] === "#" || match[2] === "b" ? match[2] : "";
  return noteSemitone(letter, accidental);
}

function degreeInfoFor(noteSemitoneValue, keySemitoneValue) {
  const diff = (((noteSemitoneValue - keySemitoneValue) % 12) + 12) % 12;
  return DEGREE_MAP[diff];
}

function toNashville(degreeInfo, quality, ext) {
  return `${degreeInfo.accidental}${degreeInfo.degree}${quality}${ext}`;
}

function toRoman(degreeInfo, quality, ext) {
  const base = ROMAN[degreeInfo.degree - 1];
  const isMinor = /^(m|min)$/i.test(quality);
  const isDim = /^dim$/i.test(quality);
  const isAug = /^aug$/i.test(quality);
  // Half-diminished (m7b5, min7b5) gets its own symbol (ø) in standard
  // notation instead of just being treated as a plain lowercase minor —
  // this was previously falling through to "vii7b5" when it should read
  // "viiø7".
  const isHalfDiminished = isMinor && /b5/.test(ext);

  let numeral = isMinor || isDim ? base.toLowerCase() : base;
  let symbol = "";
  let remainingSuffix = ext;

  if (isDim) {
    symbol = "\u00B0"; // °
  } else if (isHalfDiminished) {
    symbol = "\u00F8"; // ø
    remainingSuffix = ext.replace("b5", ""); // ø already implies the b5
  } else if (isAug) {
    symbol = "+";
  } else if (!isMinor) {
    // maj / dom / sus / add / no / (none) — keep the quality word visible
    remainingSuffix = quality + ext;
  }

  return `${degreeInfo.accidental}${numeral}${symbol}${remainingSuffix}`;
}

// Converts one chord token. mode is "letters" | "number" | "roman".
export function convertChordToken(token, keySemitoneValue, mode) {
  if (!token) return token;
  if (mode === "letters" || keySemitoneValue == null) return token;
  if (token === "N.C." || token === "N.C") return token;

  const match = CHORD_TOKEN_REGEX.exec(token);
  if (!match) return token; // annotation like "(fade)", "x4", etc.

  const [, rootLetter, rootAcc, quality, ext, bassLetter, bassAcc] = match;

  const rootDegreeInfo = degreeInfoFor(
    noteSemitone(rootLetter, rootAcc),
    keySemitoneValue,
  );

  const converter = mode === "roman" ? toRoman : toNashville;
  let result = converter(rootDegreeInfo, quality || "", ext || "");

  if (bassLetter) {
    const bassDegreeInfo = degreeInfoFor(
      noteSemitone(bassLetter, bassAcc),
      keySemitoneValue,
    );
    result += `/${bassDegreeInfo.accidental}${bassDegreeInfo.degree}`;
  }

  return result;
}

// Converts a full chord line (e.g. "G     Am7     D/F#"), preserving the
// original whitespace so the chord-to-lyric column alignment survives.
export function convertChordLine(line, keyString, mode) {
  if (!line || !mode || mode === "letters") return line || "";
  const keySemitoneValue = parseKeySemitone(keyString);
  if (keySemitoneValue == null) return line;

  return line
    .split(/(\s+)/)
    .map((piece) =>
      piece === "" || /^\s+$/.test(piece)
        ? piece
        : convertChordToken(piece, keySemitoneValue, mode),
    )
    .join("");
}

// ============================================================
// 👇 NEW: Reverse conversion (Numbers/Roman → Letter chords)
// ============================================================

const SHARP_NOTE_NAMES = [
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

const FLAT_NOTE_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

function noteNameFor(idx, accidentalPreference) {
  return accidentalPreference === "flat"
    ? FLAT_NOTE_NAMES[idx]
    : SHARP_NOTE_NAMES[idx];
}

// Semitone of each scale degree in a major scale, before accidentals.
const DEGREE_BASE_SEMITONE = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };

const ROMAN_TO_DEGREE = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
};

function degreeAccidentalToDiff(degree, accidental) {
  let diff = DEGREE_BASE_SEMITONE[degree];
  if (diff == null) return null;
  if (accidental === "#") diff += 1;
  if (accidental === "b") diff -= 1;
  return ((diff % 12) + 12) % 12;
}

// Matches a single Nashville Number token, e.g. "5", "6m7", "2/#4", "4maj7".
export const NUMBER_TOKEN_REGEX =
  /^(?:([#b]?)([1-7])((?:maj|min|m|M|sus|dim|dom|aug|add|no)?)((?:[#b]?\d{1,2})*)(?:\/([#b]?)([1-7]))?|N\.C\.)$/;

// Matches a single Roman numeral token, e.g. "V", "vi7", "viiø7", "bVII".
// The bass note (after the slash) may be either another Roman numeral
// ("V/IV") or a plain scale-degree number ("V/#4") — the latter is common
// for chromatic bass tones that don't have a clean Roman numeral name.
export const ROMAN_TOKEN_REGEX =
  /^(?:([#b]?)(VII|VI|IV|III|II|I|V|vii|vi|iv|iii|ii|i|v)([\u00B0\u00F8+]?)((?:maj|min|m|M|sus|dim|dom|aug|add|no)?(?:[#b]?\d{1,2})*)(?:\/([#b]?)(VII|VI|IV|III|II|I|V|vii|vi|iv|iii|ii|i|v|[1-7]))?|N\.C\.)$/;

// Converts a single Number or Roman token back into a letter chord,
// relative to the given key semitone. Returns null if it can't be parsed.
export function convertChordTokenToLetters(
  token,
  keySemitoneValue,
  mode,
  accidentalPreference = "sharp",
) {
  if (!token) return token;
  if (token === "N.C." || token === "N.C") return token;
  if (keySemitoneValue == null) return null;

  if (mode === "numbers" || mode === "number") {
    const m = NUMBER_TOKEN_REGEX.exec(token);
    if (!m) return null;
    const [, leadAcc, degree, quality, ext, bassAcc, bassDegree] = m;
    if (!degree) return null;

    const rootDiff = degreeAccidentalToDiff(Number(degree), leadAcc);
    if (rootDiff == null) return null;
    const rootLetter = noteNameFor(
      (keySemitoneValue + rootDiff + 12) % 12,
      accidentalPreference,
    );

    let result = rootLetter + (quality || "") + (ext || "");

    if (bassDegree) {
      const bassDiff = degreeAccidentalToDiff(Number(bassDegree), bassAcc);
      if (bassDiff != null) {
        const bassLetter = noteNameFor(
          (keySemitoneValue + bassDiff + 12) % 12,
          accidentalPreference,
        );
        result += `/${bassLetter}`;
      }
    }
    return result;
  }

  if (mode === "roman") {
    const m = ROMAN_TOKEN_REGEX.exec(token);
    if (!m) return null;
    const [, leadAcc, numeral, symbol, suffix, bassAcc, bassNumeral] = m;
    if (!numeral) return null;

    const degree = ROMAN_TO_DEGREE[numeral.toUpperCase()];
    if (!degree) return null;
    const rootDiff = degreeAccidentalToDiff(degree, leadAcc);
    if (rootDiff == null) return null;
    const rootLetter = noteNameFor(
      (keySemitoneValue + rootDiff + 12) % 12,
      accidentalPreference,
    );

    const isLowercase = numeral === numeral.toLowerCase();
    let quality = "";
    let ext = "";

    if (symbol === "\u00B0") {
      // ° (dim)
      quality = "dim";
      ext = suffix || "";
    } else if (symbol === "\u00F8") {
      // ø (half-diminished)
      quality = "m";
      ext = suffix ? `${suffix}b5` : "b5";
    } else if (symbol === "+") {
      quality = "aug";
      ext = suffix || "";
    } else if (isLowercase) {
      quality = "m";
      ext = suffix || "";
    } else {
      // Uppercase, no symbol: suffix is quality+ext concatenated
      const qm =
        /^(maj|min|m|M|sus|dim|dom|aug|add|no)?((?:[#b]?\d{1,2})*)$/.exec(
          suffix || "",
        );
      quality = (qm && qm[1]) || "";
      ext = (qm && qm[2]) || "";
    }

    let result = rootLetter + quality + ext;

    if (bassNumeral) {
      // Bass can be a Roman numeral ("V/IV") or a plain scale-degree
      // number ("V/#4") — handle whichever one matched.
      const isNumericBass = /^[1-7]$/.test(bassNumeral);
      const bassDegree = isNumericBass
        ? Number(bassNumeral)
        : ROMAN_TO_DEGREE[bassNumeral.toUpperCase()];
      if (bassDegree) {
        const bassDiff = degreeAccidentalToDiff(bassDegree, bassAcc);
        if (bassDiff != null) {
          const bassLetter = noteNameFor(
            (keySemitoneValue + bassDiff + 12) % 12,
            accidentalPreference,
          );
          result += `/${bassLetter}`;
        }
      }
    }
    return result;
  }

  return null;
}
