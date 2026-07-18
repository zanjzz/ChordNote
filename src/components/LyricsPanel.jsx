// src/components/LyricsPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";
import { SECTION_PRESETS } from "../utils/sectionHelpers";
import { useResizableHeight } from "../hooks/useResizableHeight.js"; // 👈 NEW

export default function LyricsPanel({
  theme,
  lyrics,
  setLyrics,
  editorFontSize,
  addSection,
  chordColor,
  showLineNumbers,
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [hoveredSection, setHoveredSection] = useState(null);
  const gutterRef = useRef(null);
  const textareaRef = useRef(null);
  const { height, startDragging } = useResizableHeight(380, { min: 180 }); // 👈 NEW

  const pendingScrollRef = useRef(false);

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    const el = textareaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
      el.scrollTop = el.scrollHeight;
      if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
    });
  }, [lyrics]);

  const runAddSection = (label) => {
    pendingScrollRef.current = true;
    addSection(label);
  };

  const submitCustomSection = () => {
    if (customValue.trim()) runAddSection(customValue.trim());
    setCustomValue("");
    setCustomOpen(false);
  };

  const handleScroll = (e) => {
    if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop;
  };

  const lineCount = lyrics.split("\n").length;
  const lineHeightPx = editorFontSize * 1.9;

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
        Lyrics
      </span>

      <div style={{ position: "relative" }}>
        {showLineNumbers && (
          <div
            ref={gutterRef}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "34px",
              overflow: "hidden",
              paddingTop: "16px",
              boxSizing: "border-box",
              pointerEvents: "none",
              borderRight: `1px solid ${theme.borderSoft}`,
              borderRadius: "10px 0 0 0", // 👈 CHANGED: bottom rounding moved to handle
            }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                style={{
                  height: `${lineHeightPx}px`,
                  lineHeight: `${lineHeightPx}px`,
                  fontSize: `${Math.max(editorFontSize - 3, 10)}px`,
                  color: theme.textMuted,
                  textAlign: "right",
                  paddingRight: "8px",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  boxSizing: "border-box",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          onScroll={handleScroll}
          placeholder="Type or paste your lyrics here, line by line..."
          className="chord-lyrics-textarea"
          style={{
            width: "100%",
            height: `${height}px`, // 👈 CHANGED: was minHeight + native resize
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderBottom: "none", // 👈 NEW
            borderRadius: "10px 10px 0 0", // 👈 CHANGED
            padding: "16px",
            paddingLeft: showLineNumbers ? "42px" : "16px",
            fontSize: `${editorFontSize}px`,
            lineHeight: "1.9",
            color: theme.text,
            boxSizing: "border-box",
            outline: "none",
            transition: "padding-left 0.15s ease",
          }}
        />
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

      <div
        style={{
          display: "flex",
          gap: "6px",
          marginTop: "10px",
          flexWrap: "wrap",
        }}
      >
        {SECTION_PRESETS.map((label) => (
          <button
            key={label}
            onClick={() => runAddSection(label)}
            onMouseEnter={() => setHoveredSection(label)}
            onMouseLeave={() => setHoveredSection(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              fontSize: "12px",
              borderRadius: "6px",
              border: `1px solid ${
                hoveredSection === label ? theme.text : theme.border
              }`,
              background: theme.panel,
              color: theme.textSecondary,
              cursor: "pointer",
              transition: "border-color 0.15s ease",
            }}
          >
            <Plus size={11} /> {label}
          </button>
        ))}
        {!customOpen ? (
          <button
            onClick={() => setCustomOpen(true)}
            onMouseEnter={() => setHoveredSection("custom")}
            onMouseLeave={() => setHoveredSection(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              fontSize: "12px",
              borderRadius: "6px",
              border: `1px dashed ${
                hoveredSection === "custom" ? theme.text : theme.border
              }`,
              background: "transparent",
              color: theme.textMuted,
              cursor: "pointer",
              transition: "border-color 0.15s ease",
            }}
          >
            <Plus size={11} /> Custom
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              autoFocus
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCustomSection();
                if (e.key === "Escape") {
                  setCustomOpen(false);
                  setCustomValue("");
                }
              }}
              placeholder="Section name"
              style={{
                fontSize: "12px",
                padding: "5px 8px",
                borderRadius: "6px",
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
                outline: "none",
                width: "120px",
              }}
            />
            <button
              onClick={submitCustomSection}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "5px",
                border: `1px solid ${chordColor}`,
                background: "transparent",
                color: chordColor,
                cursor: "pointer",
              }}
            >
              <Check size={12} />
            </button>
            <button
              onClick={() => {
                setCustomOpen(false);
                setCustomValue("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "5px",
                border: `1px solid ${theme.border}`,
                background: "transparent",
                color: theme.textMuted,
                cursor: "pointer",
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
