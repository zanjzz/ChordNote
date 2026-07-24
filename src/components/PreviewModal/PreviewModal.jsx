import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { X, Check } from "lucide-react";

// Import local components
import CanvasPreview from "./CanvasPreview.jsx";
import ToolsSidebar from "./ToolsSidebar.jsx";

const NAV_DEBOUNCE_MS = 90;
const FONT_DEBOUNCE_MS = 150;

const scheduleIdle =
  typeof window !== "undefined" && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 60);
const cancelIdle =
  typeof window !== "undefined" && window.cancelIdleCallback
    ? window.cancelIdleCallback
    : clearTimeout;

export default function PreviewModal({
  showPreview,
  setShowPreview,
  lines,
  chords,
  fontSize,
  setFontSize,
  PREVIEW_MIN,
  PREVIEW_MAX,
  clamp,
  columns,
  setColumns,
  alignment,
  setAlignment,
  chordColor,
  setChordColor,
  title,
  author,
  musicKey,
  bpm,
  capo,
  downloadPages,
  generatePages,
  appTheme,
  chordDisplayMode,
}) {
  // ---- State ----
  const [lineHeight, setLineHeight] = useState(1.3);
  const [metaLyricsGap, setMetaLyricsGap] = useState(1.0);
  const [paddingSize, setPaddingSize] = useState(130);
  const [canvasTheme, setCanvasTheme] = useState("light");
  const [customCanvasColor, setCustomCanvasColor] = useState("#FDFCFA");
  const [showChords, setShowChords] = useState(true);
  const [showBrackets, setShowBrackets] = useState(true);
  const [labelSpacing, setLabelSpacing] = useState(1.0);
  const [blockSpacing, setBlockSpacing] = useState(1.0);

  const [titleFontSize, setTitleFontSize] = useState(24);
  const [titleColor, setTitleColor] = useState("#22221F");
  const [titleFont, setTitleFont] = useState(
    "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  );

  const [metaFontSize, setMetaFontSize] = useState(15);
  const [metaColor, setMetaColor] = useState("#77746A");
  const [metaFont, setMetaFont] = useState(
    "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  );

  const [chordFontSize, setChordFontSize] = useState(15);
  const [chordFont, setChordFont] = useState(
    "'Courier New', Courier, monospace",
  );
  const [lyricFontSize, setLyricFontSize] = useState(15);
  const [lyricColor, setLyricColor] = useState("#22221F");
  const [lyricFont, setLyricFont] = useState(
    "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  );
  const [labelFontSize, setLabelFontSize] = useState(12);
  const [labelColor, setLabelColor] = useState("#77746A");
  const [labelFont, setLabelFont] = useState(
    "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  );

  const [showChordBg, setShowChordBg] = useState(true);
  const [chordBgColor, setChordBgColor] = useState("#0F6E56");
  const [chordBgOpacity, setChordBgOpacity] = useState(0.15);
  const [chordBgPadding, setChordBgPadding] = useState(4);
  const [chordBgRadius, setChordBgRadius] = useState(4);

  const [pageRanges, setPageRanges] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [displayFontSize, setDisplayFontSize] = useState(fontSize);

  const [downloadFeedback, setDownloadFeedback] = useState(null); // e.g. "PDF", "PNG", "JPG"
  const downloadFeedbackTimeoutRef = useRef(null);

  const idleHandleRef = useRef(null);
  const helpersRef = useRef(null);
  const cacheRef = useRef(new Map());

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => setDisplayFontSize(fontSize), [fontSize]);

  const adjustFont = (setter, delta, min = 8, max = 40) => {
    setter((v) => clamp(v + delta, min, max));
  };

  const changePage = useCallback(
    (newPage) => {
      setCurrentPage((prev) => {
        const clamped = Math.max(0, Math.min(pageRanges.length - 1, newPage));
        return clamped;
      });
    },
    [pageRanges.length],
  );

  useEffect(() => {
    return () => {
      if (idleHandleRef.current) cancelIdle(idleHandleRef.current);
      if (downloadFeedbackTimeoutRef.current)
        clearTimeout(downloadFeedbackTimeoutRef.current);
    };
  }, []);

  const showDownloadFeedback = (label) => {
    if (downloadFeedbackTimeoutRef.current)
      clearTimeout(downloadFeedbackTimeoutRef.current);
    setDownloadFeedback(label);
    downloadFeedbackTimeoutRef.current = setTimeout(() => {
      setDownloadFeedback(null);
    }, 2800);
  };

  const settingsKey = useMemo(
    () =>
      JSON.stringify([
        fontSize,
        lineHeight,
        metaLyricsGap,
        paddingSize,
        canvasTheme,
        customCanvasColor,
        showChords,
        showBrackets,
        blockSpacing,
        labelSpacing,
        columns,
        alignment,
        title,
        author,
        musicKey,
        bpm,
        capo,
        chordColor,
        lines,
        chords,
        titleFontSize,
        titleColor,
        titleFont,
        metaFontSize,
        metaColor,
        metaFont,
        chordFontSize,
        chordFont,
        lyricFontSize,
        lyricColor,
        lyricFont,
        labelFontSize,
        labelColor,
        labelFont,
        chordDisplayMode,
        showChordBg,
        chordBgColor,
        chordBgOpacity,
        chordBgPadding,
        chordBgRadius,
      ]),
    [
      lines,
      chords,
      fontSize,
      lineHeight,
      metaLyricsGap,
      paddingSize,
      canvasTheme,
      customCanvasColor,
      showChords,
      showBrackets,
      blockSpacing,
      labelSpacing,
      columns,
      alignment,
      title,
      author,
      musicKey,
      bpm,
      capo,
      chordColor,
      titleFontSize,
      titleColor,
      titleFont,
      metaFontSize,
      metaColor,
      metaFont,
      chordFontSize,
      chordFont,
      lyricFontSize,
      lyricColor,
      lyricFont,
      labelFontSize,
      labelColor,
      labelFont,
      chordDisplayMode,
      showChordBg,
      chordBgColor,
      chordBgOpacity,
      chordBgPadding,
      chordBgRadius,
    ],
  );

  useEffect(() => {
    if (!showPreview) return;
    let cancelled = false;

    (async () => {
      if (!helpersRef.current) {
        helpersRef.current = await import("../../utils/canvasHelpers.js");
      }
      if (cancelled) return;

      cacheRef.current = new Map();
      const ranges = generatePages({
        lines,
        chords,
        fontSize,
        author,
        musicKey,
        bpm,
        capo,
        columns,
        lineHeight,
        metaLyricsGap,
        paddingSize,
        canvasTheme,
        customCanvasColor,
        showChords,
        showBrackets,
        blockSpacing,
        labelSpacing,
        titleFontSize,
        titleColor,
        titleFont,
        metaFontSize,
        metaColor,
        metaFont,
        chordFontSize,
        chordFont,
        lyricFontSize,
        lyricColor,
        lyricFont,
        labelFontSize,
        labelColor,
        labelFont,
        chordDisplayMode,
        showChordBg,
        chordBgColor,
        chordBgOpacity,
        chordBgPadding,
        chordBgRadius,
      });
      setPageRanges(ranges);
      setCurrentPage((prev) => (prev >= ranges.length ? 0 : prev));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, settingsKey]);

  const currentCanvas = useMemo(() => {
    if (!showPreview || !helpersRef.current || !pageRanges.length) return null;
    const { buildSingleCanvas } = helpersRef.current;
    const range = pageRanges[currentPage];
    if (!range) return null;

    return buildSingleCanvas({
      lines,
      chords,
      fontSize,
      columns,
      alignment,
      title,
      author,
      musicKey,
      bpm,
      capo,
      chordColor,
      startLine: range.start,
      endLine: range.end,
      pageNum: currentPage,
      totalPages: pageRanges.length,
      lineHeight,
      metaLyricsGap,
      paddingSize,
      canvasTheme,
      customCanvasColor,
      showChords,
      showBrackets,
      blockSpacing,
      labelSpacing,
      titleFontSize,
      titleColor,
      titleFont,
      metaFontSize,
      metaColor,
      metaFont,
      chordFontSize,
      chordFont,
      lyricFontSize,
      lyricColor,
      lyricFont,
      labelFontSize,
      labelColor,
      labelFont,
      chordDisplayMode,
      showChordBg,
      chordBgColor,
      chordBgOpacity,
      chordBgPadding,
      chordBgRadius,
    });
  }, [showPreview, pageRanges, currentPage, settingsKey]);

  useEffect(() => {
    if (!showPreview || !helpersRef.current || !pageRanges.length) return;
    const { buildSingleCanvas } = helpersRef.current;
    const cache = cacheRef.current;

    if (idleHandleRef.current) cancelIdle(idleHandleRef.current);
    let nextIdx = 0;
    const step = (deadline) => {
      while (
        nextIdx < pageRanges.length &&
        (deadline.timeRemaining ? deadline.timeRemaining() > 0 : true)
      ) {
        if (!cache.has(nextIdx) && nextIdx !== currentPage) {
          const range = pageRanges[nextIdx];
          const canvas = buildSingleCanvas({
            lines,
            chords,
            fontSize,
            columns,
            alignment,
            title,
            author,
            musicKey,
            bpm,
            capo,
            chordColor,
            startLine: range.start,
            endLine: range.end,
            pageNum: nextIdx,
            totalPages: pageRanges.length,
            lineHeight,
            metaLyricsGap,
            paddingSize,
            canvasTheme,
            customCanvasColor,
            showChords,
            showBrackets,
            blockSpacing,
            labelSpacing,
            titleFontSize,
            titleColor,
            titleFont,
            metaFontSize,
            metaColor,
            metaFont,
            chordFontSize,
            chordFont,
            lyricFontSize,
            lyricColor,
            lyricFont,
            labelFontSize,
            labelColor,
            labelFont,
            chordDisplayMode,
            showChordBg,
            chordBgColor,
            chordBgOpacity,
            chordBgPadding,
            chordBgRadius,
          });
          cache.set(nextIdx, canvas);
        }
        nextIdx++;
      }
      if (nextIdx < pageRanges.length) {
        idleHandleRef.current = scheduleIdle(step);
      }
    };
    idleHandleRef.current = scheduleIdle(step);

    return () => {
      if (idleHandleRef.current) cancelIdle(idleHandleRef.current);
    };
  }, [showPreview, pageRanges, currentPage, settingsKey]);

  const toggleZoom = () => setZoomed((prev) => !prev);
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && zoomed) setZoomed(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [zoomed]);

  const handleExport = async (mime, ext) => {
    if (exporting) return;
    setExporting(ext);
    try {
      await downloadPages({
        pages: generatePages({
          lines,
          chords,
          fontSize,
          author,
          musicKey,
          bpm,
          capo,
          columns,
          lineHeight,
          metaLyricsGap,
          paddingSize,
          canvasTheme,
          customCanvasColor,
          showChords,
          showBrackets,
          blockSpacing,
          labelSpacing,
          titleFontSize,
          titleColor,
          titleFont,
          metaFontSize,
          metaColor,
          metaFont,
          chordFontSize,
          chordFont,
          lyricFontSize,
          lyricColor,
          lyricFont,
          labelFontSize,
          labelColor,
          labelFont,
          chordDisplayMode,
          showChordBg,
          chordBgColor,
          chordBgOpacity,
          chordBgPadding,
          chordBgRadius,
        }),
        title,
        lines,
        chords,
        fontSize,
        columns,
        alignment,
        author,
        musicKey,
        bpm,
        capo,
        chordColor,
        mime,
        ext,
        lineHeight,
        metaLyricsGap,
        paddingSize,
        canvasTheme,
        customCanvasColor,
        showChords,
        showBrackets,
        blockSpacing,
        labelSpacing,
        titleFontSize,
        titleColor,
        titleFont,
        metaFontSize,
        metaColor,
        metaFont,
        chordFontSize,
        chordFont,
        lyricFontSize,
        lyricColor,
        lyricFont,
        labelFontSize,
        labelColor,
        labelFont,
        chordDisplayMode,
        showChordBg,
        chordBgColor,
        chordBgOpacity,
        chordBgPadding,
        chordBgRadius,
      });
      showDownloadFeedback(ext.toUpperCase());
    } finally {
      setExporting(null);
    }
  };

  const handlePDFExport = async () => {
    if (exporting) return;
    setExporting("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const pages = generatePages({
        lines,
        chords,
        fontSize,
        author,
        musicKey,
        bpm,
        capo,
        columns,
        lineHeight,
        metaLyricsGap,
        paddingSize,
        canvasTheme,
        customCanvasColor,
        showChords,
        showBrackets,
        blockSpacing,
        labelSpacing,
        titleFontSize,
        titleColor,
        titleFont,
        metaFontSize,
        metaColor,
        metaFont,
        chordFontSize,
        chordFont,
        lyricFontSize,
        lyricColor,
        lyricFont,
        labelFontSize,
        labelColor,
        labelFont,
        chordDisplayMode,
        showChordBg,
        chordBgColor,
        chordBgOpacity,
        chordBgPadding,
        chordBgRadius,
      });
      const { buildSingleCanvas } = helpersRef.current;
      const pdf = new jsPDF("p", "px", "letter");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const canvas = buildSingleCanvas({
          lines,
          chords,
          fontSize,
          columns,
          alignment,
          title,
          author,
          musicKey,
          bpm,
          capo,
          chordColor,
          startLine: pages[i].start,
          endLine: pages[i].end,
          pageNum: i,
          totalPages: pages.length,
          lineHeight,
          metaLyricsGap,
          paddingSize,
          canvasTheme,
          customCanvasColor,
          showChords,
          showBrackets,
          blockSpacing,
          labelSpacing,
          titleFontSize,
          titleColor,
          titleFont,
          metaFontSize,
          metaColor,
          metaFont,
          chordFontSize,
          chordFont,
          lyricFontSize,
          lyricColor,
          lyricFont,
          labelFontSize,
          labelColor,
          labelFont,
          chordDisplayMode,
          showChordBg,
          chordBgColor,
          chordBgOpacity,
          chordBgPadding,
          chordBgRadius,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      }
      const safeTitle = (title || "chord-sheet").replace(/[/\\?%*:|"<>]/g, "-");
      pdf.save(`${safeTitle}.pdf`);
      showDownloadFeedback("PDF");
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  if (!showPreview) return null;

  const modalBg = appTheme === "dark" ? "#181715" : "#FDFCFA";
  const borderColor = appTheme === "dark" ? "#3B3833" : "#E5E2D9";
  const panelBg = appTheme === "dark" ? "#1F1C19" : "#F8F6F2";
  const textColor = appTheme === "dark" ? "#EDEAE3" : "#22221F";
  const textMutedColor = appTheme === "dark" ? "#A8A398" : "#77746A";
  const activeBg = appTheme === "dark" ? "#3A3530" : "#E1F5EE";
  const inactiveBg = appTheme === "dark" ? "#2C2A26" : "#FFFFFF";

  return (
    <>
      {downloadFeedback && (
        <div
          className="chord-download-toast"
          style={{
            position: "fixed",
            left: "50%",
            bottom: isMobile ? "28px" : "36px",
            transform: "translateX(-50%)",
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: panelBg,
            color: textColor,
            border: `1px solid ${borderColor}`,
            padding: "12px 18px",
            borderRadius: "12px",
            boxShadow:
              appTheme === "dark"
                ? "0 8px 24px rgba(0,0,0,0.5)"
                : "0 8px 24px rgba(0,0,0,0.18)",
            fontSize: "14px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: textColor,
              flexShrink: 0,
            }}
          >
            <Check size={13} color={panelBg} strokeWidth={3} />
          </span>
          {downloadFeedback} downloaded
        </div>
      )}

      {zoomed && currentCanvas && (
        <div
          onClick={toggleZoom}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            cursor: "zoom-out",
            padding: "24px",
          }}
        >
          <canvas
            ref={(el) => {
              if (el && currentCanvas) {
                const maxWidth = window.innerWidth * 0.9;
                const maxHeight = window.innerHeight * 0.9;
                const scale = Math.min(
                  maxWidth / currentCanvas.width,
                  maxHeight / currentCanvas.height,
                );
                // 👇 Same HiDPI fix as the main preview canvas — render
                // at device-pixel resolution instead of CSS-pixel
                // resolution so the zoomed-in view (where blur is most
                // visible) is actually sharp.
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const displayWidth = currentCanvas.width * scale;
                const displayHeight = currentCanvas.height * scale;
                el.width = displayWidth * dpr;
                el.height = displayHeight * dpr;
                el.style.width = `${displayWidth}px`;
                el.style.height = `${displayHeight}px`;
                const ctx = el.getContext("2d");
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.scale(scale * dpr, scale * dpr);
                ctx.drawImage(currentCanvas, 0, 0);
              }
            }}
            style={{
              maxWidth: "95vw",
              maxHeight: "95vh",
              borderRadius: "8px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}

      <div
        className="chord-preview-overlay"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20, 19, 16, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          padding: "16px",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          className="chord-print-content chord-preview-inner"
          style={{
            background: modalBg,
            height: isMobile ? "auto" : "88vh",
            maxHeight: isMobile ? "96vh" : "88vh",
            maxWidth: isMobile ? "100%" : "1100px",
            width: "100%",
            overflowX: "hidden",
            overflowY: isMobile ? "auto" : "hidden",
            borderRadius: "14px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            position: "relative",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            boxSizing: "border-box",
          }}
        >
          <button
            onClick={() => setShowPreview(false)}
            className="chord-close-btn"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isMobile
                ? appTheme === "dark"
                  ? "rgba(34,31,28,0.85)"
                  : "rgba(255,255,255,0.85)"
                : "none",
              border: "none",
              color: appTheme === "dark" ? "#A8A398" : "#77746A",
              cursor: "pointer",
              borderRadius: "50%",
              zIndex: 3,
              transition:
                "background-color 0.18s cubic-bezier(0.4, 0, 0.2, 1), color 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                appTheme === "dark" ? "#3B3833" : "#EBE9E2";
              e.currentTarget.style.color = textColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color =
                appTheme === "dark" ? "#A8A398" : "#77746A";
            }}
          >
            <X size={22} />
          </button>

          <CanvasPreview
            currentCanvas={currentCanvas}
            pageRanges={pageRanges}
            currentPage={currentPage}
            changePage={changePage}
            toggleZoom={toggleZoom}
            canvasTheme={canvasTheme}
            customCanvasColor={customCanvasColor}
            isMobile={isMobile}
            appTheme={appTheme}
            borderColor={borderColor}
          />

          <ToolsSidebar
            isMobile={isMobile}
            appTheme={appTheme}
            borderColor={borderColor}
            panelBg={panelBg}
            textColor={textColor}
            textMutedColor={textMutedColor}
            activeBg={activeBg}
            inactiveBg={inactiveBg}
            titleFontSize={titleFontSize}
            setTitleFontSize={setTitleFontSize}
            titleColor={titleColor}
            setTitleColor={setTitleColor}
            titleFont={titleFont}
            setTitleFont={setTitleFont}
            metaFontSize={metaFontSize}
            setMetaFontSize={setMetaFontSize}
            metaColor={metaColor}
            setMetaColor={setMetaColor}
            metaFont={metaFont}
            setMetaFont={setMetaFont}
            metaLyricsGap={metaLyricsGap}
            setMetaLyricsGap={setMetaLyricsGap}
            chordFontSize={chordFontSize}
            setChordFontSize={setChordFontSize}
            chordColor={chordColor}
            setChordColor={setChordColor}
            chordFont={chordFont}
            setChordFont={setChordFont}
            lyricFontSize={lyricFontSize}
            setLyricFontSize={setLyricFontSize}
            lyricColor={lyricColor}
            setLyricColor={setLyricColor}
            lyricFont={lyricFont}
            setLyricFont={setLyricFont}
            labelFontSize={labelFontSize}
            setLabelFontSize={setLabelFontSize}
            labelColor={labelColor}
            setLabelColor={setLabelColor}
            labelFont={labelFont}
            setLabelFont={setLabelFont}
            showBrackets={showBrackets}
            setShowBrackets={setShowBrackets}
            adjustFont={adjustFont}
            lineHeight={lineHeight}
            setLineHeight={setLineHeight}
            labelSpacing={labelSpacing}
            setLabelSpacing={setLabelSpacing}
            paddingSize={paddingSize}
            setPaddingSize={setPaddingSize}
            blockSpacing={blockSpacing}
            setBlockSpacing={setBlockSpacing}
            columns={columns}
            setColumns={setColumns}
            alignment={alignment}
            setAlignment={setAlignment}
            canvasTheme={canvasTheme}
            setCanvasTheme={setCanvasTheme}
            customCanvasColor={customCanvasColor}
            setCustomCanvasColor={setCustomCanvasColor}
            showChords={showChords}
            setShowChords={setShowChords}
            exporting={exporting}
            handleExport={handleExport}
            handlePDFExport={handlePDFExport}
            pageRanges={pageRanges}
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
        </div>
      </div>

      <style>{`
        .chord-spin { animation: chord-spin-anim 0.8s linear infinite; }
        @keyframes chord-spin-anim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .chord-download-toast {
          animation: chord-toast-in 0.22s cubic-bezier(0.4, 0, 0.2, 1),
            chord-toast-out 0.25s cubic-bezier(0.4, 0, 0.2, 1) 2.5s forwards;
        }
        @keyframes chord-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes chord-toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(8px); }
        }
        @media print {
          .chord-preview-overlay { background: none !important; padding: 0 !important; }
          .chord-preview-inner { box-shadow: none !important; border-radius: 0 !important; height: auto !important; max-height: none !important; max-width: 100% !important; flex-direction: column !important; }
          .chord-preview-inner > div:last-child { display: none !important; }
          .chord-preview-inner > div:first-child { padding: 20px !important; border: none !important; background: #FDFCFA !important; }
          canvas { max-height: none !important; box-shadow: none !important; borderRadius: 0 !important; }
          button { display: none !important; }
          .chord-preview-overlay > div { background: white !important; }
        }
      `}</style>
    </>
  );
}
