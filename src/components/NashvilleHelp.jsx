// src/components/NashvilleHelp.jsx
import React, { useState, useRef, useEffect } from "react";
import { Info, X } from "lucide-react";

export default function NashvilleHelp({ theme, chordColor, mode }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const tooltipTimeoutRef = useRef(null);
  const iconRef = useRef(null);

  const modeLabel = mode === "numbers" ? "Numbers" : "Roman";
  const isDark = theme.page === "#181715" || false;
  const neutralColor = isDark ? "#EDEAE3" : "#22221F";
  const neutralBg = isDark ? "#3A3530" : "#E1F5EE";

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipVisible(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setTooltipVisible(false);
  };

  const handleClick = () => {
    setTooltipVisible(false);
    setModalOpen(true);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && modalOpen) setModalOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [modalOpen]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) setModalOpen(false);
  };

  return (
    <>
      {/* Icon with tooltip */}
      <div
        ref={iconRef}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginLeft: "4px",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: neutralColor,
            color: isDark ? "#181715" : "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow:
              tooltipVisible || modalOpen
                ? `0 0 0 4px ${neutralColor}40`
                : "none",
            transform: tooltipVisible || modalOpen ? "scale(1.1)" : "scale(1)",
          }}
        >
          <span style={{ lineHeight: 1, marginTop: "-1px" }}>!</span>
        </div>

        {tooltipVisible && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              color: theme.text,
              whiteSpace: "nowrap",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              zIndex: 10,
              animation: "tooltipFadeIn 0.2s ease",
              pointerEvents: "none",
            }}
          >
            <style>{`
              @keyframes tooltipFadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(6px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
              }
              @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.96) translateY(12px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
              @keyframes overlayFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Info size={14} color={neutralColor} />
              Learn how {modeLabel} notation works
            </span>
            <div
              style={{
                position: "absolute",
                bottom: "-6px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "0",
                height: "0",
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: `6px solid ${theme.border}`,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-5px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "0",
                height: "0",
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: `5px solid ${theme.panel}`,
              }}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px",
            animation: "overlayFadeIn 0.25s ease",
            backdropFilter: "blur(4px)",
          }}
          onClick={handleOverlayClick}
        >
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "16px",
              maxWidth: "580px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
              animation: "modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px 16px",
                borderBottom: `1px solid ${theme.borderSoft}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: `${neutralColor}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: neutralColor,
                  }}
                >
                  <span style={{ fontSize: "18px", fontWeight: 700 }}>N</span>
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: theme.text,
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Nashville Number System
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: theme.textMuted,
                      margin: 0,
                    }}
                  >
                    How {modeLabel} notation works in ChordNote
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: theme.textMuted,
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                  transition: "background 0.15s ease",
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
            </div>

            {/* Body */}
            <div
              style={{
                padding: "20px 24px 24px",
                overflowY: "auto",
                color: theme.text,
                fontSize: "14px",
                lineHeight: 1.7,
              }}
            >
              <p style={{ marginTop: 0, color: theme.textSecondary }}>
                The{" "}
                <strong style={{ color: theme.text }}>
                  Nashville Number System
                </strong>{" "}
                is a method of notating chord progressions using numbers instead
                of letter names. It makes transposition effortless and is widely
                used by session musicians.
              </p>

              <div
                style={{
                  background: theme.borderSoft,
                  borderRadius: "8px",
                  padding: "16px",
                  margin: "12px 0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    { num: "1", roman: "I", label: "Tonic" },
                    { num: "2m", roman: "ii", label: "Supertonic" },
                    { num: "3m", roman: "iii", label: "Mediant" },
                    { num: "4", roman: "IV", label: "Subdominant" },
                    { num: "5", roman: "V", label: "Dominant" },
                    { num: "6m", roman: "vi", label: "Submediant" },
                    { num: "7°", roman: "vii°", label: "Leading Tone" },
                  ].map((deg) => (
                    <div key={deg.num} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color: chordColor,
                        }}
                      >
                        {deg.num}
                      </div>
                      <div style={{ fontSize: "11px", color: theme.textMuted }}>
                        {deg.roman}
                      </div>
                      <div style={{ fontSize: "11px", color: theme.textMuted }}>
                        {deg.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <p>
                  <strong style={{ color: theme.text }}>In ChordNote:</strong>
                </p>
                <ul
                  style={{
                    color: theme.textSecondary,
                    paddingLeft: "20px",
                    margin: "6px 0 0",
                  }}
                >
                  <li>
                    <strong style={{ color: theme.text }}>Type letters</strong>{" "}
                    – Always enter chords as letters regardless of chord type.
                    When you focus on a chord input, it will show you the
                    letters (e.g., <code>G</code>, <code>Am</code>,{" "}
                    <code>D/F#</code>).
                  </li>
                  <li>
                    <strong style={{ color: theme.text }}>Set a Key</strong> –{" "}
                    The number system is relative to your song's key, so make
                    sure to set it correctly.
                  </li>
                  <li>
                    <strong style={{ color: theme.text }}>Transpose</strong> –{" "}
                    Transposing updates the key automatically; numbers stay the
                    same.
                  </li>
                  <li>
                    <strong style={{ color: theme.text }}>Edit anytime</strong>{" "}
                    – Click a chord to edit the raw letter; numbers update
                    automatically.
                  </li>
                </ul>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  background: `${chordColor}10`,
                  borderRadius: "8px",
                  borderLeft: `3px solid ${chordColor}`,
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: theme.textSecondary,
                    margin: 0,
                  }}
                >
                  💡 <strong style={{ color: theme.text }}>Example:</strong> In
                  the key of <strong style={{ color: chordColor }}>G</strong>,
                  the chord <strong style={{ color: chordColor }}>G</strong> is{" "}
                  <strong style={{ color: chordColor }}>1</strong>,{" "}
                  <strong style={{ color: chordColor }}>Am</strong> is{" "}
                  <strong style={{ color: chordColor }}>2m</strong>, and{" "}
                  <strong style={{ color: chordColor }}>D</strong> is{" "}
                  <strong style={{ color: chordColor }}>5</strong>.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 24px 16px",
                borderTop: `1px solid ${theme.borderSoft}`,
                display: "flex",
                justifyContent: "flex-end",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: "none",
                  background: chordColor,
                  color: (() => {
                    const hex = chordColor.replace("#", "");
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    return brightness > 140 ? "#22221F" : "#FFFFFF";
                  })(),
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = `0 4px 12px ${chordColor}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
