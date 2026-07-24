import React, { useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

const RESIZE_DEBOUNCE_MS = 80;

// Buttery hover/press easing for pagination controls — itemized
// properties instead of `all`, and a standard "ease-out" cubic-bezier
// instead of the default `ease`, which reads as noticeably smoother for
// small UI transitions like this.
const BTN_TRANSITION =
  "background-color 0.18s cubic-bezier(0.4, 0, 0.2, 1), " +
  "border-color 0.18s cubic-bezier(0.4, 0, 0.2, 1), " +
  "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), " +
  "box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1)";

export default function CanvasPreview({
  currentCanvas,
  pageRanges,
  currentPage,
  changePage,
  toggleZoom,
  canvasTheme,
  customCanvasColor,
  isMobile,
  appTheme,
  borderColor,
}) {
  const canvasElRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const resizeTimeoutRef = useRef(null);

  const theme =
    appTheme === "dark"
      ? {
          panel: "#1F1C19",
          border: "#3B3833",
          borderSoft: "#2C2A26",
          text: "#EDEAE3",
          textMuted: "#78746A",
        }
      : {
          panel: "#FFFFFF",
          border: "#D8D5CB",
          borderSoft: "#F0EEE8",
          text: "#22221F",
          textMuted: "#9A9689",
        };

  const drawCanvasToElement = useCallback(() => {
    if (!currentCanvas || !containerRef.current || !canvasElRef.current) return;

    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const rect = container.getBoundingClientRect();
    const horizontalPadding = 64;
    const verticalPadding = isMobile ? 116 : 120;

    const maxWidth = Math.max(rect.width - horizontalPadding, 200);
    const maxHeight = Math.max(rect.height - verticalPadding, 200);

    const scale = Math.min(
      maxWidth / currentCanvas.width,
      maxHeight / currentCanvas.height,
    );

    // 👇 Render at device-pixel resolution, not CSS-pixel resolution.
    // Before, el.width/el.height were set to the *displayed* size, so on
    // any HiDPI screen (basically every phone, and retina desktops) the
    // browser stretched a 1x bitmap across 2-3x as many physical pixels
    // — that's what made this look soft, especially on mobile. Capped at
    // 2x so very high-density (3x+) phones don't pay for pixels nobody
    // can see, keeping this cheap (a single drawImage call either way).
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
  }, [currentCanvas, isMobile]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawCanvasToElement);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawCanvasToElement]);

  useEffect(() => {
    const handleWindowResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(drawCanvasToElement);
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [drawCanvasToElement]);

  if (pageRanges.length === 0) {
    return (
      <div
        style={{
          padding: "40px",
          color: appTheme === "dark" ? "#A8A398" : "#77746A",
        }}
      >
        No content to preview.
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        style={{
          flex: isMobile ? "none" : 5.5,
          minWidth: 0,
          // 👇 FIX: was `minHeight: "50vh"` — a floor only, which let the
          // container grow to fit whatever the canvas rendered at. Since
          // the canvas's own size is computed FROM this container's
          // measured height, that created a feedback loop: draw → box
          // grows to fit → next redraw measures a bigger box → draws an
          // even bigger canvas → repeat (the "grows on every click, up
          // to ~3 times" bug). A real fixed height breaks the loop —
          // every measurement is identical, so the computed size is
          // stable from the very first draw. `overflow: hidden` below
          // was already there but couldn't help without an actual cap.
          height: isMobile ? "50vh" : "auto",
          background: appTheme === "dark" ? "#22221F" : "#F0EEE8",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "56px 16px 60px 16px" : "40px 16px 60px 16px",
          position: "relative",
          overflow: "hidden",
          borderBottom: isMobile ? `1px solid ${borderColor}` : "none",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "relative",
            cursor: "zoom-in",
            maxWidth: "100%",
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.01)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onClick={toggleZoom}
        >
          <canvas
            ref={canvasElRef}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              borderRadius: "4px",
              backgroundColor:
                canvasTheme === "dark"
                  ? "#181715"
                  : canvasTheme === "custom"
                    ? customCanvasColor
                    : "#FDFCFA",
              display: "block",
              transition: "box-shadow 0.2s ease",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              background: "rgba(255,255,255,0.9)",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "11px",
              color: "#77746A",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              pointerEvents: "none",
              transition: "opacity 0.2s ease, transform 0.2s ease",
            }}
          >
            <ZoomIn size={14} />
            Click to zoom
          </div>
        </div>

        {pageRanges.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "16px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 0}
              style={{
                padding: "6px 12px",
                minWidth: "108px",
                borderRadius: "6px",
                border: `1px solid ${theme.border}`,
                background: currentPage === 0 ? theme.borderSoft : theme.panel,
                color: currentPage === 0 ? theme.textMuted : theme.text,
                cursor: currentPage === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontSize: "13px",
                transition: BTN_TRANSITION,
                boxShadow: "none",
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 0) {
                  e.currentTarget.style.background = theme.borderSoft;
                  e.currentTarget.style.borderColor = theme.text;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 0) {
                  e.currentTarget.style.background = theme.panel;
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: theme.textMuted,
              }}
            >
              Page {currentPage + 1} of {pageRanges.length}
            </span>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === pageRanges.length - 1}
              style={{
                padding: "6px 12px",
                minWidth: "108px",
                borderRadius: "6px",
                border: `1px solid ${theme.border}`,
                background:
                  currentPage === pageRanges.length - 1
                    ? theme.borderSoft
                    : theme.panel,
                color:
                  currentPage === pageRanges.length - 1
                    ? theme.textMuted
                    : theme.text,
                cursor:
                  currentPage === pageRanges.length - 1
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontSize: "13px",
                transition: BTN_TRANSITION,
                boxShadow: "none",
              }}
              onMouseEnter={(e) => {
                if (currentPage !== pageRanges.length - 1) {
                  e.currentTarget.style.background = theme.borderSoft;
                  e.currentTarget.style.borderColor = theme.text;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== pageRanges.length - 1) {
                  e.currentTarget.style.background = theme.panel;
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
