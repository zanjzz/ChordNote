// src/components/ChordsPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { isSectionLabel, labelText } from "../utils/sectionHelpers";
import { normalizeChordLine } from "../utils/chordTranspose";
import { convertChordLine } from "../utils/nashvilleNumbers";
import { useResizableHeight } from "../hooks/useResizableHeight.js"; // 👈 NEW

export default function ChordsPanel({
  lines,
  chords,
  handleChordChange,
  editorFontSize,
  chordColor,
  theme,
  showLineNumbers,
  chordDisplayMode,
  musicKey,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const inputRefs = useRef({});
  const { height, startDragging } = useResizableHeight(380, { min: 180 }); // 👈 NEW

  const setInputRef = (index) => (el) => {
    if (el) {
      inputRefs.current[index] = el;
    } else {
      delete inputRefs.current[index];
    }
  };

  const getDisplayChord = (chordText, index) => {
    if (!chordText) return "";
    if (focusedIndex === index) return chordText;
    if (chordDisplayMode === "letters") {
      return normalizeChordLine(chordText);
    }
    return convertChordLine(chordText, musicKey, chordDisplayMode);
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
    const el = inputRefs.current[index];
    if (el) {
      const raw = chords[index] || "";
      if (el.innerText !== raw) {
        el.innerText = raw;
      }
    }
  };

  const handleBlur = (index, rawValue) => {
    const normalized = normalizeChordLine(rawValue);
    handleChordChange(index, normalized);
    setFocusedIndex(null);
  };

  useEffect(() => {
    Object.keys(inputRefs.current).forEach((key) => {
      const index = parseInt(key, 10);
      const el = inputRefs.current[index];
      if (el && focusedIndex !== index) {
        const display = getDisplayChord(chords[index] || "", index);
        if (el.innerText !== display) {
          el.innerText = display;
        }
      }
    });
  }, [chords, chordDisplayMode, musicKey, focusedIndex]);

  useEffect(() => {
    Object.keys(inputRefs.current).forEach((key) => {
      const index = parseInt(key, 10);
      const el = inputRefs.current[index];
      if (el && focusedIndex !== index) {
        const display = getDisplayChord(chords[index] || "", index);
        if (el.innerText !== display) {
          el.innerText = display;
        }
      }
    });
  }, []);

  const isNashvilleMode = chordDisplayMode !== "letters";
  const noKey = !musicKey || musicKey.trim() === "";

  return (
    <div>
      <span
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "8px",
        }}
      >
        Chords
        {isNashvilleMode && noKey && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 400,
              color: theme.textMuted,
              marginLeft: "8px",
              textTransform: "none",
              letterSpacing: "0",
            }}
          >
            ⚠️ Set a key above to enable{" "}
            {chordDisplayMode === "numbers" ? "Numbers" : "Roman"}
          </span>
        )}
      </span>

      <div
        className="chord-panel"
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderBottom: "none", // 👈 NEW: handle bar below owns the bottom border
          borderRadius: "10px 10px 0 0", // 👈 NEW: bottom rounding now lives on the handle
          height: `${height}px`, // 👈 CHANGED: driven by drag state, not a fixed value
          overflowY: "auto",
          overflowX: "hidden",
          textAlign: "left",
          padding: "12px 12px",
          boxSizing: "border-box",
        }}
      >
        {lines.length === 0 || (lines.length === 1 && lines[0] === "") ? (
          <p style={{ color: theme.textMuted, fontSize: "14px", margin: 0 }}>
            Your lyrics will show up here — add chords above each line.
          </p>
        ) : (
          lines.map((line, i) =>
            isSectionLabel(line) ? (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: showLineNumbers ? "8px" : 0,
                  margin: i === 0 ? "0 0 8px" : "12px 0 8px",
                  padding: "0 4px",
                }}
              >
                {showLineNumbers && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: theme.textMuted,
                      minWidth: "16px",
                      textAlign: "right",
                      fontFamily:
                        "var(--font-mono, 'JetBrains Mono', monospace)",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                )}
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: theme.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "left",
                    flex: 1,
                  }}
                >
                  {labelText(line)}
                </div>
              </div>
            ) : (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: showLineNumbers ? "8px" : 0,
                  marginBottom: "6px",
                  padding: "0 4px",
                }}
              >
                {showLineNumbers && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: theme.textMuted,
                      minWidth: "16px",
                      textAlign: "right",
                      paddingTop: "3px",
                      fontFamily:
                        "var(--font-mono, 'JetBrains Mono', monospace)",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                )}
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <div
                    className="chord-input"
                    contentEditable
                    suppressContentEditableWarning
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() =>
                      setHoveredIndex((h) => (h === i ? null : h))
                    }
                    onFocus={() => handleFocus(i)}
                    onBlur={(e) => handleBlur(i, e.currentTarget.innerText)}
                    ref={setInputRef(i)}
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: "100%",
                      border: "none",
                      outline: "none",
                      background:
                        hoveredIndex === i ? theme.borderSoft : "transparent",
                      borderRadius: "4px",
                      fontSize: `${editorFontSize}px`,
                      fontWeight: 600,
                      color: chordColor,
                      padding: "2px 4px",
                      textAlign: "left",
                      minHeight: `${editorFontSize * 0.9}px`,
                      lineHeight: 1.2,
                      letterSpacing: "0.02em",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily:
                        "var(--font-mono, 'JetBrains Mono', monospace)",
                      cursor: "text",
                      transition: "background 0.15s ease",
                      overflowX: "hidden",
                      boxSizing: "border-box",
                    }}
                  />
                  <div
                    className="chord-lyrics-textarea"
                    style={{
                      fontSize: `${editorFontSize}px`,
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      minHeight: "24px",
                      borderBottom: `1px solid ${theme.borderSoft}`,
                      paddingBottom: "6px",
                      color: theme.text,
                      textAlign: "left",
                      paddingLeft: "2px",
                    }}
                  >
                    {line === "" ? "\u00A0" : line}
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>

      {/* 👇 NEW: full-width drag handle, replaces native corner resize */}
      <div
        onMouseDown={startDragging}
        onTouchStart={startDragging}
        style={{
          height: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: theme.borderSoft,
          border: `1px solid ${theme.border}`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          cursor: "row-resize",
          touchAction: "none",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "4px",
            borderRadius: "2px",
            background: theme.textMuted,
            opacity: 0.6,
          }}
        />
      </div>

      <style>{`
        .chord-input:focus {
          background: ${theme.borderSoft} !important;
        }
      `}</style>
    </div>
  );
}
