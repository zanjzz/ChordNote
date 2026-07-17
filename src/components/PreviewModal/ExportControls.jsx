// src/components/PreviewModal/ExportControls.jsx
import React from "react";
import { Image, FileText, Loader2 } from "lucide-react";
import SectionHeader from "./SectionHeader.jsx";

export default function ExportControls({
  exporting,
  handleExport,
  handlePDFExport,
  pageRanges,
  textMutedColor,
  borderColor,
  appTheme,
  textColor,
}) {
  const exportBtnStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 8px",
    borderRadius: "8px",
    border: `1px solid ${borderColor}`,
    background: appTheme === "dark" ? "#2C2A26" : "#FFFFFF",
    color: textColor,
    fontSize: "13px",
    fontWeight: 600,
    cursor: active ? "not-allowed" : "pointer",
    opacity: active ? 0.6 : 1,
    transition: "all 0.2s ease",
    width: "100%",
    minWidth: 0,
  });

  return (
    <div
      style={{
        borderTop: `1px solid ${borderColor}`,
        paddingTop: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flex: "0 0 auto",
        minWidth: 0,
      }}
    >
      <SectionHeader
        color="#C2410C"
        mutedColor={textMutedColor}
        fontSize="10px"
      >
        Export {pageRanges.length > 1 ? `(${pageRanges.length} pages)` : "as"}
      </SectionHeader>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        <button
          onClick={() => handleExport("image/png", "png")}
          disabled={!!exporting}
          style={exportBtnStyle(exporting === "png")}
        >
          {exporting === "png" ? (
            <Loader2 size={16} className="chord-spin" />
          ) : (
            <Image size={16} />
          )}{" "}
          PNG
        </button>
        <button
          onClick={() => handleExport("image/jpeg", "jpg")}
          disabled={!!exporting}
          style={exportBtnStyle(exporting === "jpg")}
        >
          {exporting === "jpg" ? (
            <Loader2 size={16} className="chord-spin" />
          ) : (
            <Image size={16} />
          )}{" "}
          JPG
        </button>
        <button
          onClick={handlePDFExport}
          disabled={!!exporting}
          style={exportBtnStyle(exporting === "pdf")}
        >
          {exporting === "pdf" ? (
            <Loader2 size={16} className="chord-spin" />
          ) : (
            <FileText size={16} />
          )}{" "}
          PDF
        </button>
      </div>
    </div>
  );
}
