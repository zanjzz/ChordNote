import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Sun,
  Moon,
  Menu,
  X,
  MousePointerClick,
  RefreshCw,
  ListMusic,
  ClipboardPaste,
  Share2,
  Image,
} from "lucide-react";
import { LIGHT_THEME, DARK_THEME } from "../constants/themes.js";
import "./LandingPage.css";
import whiteLogo from "../assets/default-monochrome-white.svg";
import darkLogo from "../assets/default-monochrome-black.svg";
import Aurora from "./Aurora.jsx";
import Footer from "./Footer.jsx";
import VariableProximity from "./VariableProximity";
import "./VariableProximity.css";

// Local storage key for persisting user preferences
const STORAGE_KEY = "chordsheet_data";

// Features data for the grid section
const FEATURES = [
  {
    icon: MousePointerClick,
    title: "Lyrics and Chord Editor",
    desc: "Input your lyrics and place chords with ease. Separate editing panels make your workflow smooth and intuitive.",
  },
  {
    icon: RefreshCw,
    title: "Instant Transposition",
    desc: "Change keys with one click. All chords and the key label update automatically.",
  },
  {
    icon: ListMusic,
    title: "Multiple Notations",
    desc: "Switch between letter chords, Nashville numbers, or Roman numerals. Your chart adapts instantly.",
  },
  {
    icon: ClipboardPaste,
    title: "Paste to Import",
    desc: "Copy a chord sheet from the web, paste it in, and modify it however you like. You don't always have to start from scratch.",
  },
  {
    icon: Share2,
    title: "Shareable Links",
    desc: "Share your work with anyone. Send a link and they'll see your chord sheet exactly as you made it.",
  },
  {
    icon: Image,
    title: "Export as Image",
    desc: "Customize your chord sheet and export it as a clean, high-quality image. Perfect for printing, personal use, or sharing on social media.",
  },
];

// Sample chord charts displayed in the hero visual
const SAMPLE_CHARTS = [
  {
    title: "Amazing Grace",
    keyLabel: "G",
    rot: 0,
    rows: [
      {
        chords: "G           C          G",
        lyric: "Amazing grace, how sweet the sound",
      },
      {
        chords: "            D          G",
        lyric: "That saved a wretch like me",
      },
      { chords: "            ", lyric: "..." },
    ],
  },
  {
    title: "You Are My Light",
    keyLabel: "D",
    rot: 0,
    rows: [
      {
        chords: "D          A         Bm       G",
        lyric: "You are the light that leads me home",
      },
      {
        chords: "D          A              G",
        lyric: "Through every storm You call my name",
      },
      { chords: "            ", lyric: "..." },
    ],
  },
  {
    title: "Faithful Heart",
    keyLabel: "Am",
    rot: 0,
    rows: [
      {
        chords: "Am        F         C        G",
        lyric: "I will sing of Your faithful love",
      },
      {
        chords: "Am        F         C          G",
        lyric: "Forever my heart will trust in You",
      },
      { chords: "            ", lyric: "..." },
    ],
  },
];

// -------- HELPER: convert hex to RGB string (comma separated) --------
const hexToRgb = (hex) => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
};

export default function LandingPage({ onOpenEditor }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const scrollTimeout = useRef(null);
  const heroContainerRef = useRef(null);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).darkMode ?? false;
    } catch (_) {}
    return false;
  });

  const theme = darkMode ? DARK_THEME : LIGHT_THEME;
  const primaryColor = darkMode ? "#12D8C8" : "#063564";
  const primaryHover = darkMode ? "#0fbdb0" : "#052a4f";

  // Compute RGB version of the panel color for use in rgba()
  const panelRgb = useMemo(() => hexToRgb(theme.panel), [theme.panel]);

  // Aurora settings
  const auroraSettings = useMemo(
    () => ({
      colorStops: darkMode
        ? ["#0fca63", "#772cbd", "#279bff"]
        : ["#cefde4", "#cd96ff", "#b5dcff"],
      blend: 0.72,
      amplitude: 1.0,
      speed: 0.5,
      opacity: darkMode ? 0.7 : 1.0,
    }),
    [darkMode],
  );

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...data, darkMode: next }),
        );
      } catch (_) {}
      return next;
    });
  }, []);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeout.current) {
        cancelAnimationFrame(scrollTimeout.current);
      }
      scrollTimeout.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) cancelAnimationFrame(scrollTimeout.current);
    };
  }, []);

  // Close mobile menu on outside click
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

  // CSS variables – includes --lp-panel-rgb for dynamic rgba backgrounds
  const cssVars = useMemo(
    () => ({
      "--lp-page": theme.page,
      "--lp-panel": theme.panel,
      "--lp-panel-rgb": panelRgb,
      "--lp-border": theme.border,
      "--lp-border-soft": theme.borderSoft,
      "--lp-text": theme.text,
      "--lp-text-secondary": theme.textSecondary,
      "--lp-text-muted": theme.textMuted,
      "--lp-primary": primaryColor,
      "--lp-primary-hover": primaryHover,
      "--lp-primary-text": darkMode ? "#1a1a1a" : "#ffffff",
    }),
    [theme, primaryColor, primaryHover, darkMode, panelRgb],
  );

  // Mobile menu item style
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
    textDecoration: "none",
    boxSizing: "border-box",
  };

  const handleOpenEditor = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    onOpenEditor();
  };

  return (
    <div className="landing-page" style={cssVars}>
      {/* Aurora Background */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
          opacity: auroraSettings.opacity,
        }}
      >
        <Aurora
          key={darkMode ? "dark" : "light"}
          colorStops={auroraSettings.colorStops}
          amplitude={auroraSettings.amplitude}
          blend={auroraSettings.blend}
          speed={auroraSettings.speed}
        />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Navigation */}
        <nav className={`lp-navbar ${scrolled ? "scrolled" : ""}`}>
          <div
            className="lp-navbar-inner"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* Logo */}
            <div className="lp-nav-left">
              <img
                src={darkMode ? darkLogo : whiteLogo}
                alt="Chordnote logo"
                style={{ width: "110px", height: "auto", display: "block" }}
              />
            </div>

            <div className="lp-nav-right">
              <button
                onClick={handleOpenEditor}
                className="lp-btn lp-btn-primary lp-btn-sm"
              >
                Open Editor
              </button>
              <ul className="lp-nav-links">
                <li>
                  <a href="#features">Features</a>
                </li>
              </ul>
              <button
                className="lp-icon-btn"
                onClick={toggleDarkMode}
                title={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <div className="lp-mobile-menu" ref={menuRef}>
                <button
                  className="lp-icon-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Menu"
                >
                  {menuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                {menuOpen && (
                  <div className="lp-mobile-dropdown">
                    <button
                      style={{
                        ...menuItemStyle,
                        color: primaryColor,
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        setMenuOpen(false);
                        handleOpenEditor();
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      Open Editor
                    </button>
                    <a
                      href="#features"
                      style={menuItemStyle}
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                      Features
                    </a>
                    <button
                      style={menuItemStyle}
                      onClick={() => {
                        toggleDarkMode();
                        setMenuOpen(false);
                      }}
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
          </div>
        </nav>

        {/* Hero Section */}
        <section className="lp-hero">
          <div className="lp-hero-grid">
            <div className="lp-hero-content" ref={heroContainerRef}>
              <div className="hero-heading">
                <VariableProximity
                  label="ChordNote -"
                  className="hero-variable-proximity"
                  fromFontVariationSettings="'wght' 700, 'opsz' 9"
                  toFontVariationSettings="'wght' 300, 'opsz' 40"
                  containerRef={heroContainerRef}
                  radius={150}
                  falloff="gaussian"
                />
                <VariableProximity
                  label="The Ultimate Lyrics & Chord Sheet Editor"
                  className="hero-variable-proximity"
                  fromFontVariationSettings="'wght' 700, 'opsz' 9"
                  toFontVariationSettings="'wght' 300, 'opsz' 40"
                  containerRef={heroContainerRef}
                  radius={150}
                  falloff="gaussian"
                />
              </div>
              <p>
                Everything you need to create, edit, transpose, print, and share
                chord sheets. Fast, simple, and free.
              </p>
              <div className="lp-hero-actions">
                <button
                  onClick={handleOpenEditor}
                  className="lp-btn lp-btn-primary lp-btn-lg"
                >
                  Start Now!
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
                <a
                  href="#features"
                  className="lp-btn lp-btn-secondary lp-btn-lg"
                >
                  See how it works
                </a>
              </div>
            </div>

            <div className="lp-hero-visual">
              <div className="lp-sheet-stack">
                {SAMPLE_CHARTS.map((chart, i) => (
                  <div
                    key={i}
                    className={`lp-sheet-card lp-sheet-card-${i + 1}`}
                    style={{ "--rot": `${chart.rot}deg` }}
                  >
                    <div className="lp-sheet-header">
                      <span className="lp-sheet-title">{chart.title}</span>
                      <span className="lp-sheet-key">
                        Key: {chart.keyLabel}
                      </span>
                    </div>
                    {chart.rows.map((row, j) => (
                      <div className="lp-sheet-row" key={j}>
                        <div className="lp-sheet-chords">{row.chords}</div>
                        <div className="lp-sheet-lyric">{row.lyric}</div>
                      </div>
                    ))}
                    {i === 2 && (
                      <div className="lp-cursor" aria-hidden="true">
                        <span className="lp-cursor-ring" />
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M4 2.5 L19.5 9.8 L12 11.8 L9.3 19.5 Z"
                            fill="#ffffff"
                            stroke="#111111"
                            strokeWidth="1.3"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="lp-section" id="features">
          <div className="lp-container">
            <div className="lp-section-header">
              <h2 className="lp-section-title">
                What you can do with ChordNote
              </h2>
            </div>
            <div className="lp-features-grid-wrapper">
              <div className="lp-features-grid">
                {FEATURES.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={i} className="lp-feature-card">
                      <div className="lp-feature-top">
                        <div className="lp-feature-icon">
                          <Icon size={20} />
                        </div>
                        <h3>{f.title}</h3>
                      </div>
                      <p>{f.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="lp-section lp-cta-section">
          <div
            className="lp-container lp-container-narrow"
            style={{ textAlign: "center" }}
          >
            <h2 className="lp-section-title">
              Start creating & editing your chord sheets now!
            </h2>
            <p className="lp-cta-sub">
              It's completely free! No annoying setup, just music.
            </p>
            <div className="lp-cta-actions">
              <button
                onClick={handleOpenEditor}
                className="lp-btn lp-btn-primary lp-btn-lg"
              >
                Launch ChordNote
              </button>
              <a href="#features" className="lp-btn lp-btn-secondary lp-btn-lg">
                Learn More
              </a>
            </div>
          </div>
        </section>

        <Footer theme={theme} darkMode={darkMode} />
      </div>
    </div>
  );
}
