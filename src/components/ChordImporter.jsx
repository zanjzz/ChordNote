// src/components/ChordImporter.jsx
import React, { useState, useRef, useEffect } from "react";
import { X, Link2, Loader2, ClipboardList } from "lucide-react";
import { normalizeChordLine } from "../utils/chordTranspose.js";
import {
  parseKeySemitone,
  convertChordTokenToLetters,
  NUMBER_TOKEN_REGEX,
  ROMAN_TOKEN_REGEX,
} from "../utils/nashvilleNumbers.js";
import { isUrl, importFromUrl } from "../services/importUrl.js";
import {
  isChordPro,
  convertChordPro,
  extractChordProMeta,
} from "../utils/chordpro.js";

// Maps any import failure to a short, non-technical message for the user.
// Keyed off the error's .code (set by the import service) so we never leak
// developer-oriented text (ports, "the API", stack details) into the UI.
function friendlyError(err) {
  const code = err?.code;
  switch (code) {
    case "INVALID_URL":
      return "That link doesn't look right. Double-check it and try again.";
    case "UNSUPPORTED":
      return "That link isn't a page we can read chords from.";
    case "UNSUPPORTED_TAB":
      return "That looks like a guitar tab (fret tablature), which ChordNote can't import. Try a chords page instead.";
    case "SITE_UNAVAILABLE":
      return "We couldn't reach that website. It may be down or blocking imports — try again, or use the Paste Text tab.";
    case "NO_CHORD_DATA":
      return "We opened that page but couldn't find a chord chart on it. Try the Paste Text tab instead.";
    case "PARSE_FAILED":
      return "We couldn't read the chords from that page. Try the Paste Text tab instead.";
    case "NETWORK":
      return "Network problem — check your connection and try again.";
    case "ENDPOINT_UNAVAILABLE":
      return "Link import isn't available right now. You can still paste the chords as text.";
    default:
      return "Something went wrong importing that link. Try the Paste Text tab instead.";
  }
}

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

// Parses raw chord-sheet TEXT into { lyrics, chords, detectedMode }.
// Returns { ok: false, error } on failure. Shared by both the paste path
// and the URL path (URL fetches text, then runs it through here) so the
// detection/conversion logic lives in exactly one place.
function parseChartText(text, musicKey) {
  // ChordPro notation (inline [chord]s like "Walk[G]ing") is converted to
  // ChordNote's two-line format FIRST, so the rest of the detection/parse
  // logic below works on it unchanged.
  const normalizedText = isChordPro(text) ? convertChordPro(text) : text;

  const rawLines = normalizedText.split("\n");

  // ---- Pass 1: figure out which notation the sheet is in ----
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
      return {
        ok: false,
        error:
          "This looks like Nashville Number or Roman numeral notation — please set a Key above first so chords can be converted.",
      };
    }
  }

  const isChordLineFn =
    detectedMode === "numbers"
      ? isNumberChordLine
      : detectedMode === "roman"
        ? isRomanChordLine
        : isLetterChordLine;

  // ---- Pass 2: build lyrics + chords using detected mode ----
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
    return {
      ok: false,
      error:
        "No lyrics detected. Please make sure the content includes text lines.",
    };
  }

  return {
    ok: true,
    lyrics: parsedLyrics.join("\n"),
    chords: cleanedChords,
    detectedMode,
  };
}

export default function ChordImporter({
  onImport,
  onClose,
  theme,
  chordColor,
  musicKey,
}) {
  // Two separate inputs, each with its own value, so pasting text and
  // pasting a link are visually and behaviorally distinct.
  const [mode, setMode] = useState("link"); // "link" | "text" — link first
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Guards against an in-flight URL import resolving after the modal has
  // been dismissed — without this, a late response would call onImport and
  // overwrite the editor even though the user already closed the importer.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const switchMode = (next) => {
    setMode(next);
    setError("");
  };

  // Runs chord-sheet text through the parser and finishes the import.
  // `meta` optionally carries { title, author } from a URL import.
  const finishWithText = (text, meta = {}) => {
    const result = parseChartText(text, musicKey);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    onImport({
      lyrics: result.lyrics,
      chords: result.chords,
      detectedMode: result.detectedMode,
      ...(meta.title ? { title: meta.title } : {}),
      ...(meta.author ? { author: meta.author } : {}),
      ...(meta.musicKey ? { musicKey: meta.musicKey } : {}),
      ...(meta.capo ? { capo: meta.capo } : {}),
      ...(meta.bpm ? { bpm: meta.bpm } : {}),
    });
    onClose();
    return true;
  };

  const handleTextImport = () => {
    if (!textInput.trim()) {
      setError("Paste a chord sheet first, then press Import.");
      return;
    }
    // If it's ChordPro, lift {title}/{artist}/{key} directives into meta too.
    const meta = isChordPro(textInput) ? extractChordProMeta(textInput) : {};
    finishWithText(textInput, {
      title: meta.title,
      author: meta.artist,
      musicKey: meta.key,
    });
  };

  const handleUrlImport = async () => {
    const url = urlInput.trim();
    if (!url) {
      setError("Paste a song link first, then press Import.");
      return;
    }
    if (!isUrl(url)) {
      setError("That doesn't look like a web link. It should start with https://");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const song = await importFromUrl(url);
      // The user may have closed the modal while the request was in flight;
      // if so, discard the result instead of mutating the editor.
      if (!isMountedRef.current) return;
      if (!song.chartText || !song.chartText.trim()) {
        setError(
          "We reached that page but couldn't find a chord chart on it. Try the Paste Text tab instead.",
        );
        return;
      }
      finishWithText(song.chartText, {
        title: song.title,
        author: song.artist,
        musicKey: song.musicKey,
        capo: song.capo,
        bpm: song.bpm,
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(friendlyError(err));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
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
        <style>{`
          @keyframes chord-spin-anim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
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
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: theme.textMuted,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.5 : 1,
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Tab switcher ───────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "4px",
            borderRadius: "10px",
            background: theme.borderSoft,
            marginBottom: "16px",
          }}
        >
          {[
            { id: "link", label: "From Link" },
            { id: "text", label: "Paste Text" },
          ].map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchMode(tab.id)}
                disabled={loading}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "7px",
                  border: "none",
                  background: active ? theme.panel : "transparent",
                  color: active ? theme.text : theme.textSecondary,
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  cursor: loading ? "default" : "pointer",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                {tab.id === "link" ? (
                  <Link2 size={14} />
                ) : (
                  <ClipboardList size={14} />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Paste Text tab ─────────────────────────────────────────── */}
        {mode === "text" && (
          <>
            <p
              style={{
                fontSize: "14px",
                color: theme.textSecondary,
                marginBottom: "12px",
                lineHeight: 1.4,
              }}
            >
              Paste a chord sheet (chords above lyric lines). ChordNote will
              parse and format it into an editable sheet.
            </p>
            <textarea
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                setError("");
              }}
              placeholder="Paste your chord sheet here…"
              className="chord-importer-textarea"
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                border: error
                  ? "2px solid #e74c3c"
                  : `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
              }}
            />
          </>
        )}

        {/* ── From Link tab ──────────────────────────────────────────── */}
        {mode === "link" && (
          <>
            <p
              style={{
                fontSize: "14px",
                color: theme.textSecondary,
                marginBottom: "12px",
                lineHeight: 1.4,
              }}
            >
              Paste a song link from a chord website. We'll open it, pull out
              the chords and lyrics, and format them for you.
            </p>
            <div style={{ position: "relative" }}>
              <Link2
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: theme.textMuted,
                  pointerEvents: "none",
                }}
              />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleUrlImport();
                }}
                placeholder="https://example.com/song-chords"
                disabled={loading}
                autoFocus
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 12px 12px 36px",
                  fontSize: "14px",
                  borderRadius: "8px",
                  border: error
                    ? "2px solid #e74c3c"
                    : `1px solid ${theme.border}`,
                  background: theme.panel,
                  color: theme.text,
                  outline: "none",
                  opacity: loading ? 0.6 : 1,
                }}
              />
            </div>
            <p
              style={{
                fontSize: "12px",
                color: theme.textMuted,
                marginTop: "8px",
                marginBottom: 0,
                lineHeight: 1.4,
              }}
            >
              Works best with simpler chord sites. If a link can't be read,
              use the Paste Text tab instead.
            </p>
          </>
        )}

        {error && (
          <p
            style={{
              color: "#e74c3c",
              fontSize: "13px",
              marginTop: "12px",
              marginBottom: 0,
              lineHeight: 1.4,
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
            disabled={loading}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.textSecondary,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={mode === "link" ? handleUrlImport : handleTextImport}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              background: chordColor,
              color: "#FFFFFF",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading && (
              <Loader2
                size={15}
                className="chord-spin"
                style={{ animation: "chord-spin-anim 0.8s linear infinite" }}
              />
            )}
            {loading ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
