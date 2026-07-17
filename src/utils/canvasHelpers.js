// src/utils/canvasHelpers.js
import { isSectionLabel, labelText } from "./sectionHelpers.js";
import { convertChordLine } from "./nashvilleNumbers.js";
import { normalizeChordCase } from "./chordTranspose.js";

const LIGHT_SHEET = {
  bg: "#FDFCFA",
  text: "#22221F",
  textSecondary: "#77746A",
  textMuted: "#9A9689",
};

const DARK_SHEET = {
  bg: "#181715",
  text: "#EDEAE3",
  textSecondary: "#A8A398",
  textMuted: "#78746A",
};

const PAGE_WIDTH = 2550;
const PAGE_HEIGHT = 3300;
const COL_GAP = 80;

export function wrapText(ctx, text, maxWidth) {
  if (!text) return [""];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines;
}

export function wrapChordLine(ctx, text, maxWidth) {
  if (!text) return [""];
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);
  const lines = [];
  let current = "";
  tokens.forEach((tok) => {
    const test = current + tok;
    if (ctx.measureText(test).width > maxWidth && current.trim() !== "") {
      lines.push(current.replace(/\s+$/, ""));
      current = tok.trim() === "" ? "" : tok;
    } else {
      current = test;
    }
  });
  if (current.trim() !== "") lines.push(current.replace(/\s+$/, ""));
  return lines.length ? lines : [text];
}

function getSpacingMetrics(fontSize, lineHeight = 1.3) {
  const effectiveFontSize = Math.max(fontSize, 16);
  const scaledFontSize = effectiveFontSize * 3.5;
  return {
    scaledFontSize,
    baseLineGap: scaledFontSize * lineHeight * 0.95,
    baseChordGap: scaledFontSize * 0.85,
    baseBlockGap: scaledFontSize * 0.18,
    baseLabelHeight: scaledFontSize * 0.62 + 2,
    labelTopGap: scaledFontSize * 0.12,
    emptyLineHeight: scaledFontSize * 0.4,
  };
}

function getColWidth(columns, padding) {
  return columns === 2
    ? (PAGE_WIDTH - padding * 2 - COL_GAP) / 2
    : PAGE_WIDTH - padding * 2;
}

// 👇 Updated to accept metaLyricsGap and metaFontSize
function computeHeaderMetrics(
  scaledFontSize,
  metaLyricsGap,
  { author, musicKey, bpm, capo },
  metaFontSize,
) {
  const base = scaledFontSize * 1.0;
  const titleFontSize = base * 1.7;
  const authorFontSize = metaFontSize * 3.5;
  const metaFontSizeScaled = metaFontSize * 3.5;
  const hasMeta = !!(musicKey || bpm || capo);
  // gap is multiplied by metaLyricsGap
  const bodyGap = Math.max(base * 0.2, 10) * metaLyricsGap;
  let height = titleFontSize * 1.25;
  if (author) height += authorFontSize * 1.5;
  if (hasMeta) height += metaFontSizeScaled * 1.3;
  height += bodyGap;
  return {
    titleFontSize,
    authorFontSize,
    metaFontSize: metaFontSizeScaled,
    hasMeta,
    bodyGap,
    height,
  };
}

function computeLabelHeight(metrics, blockSpacing, labelSpacing, isFirstBlock) {
  const { baseBlockGap, labelTopGap, baseLabelHeight, baseLineGap } = metrics;
  const beforeGap = isFirstBlock ? 0 : baseBlockGap * blockSpacing;
  return (
    beforeGap +
    labelTopGap * blockSpacing +
    (baseLabelHeight - labelTopGap) +
    baseLineGap * 0.5 * labelSpacing
  );
}

export function buildSingleCanvas({
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
  startLine,
  endLine,
  pageNum,
  lineHeight = 1.3,
  metaLyricsGap = 1.0, // renamed and default
  paddingSize = 130,
  canvasTheme = "light",
  customCanvasColor = "#FDFCFA",
  showChords = true,
  showBrackets = true,
  blockSpacing = 1.0,
  labelSpacing = 1.0,
  titleFontSize = 24,
  titleColor = "#22221F",
  titleFont = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  metaFontSize = 15,
  metaColor = "#77746A",
  metaFont = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  chordFontSize = 15,
  chordFont = "'Courier New', Courier, monospace",
  lyricFontSize = 15,
  lyricColor = "#22221F",
  lyricFont = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  labelFontSize = 12,
  labelColor = "#77746A",
  labelFont = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  chordDisplayMode = "letters",
  showChordBg = true,
  chordBgColor = "#0F6E56",
  chordBgOpacity = 0.15,
  chordBgPadding = 4,
  chordBgRadius = 4,
}) {
  let theme;
  if (canvasTheme === "dark") {
    theme = DARK_SHEET;
  } else if (canvasTheme === "custom") {
    theme = {
      bg: customCanvasColor,
      text: "#22221F",
      textSecondary: "#77746A",
      textMuted: "#9A9689",
    };
    const r = parseInt(customCanvasColor.slice(1, 3), 16);
    const g = parseInt(customCanvasColor.slice(3, 5), 16);
    const b = parseInt(customCanvasColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness < 128) {
      theme.text = "#EDEAE3";
      theme.textSecondary = "#A8A398";
      theme.textMuted = "#78746A";
    }
  } else {
    theme = LIGHT_SHEET;
  }

  const width = PAGE_WIDTH;
  const height = PAGE_HEIGHT;
  const padding = paddingSize;
  const bottomMargin = padding;
  const colWidth = getColWidth(columns, padding);

  const SCALE_FACTOR = 3.5;
  const renderTitleSize = titleFontSize * SCALE_FACTOR;
  const renderChordSize = chordFontSize * SCALE_FACTOR;
  const renderLyricSize = lyricFontSize * SCALE_FACTOR;
  const renderLabelSize = labelFontSize * SCALE_FACTOR;
  const renderMetaSize = metaFontSize * SCALE_FACTOR;

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");

  const metrics = getSpacingMetrics(fontSize, lineHeight);
  const {
    scaledFontSize,
    baseLineGap,
    baseChordGap,
    baseBlockGap,
    baseLabelHeight,
    labelTopGap,
    emptyLineHeight,
  } = metrics;

  const pageLines = lines.slice(startLine, endLine);

  let columnLines, columnOffsets;
  if (columns === 2) {
    const totalLines = pageLines.length;
    const half = Math.ceil(totalLines / 2);
    let splitIdx = half;
    for (let i = half; i < totalLines; i++) {
      if (isSectionLabel(pageLines[i])) {
        splitIdx = i;
        break;
      }
    }
    columnLines = [pageLines.slice(0, splitIdx), pageLines.slice(splitIdx)];
    columnOffsets = [0, splitIdx];
  } else {
    columnLines = [pageLines];
    columnOffsets = [0];
  }

  const columnsWrapped = columnLines.map((group, colIdx) => {
    const entries = [];
    let lastWasEmpty = false;
    group.forEach((line, j) => {
      const isBlank = line.trim() === "";
      if (isBlank) {
        entries.push({ isEmpty: true, collapsed: lastWasEmpty });
        lastWasEmpty = true;
        return;
      }
      lastWasEmpty = false;
      if (isSectionLabel(line)) {
        entries.push({
          isLabel: true,
          rawText: line.trim(),
          displayText: labelText(line),
        });
        return;
      }
      const actualIndex = startLine + columnOffsets[colIdx] + j;
      const rawChord = showChords ? chords[actualIndex] || "" : "";
      const normalizedChord = normalizeChordCase(rawChord);

      const chordLine =
        chordDisplayMode !== "letters" && musicKey
          ? convertChordLine(normalizedChord, musicKey, chordDisplayMode)
          : normalizedChord;

      mctx.font = `${renderLyricSize}px ${lyricFont}`;
      const wrapped = wrapText(mctx, line, colWidth);

      mctx.font = `700 ${renderChordSize}px ${chordFont}`;
      const chordWrapped = chordLine
        ? wrapChordLine(mctx, chordLine, colWidth)
        : [""];

      const chordWidth = Math.max(
        0,
        ...chordWrapped.map((c) => mctx.measureText(c).width),
      );

      mctx.font = `${renderLyricSize}px ${lyricFont}`;
      const lyricWidth = Math.max(
        0,
        ...wrapped.map((w) => mctx.measureText(w).width),
      );

      entries.push({
        isLabel: false,
        chordWrapped,
        wrapped,
        chordWidth,
        lyricWidth,
      });
    });
    return entries;
  });

  const colHeights = columnsWrapped.map((entries) => {
    let h = 0;
    let isFirstBlock = true;
    entries.forEach((e) => {
      if (e.isEmpty) {
        h += e.collapsed ? 0 : emptyLineHeight;
        return;
      }
      if (e.isLabel) {
        h += computeLabelHeight(
          metrics,
          blockSpacing,
          labelSpacing,
          isFirstBlock,
        );
        isFirstBlock = false;
        return;
      }
      h +=
        baseChordGap * e.chordWrapped.length +
        e.wrapped.length * baseLineGap +
        baseBlockGap;
    });
    return h;
  });
  const bodyHeight = Math.max(...colHeights, 0);

  const headerMetrics =
    pageNum === 0
      ? computeHeaderMetrics(
          scaledFontSize,
          metaLyricsGap,
          { author, musicKey, bpm, capo },
          metaFontSize,
        )
      : null;
  const headerHeight = headerMetrics ? headerMetrics.height : 0;

  const totalBodyHeight =
    PAGE_HEIGHT - headerHeight - padding - 12 - bottomMargin;
  const extraSpace = Math.max(0, totalBodyHeight - bodyHeight);

  let totalFlexUnits = 0;
  columnsWrapped.forEach((entries) => {
    entries.forEach((e) => {
      if (!e.isLabel && !e.isEmpty) {
        totalFlexUnits += e.wrapped.length + e.chordWrapped.length;
      }
    });
  });

  const maxExtraPerUnit = scaledFontSize * 0.5;
  const rawExtraPerUnit = totalFlexUnits > 0 ? extraSpace / totalFlexUnits : 0;
  const extraPerUnit = Math.min(rawExtraPerUnit, maxExtraPerUnit);

  const lineGap = baseLineGap + extraPerUnit;
  const chordGap = baseChordGap + extraPerUnit;
  const blockGap = baseBlockGap;
  const labelHeight = baseLabelHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const effectiveAlignment = columns === 2 ? "left" : alignment;

  if (pageNum === 0) {
    const {
      titleFontSize: originalTitleSize,
      authorFontSize,
      metaFontSize: metaSize,
      hasMeta,
    } = headerMetrics;
    ctx.textAlign = effectiveAlignment === "center" ? "center" : "left";
    const headerX = effectiveAlignment === "center" ? width / 2 : padding;

    // Title
    ctx.fillStyle = titleColor;
    ctx.font = `700 ${renderTitleSize}px ${titleFont}`;
    let y = padding + renderTitleSize * 0.78;
    ctx.fillText(title || "Untitled song", headerX, y);

    // Author (uses meta font)
    if (author) {
      y += authorFontSize * 1.15;
      ctx.font = `500 ${renderMetaSize}px ${metaFont}`;
      ctx.fillStyle = metaColor;
      ctx.fillText(author, headerX, y);
    }

    // Meta bits (key, BPM, capo) (uses meta font)
    if (hasMeta) {
      const metaBits = [
        musicKey ? `Key: ${musicKey}` : null,
        bpm ? `BPM: ${bpm}` : null,
        capo ? `Capo: ${capo}` : null,
      ].filter(Boolean);
      y += renderMetaSize * 1.2;
      ctx.font = `500 ${renderMetaSize}px ${metaFont}`;
      ctx.fillStyle = metaColor;
      ctx.fillText(metaBits.join("     "), headerX, y);
    }
  }

  const bodyTop = padding + headerHeight + 12;

  columnsWrapped.forEach((entries, colIdx) => {
    const colLeft =
      columns === 2 ? padding + colIdx * (colWidth + COL_GAP) : padding;
    const colCenter = colLeft + colWidth / 2;

    let cy = bodyTop;
    let isFirstBlock = true;
    let isInsideBlock = false;

    entries.forEach((entry) => {
      if (entry.isEmpty) {
        isInsideBlock = false;
        cy += entry.collapsed ? 0 : emptyLineHeight;
        return;
      }

      if (entry.isLabel) {
        if (!isFirstBlock) {
          cy += blockGap * blockSpacing;
        }
        isFirstBlock = false;
        isInsideBlock = false;

        cy += labelTopGap * blockSpacing;
        ctx.font = `600 ${renderLabelSize}px ${labelFont}`;
        ctx.fillStyle = labelColor;
        const textToDraw = showBrackets ? entry.rawText : entry.displayText;
        if (effectiveAlignment === "center") {
          ctx.textAlign = "center";
          ctx.fillText(textToDraw, colCenter, cy);
        } else {
          ctx.textAlign = "left";
          ctx.fillText(textToDraw, colLeft, cy);
        }
        cy += labelHeight - labelTopGap;
        cy += baseLineGap * 0.5 * labelSpacing;
        return;
      }

      isInsideBlock = true;

      const chordStartX =
        effectiveAlignment === "center"
          ? colCenter - entry.chordWidth / 2
          : colLeft;
      const lyricStartX =
        effectiveAlignment === "center"
          ? colCenter - entry.lyricWidth / 2
          : colLeft;

      ctx.textAlign = "left";
      ctx.font = `700 ${renderChordSize}px ${chordFont}`;
      ctx.fillStyle = chordColor;

      // Draw each chord line with individual background per chord
      entry.chordWrapped.forEach((cline, idx) => {
        const yPos = cy + idx * chordGap;

        if (cline && cline.trim()) {
          if (showChordBg && cline.trim()) {
            const tokens = cline.split(/\s+/).filter((t) => t.length > 0);
            const spaces = cline.match(/\s+/g) || [];

            let currentX = chordStartX;
            const bgColor = chordBgColor || chordColor;
            const bgOpacity =
              chordBgOpacity !== undefined ? chordBgOpacity : 0.15;
            const bgPadding = chordBgPadding !== undefined ? chordBgPadding : 4;
            const bgRadius = chordBgRadius !== undefined ? chordBgRadius : 4;

            ctx.save();

            tokens.forEach((token, i) => {
              if (!token) return;

              const metrics = ctx.measureText(token);
              const textWidth = metrics.width;
              const textHeight = renderChordSize * 0.9;

              const rectX = currentX - bgPadding;
              const rectY =
                yPos - textHeight - bgPadding + renderChordSize * 0.15;
              const rectWidth = textWidth + bgPadding * 2;
              const rectHeight = textHeight + bgPadding * 2;

              const alpha = Math.round(Math.min(bgOpacity, 1) * 255)
                .toString(16)
                .padStart(2, "0");
              ctx.fillStyle = bgColor + alpha;

              const r = Math.min(bgRadius, rectWidth / 2, rectHeight / 2);
              ctx.beginPath();
              ctx.moveTo(rectX + r, rectY);
              ctx.lineTo(rectX + rectWidth - r, rectY);
              ctx.quadraticCurveTo(
                rectX + rectWidth,
                rectY,
                rectX + rectWidth,
                rectY + r,
              );
              ctx.lineTo(rectX + rectWidth, rectY + rectHeight - r);
              ctx.quadraticCurveTo(
                rectX + rectWidth,
                rectY + rectHeight,
                rectX + rectWidth - r,
                rectY + rectHeight,
              );
              ctx.lineTo(rectX + r, rectY + rectHeight);
              ctx.quadraticCurveTo(
                rectX,
                rectY + rectHeight,
                rectX,
                rectY + rectHeight - r,
              );
              ctx.lineTo(rectX, rectY + r);
              ctx.quadraticCurveTo(rectX, rectY, rectX + r, rectY);
              ctx.closePath();
              ctx.fill();

              currentX +=
                textWidth +
                (spaces[i] ? spaces[i].length * ctx.measureText(" ").width : 0);
            });

            ctx.restore();
          }
        }

        // Draw chord text on top
        ctx.fillText(cline || "", chordStartX, yPos);
      });

      // Adjust cy to after the last chord line
      if (entry.chordWrapped.length > 0) {
        cy += (entry.chordWrapped.length - 1) * chordGap + chordGap;
      }

      ctx.font = `${renderLyricSize}px ${lyricFont}`;
      ctx.fillStyle = lyricColor;
      entry.wrapped.forEach((wline) => {
        ctx.fillText(wline || "\u00A0", lyricStartX, cy);
        cy += lineGap;
      });
    });
  });

  return canvas;
}

export function generatePages({
  lines,
  chords = {},
  fontSize,
  author,
  musicKey,
  bpm,
  capo,
  columns = 1,
  lineHeight = 1.3,
  metaLyricsGap = 1.0,
  paddingSize = 130,
  canvasTheme = "light",
  customCanvasColor = "#FDFCFA",
  showChords = true,
  showBrackets = true,
  blockSpacing = 1.0,
  labelSpacing = 1.0,
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
  chordDisplayMode = "letters",
  showChordBg = true,
  chordBgColor = "#0F6E56",
  chordBgOpacity = 0.15,
  chordBgPadding = 4,
  chordBgRadius = 4,
}) {
  const pages = [];
  let currentLine = 0;
  let pageNum = 0;

  const metrics = getSpacingMetrics(fontSize, lineHeight);
  const {
    scaledFontSize,
    baseLineGap,
    baseChordGap,
    baseBlockGap,
    baseLabelHeight,
    labelTopGap,
    emptyLineHeight,
  } = metrics;

  const padding = paddingSize;
  const colWidth = getColWidth(columns, padding);

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");

  const SCALE_FACTOR = 3.5;
  const renderLyricSize = lyricFontSize * SCALE_FACTOR;
  const renderChordSize = chordFontSize * SCALE_FACTOR;
  mctx.font = `${renderLyricSize}px ${lyricFont}`;

  const safetyBuffer = scaledFontSize * 0.75;

  while (currentLine < lines.length) {
    const headerHeight =
      pageNum === 0
        ? computeHeaderMetrics(
            scaledFontSize,
            metaLyricsGap,
            { author, musicKey, bpm, capo },
            metaFontSize || 15,
          ).height
        : 0;

    const columnMultiplier = columns === 2 ? 2 : 1;
    const maxBodyHeight =
      (PAGE_HEIGHT - headerHeight - padding - 12 - padding) * columnMultiplier -
      safetyBuffer;

    let endLine = currentLine;
    let tempHeight = 0;
    let lastSafeEnd = currentLine;
    let lastWasEmpty = false;
    let isFirstBlock = true;

    while (endLine < lines.length) {
      const line = lines[endLine];
      const isBlank = line.trim() === "";

      if (isBlank) {
        tempHeight += lastWasEmpty ? 0 : emptyLineHeight;
        lastWasEmpty = true;
      } else {
        lastWasEmpty = false;
        if (isSectionLabel(line)) {
          tempHeight += computeLabelHeight(
            metrics,
            blockSpacing,
            labelSpacing,
            isFirstBlock,
          );
          isFirstBlock = false;
        } else {
          const rawChord = showChords ? chords[endLine] || "" : "";
          const normalizedChord = normalizeChordCase(rawChord);
          const chordLine =
            chordDisplayMode !== "letters" && musicKey
              ? convertChordLine(normalizedChord, musicKey, chordDisplayMode)
              : normalizedChord;

          mctx.font = `${renderLyricSize}px ${lyricFont}`;
          const wrapped = wrapText(mctx, line, colWidth);

          mctx.font = `700 ${renderChordSize}px ${chordFont}`;
          const chordLines = chordLine
            ? wrapChordLine(mctx, chordLine, colWidth).length
            : 1;

          tempHeight +=
            baseChordGap * chordLines +
            wrapped.length * baseLineGap +
            baseBlockGap;
        }
      }

      if (tempHeight > maxBodyHeight) break;
      lastSafeEnd = endLine + 1;
      endLine++;
    }

    if (lastSafeEnd === currentLine) {
      lastSafeEnd = currentLine + 1;
    }

    let breakPoint = lastSafeEnd;
    for (let i = lastSafeEnd - 1; i > currentLine; i--) {
      if (isSectionLabel(lines[i])) {
        const linesBack = lastSafeEnd - i;
        if (linesBack <= 4) {
          breakPoint = i;
          break;
        }
      }
    }

    endLine = breakPoint;
    pages.push({ start: currentLine, end: endLine });
    currentLine = endLine;
    pageNum++;
  }

  return pages;
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

export async function downloadPages({
  pages,
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
  lineHeight = 1.3,
  metaLyricsGap = 1.0,
  paddingSize = 130,
  canvasTheme = "light",
  customCanvasColor = "#FDFCFA",
  showChords = true,
  showBrackets = true,
  blockSpacing = 1.0,
  labelSpacing = 1.0,
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
  chordDisplayMode = "letters",
  showChordBg = true,
  chordBgColor = "#0F6E56",
  chordBgOpacity = 0.15,
  chordBgPadding = 4,
  chordBgRadius = 4,
}) {
  if (!pages || pages.length === 0) return;

  const safeTitle = (title || "chord-sheet").replace(/[/\\?%*:|"<>]/g, "-");

  const canvases = pages.map((page, idx) =>
    buildSingleCanvas({
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
      startLine: page.start,
      endLine: page.end,
      pageNum: idx,
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
  );

  if (canvases.length === 1) {
    const link = document.createElement("a");
    link.download = `${safeTitle}.${ext}`;
    link.href = canvases[0].toDataURL(mime, 0.95);
    link.click();
    return;
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const blobs = await Promise.all(
    canvases.map((canvas) => canvasToBlob(canvas, mime, 0.95)),
  );

  blobs.forEach((blob, idx) => {
    if (!blob) return;
    zip.file(`${safeTitle}-page-${idx + 1}.${ext}`, blob);
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.download = `${safeTitle}.zip`;
  link.href = URL.createObjectURL(zipBlob);
  link.click();
  URL.revokeObjectURL(link.href);
}
