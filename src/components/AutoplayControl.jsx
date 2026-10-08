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

// Size presets. "sm" is the compact panel header size (unchanged); "lg"
// matches the larger tool buttons on the full-page view so the autoplay
// control sits balanced next to the theme toggle and font stepper.
const SIZES = {
  sm: {
    play: 26,
    playIcon: 13,
    step: 20,
    stepIcon: 11,
    label: 10,
    labelWidth: 34,
    radius: 6,
    gap: 6,
  },
  lg: {
    play: 38,
    playIcon: 17,
    step: 30,
    stepIcon: 14,
    label: 12,
    labelWidth: 42,
    radius: 8,
    gap: 8,
  },
};

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
  size = "sm",
}) {
  const s = SIZES[size] || SIZES.sm;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: `${s.gap}px` }}>
      <button
        onClick={onToggle}
        title={isPlaying ? "Pause autoplay" : "Start autoplay"}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: `${s.play}px`,
          height: `${s.play}px`,
          flexShrink: 0,
          borderRadius: `${s.radius}px`,
          border: `1px solid ${isPlaying ? chordColor : theme.border}`,
          background: isPlaying ? chordColor : theme.panel,
          color: isPlaying ? contrastColor(chordColor) : theme.textSecondary,
          cursor: "pointer",
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}
      >
        {isPlaying ? <Pause size={s.playIcon} /> : <Play size={s.playIcon} />}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          border: `1px solid ${theme.border}`,
          borderRadius: `${s.radius}px`,
          padding: "3px",
          background: theme.panel,
          height: `${s.play}px`,
          boxSizing: "border-box",
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
            width: `${s.step}px`,
            height: `${s.step}px`,
            border: "none",
            borderRadius: `${s.radius - 2}px`,
            background: "transparent",
            color: canDecrease ? theme.textSecondary : theme.textMuted,
            cursor: canDecrease ? "pointer" : "default",
            opacity: canDecrease ? 1 : 0.4,
          }}
        >
          <Minus size={s.stepIcon} />
        </button>
        <span
          style={{
            fontSize: `${s.label}px`,
            fontWeight: 600,
            color: theme.textMuted,
            minWidth: `${s.labelWidth}px`,
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
            width: `${s.step}px`,
            height: `${s.step}px`,
            border: "none",
            borderRadius: `${s.radius - 2}px`,
            background: "transparent",
            color: canIncrease ? theme.textSecondary : theme.textMuted,
            cursor: canIncrease ? "pointer" : "default",
            opacity: canIncrease ? 1 : 0.4,
          }}
        >
          <Plus size={s.stepIcon} />
        </button>
      </div>
    </div>
  );
}
