// src/components/modals/ConfirmDeleteModal.jsx
import React from "react";
import { X, Trash2 } from "lucide-react";

export default function ConfirmDeleteModal({
  visible,
  title,
  onConfirm,
  onCancel,
  theme,
}) {
  if (!visible) return null;

  return (
    <div
      className="chord-confirm-overlay"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 19, 16, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "16px",
        boxSizing: "border-box",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        className="chord-confirm-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: "14px",
          padding: "24px",
          maxWidth: "400px",
          width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          animation: "slideUp 0.25s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: theme.text,
              margin: 0,
            }}
          >
            Delete Song
          </h3>
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              color: theme.textMuted,
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>
        <p
          style={{
            fontSize: "15px",
            color: theme.textSecondary,
            marginBottom: "20px",
          }}
        >
          Are you sure you want to delete <strong>"{title}"</strong>? This
          action cannot be undone.
        </p>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.textSecondary,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              background: "#e74c3c",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Trash2 size={16} /> Delete
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
