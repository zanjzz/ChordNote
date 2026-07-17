// src/components/PreviewModal/LayoutControls.jsx
import React from "react";
import { Columns, Columns2, AlignLeft, AlignCenter } from "lucide-react";
import ToggleBtn from "../ToggleBtn.jsx";
import SectionHeader from "./SectionHeader.jsx";

export default function LayoutControls({
  chordColor, // kept for compatibility
  columns,
  setColumns,
  alignment,
  setAlignment,
  appTheme,
}) {
  const alignDisabled = columns === 2;

  const isDark = appTheme === "dark";
  const bgColor = isDark ? "#2C2A26" : "#F0EEE8";
  const activeBgColor = isDark ? "#3A3530" : "#E1F5EE";
  const textColor = isDark ? "#EDEAE3" : "#22221F";
  const textMutedColor = isDark ? "#78746A" : "#9A9689";

  return (
    <div style={{ minWidth: 0 }}>
      <SectionHeader color="#0F6E56" mutedColor={textMutedColor}>
        Layout
      </SectionHeader>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "4px",
          width: "100%",
        }}
      >
        <ToggleBtn
          chordColor={chordColor}
          active={columns === 1}
          onClick={() => setColumns(1)}
          icon={<Columns size={16} />}
          label="1 col"
          theme={appTheme}
          style={{ width: "100%" }}
          bgColor={bgColor}
          activeBgColor={activeBgColor}
          textColor={textColor}
          textMutedColor={textMutedColor}
        />
        <ToggleBtn
          chordColor={chordColor}
          active={columns === 2}
          onClick={() => setColumns(2)}
          icon={<Columns2 size={16} />}
          label="2 col"
          theme={appTheme}
          style={{ width: "100%" }}
          bgColor={bgColor}
          activeBgColor={activeBgColor}
          textColor={textColor}
          textMutedColor={textMutedColor}
        />

        <div
          style={{
            minWidth: 0,
            opacity: alignDisabled ? 0.4 : 1,
            pointerEvents: alignDisabled ? "none" : "auto",
            transition: "opacity 0.2s",
          }}
          title={
            alignDisabled ? "Only available for 1 column layout" : undefined
          }
        >
          <ToggleBtn
            chordColor={chordColor}
            active={alignment === "left"}
            onClick={() => setAlignment("left")}
            icon={<AlignLeft size={16} />}
            label="Left"
            theme={appTheme}
            style={{ width: "100%" }}
            bgColor={bgColor}
            activeBgColor={activeBgColor}
            textColor={textColor}
            textMutedColor={textMutedColor}
          />
        </div>

        <div
          style={{
            minWidth: 0,
            opacity: alignDisabled ? 0.4 : 1,
            pointerEvents: alignDisabled ? "none" : "auto",
            transition: "opacity 0.2s",
          }}
          title={
            alignDisabled ? "Only available for 1 column layout" : undefined
          }
        >
          <ToggleBtn
            chordColor={chordColor}
            active={alignment === "center"}
            onClick={() => setAlignment("center")}
            icon={<AlignCenter size={16} />}
            label="Center"
            theme={appTheme}
            style={{ width: "100%" }}
            bgColor={bgColor}
            activeBgColor={activeBgColor}
            textColor={textColor}
            textMutedColor={textMutedColor}
          />
        </div>
      </div>
    </div>
  );
}
