// src/components/TopBar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Save, Folder, Menu, X, Trash2 } from "lucide-react";

import whiteLogo from "../assets/default-monochrome-white.svg";
import darkLogo from "../assets/default-monochrome-black.svg";

export default function TopBar({
  darkMode,
  setDarkMode,
  theme,
  onSave,
  onViewSaved,
  savedCount,
  onClear,
  onGoHome,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const btnStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    fontSize: "13px",
    fontWeight: 600,
    borderRadius: "7px",
    border: `1px solid ${theme.border}`,
    background: theme.panel,
    color: theme.text,
    cursor: "pointer",
    transition: "background 0.15s",
  };

  const menuItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    textAlign: "left",
    padding: "11px 12px",
    fontSize: "14px",
    fontWeight: 500,
    color: theme.text,
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  };

  const hoverIn = (e) => (e.currentTarget.style.background = theme.borderSoft);
  const hoverOutPanel = (e) => (e.currentTarget.style.background = theme.panel);
  const hoverOutTransparent = (e) =>
    (e.currentTarget.style.background = "transparent");

  return (
    <div className="chord-top-bar">
      <button
        onClick={onGoHome}
        title="Back to home"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          minWidth: 0,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <img
          src={darkMode ? darkLogo : whiteLogo}
          alt="Chordnote logo"
          style={{ width: "110px", height: "auto", display: "block" }}
        />
      </button>

      {/* Desktop button row */}
      <div
        className="chord-topbar-actions-desktop"
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <button
          onClick={onSave}
          style={btnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOutPanel}
          title="Save current song to library"
        >
          <Save size={14} /> Save
        </button>

        <button
          onClick={onViewSaved}
          style={btnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOutPanel}
          title="View your saved songs"
        >
          <Folder size={14} /> Saved ({savedCount})
        </button>

        <button
          onClick={onClear}
          style={btnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOutPanel}
          title="Clear all inputs"
        >
          <Trash2 size={14} /> Clear
        </button>

        <button
          onClick={() => setDarkMode((d) => !d)}
          style={btnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOutPanel}
        >
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </div>

      {/* Mobile hamburger */}
      <div
        className="chord-topbar-actions-mobile"
        ref={menuRef}
        style={{ position: "relative", flexShrink: 0 }}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38px",
            height: "38px",
            borderRadius: "7px",
            border: `1px solid ${theme.border}`,
            background: theme.panel,
            color: theme.text,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOutPanel}
        >
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
              minWidth: "200px",
              padding: "6px",
              zIndex: 50,
              animation: "slideUp 0.18s ease",
            }}
          >
            <button
              onClick={() => {
                onSave();
                setMenuOpen(false);
              }}
              style={menuItemStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOutTransparent}
            >
              <Save size={16} color={theme.textMuted} />
              Save
            </button>
            <button
              onClick={() => {
                onViewSaved();
                setMenuOpen(false);
              }}
              style={menuItemStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOutTransparent}
            >
              <Folder size={16} color={theme.textMuted} />
              Saved ({savedCount})
            </button>
            <button
              onClick={() => {
                onClear();
                setMenuOpen(false);
              }}
              style={menuItemStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOutTransparent}
            >
              <Trash2 size={16} color={theme.textMuted} />
              Clear
            </button>
            <button
              onClick={() => {
                setDarkMode((d) => !d);
                setMenuOpen(false);
              }}
              style={menuItemStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOutTransparent}
            >
              {darkMode ? (
                <Sun size={16} color={theme.textMuted} />
              ) : (
                <Moon size={16} color={theme.textMuted} />
              )}
              {darkMode ? "Light mode" : "Dark mode"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
