import React from "react";

export default function SectionHeader({
  children,
  color,
  mutedColor,
  fontSize = "13px",
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize,
        fontWeight: 700,
        color: mutedColor,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "10px",
        paddingBottom: "8px",
        borderBottom: `1px solid ${mutedColor}2A`,
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 0 3px ${color}22`,
        }}
      />
      {children}
    </div>
  );
}
