// src/components/Footer.jsx
import React from "react";
import { Mail, Heart } from "lucide-react";

export default function Footer({ theme, darkMode, chordColor }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: "48px",
        padding: "32px 24px 24px",
        borderTop: `1px solid ${theme.borderSoft}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px 16px",
          fontSize: "13px",
          color: theme.textSecondary,
        }}
      >
        <span>
          &copy; {currentYear}{" "}
          <strong style={{ color: theme.text }}>ChordNote</strong>. All rights
          reserved.
        </span>
        <span style={{ color: theme.textMuted }}>·</span>
        <a
          href="mailto:zanj269@gmail.com?subject=ChordNote%20Feedback"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: theme.textSecondary,
            textDecoration: "none",
            borderBottom: `1px solid transparent`,
            transition: "border-color 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = theme.text;
            e.currentTarget.style.borderBottomColor = theme.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.textSecondary;
            e.currentTarget.style.borderBottomColor = "transparent";
          }}
        >
          <Mail size={14} />
          Report bug / Suggest feature
        </a>
      </div>

      {/*
        Accessibility fix: Changed color from theme.textMuted to theme.textSecondary
        to ensure 4.5:1 contrast ratio for 12px text (WCAG AA).
        Heart icon now matches text color for better visibility.
      */}
      <div
        style={{
          fontSize: "12px",
          color: theme.textSecondary,
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        Made with{" "}
        <Heart
          size={12}
          fill={theme.textSecondary}
          color={theme.textSecondary}
        />{" "}
        for musicians
      </div>
    </footer>
  );
}                            