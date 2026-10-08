// src/components/PreviewModal/ToolsSidebar.jsx
import React from "react";
import SectionHeader from "./SectionHeader.jsx";
import TypographyControls from "./TypographyControls.jsx";
import SpacingControls from "./SpacingControls.jsx";
import LayoutControls from "./LayoutControls.jsx";
import CanvasControls from "./CanvasControls.jsx";
import ModeControls from "./ModeControls.jsx";
import ExportControls from "./ExportControls.jsx";

export default function ToolsSidebar(props) {
  const {
    isMobile,
    appTheme,
    borderColor,
    panelBg,
    textColor,
    textMutedColor,
    activeBg,
    inactiveBg,
    // Typography - Title
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
    metaLyricsGap,
    setMetaLyricsGap,
    // Typography - Chord
    chordFontSize,
    setChordFontSize,
    chordColor,
    setChordColor,
    chordFont,
    setChordFont,
    // Typography - Lyric
    lyricFontSize,
    setLyricFontSize,
    lyricColor,
    setLyricColor,
    lyricFont,
    setLyricFont,
    // Typography - Label
    labelFontSize,
    setLabelFontSize,
    labelColor,
    setLabelColor,
    labelFont,
    setLabelFont,
    showBrackets,
    setShowBrackets,
    adjustFont,
    // Spacing
    lineHeight,
    setLineHeight,
    labelSpacing,
    setLabelSpacing,
    paddingSize,
    setPaddingSize,
    blockSpacing,
    setBlockSpacing,
    // Layout
    columns,
    setColumns,
    alignment,
    setAlignment,
    // Canvas
    canvasTheme,
    setCanvasTheme,
    customCanvasColor,
    setCustomCanvasColor,
    // Mode
    showChords,
    setShowChords,
    // Export
    exporting,
    handleExport,
    handlePDFExport,
    handlePrint,
    pageRanges,
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
    // Chord Spacing
    chordSpacing,
    setChordSpacing,
  } = props;

  return (
    <div
      style={{
        flex: isMobile ? "none" : 4.5,
        minWidth: isMobile ? "100%" : "320px",
        minHeight: 0,
        flexShrink: 0,
        borderLeft: isMobile ? "none" : `1px solid ${borderColor}`,
        padding: isMobile ? "16px 16px 32px 16px" : "20px 16px 32px 16px",
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "auto" : "100%",
        maxHeight: isMobile ? "50vh" : "none",
        overflowY: "hidden",
        overflowX: "hidden",
        background: appTheme === "dark" ? "#221F1C" : "#FFFFFF",
        color: textColor,
        borderTop: isMobile ? `1px solid ${borderColor}` : "none",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          fontSize: "16px",
          fontWeight: 700,
          marginBottom: "12px",
          display: isMobile ? "none" : "block",
        }}
      >
        Preview
      </span>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          background: panelBg,
          borderRadius: "12px",
          padding: "16px 14px",
          overflowY: "auto",
          overflowX: "hidden",
          marginBottom: "12px",
          minHeight: 0,
          boxSizing: "border-box",
        }}
      >
        <TypographyControls
          textMutedColor={textMutedColor}
          borderColor={borderColor}
          inactiveBg={inactiveBg}
          appTheme={appTheme}
          adjustFont={adjustFont}
          // Title
          titleFontSize={titleFontSize}
          setTitleFontSize={setTitleFontSize}
          titleColor={titleColor}
          setTitleColor={setTitleColor}
          titleFont={titleFont}
          setTitleFont={setTitleFont}
          // Meta
          metaFontSize={metaFontSize}
          setMetaFontSize={setMetaFontSize}
          metaColor={metaColor}
          setMetaColor={setMetaColor}
          metaFont={metaFont}
          setMetaFont={setMetaFont}
          // Chord
          chordFontSize={chordFontSize}
          setChordFontSize={setChordFontSize}
          chordColor={chordColor}
          setChordColor={setChordColor}
          chordFont={chordFont}
          setChordFont={setChordFont}
          // Lyric
          lyricFontSize={lyricFontSize}
          setLyricFontSize={setLyricFontSize}
          lyricColor={lyricColor}
          setLyricColor={setLyricColor}
          lyricFont={lyricFont}
          setLyricFont={setLyricFont}
          // Label
          labelFontSize={labelFontSize}
          setLabelFontSize={setLabelFontSize}
          labelColor={labelColor}
          setLabelColor={setLabelColor}
          labelFont={labelFont}
          setLabelFont={setLabelFont}
          showBrackets={showBrackets}
          setShowBrackets={setShowBrackets}
          // Chord Background
          showChordBg={showChordBg}
          setShowChordBg={setShowChordBg}
          chordBgColor={chordBgColor}
          setChordBgColor={setChordBgColor}
          chordBgOpacity={chordBgOpacity}
          setChordBgOpacity={setChordBgOpacity}
          chordBgPadding={chordBgPadding}
          setChordBgPadding={setChordBgPadding}
          chordBgRadius={chordBgRadius}
          setChordBgRadius={setChordBgRadius}
        />

        <SpacingControls
          textMutedColor={textMutedColor}
          borderColor={borderColor}
          inactiveBg={inactiveBg}
          lineHeight={lineHeight}
          setLineHeight={setLineHeight}
          labelSpacing={labelSpacing}
          setLabelSpacing={setLabelSpacing}
          paddingSize={paddingSize}
          setPaddingSize={setPaddingSize}
          blockSpacing={blockSpacing}
          setBlockSpacing={setBlockSpacing}
          metaLyricsGap={metaLyricsGap}
          setMetaLyricsGap={setMetaLyricsGap}
          chordSpacing={chordSpacing}
          setChordSpacing={setChordSpacing}
        />

        <LayoutControls
          chordColor={chordColor}
          columns={columns}
          setColumns={setColumns}
          alignment={alignment}
          setAlignment={setAlignment}
          appTheme={appTheme}
          textMutedColor={textMutedColor}
        />

        <CanvasControls
          canvasTheme={canvasTheme}
          setCanvasTheme={setCanvasTheme}
          customCanvasColor={customCanvasColor}
          setCustomCanvasColor={setCustomCanvasColor}
          chordColor={chordColor}
          borderColor={borderColor}
          activeBg={activeBg}
          inactiveBg={inactiveBg}
          textMutedColor={textMutedColor}
          appTheme={appTheme}
        />

        <ModeControls
          showChords={showChords}
          setShowChords={setShowChords}
          chordColor={chordColor}
          borderColor={borderColor}
          activeBg={activeBg}
          inactiveBg={inactiveBg}
          textMutedColor={textMutedColor}
          theme={appTheme}
        />
      </div>

      <ExportControls
        exporting={exporting}
        handleExport={handleExport}
        handlePDFExport={handlePDFExport}
        handlePrint={handlePrint}
        pageRanges={pageRanges}
        textMutedColor={textMutedColor}
        borderColor={borderColor}
        appTheme={appTheme}
        textColor={textColor}
      />
    </div>
  );
}
