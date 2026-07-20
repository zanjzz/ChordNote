// src/components/ControlsBar.jsx
import React from "react";
import { Minus, Plus } from "lucide-react";
import StepBtn from "./StepBtn.jsx";
import NashvilleHelp from "./NashvilleHelp.jsx";

export const CHORD_COLOR_PRESETS = [
  { name: "Teal", value: "#029b7a" },
  { name: "Coral", value: "#E87A4D" },
  { name: "Blue", value: "#4A8FE0" },
  { name: "Yellow", value: "#a5c40c" },
  { name: "Pink", value: "#D95A8C" },
];


export default function ControlsBar({
  theme,
  chordColor,
  setChordColor,
  transposeOffset,
  handleTranspose,
  editorFontSize,
  setEditorFontSize,
  EDITOR_MIN,
  EDITOR_MAX,
  clamp,
  showLineNumbers,
  setShowLineNumbers,
  chordDisplayMode,
  setChordDisplayMode,
  musicKey,
  darkMode,
}) {
  const isNashvilleMode = chordDisplayMode !== "letters";

  return (
    <div
      className="chord-controls-wrap"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px 16px",
        alignItems: "center",
        padding: "30px 0 30px",
        borderBottom: `1px solid ${theme.borderSoft}`,
        marginBottom: "24px",
      }}
    >
      {/* Transpose - increased gap to 8px */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: theme.textSecondary,
          }}
        >
          Transpose
        </span>
        <StepBtn
          className="chord-btn-step"
          theme={theme}
          onClick={() => handleTranspose(-1)}
          icon={<Minus size={14} />}
          aria-label="Transpose down"
        />
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            minWidth: "28px",
            textAlign: "center",
            color: chordColor,
          }}
        >
          {transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}
        </span>
        <StepBtn
          className="chord-btn-step"
          theme={theme}
          onClick={() => handleTranspose(1)}
          icon={<Plus size={14} />}
          aria-label="Transpose up"
        />
      </div>

      {/* Text size - increased gap to 8px */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: theme.textSecondary,
          }}
        >
          Size
        </span>
        <StepBtn
          className="chord-btn-step"
          theme={theme}
          onClick={() =>
            setEditorFontSize((s) => clamp(s - 1, EDITOR_MIN, EDITOR_MAX))
          }
          icon={<Minus size={14} />}
          aria-label="Decrease font size"
        />
        <span
          style={{
            fontSize: "12px",
            color: theme.textMuted,
            minWidth: "16px",
            textAlign: "center",
          }}
        >
          {editorFontSize}
        </span>
        <StepBtn
          className="chord-btn-step"
          theme={theme}
          onClick={() =>
            setEditorFontSize((s) => clamp(s + 1, EDITOR_MIN, EDITOR_MAX))
          }
          icon={<Plus size={14} />}
          aria-label="Increase font size"
        />
      </div>

      {/* Chord color - increased gap to 8px + added .chord-color-swatch class */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: theme.textSecondary,
            marginRight: "2px",
          }}
        >
          Color
        </span>
        {CHORD_COLOR_PRESETS.map((c) => (
          <button
            key={c.value}
            className="chord-color-swatch"
            onClick={() => setChordColor(c.value)}
            aria-label={`Set chord color to ${c.name}`}
            title={c.name}
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: c.value,
              border:
                chordColor === c.value
                  ? `2px solid ${theme.text}`
                  : "1px solid rgba(0,0,0,0.12)",
              cursor: "pointer",
              padding: 0,
              transition: "transform 0.15s ease, border-color 0.15s ease",
              transform: chordColor === c.value ? "scale(1.1)" : "scale(1)",
            }}
          />
        ))}
        <input
          type="color"
          value={chordColor}
          onChange={(e) => setChordColor(e.target.value)}
          className="chord-color-swatch"
          style={{
            width: "20px",
            height: "20px",
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderRadius: "50%",
          }}
          title="Custom color"
          aria-label="Custom chord color picker"
        />
      </div>

      {/* Line numbers toggle - restored to standard pill shape */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: theme.textSecondary,
          }}
        >
          Line No.
        </span>
        <button
          onClick={() => setShowLineNumbers((v) => !v)}
          aria-pressed={showLineNumbers}
          aria-label="Toggle line numbers"
          title="Toggle line numbers"
          style={{
            width: "34px",
            height: "18px",
            borderRadius: "999px",
            border: `1px solid ${showLineNumbers ? chordColor : theme.border}`,
            background: showLineNumbers ? chordColor : theme.borderSoft,
            position: "relative",
            cursor: "pointer",
            padding: 0,
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "1px",
              left: showLineNumbers ? "17px" : "1px",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "#FFFFFF",
              transition: "left 0.15s ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          />
        </button>
      </div>

      {/* Chord Display Mode selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <label
          htmlFor="chord-display-mode"
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: theme.textSecondary,
          }}
        >
          Chords
        </label>
        <select
          id="chord-display-mode"
          value={chordDisplayMode}
          onChange={(e) => setChordDisplayMode(e.target.value)}
          aria-label="Chord display mode"
          style={{
            padding: "6px 12px",
            paddingRight: "30px",
            borderRadius: "6px",
            border: `1px solid ${theme.border}`,
            background: `${theme.panel} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${encodeURIComponent(theme.textMuted)}'/%3E%3C/svg%3E") no-repeat right 12px center / 10px 6px`,
            color: theme.text,
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.15s ease",
            appearance: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = chordColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.border;
          }}
        >
          <option value="letters">Letters</option>
          <option value="numbers">Numbers</option>
          <option value="roman">Roman</option>
        </select>

        {isNashvilleMode && (
          <NashvilleHelp
            theme={theme}
            chordColor={chordColor}
            mode={chordDisplayMode}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}
