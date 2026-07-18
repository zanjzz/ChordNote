// src/components/modals/ConfirmClearModal.jsx
import React from "react";
import { X } from "lucide-react";

export default function ConfirmClearModal({
  visible,
  onConfirm,
  onCancel,
  theme,
}) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 19, 16, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: "24px",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: "14px",
          padding: "24px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "none",
            border: "none",
            color: theme.textMuted,
            cursor: "pointer",
            padding: "4px",
            borderRadius: "6px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = theme.borderSoft)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <X size={20} />
        </button>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: theme.text,
            margin: "0 0 8px",
          }}
        >
          Clear all inputs?
        </h3>
        <p
          style={{
            fontSize: "14px",
            color: theme.textSecondary,
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          This will erase your current chord sheet, including lyrics, chords,
          and metadata. You can't undo this.
        </p>
        <div
          style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.text,
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = theme.borderSoft)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              background: "#B04A24", // Coral red matches your chord presets
              color: "#FFFFFF",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
