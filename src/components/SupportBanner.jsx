// src/components/SupportBanner.jsx
import React from "react";
import { Heart } from "lucide-react";

const ACCENT = "#0F6E56"; // matches your default chord color / teal theme
const CUP_BODY = "#F5F5F5";
const CUP_SHADOW = "#D8D5CB";

export default function SupportBanner({ theme, darkMode }) {
  const bg = darkMode ? "#1F1C19" : "#FBF8F2";
  const border = darkMode ? "#3B3833" : "#EFE9DD";
  const textColor = darkMode ? "#EDEAE3" : "#22221F";
  const textMuted = darkMode ? "#A8A398" : "#77746A";

  return (
    <section
      style={{
        marginTop: "48px",
        padding: "48px 24px",
        borderRadius: "20px",
        background: bg,
        border: `1px solid ${border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "18px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Soft decorative glow behind the cup */}
      <div
        style={{
          position: "absolute",
          top: "-60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* ---- Improved SVG Coffee Cup ---- */}
      <div className="sb-cup-wrap">
        <svg
          className="sb-cup-svg"
          viewBox="0 0 120 120"
          width="90"
          height="100"
          style={{ display: "block" }}
        >
          <defs>
            <linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={CUP_BODY} />
              <stop offset="100%" stopColor={CUP_SHADOW} />
            </linearGradient>
            <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6B4A33" />
              <stop offset="100%" stopColor="#4A3221" />
            </linearGradient>
            <radialGradient id="foamGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDFBF7" />
              <stop offset="100%" stopColor="#E8E0D5" />
            </radialGradient>
          </defs>

          {/* Saucer */}
          <ellipse cx="60" cy="100" rx="50" ry="8" fill={CUP_SHADOW} />

          {/* Handle */}
          <path
            d="M 86 55 C 100 55, 104 70, 88 80"
            stroke={CUP_SHADOW}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />

          {/* Cup body */}
          <path
            d="M 30 40 L 36 95 Q 60 102 84 95 L 90 40 Z"
            fill="url(#cupGrad)"
            stroke={CUP_SHADOW}
            strokeWidth="2"
          />

          {/* Coffee liquid */}
          <path
            d="M 34 48 L 40 95 Q 60 100 80 95 L 86 48 Z"
            fill="url(#liquidGrad)"
          />

          {/* Foam layer (creamy top) */}
          <path
            d="M 34 48 Q 60 44 86 48 Q 60 54 34 48 Z"
            fill="url(#foamGrad)"
          />

          {/* Latte art – heart */}
          <path
            d="M 60 56 C 55 48, 48 52, 60 64 C 72 52, 65 48, 60 56 Z"
            fill="#FFF"
            opacity="0.85"
          />

          {/* Cup shine highlight */}
          <path
            d="M 40 52 Q 44 48 48 52"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Steam wisps */}
          <path
            className="sb-steam sb-steam-1"
            d="M 42 30 Q 38 20 42 10 T 42 -5"
            stroke="#A8A398"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            className="sb-steam sb-steam-2"
            d="M 60 30 Q 56 20 60 10 T 60 -5"
            stroke="#A8A398"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            className="sb-steam sb-steam-3"
            d="M 78 30 Q 74 20 78 10 T 78 -5"
            stroke="#A8A398"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h2
        style={{
          fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
          fontSize: "22px",
          fontWeight: 700,
          margin: 0,
          color: textColor,
        }}
      >
        Find ChordNote helpful?
      </h2>

      <p
        style={{
          fontSize: "14px",
          color: textMuted,
          maxWidth: "380px",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        This tool is free to use. If it's helped you write, transpose, or export
        your chord sheets, a coffee goes a long way, your support is greatly
        appreciated and helps this site keep running.
      </p>

      <a
        href="https://ko-fi.com/zanjzz"
        target="_blank"
        rel="noopener noreferrer"
        className="sb-cta"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 26px",
          borderRadius: "999px",
          background: darkMode ? ACCENT : "#1A8A72", // ← lighter teal in light mode
          color: "#FFFFFF",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
          boxShadow: `0 6px 18px ${ACCENT}40`,
        }}
      >
        <Heart size={16} fill="#FFFFFF" />
        Buy me a coffee
      </a>

      <style>{`
        .sb-cta {
          transition: transform 0.4s ease, box-shadow 0.2s ease;
        }
        .sb-cta:hover {
          color: #FFFFFF !important; 
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 10px 24px ${ACCENT}55;
        }
        .sb-cta:active {
          transform: translateY(0) scale(0.98);
        }

        .sb-cup-wrap {
          position: relative;
          width: 90px;
          height: 100px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          cursor: default;
        }

        .sb-cup-svg {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: 60px 90px;
        }

        .sb-cup-wrap:hover .sb-cup-svg {
          transform: rotate(-4deg) translateY(-2px);
        }

        .sb-steam {
          opacity: 0;
          animation: sb-rise 2.6s ease-in-out infinite;
        }
        .sb-steam-1 {
          animation-delay: 0s;
        }
        .sb-steam-2 {
          animation-delay: 0.6s;
        }
        .sb-steam-3 {
          animation-delay: 1.2s;
        }

        @keyframes sb-rise {
          0% {
            transform: translateY(0) scaleX(1);
            opacity: 0;
          }
          20% {
            opacity: 0.7;
          }
          80% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-34px) scaleX(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}
