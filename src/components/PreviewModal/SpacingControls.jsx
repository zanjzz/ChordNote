// src/components/PreviewModal/SpacingControls.jsx
import React from "react";
import { Minus, Plus } from "lucide-react";
import StepBtn from "../StepBtn.jsx";
import SectionHeader from "./SectionHeader.jsx";

export default function SpacingControls({
  textMutedColor,
  borderColor,
  inactiveBg,
  lineHeight,
  setLineHeight,
  labelSpacing,
  setLabelSpacing,
  paddingSize,
  setPaddingSize,
  blockSpacing,
  setBlockSpacing,
}) {
  const themeObj = {
    border: borderColor,
    panel: inactiveBg,
    textSecondary: textMutedColor,
  };

  const renderSlider = (
    label,
    value,
    setter,
    step = 0.1,
    min = 0.2,
    max = 3.0,
    fixed = 1,
  ) => (
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
          onClick={() =>
            setter((v) => Math.max(min, +(v - step).toFixed(fixed)))
          }
          icon={<Minus size={12} />}
        />
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            width: "36px",
            textAlign: "center",
          }}
        >
          {value.toFixed(fixed)}
        </span>
        <StepBtn
          theme={themeObj}
          onClick={() =>
            setter((v) => Math.min(max, +(v + step).toFixed(fixed)))
          }
          icon={<Plus size={12} />}
        />
      </div>
    </div>
  );

  return (
    <div style={{ minWidth: 0 }}>
      <SectionHeader color="#993556" mutedColor={textMutedColor}>
        Spacing
      </SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/*
          👇 Same min/max/default values as before (untouched, per request)
          — only the step size and displayed precision changed, so the
          +/- buttons move in finer increments instead of jumping by a
          full 0.1 (or 10px for padding) each click.
        */}
        {renderSlider(
          "Line height",
          lineHeight,
          setLineHeight,
          0.05,
          1.0,
          2.0,
          2,
        )}
        {renderSlider(
          "Label spacing",
          labelSpacing,
          setLabelSpacing,
          0.05,
          0.2,
          3.0,
          2,
        )}
        {renderSlider("Padding", paddingSize, setPaddingSize, 5, 80, 250, 0)}
        {renderSlider(
          "Block spacing",
          blockSpacing,
          setBlockSpacing,
          0.05,
          0.2,
          3.0,
          2,
        )}
      </div>
    </div>
  );
}
