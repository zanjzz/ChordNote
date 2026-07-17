// src/components/PreviewModal/SectionHeader.jsx
import React from "react";

export default function SectionHeader({
  children,
  color,
  mutedColor,
  fontSize = "11px",
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize,
        fontWeight: 600,
        color: mutedColor,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: "6px",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  );
}
