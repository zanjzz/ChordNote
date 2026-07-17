// src/components/ToggleBtn.jsx
import React from "react";

export default function ToggleBtn({
  chordColor, // kept for compatibility but not used for UI
  active,
  onClick,
  icon,
  label,
  theme,
  style,
  bgColor,
  activeBgColor,
  textColor,
  textMutedColor,
}) {
  const isDark = theme === "dark";
  const defaultBg = isDark ? "#2C2A26" : "#F0EEE8";
  const defaultActiveBg = isDark ? "#3A3530" : "#E1F5EE";
  const defaultText = isDark ? "#EDEAE3" : "#22221F";
  const defaultTextMuted = isDark ? "#78746A" : "#9A9689";

  const finalBg = bgColor || defaultBg;
  const finalActiveBg = activeBgColor || defaultActiveBg;
  const finalText = textColor || defaultText;
  const finalTextMuted = textMutedColor || defaultTextMuted;

  // 👇 Use neutral colors for border and text
  const activeBorderColor = isDark ? "#EDEAE3" : "#22221F";

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        padding: "3px 4px",
        fontSize: "10px",
        fontWeight: 500,
        borderRadius: "6px",
        border: `1px solid ${active ? activeBorderColor : "#D8D5CB"}`,
        background: active ? finalActiveBg : finalBg,
        color: active ? finalText : finalTextMuted,
        cursor: "pointer",
        transition: "all 0.15s ease",
        ...style,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
