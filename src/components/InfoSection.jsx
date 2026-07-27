// src/components/InfoSection.jsx
import React from "react";
import { Check } from "lucide-react";

const FEATURES = [
  {
    title: "Chord Editing",
    description: "Place chords precisely above your lyrics with ease.",
  },
  {
    title: "Lyrics Editing",
    description:
      "Write, edit, and organize lyrics in a clean, distraction-free editor.",
  },
  {
    title: "Chord Transposition",
    description: "Transpose your chord sheet to any key instantly.",
  },
  {
    title: "Nashville Number System",
    description:
      "Convert chords between letter notation, Nashville Numbers, and Roman Numerals.",
  },
  {
    title: "Import Chord Sheets",
    description:
      "Import existing chord sheets and continue editing without starting from scratch.",
  },
  {
  title: "Sharing",
  description:
    "Share chord sheets with bandmates or friends using a shareable link or the copy button.",
  },
  {
    title: "Image Export",
    description:
      "Export your chord sheets as high-quality images for easy sharing and printing.",
  },
];

const QUICK_START_STEPS = [
  "Write your lyrics or import an existing chord sheet using the Import button.",
  "Add or edit chords above the lyrics.",
  "Customize your chord sheet using transpose, formatting, or notation options.",
  "Save, export, or share your finished chord sheet.",
];

export default function InfoSection({ theme, chordColor }) {
  const getContrastColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? "#1a1a1a" : "#ffffff";
  };

  const contrastText = getContrastColor(chordColor);

  return (
    <section
      style={{
        maxWidth: "2400px",
        width: "100%",
        margin: "140px auto 90px",
        padding: "0 24px",
        boxSizing: "border-box",
        color: theme.text,
      }}
    >
      {/* Inner wrapper keeps reading width sane even though the outer
          section matches the editor's full max-width above it. */}
      <div style={{ maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        {/* ---- About ---- */}
        <div style={{ marginBottom: "72px" }}>
          <h2
            style={{
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 700,
              marginBottom: "20px",
              letterSpacing: "-0.02em",
              color: theme.text,
            }}
          >
            What is ChordNote?
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.8,
              color: theme.textSecondary,
              marginBottom: "16px",
            }}
          >
            ChordNote is a free online lyrics and chord editor that runs
            entirely in your browser. Create new chord sheets or edit existing
            ones by writing your lyrics, placing chords exactly where you want
            them, and customizing everything with no installation or account
            required.
          </p>

          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.8,
              color: theme.textSecondary,
              marginBottom: "16px",
            }}
          >
            Easily transpose songs to any key, switch between chord letters,
            Nashville Numbers, or Roman Numerals, and import existing chord
            sheets in seconds. ChordNote automatically aligns chords with your
            lyrics, making editing quick, accurate, and effortless.
          </p>

          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.8,
              color: theme.textSecondary,
            }}
          >
            Whether you're a guitarist, pianist, worship musician, songwriter,
            or band member, ChordNote helps you organize, edit, and share
            professional-looking chord sheets so you're always ready for
            practice, rehearsal, or live performance.
          </p>
        </div>

        {/* ---- Divider ---- */}
        <hr
          style={{
            border: "none",
            borderTop: `1px solid ${theme.border}`,
            margin: "0 0 64px 0",
          }}
        />

        {/* ---- Quick Start + Features (side‑by‑side on desktop) ---- */}
        <style>{`
          .chordnote-info-row {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            gap: 56px;
          }
          @media (max-width: 640px) {
            .chordnote-info-row {
              flex-direction: column;
              gap: 48px;
            }
          }
        `}</style>
        <div className="chordnote-info-row">
          {/* Quick Start */}
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <h3
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                marginBottom: "20px",
                letterSpacing: "-0.01em",
                color: theme.text,
              }}
            >
              Quick Start
            </h3>
            <ol
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {QUICK_START_STEPS.map((step, index) => (
                <li
                  key={step}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                    color: theme.textSecondary,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: chordColor,
                      color: contrastText,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      marginTop: "1px",
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ paddingTop: "2px" }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Features */}
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <h3
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                marginBottom: "20px",
                letterSpacing: "-0.01em",
                color: theme.text,
              }}
            >
              Features
            </h3>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {FEATURES.map((feature) => (
                <li
                  key={feature.title}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <Check
                    size={18}
                    style={{
                      flexShrink: 0,
                      marginTop: "2px",
                      color: chordColor,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: theme.text,
                      }}
                    >
                      {feature.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: theme.textMuted,
                        marginTop: "2px",
                        lineHeight: 1.5,
                      }}
                    >
                      {feature.description}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
