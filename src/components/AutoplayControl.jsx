// src/components/AutoplayControl.jsx
import React from "react";
import { Play, Pause, Minus, Plus } from "lucide-react";

function contrastColor(hexColor) {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? "#22221F" : "#FFFFFF";
}

export default function AutoplayControl({
  theme,
  chordColor,
  isPlaying,
  onToggle,
  speedLabel,
  onIncreaseSpeed,
  onDecreaseSpeed,
  canIncrease,
  canDecrease,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <button
        onClick={onToggle}
        title={isPlaying ? "Pause autoplay" : "Start autoplay"}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "26px",
          height: "26px",
          flexShrink: 0,
          borderRadius: "6px",
          border: `1px solid ${isPlaying ? chordColor : theme.border}`,
          background: isPlaying ? chordColor : theme.panel,
          color: isPlaying ? contrastColor(chordColor) : theme.textSecondary,
          cursor: "pointer",
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          border: `1px solid ${theme.border}`,
          borderRadius: "6px",
          padding: "2px",
          background: theme.panel,
        }}
        title="Autoplay speed"
      >
        <button
          onClick={onDecreaseSpeed}
          disabled={!canDecrease}
          title="Slower"
          aria-label="Decrease autoplay speed"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            border: "none",
            borderRadius: "4px",
            background: "transparent",
            color: canDecrease ? theme.textSecondary : theme.textMuted,
            cursor: canDecrease ? "pointer" : "default",
            opacity: canDecrease ? 1 : 0.4,
          }}
        >
          <Minus size={11} />
        </button>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: theme.textMuted,
            minWidth: "34px",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {speedLabel}
        </span>
        <button
          onClick={onIncreaseSpeed}
          disabled={!canIncrease}
          title="Faster"
          aria-label="Increase autoplay speed"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            border: "none",
            borderRadius: "4px",
            background: "transparent",
            color: canIncrease ? theme.textSecondary : theme.textMuted,
            cursor: canIncrease ? "pointer" : "default",
            opacity: canIncrease ? 1 : 0.4,
          }}
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}
