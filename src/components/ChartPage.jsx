// src/components/ChartPage.jsx
//
// Standalone, read-only full-page view of a chord chart or lyrics page.
// Opened in a new tab via ?view=lyrics or ?view=chords (plus encoded song data).
// No editing controls — just the chart and an autoplay bar.

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Sun, Moon, Minus, Plus } from "lucide-react";
import { isSectionLabel, labelText } from "../utils/sectionHelpers";
import { normalizeChordLine } from "../utils/chordTranspose";
import { convertChordLine } from "../utils/nashvilleNumbers";
import { useAutoScroll } from "../hooks/useAutoScroll";
import AutoplayControl from "./AutoplayControl";
import whiteLogo from "../assets/default-monochrome-white.svg";
import darkLogo from "../assets/default-monochrome-black.svg";

// ── Design tokens (matches the existing app theme system) ──────────────────

const LIGHT = {
  page: "#FDFCFA",
  surface: "#FFFFFF",
  border: "#E8E5DC",
  text: "#22221F",
  textSecondary: "#5A5A5A",
  textMuted: "#888888",
  labelBg: "rgba(34,34,31,0.055)",
};

const DARK = {
  page: "#121212",
  surface: "#1A1A17",
  border: "#2E2C28",
  text: "#EDEAE3",
  textSecondary: "#A8A398",
  textMuted: "#666360",
  labelBg: "rgba(237,234,227,0.06)",
};

// Typography stack used in the editor for lyrics/body text
const BODY_FONT =
  "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif";
const MONO_FONT = "'JetBrains Mono', 'Courier New', Courier, monospace";

// ── Helpers ────────────────────────────────────────────────────────────────

function IconBtn({ onClick, disabled, colors, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "30px",
        height: "30px",
        border: "none",
        borderRadius: "6px",
        background: "transparent",
        color: disabled ? colors.textMuted : colors.textSecondary,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

// Converts a #rrggbb hex to an rgba() string with the given alpha.
function hexToRgba(hex, alpha) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A distinct, eye-pleasing section marker: an accent bar in the song's
// chord color + a soft tint of that color behind the label text.
function SectionLabel({ text, chordColor, colors, isFirst }) {
  return (
    <div
      style={{
        marginTop: isFirst ? 0 : "32px",
        marginBottom: "14px",
        display: "flex",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: chordColor,
          background: hexToRgba(chordColor, 0.1),
          padding: "6px 12px",
          fontFamily: BODY_FONT,
        }}
      >
        {`// ${text}`}
      </span>
    </div>
  );
}

function MetaBadge({ label, value, colors }) {
  if (!value) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "13px",
        color: colors.textSecondary,
        fontFamily: BODY_FONT,
      }}
    >
      <span style={{ color: colors.textMuted, fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ChartPage({ song, mode }) {
  // mode: "lyrics" | "chords"
  const {
    title = "",
    author = "",
    bpm = "",
    musicKey = "",
    capo = "",
    lyrics = "",
    chords = {},
    chordColor = "#0F6E56",
    darkMode: initialDarkMode = false,
    chordDisplayMode = "letters",
    editorFontSize = 15,
  } = song;

  // Local, view-only controls — the dedicated page lets the reader tweak
  // theme and text size without affecting the editor/stored song.
  const [darkMode, setDarkMode] = useState(initialDarkMode);
  const [fontSize, setFontSize] = useState(Math.max(editorFontSize, 14));

  const colors = darkMode ? DARK : LIGHT;
  const lines = useMemo(() => lyrics.split("\n"), [lyrics]);

  // Set the browser tab title to the song title.
  useEffect(() => {
    const label = title || "Untitled Song";
    document.title =
      mode === "chords" ? `${label} — Chords` : `${label} — Lyrics`;
  }, [title, mode]);

  // Autoplay scrolls the main content area
  const scrollRef = useRef(null);
  const autoplay = useAutoScroll(scrollRef, { active: true });

  const adjustFont = (delta) =>
    setFontSize((v) => Math.min(40, Math.max(12, v + delta)));

  // Chord display conversion (Nashville / Roman / Letters)
  const getDisplayChord = (raw) => {
    if (!raw) return "";
    if (chordDisplayMode === "letters") return normalizeChordLine(raw);
    return convertChordLine(raw, musicKey, chordDisplayMode);
  };

  // ── Meta row ──────────────────────────────────────────────────────────────

  const hasMeta = !!(musicKey || bpm || capo);

  // ── Render ────────────────────────────────────────────────────────────────

  const chordFontSize = fontSize;
  const lyricFontSize = fontSize;

  return (
    <div
      style={{
        height: "100vh",
        background: colors.page,
        color: colors.text,
        fontFamily: BODY_FONT,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        @media (max-width: 560px) {
          .chartpage-navbar { padding: 8px 12px !important; gap: 8px !important; }
          .chartpage-tools { gap: 6px !important; }
          .chartpage-navbar img { width: 88px !important; }
        }
      `}</style>

      {/* ── Top bar — stays fixed above the scrolling content ───────────── */}
      <div
        className="chartpage-navbar"
        style={{
          flexShrink: 0,
          background: darkMode
            ? "rgba(18,18,18,0.92)"
            : "rgba(253,252,250,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${colors.border}`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "nowrap",
          boxSizing: "border-box",
        }}
      >
        {/* Left: logo */}
        <a
          href={`${window.location.origin}${window.location.pathname}?editor=true`}
          title="Open ChordNote editor"
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <img
            src={darkMode ? darkLogo : whiteLogo}
            alt="ChordNote"
            style={{ width: "104px", height: "auto", display: "block" }}
          />
        </a>

        {/* Right: tools + autoplay — single row, never wraps */}
        <div
          className="chartpage-tools"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "nowrap",
          }}
        >
          {/* Font size stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              padding: "3px",
              background: darkMode ? "#1A1A17" : "#FFFFFF",
              flexShrink: 0,
            }}
            title="Text size"
          >
            <IconBtn
              onClick={() => adjustFont(-1)}
              disabled={fontSize <= 12}
              colors={colors}
            >
              <Minus size={16} />
            </IconBtn>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: colors.textMuted,
                minWidth: "28px",
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fontSize}
            </span>
            <IconBtn
              onClick={() => adjustFont(1)}
              disabled={fontSize >= 40}
              colors={colors}
            >
              <Plus size={16} />
            </IconBtn>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? "Switch to light" : "Switch to dark"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              flexShrink: 0,
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              background: darkMode ? "#1A1A17" : "#FFFFFF",
              color: colors.textSecondary,
              cursor: "pointer",
            }}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Autoplay control (reuses existing component) */}
          <AutoplayControl
            size="lg"
            theme={{
              border: colors.border,
              panel: darkMode ? "#1A1A17" : "#FFFFFF",
              textSecondary: colors.textSecondary,
              textMuted: colors.textMuted,
            }}
            chordColor={chordColor}
            isPlaying={autoplay.isPlaying}
            onToggle={autoplay.toggle}
            speedLabel={autoplay.speedLabel}
            onIncreaseSpeed={autoplay.increaseSpeed}
            onDecreaseSpeed={autoplay.decreaseSpeed}
            canIncrease={autoplay.canIncrease}
            canDecrease={autoplay.canDecrease}
          />
        </div>
      </div>

      {/* ── Scrollable content area ──────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "48px 24px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* Inner container: centered, generous margins, left-aligned text */}
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            textAlign: "left",
          }}
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <header style={{ marginBottom: "40px" }}>
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "clamp(28px, 5vw, 42px)",
                fontWeight: 800,
                lineHeight: 1.15,
                color: colors.text,
                fontFamily: BODY_FONT,
                letterSpacing: "-0.02em",
              }}
            >
              {title || "Untitled Song"}
            </h1>

            {author && (
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: colors.textSecondary,
                  fontFamily: BODY_FONT,
                }}
              >
                {author}
              </p>
            )}

            {hasMeta && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "16px",
                  marginTop: "4px",
                }}
              >
                <MetaBadge label="Key" value={musicKey} colors={colors} />
                <MetaBadge label="BPM" value={bpm} colors={colors} />
                <MetaBadge label="Capo" value={capo} colors={colors} />
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                marginTop: "28px",
                height: "1px",
                background: colors.border,
              }}
            />
          </header>

          {/* ── Chart body ────────────────────────────────────────────────── */}
          {mode === "chords" ? (
            <ChordChart
              lines={lines}
              chords={chords}
              getDisplayChord={getDisplayChord}
              chordFontSize={chordFontSize}
              lyricFontSize={lyricFontSize}
              chordColor={chordColor}
              colors={colors}
            />
          ) : (
            <LyricsView
              lines={lines}
              lyricFontSize={lyricFontSize}
              chordColor={chordColor}
              colors={colors}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chord chart sub-component ──────────────────────────────────────────────

function ChordChart({
  lines,
  chords,
  getDisplayChord,
  chordFontSize,
  lyricFontSize,
  chordColor,
  colors,
}) {
  const isEmpty = lines.length === 0 || (lines.length === 1 && lines[0] === "");
  if (isEmpty) {
    return (
      <p style={{ color: colors.textMuted, fontFamily: BODY_FONT }}>
        No content yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
      {lines.map((line, i) => {
        if (isSectionLabel(line)) {
          return (
            <SectionLabel
              key={i}
              text={labelText(line)}
              chordColor={chordColor}
              colors={colors}
              isFirst={i === 0}
            />
          );
        }

        const chord = chords[i];
        const displayChord = getDisplayChord(chord || "");
        const hasChord = displayChord && displayChord.trim();

        return (
          <div
            key={i}
            style={{
              marginBottom: "10px",
            }}
          >
            {hasChord && (
              <div
                style={{
                  fontSize: `${chordFontSize}px`,
                  fontWeight: 700,
                  color: chordColor,
                  fontFamily: MONO_FONT,
                  lineHeight: 1.3,
                  whiteSpace: "pre",
                  marginBottom: "1px",
                  letterSpacing: "0.02em",
                }}
              >
                {displayChord}
              </div>
            )}
            <div
              style={{
                fontSize: `${lyricFontSize}px`,
                lineHeight: 1.65,
                color: line === "" ? "transparent" : colors.text,
                fontFamily: BODY_FONT,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: `${lyricFontSize * 1.65}px`,
              }}
            >
              {line === "" ? "\u00A0" : line}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lyrics-only sub-component ──────────────────────────────────────────────

function LyricsView({ lines, lyricFontSize, chordColor, colors }) {
  const isEmpty = lines.length === 0 || (lines.length === 1 && lines[0] === "");
  if (isEmpty) {
    return (
      <p style={{ color: colors.textMuted, fontFamily: BODY_FONT }}>
        No lyrics yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((line, i) => {
        if (isSectionLabel(line)) {
          return (
            <SectionLabel
              key={i}
              text={labelText(line)}
              chordColor={chordColor}
              colors={colors}
              isFirst={i === 0}
            />
          );
        }

        return (
          <div
            key={i}
            style={{
              fontSize: `${lyricFontSize}px`,
              lineHeight: 1.8,
              color: line === "" ? "transparent" : colors.text,
              fontFamily: BODY_FONT,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              minHeight: `${lyricFontSize * 1.8}px`,
            }}
          >
            {line === "" ? "\u00A0" : line}
          </div>
        );
      })}
    </div>
  );
}
