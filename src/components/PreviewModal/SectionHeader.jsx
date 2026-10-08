import React from "react";

export default function SectionHeader({
  children,
  color,
  mutedColor,
  icon: Icon,
  fontSize = "13px",
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "9px",
        fontSize,
        fontWeight: 700,
        color: mutedColor,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "12px",
        paddingBottom: "9px",
        borderBottom: `1px solid ${mutedColor}2A`,
      }}
    >
      {Icon ? (
        // Monochrome icon in a soft tinted square — reads faster than a
        // bare dot while staying understated.
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "22px",
            height: "22px",
            borderRadius: "6px",
            background: `${color}1E`,
            color: mutedColor,
            flexShrink: 0,
          }}
        >
          <Icon size={13} strokeWidth={2.25} />
        </span>
      ) : (
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
      )}
      {children}
    </div>
  );
}
