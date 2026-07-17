// src/components/modals/Toast.jsx
import React from "react";

export default function Toast({ visible, message, type, theme }) {
  if (!visible) return null;

  return (
    <div
      className="chord-toast"
      style={{
        position: "fixed",
        bottom: "30px",
        right: "30px",
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "12px",
        padding: "14px 20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        zIndex: 300,
        color: theme.text,
        fontSize: "14px",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        animation: "slideUp 0.4s ease",
        maxWidth: "350px",
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: type === "success" ? "#2ECC71" : "#3498DB",
          flexShrink: 0,
        }}
      />
      {message}
    </div>
  );
}
