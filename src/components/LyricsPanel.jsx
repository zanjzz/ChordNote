// src/components/LyricsPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { Plus, Check, X, Maximize2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { SECTION_PRESETS } from "../utils/sectionHelpers";
import { useResizableHeight } from "../hooks/useResizableHeight.js";
import { useAutoScroll } from "../hooks/useAutoScroll.js";
import AutoplayControl from "./AutoplayControl.jsx";

export default function LyricsPanel({
  theme,
  lyrics,
  setLyrics,
  editorFontSize,
  addSection,
  chordColor,
  showLineNumbers,
  inModal = false,
  onToggleFullscreen,
  onOpenPage,
  // When true the desktop label chips are suppressed here — the parent
  // renders them in a shared row with the action bar on desktop.
  // Mobile chips (collapsible trigger) are always rendered here.
  hideDesktopChips = false,
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [hoveredSection, setHoveredSection] = useState(null);
  // Mobile only: label chips are collapsed by default.
  // On desktop this state is irrelevant — chips always show via CSS.
  const [mobileLabelsExpanded, setMobileLabelsExpanded] = useState(true);
  const gutterRef = useRef(null);
  const textareaRef = useRef(null);
  const { height, startDragging } = useResizableHeight(380, { min: 180 });

  const autoplay = useAutoScroll(textareaRef, { active: inModal });

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

  // The chips + custom input — same markup used in both desktop (always
  // visible) and mobile (shown/hidden by the expand toggle).
  const labelChips = (
    <div
      style={{
        display: "flex",
        gap: "6px",
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

      {/* Custom section */}
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
  );

  return (
    <div
      style={
        inModal
          ? { height: "100%", display: "flex", flexDirection: "column" }
          : undefined
      }
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Lyrics
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {inModal && (
            <AutoplayControl
              theme={theme}
              chordColor={chordColor}
              isPlaying={autoplay.isPlaying}
              onToggle={autoplay.toggle}
              speedLabel={autoplay.speedLabel}
              onIncreaseSpeed={autoplay.increaseSpeed}
              onDecreaseSpeed={autoplay.decreaseSpeed}
              canIncrease={autoplay.canIncrease}
              canDecrease={autoplay.canDecrease}
            />
          )}
          {!inModal && onOpenPage && (
            <button
              onClick={onOpenPage}
              title="Open full page in a new tab"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                flexShrink: 0,
                borderRadius: "6px",
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.textSecondary,
                cursor: "pointer",
              }}
            >
              <ExternalLink size={13} />
            </button>
          )}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={inModal ? "Exit fullscreen" : "Expand"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                flexShrink: 0,
                borderRadius: "6px",
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.textSecondary,
                cursor: "pointer",
              }}
            >
              {inModal ? <X size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Textarea + optional gutter */}
      <div
        style={{
          position: "relative",
          ...(inModal ? { flex: 1, minHeight: 0 } : null),
        }}
      >
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
              borderRadius: inModal ? "10px 0 0 10px" : "10px 0 0 0",
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
            height: inModal ? "100%" : `${height}px`,
            display: "block",
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderBottom: inModal ? `1px solid ${theme.border}` : "none",
            borderRadius: inModal ? "10px" : "10px 10px 0 0",
            padding: "16px",
            paddingLeft: showLineNumbers ? "42px" : "16px",
            fontSize: `${editorFontSize}px`,
            lineHeight: "1.9",
            color: theme.text,
            boxSizing: "border-box",
            outline: "none",
            transition: "padding-left 0.15s ease",
            resize: "none",
          }}
        />
      </div>

      {/* Resize handle (non-modal only) */}
      {!inModal && (
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
      )}

      {/* ── Section label chips ──────────────────────────────────────────
          Desktop (>768px): when hideDesktopChips=true the desktop chips
          are rendered externally alongside the action bar. Otherwise shown
          here normally. Mobile chips (collapsible) always rendered here.
      ────────────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: "10px", flexShrink: 0 }}>

        {/* DESKTOP — shown unless parent renders them externally */}
        {!hideDesktopChips && (
          <div className="lyricspanel-labels-desktop">
            {labelChips}
          </div>
        )}

          {/* MOBILE — collapsed trigger */}
          <div className="lyricspanel-labels-mobile-trigger">
            {!mobileLabelsExpanded ? (
              <button
                onClick={() => setMobileLabelsExpanded(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: theme.textMuted,
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                <ChevronDown size={13} />
                Show label samples
              </button>
            ) : (
              /* MOBILE — expanded: chips inline, close arrow bottom-right */
              <div>
                {labelChips}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                  <button
                    onClick={() => {
                      setMobileLabelsExpanded(false);
                      setCustomOpen(false);
                      setCustomValue("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 0",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: theme.textMuted,
                      fontSize: "11px",
                    }}
                  >
                    <ChevronUp size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
