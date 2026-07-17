// src/components/modals/MilestoneModal.jsx
import React from "react";
import { X } from "lucide-react";

const MILESTONE_LOCK_MS = 5000;

export default function MilestoneModal({
  visible,
  count,
  isLimit,
  locked,
  chordColor,
  theme,
  onClose,
}) {
  if (!visible) return null;

  return (
    <div
      className="chord-milestone-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: "20px",
        animation: "fadeIn 0.3s ease",
        backdropFilter: "blur(4px)",
        cursor: "default",
      }}
    >
      <div
        className="chord-milestone-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: "24px",
          padding: "40px 32px",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
          animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          cursor: "auto",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!isLimit && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: theme.borderSoft,
              overflow: "hidden",
            }}
          >
            <div
              key={`milestone-timer-${count}`}
              style={{
                height: "100%",
                width: "100%",
                background: chordColor,
                transformOrigin: "left",
                animation: `milestoneTimerShrink ${MILESTONE_LOCK_MS}ms linear forwards`,
              }}
            />
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "16px",
            zIndex: 10,
          }}
        >
          <button
            onClick={onClose}
            disabled={locked}
            className="close-btn"
            style={{
              background: "none",
              border: "none",
              color: theme.textMuted,
              cursor: locked ? "not-allowed" : "pointer",
              padding: "4px",
              borderRadius: "6px",
              opacity: locked ? 0.35 : 1,
              transition: "background 0.2s, opacity 0.2s",
            }}
            onMouseEnter={(e) =>
              !locked && (e.currentTarget.style.background = theme.borderSoft)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <X size={20} />
          </button>
        </div>

        {isLimit ? (
          <>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>📦</div>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: theme.text,
                margin: "0 0 8px 0",
              }}
            >
              Limit Reached
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: theme.textSecondary,
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              You've reached the maximum of 100 saved songs. To save more,
              please delete some existing songs.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: 600,
                borderRadius: "12px",
                background: theme.text,
                color: theme.bg,
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = theme.border)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = theme.text)
              }
            >
              Got it
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>🎵</div>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: theme.text,
                margin: "0 0 8px 0",
              }}
            >
              {count} Songs Saved!
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: theme.textSecondary,
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              You've been rocking Chordnote! <br />
              If this tool is making your music life easier, consider buying me
              a coffee to keep the updates coming
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://ko-fi.com/zanjzz"
                target="_blank"
                rel="noopener noreferrer"
                className="chord-cta-link"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  minWidth: "140px",
                  fontSize: "16px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: theme.text,
                  color: theme.panel,
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: "none",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.textSecondary;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 14px rgba(0,0,0,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme.text;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 6px rgba(0,0,0,0.12)";
                }}
              >
                <span
                  style={{ fontSize: "18px", lineHeight: 1, display: "block" }}
                >
                  ☕️
                </span>
                <span>Buy me a coffee</span>
              </a>
              <button
                onClick={onClose}
                disabled={locked}
                style={{
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: 600,
                  borderRadius: "12px",
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.textSecondary,
                  cursor: locked ? "not-allowed" : "pointer",
                  opacity: locked ? 0.5 : 1,
                  transition: "all 0.2s ease",
                  minWidth: "140px",
                }}
                onMouseEnter={(e) => {
                  if (locked) return;
                  e.currentTarget.style.background = theme.borderSoft;
                  e.currentTarget.style.color = theme.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = theme.textSecondary;
                }}
              >
                {locked ? "Please wait…" : "Close"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
