// src/components/PreviewModal/ModeControls.jsx
import React from "react";
import { Music2, Mic } from "lucide-react";
import SectionHeader from "./SectionHeader.jsx";

export default function ModeControls({
  showChords,
  setShowChords,
  chordColor, // kept for compatibility
  borderColor,
  activeBg,
  inactiveBg,
  textMutedColor,
  theme, // 👈 Add theme prop
}) {
  const isDark = theme === "dark" || false;
  const neutralColor = isDark ? "#EDEAE3" : "#22221F";

  return (
    <div style={{ minWidth: 0 }}>
      <SectionHeader color="#993556" mutedColor={textMutedColor}>
        Mode
      </SectionHeader>
      <button
        onClick={function () {
          setShowChords(function (prev) {
            return !prev;
          });
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          borderRadius: "8px",
          border: showChords
            ? `2px solid ${neutralColor}`
            : `1px solid ${borderColor}`,
          background: showChords ? activeBg : inactiveBg,
          color: showChords ? neutralColor : textMutedColor,
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
          width: "100%",
          justifyContent: "center",
          transition: "all 0.2s",
          boxSizing: "border-box",
        }}
      >
        {showChords ? (
          <>
            <Music2 size={16} /> Chords + Lyrics
          </>
        ) : (
          <>
            <Mic size={16} /> Lyrics Only
          </>
        )}
      </button>
    </div>
  );
}
