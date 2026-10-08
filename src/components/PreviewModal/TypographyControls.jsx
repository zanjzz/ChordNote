// src/components/PreviewModal/TypographyControls.jsx
import React from "react";
import { Minus, Plus, Type, Music, Mic2, Tag } from "lucide-react";
import StepBtn from "../StepBtn.jsx";
import SectionHeader from "./SectionHeader.jsx";

export default function TypographyControls(props) {
  const {
    textMutedColor,
    borderColor,
    inactiveBg,
    appTheme,
    adjustFont,
    // Title
    titleFontSize,
    setTitleFontSize,
    titleColor,
    setTitleColor,
    titleFont,
    setTitleFont,
    // Meta
    metaFontSize,
    setMetaFontSize,
    metaColor,
    setMetaColor,
    metaFont,
    setMetaFont,
    // Chord
    chordFontSize,
    setChordFontSize,
    chordColor, // still needed for chord font color picker? but not for UI controls
    setChordColor,
    chordFont,
    setChordFont,
    // Lyric
    lyricFontSize,
    setLyricFontSize,
    lyricColor,
    setLyricColor,
    lyricFont,
    setLyricFont,
    // Label
    labelFontSize,
    setLabelFontSize,
    labelColor,
    setLabelColor,
    labelFont,
    setLabelFont,
    showBrackets,
    setShowBrackets,
    // Chord Background
    showChordBg,
    setShowChordBg,
    chordBgColor,
    setChordBgColor,
    chordBgOpacity,
    setChordBgOpacity,
    chordBgPadding,
    setChordBgPadding,
    chordBgRadius,
    setChordBgRadius,
  } = props;

  const isDark = appTheme === "dark";
  const neutralText = isDark ? "#EDEAE3" : "#22221F";

  const themeObj = {
    border: borderColor,
    panel: inactiveBg,
    textSecondary: textMutedColor,
  };
  const bgColor = appTheme === "dark" ? "#181715" : "#FFFFFF";

  function renderRow(
    label,
    size,
    setSize,
    color,
    setColor,
    font,
    setFont,
    fontOptions,
    min,
    max,
  ) {
    const handleMinus = function () {
      adjustFont(setSize, -1, min, max);
    };
    const handlePlus = function () {
      adjustFont(setSize, 1, min, max);
    };
    const handleColor = function (e) {
      setColor(e.target.value);
    };
    const handleFont = function (e) {
      setFont(e.target.value);
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "13px" }}>{label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <StepBtn
              theme={themeObj}
              onClick={handleMinus}
              icon={<Minus size={12} />}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                width: "32px",
                textAlign: "center",
              }}
            >
              {size}
            </span>
            <StepBtn
              theme={themeObj}
              onClick={handlePlus}
              icon={<Plus size={12} />}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "11px", color: textMutedColor }}>
              Color
            </span>
            <input
              type="color"
              value={color}
              onChange={handleColor}
              style={{
                width: "100%",
                height: "32px",
                padding: 0,
                border: `1px solid ${borderColor}`,
                borderRadius: "6px",
                cursor: "pointer",
                background: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 2, minWidth: 0 }}>
            <span style={{ fontSize: "11px", color: textMutedColor }}>
              Font
            </span>
            <select
              value={font}
              onChange={handleFont}
              style={{
                width: "100%",
                marginTop: "2px",
                padding: "4px 6px",
                borderRadius: "6px",
                border: `1px solid ${borderColor}`,
                background: bgColor,
                color: appTheme === "dark" ? "#EDEAE3" : "#22221F",
                fontSize: "12px",
                outline: "none",
              }}
            >
              {fontOptions.map(function (opt) {
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
    );
  }

  function renderBgSlider(
    label,
    value,
    setter,
    min,
    max,
    step = 0.05,
    fixed = 2,
  ) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "4px",
        }}
      >
        <span style={{ fontSize: "12px", color: textMutedColor }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <StepBtn
            theme={themeObj}
            onClick={() => setter(Math.max(min, value - step))}
            icon={<Minus size={12} />}
          />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              width: "32px",
              textAlign: "center",
              color: appTheme === "dark" ? "#EDEAE3" : "#22221F",
            }}
          >
            {value.toFixed(fixed)}
          </span>
          <StepBtn
            theme={themeObj}
            onClick={() => setter(Math.min(max, value + step))}
            icon={<Plus size={12} />}
          />
        </div>
      </div>
    );
  }

  var fontOptions = [
    {
      value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      label: "Segoe UI",
    },
    { value: "'Arial', sans-serif", label: "Arial" },
    { value: "'Verdana', sans-serif", label: "Verdana" },
    { value: "'Times New Roman', Times, serif", label: "Times New Roman" },
    { value: "'Georgia', serif", label: "Georgia" },
    { value: "'Impact', Charcoal, sans-serif", label: "Impact" },
    { value: "'Courier New', Courier, monospace", label: "Courier New" },
    { value: "'Lucida Console', Monaco, monospace", label: "Lucida Console" },
  ];

  return (
    <div style={{ minWidth: 0 }}>
      {/* ---------- Title ---------- */}
      <SectionHeader color="#185FA5" mutedColor={textMutedColor} icon={Type}>
        Title
      </SectionHeader>
      {renderRow(
        "Size",
        titleFontSize,
        setTitleFontSize,
        titleColor,
        setTitleColor,
        titleFont,
        setTitleFont,
        fontOptions,
        10,
        44,
      )}

      {/* ---------- Meta ---------- */}
      <div style={{ marginTop: "20px" }}>
        {renderRow(
          "Meta",
          metaFontSize,
          setMetaFontSize,
          metaColor,
          setMetaColor,
          metaFont,
          setMetaFont,
          fontOptions,
          10,
          30,
        )}
      </div>

      {/* ---------- Chord ---------- */}
      <div style={{ marginTop: "28px", minWidth: 0 }}>
        <SectionHeader color="#B04A24" mutedColor={textMutedColor} icon={Music}>
          Chord
        </SectionHeader>
        {renderRow(
          "Size",
          chordFontSize,
          setChordFontSize,
          chordColor,
          setChordColor,
          chordFont,
          setChordFont,
          fontOptions.filter(function (f) {
            return f.value.includes("Courier") || f.value.includes("Lucida");
          }),
          8,
          26,
        )}

        {/* ---- Chord Highlight Settings ---- */}
        <div
          style={{
            marginTop: "10px",
            borderTop: `1px solid ${borderColor}`,
            paddingTop: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: textMutedColor,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Highlight
            </span>
            {/* 👇 Neutral button – uses neutralText for border/active */}
            <button
              onClick={() => setShowChordBg(!showChordBg)}
              style={{
                padding: "2px 10px",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "4px",
                border: `1px solid ${showChordBg ? neutralText : borderColor}`,
                background: showChordBg ? inactiveBg : "transparent",
                color: showChordBg ? neutralText : textMutedColor,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {showChordBg ? "ON" : "OFF"}
            </button>
          </div>

          {showChordBg && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: textMutedColor,
                  }}
                >
                  Color:
                </span>
                <input
                  type="color"
                  value={chordBgColor}
                  onChange={(e) => setChordBgColor(e.target.value)}
                  style={{
                    width: "28px",
                    height: "28px",
                    padding: 0,
                    border: `1px solid ${borderColor}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: "none",
                  }}
                />
              </div>
              {renderBgSlider(
                "Opacity",
                chordBgOpacity,
                setChordBgOpacity,
                0.05,
                1.0,
                0.05,
                2,
              )}
              {renderBgSlider(
                "Padding",
                chordBgPadding,
                setChordBgPadding,
                1,
                16,
                1,
                0,
              )}
              {renderBgSlider(
                "Radius",
                chordBgRadius,
                setChordBgRadius,
                0,
                20,
                1,
                0,
              )}
            </>
          )}
        </div>
      </div>

      {/* ---------- Lyrics ---------- */}
      <div style={{ marginTop: "28px", minWidth: 0 }}>
        <SectionHeader color="#534AB7" mutedColor={textMutedColor} icon={Mic2}>
          Lyrics
        </SectionHeader>
        {renderRow(
          "Size",
          lyricFontSize,
          setLyricFontSize,
          lyricColor,
          setLyricColor,
          lyricFont,
          setLyricFont,
          fontOptions,
          8,
          26,
        )}
      </div>

      {/* ---------- Labels ---------- */}
      <div style={{ marginTop: "28px", minWidth: 0 }}>
        <SectionHeader color="#2E9E4F" mutedColor={textMutedColor} icon={Tag}>
          Labels
        </SectionHeader>
        {renderRow(
          "Size",
          labelFontSize,
          setLabelFontSize,
          labelColor,
          setLabelColor,
          labelFont,
          setLabelFont,
          fontOptions,
          8,
          26,
        )}
        {/* 👇 Neutral Brackets button */}
        <button
          onClick={function () {
            setShowBrackets(function (prev) {
              return !prev;
            });
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px 12px",
            borderRadius: "6px",
            border: showBrackets
              ? `2px solid ${neutralText}`
              : `1px solid ${borderColor}`,
            background: showBrackets ? inactiveBg : "transparent",
            color: showBrackets ? neutralText : textMutedColor,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 500,
            transition: "all 0.2s",
            marginTop: "4px",
            width: "100%",
          }}
        >
          {showBrackets ? "Brackets: ON" : "Brackets: OFF"}
        </button>
      </div>
    </div>
  );
}
