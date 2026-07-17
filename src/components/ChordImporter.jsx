// src/components/ChordImporter.jsx
import React, { useState } from "react";
import { X } from "lucide-react";
import { normalizeChordLine } from "../utils/chordTranspose.js";
import {
  parseKeySemitone,
  convertChordTokenToLetters,
  NUMBER_TOKEN_REGEX,
  ROMAN_TOKEN_REGEX,
} from "../utils/nashvilleNumbers.js";

// ---- Chord token detection ----
// Supports: G, G7, Am, Cmaj7, Dsus4, Bb, F#m7b5, G/B, Dm7/F#, N.C.
const CHORD_QUALITY = "(?:maj|min|m|M|sus|dim|dom|aug|add|no)?";
const CHORD_EXT = "(?:[#b]?\\d{1,2})*";
const CHORD_TOKEN_REGEX = new RegExp(
  `^(?:[A-Ga-g](?:#|b)?${CHORD_QUALITY}${CHORD_EXT}(?:\\/[A-Ga-g](?:#|b)?)?|N\\.C\\.)$`,
);

// ---- Performance annotation detection ----
const ANNOTATION_TOKEN_REGEX =
  /^\(.*\)$|^[x×]\d+$|^\d+[x×]$|^[-–—]+$|^\|+$|^\/+$/i;
const ANNOTATION_WORDS = new Set([
  "fade",
  "pause",
  "hold",
  "stop",
  "break",
  "rest",
  "rit",
  "rit.",
  "rall",
  "rall.",
  "tacet",
  "fermata",
  "fine",
  "coda",
  "segno",
  "vamp",
  "solo",
  "riff",
  "repeat",
  "cont",
  "cont.",
]);

function isSectionLabel(line) {
  return /^\[.+\]$/.test(line.trim());
}

function normalizeTokenForMatch(tok) {
  return tok.replace(/^\(+/, "").replace(/\)+$/, "").replace(/,+$/, "");
}

function mergeSpacedParensForMatch(line) {
  return line
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\([^)]*\)/g, (match) => match.replace(/\s+/g, "\u00A0"));
}

function isAnnotationToken(tok) {
  if (ANNOTATION_TOKEN_REGEX.test(tok)) return true;
  const bare = tok.replace(/\u00A0/g, " ").toLowerCase();
  return ANNOTATION_WORDS.has(bare);
}

// An arrow marks the start of a trailing free-text comment on a chord
// line, e.g. "C   (G - Ab)   -> Chorus 2" or "Bb  ->  Bridge". Everything
// from the arrow to the end of the line is treated as an annotation,
// whatever words it contains, instead of requiring each word to look
// like a chord.
const ARROW_TOKEN_REGEX = /^(-{1,3}>|=+>|→|➔|⟶)/;

// Generic line-checker: does every non-annotation token on this line
// match the given chord-token regex, with at least one real chord?
function isChordLineWithRegex(trimmed, tokenRegex) {
  if (!trimmed) return false;
  const tokens = mergeSpacedParensForMatch(trimmed).split(/\s+/);
  let hasRealChord = false;
  let sawArrow = false;

  const allValid = tokens.every((tok) => {
    if (sawArrow) return true; // trailing comment after an arrow
    if (ARROW_TOKEN_REGEX.test(tok)) {
      sawArrow = true;
      return true;
    }
    if (isAnnotationToken(tok)) return true;
    const clean = normalizeTokenForMatch(tok);
    const isChord = clean.length > 0 && tokenRegex.test(clean);
    if (isChord) hasRealChord = true;
    return isChord;
  });

  return allValid && hasRealChord;
}

const isLetterChordLine = (trimmed) =>
  isChordLineWithRegex(trimmed, CHORD_TOKEN_REGEX);
const isNumberChordLine = (trimmed) =>
  isChordLineWithRegex(trimmed, NUMBER_TOKEN_REGEX);
const isRomanChordLine = (trimmed) =>
  isChordLineWithRegex(trimmed, ROMAN_TOKEN_REGEX);

// Converts every token on a chord line from Number/Roman notation into
// letter chords, preserving whitespace/alignment. Tokens that don't
// parse (annotations, etc.) are left as-is.
function convertLineToLetters(trimmed, keySemitoneValue, mode) {
  return trimmed
    .split(/(\s+)/)
    .map((piece) => {
      if (piece === "" || /^\s+$/.test(piece)) return piece;
      const converted = convertChordTokenToLetters(
        piece,
        keySemitoneValue,
        mode,
      );
      return converted != null ? converted : piece;
    })
    .join("");
}

export default function ChordImporter({
  onImport,
  onClose,
  theme,
  chordColor,
  musicKey,
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleParse = () => {
    if (!input.trim()) {
      setError("Please paste some chord sheet text.");
      return;
    }

    const rawLines = input.split("\n");

    // ---- Pass 1: figure out which notation the pasted sheet is in ----
    let letterCount = 0;
    let numberCount = 0;
    let romanCount = 0;

    rawLines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || isSectionLabel(line)) return;
      if (isLetterChordLine(trimmed)) letterCount++;
      else if (isNumberChordLine(trimmed)) numberCount++;
      else if (isRomanChordLine(trimmed)) romanCount++;
    });

    let detectedMode = "letters";
    let maxCount = letterCount;
    if (numberCount > maxCount) {
      detectedMode = "numbers";
      maxCount = numberCount;
    }
    if (romanCount > maxCount) {
      detectedMode = "roman";
      maxCount = romanCount;
    }

    // Numbers/Roman are relative to a key — need one set to convert.
    let keySemitoneValue = null;
    if (detectedMode !== "letters") {
      keySemitoneValue = parseKeySemitone(musicKey);
      if (keySemitoneValue == null) {
        setError(
          "This looks like Nashville Number or Roman numeral notation — please set a Key above first so chords can be converted.",
        );
        return;
      }
    }

    const isChordLineFn =
      detectedMode === "numbers"
        ? isNumberChordLine
        : detectedMode === "roman"
          ? isRomanChordLine
          : isLetterChordLine;

    // ---- Pass 2: actually build lyrics + chords using detected mode ----
    const parsedLyrics = [];
    const parsedChords = {};
    let lyricIndex = 0;

    rawLines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        parsedLyrics.push("");
        lyricIndex++;
        return;
      }

      if (isSectionLabel(line)) {
        parsedLyrics.push(line);
        lyricIndex++;
        return;
      }

      if (isChordLineFn(trimmed)) {
        const letterLine =
          detectedMode === "letters"
            ? trimmed
            : convertLineToLetters(trimmed, keySemitoneValue, detectedMode);
        parsedChords[lyricIndex] = normalizeChordLine(letterLine);
      } else {
        parsedLyrics.push(line);
        lyricIndex++;
      }
    });

    const cleanedChords = {};
    Object.keys(parsedChords).forEach((key) => {
      const idx = parseInt(key, 10);
      if (idx < parsedLyrics.length && !isSectionLabel(parsedLyrics[idx])) {
        cleanedChords[idx] = parsedChords[key];
      }
    });

    const hasLyrics = parsedLyrics.some((l) => l.trim() && !isSectionLabel(l));
    if (!hasLyrics) {
      setError(
        "No lyrics detected. Please make sure your paste includes text lines.",
      );
      return;
    }

    onImport({
      lyrics: parsedLyrics.join("\n"),
      chords: cleanedChords,
      detectedMode,
    });

    onClose();
  };

  return (
    <div className="chord-importer-overlay">
      <div
        className="chord-importer-modal"
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(serif)",
              fontSize: "20px",
              margin: 0,
              color: theme.text,
            }}
          >
            Import Chord Sheet
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: theme.textMuted,
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p
          style={{
            fontSize: "14px",
            color: theme.textSecondary,
            marginBottom: "15px",
            lineHeight: 1.4,
          }}
        >
          Need lyrics and chords? Find a chord sheet on{" "}
          <a
            href="https://www.ultimate-guitar.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ margin: "0 4px" }}
          >
            Ultimate Guitar
          </a>
          , then paste it here. ChordNote will automatically parse and format
          the content into an editable sheet, giving you a great starting point.
        </p>

        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError("");
          }}
          placeholder="Paste your chord sheet here..."
          className="chord-importer-textarea"
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            border: error ? "2px solid #e74c3c" : `1px solid ${theme.border}`,
            background: theme.panel,
            color: theme.text,
          }}
        />

        {error && (
          <p
            style={{
              color: "#e74c3c",
              fontSize: "13px",
              marginTop: "8px",
              marginBottom: 0,
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "16px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.textSecondary,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleParse}
            style={{
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              background: chordColor,
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
