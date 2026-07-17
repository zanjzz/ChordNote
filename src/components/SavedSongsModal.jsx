// src/components/SavedSongsModal.jsx
import React from "react";
import { X, Trash2, Music2 } from "lucide-react";

export default function SavedSongsModal({
  savedSongs,
  onClose,
  onSelect,
  onDelete,
  onDeleteAll,
  theme,
}) {
  return (
    <div
      className="saved-songs-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 19, 16, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "16px",
        boxSizing: "border-box",
        animation: "savedSongsFadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes savedSongsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes savedSongsPopIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        className="saved-songs-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: "14px",
          maxWidth: "650px",
          width: "100%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          animation: "savedSongsPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: `1px solid ${theme.borderSoft}`,
            flexShrink: 0,
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minWidth: 0,
            }}
          >
            <Music2 size={20} color={theme.textSecondary} />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: theme.text,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              My Saved Songs
            </span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: theme.textMuted,
                marginLeft: "4px",
              }}
            >
              ({savedSongs.length})
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            {onDeleteAll && savedSongs.length > 0 && (
              <button
                onClick={onDeleteAll}
                title="Delete all saved songs"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                  color: theme.textMuted,
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(231, 76, 60, 0.15)";
                  e.currentTarget.style.color = "#e74c3c";
                  e.currentTarget.style.borderColor = "rgba(231, 76, 60, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = theme.textMuted;
                  e.currentTarget.style.borderColor = theme.border;
                }}
              >
                <Trash2 size={13} />
                Delete All
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: theme.textMuted,
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = theme.borderSoft)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable List */}
        <div
          style={{
            padding: "12px 16px 20px 16px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {savedSongs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: theme.textMuted,
                fontSize: "15px",
              }}
            >
              You haven't saved any songs yet.
            </div>
          ) : (
            savedSongs.map((song, i) => (
              <div
                key={song.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 10px",
                  borderBottom: `1px solid ${theme.borderSoft}`,
                  transition: "background 0.15s",
                  animation: `savedSongsPopIn 0.25s ease both`,
                  animationDelay: `${Math.min(i, 10) * 0.02}s`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = theme.borderSoft)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: theme.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {song.title || "Untitled Song"}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: theme.textSecondary,
                      marginTop: "2px",
                    }}
                  >
                    {song.author || "No author"}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: theme.textMuted,
                      marginTop: "2px",
                      display: "flex",
                      gap: "12px",
                    }}
                  >
                    {song.musicKey && <span>Key: {song.musicKey}</span>}
                    {song.bpm && <span>BPM: {song.bpm}</span>}
                    {song.capo && <span>Capo: {song.capo}</span>}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={() => onSelect(song)}
                    title="Load song into editor"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 18px",
                      fontSize: "13px",
                      fontWeight: 600,
                      borderRadius: "6px",
                      border: `1px solid ${theme.border}`,
                      background: theme.panel,
                      color: theme.textSecondary,
                      cursor: "pointer",
                      gap: "4px",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.borderSoft;
                      e.currentTarget.style.color = theme.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme.panel;
                      e.currentTarget.style.color = theme.textSecondary;
                    }}
                  >
                    Load
                  </button>

                  <button
                    onClick={() => onDelete(song.id, song.title)}
                    title="Delete this song"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      border: "none",
                      background: "transparent",
                      color: theme.textMuted,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(231, 76, 60, 0.15)";
                      e.currentTarget.style.color = "#e74c3c";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = theme.textMuted;
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 👇 DISCLAIMER FOOTER */}
        <div
          style={{
            padding: "12px 24px 16px 24px",
            borderTop: `1px solid ${theme.borderSoft}`,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: theme.textMuted,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Songs are saved locally in your browser. They will be lost if you
            clear your browser data or use Incognito mode.
          </p>
        </div>
      </div>
    </div>
  );
}
