// src/components/PreviewModal/CanvasControls.jsx
import React from "react";
import SectionHeader from "./SectionHeader.jsx";

export default function CanvasControls({
  canvasTheme,
  setCanvasTheme,
  customCanvasColor,
  setCustomCanvasColor,
  chordColor, // kept for compatibility but not used
  borderColor,
  activeBg,
  inactiveBg,
  textMutedColor,
  appTheme,
}) {
  const isDark = appTheme === "dark";
  const neutralColor = isDark ? "#EDEAE3" : "#22221F";

  return (
    <div style={{ minWidth: 0 }}>
      <SectionHeader color="#dcc5b5" mutedColor={textMutedColor}>
        Canvas
      </SectionHeader>

      {/* Theme selector */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        {["light", "dark", "custom"].map((theme) => (
          <button
            key={theme}
            onClick={() => setCanvasTheme(theme)}
            style={{
              flex: 1,
              padding: "6px 8px",
              fontSize: "12px",
              fontWeight: canvasTheme === theme ? 600 : 500,
              borderRadius: "6px",
              border:
                canvasTheme === theme
                  ? `2px solid ${neutralColor}` // 👈 Changed from chordColor
                  : `1px solid ${borderColor}`,
              background: canvasTheme === theme ? activeBg : inactiveBg,
              color: canvasTheme === theme ? neutralColor : textMutedColor, // 👈 Changed from chordColor
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </button>
        ))}
      </div>

      {/* Custom color picker – unchanged */}
      {canvasTheme === "custom" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: textMutedColor,
            }}
          >
            Background:
          </span>
          <input
            type="color"
            value={customCanvasColor}
            onChange={(e) => setCustomCanvasColor(e.target.value)}
            style={{
              width: "32px",
              height: "32px",
              padding: 0,
              border: `1px solid ${borderColor}`,
              borderRadius: "6px",
              cursor: "pointer",
              background: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
