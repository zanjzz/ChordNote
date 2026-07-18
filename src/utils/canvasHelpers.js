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

// A candidate page break (a [Section] label or a blank line) is only used
// instead of packing the page fully if doing so leaves no more than this
// fraction of the page's usable body height empty. This replaces a fixed
// "how many lines back" lookback — a line count doesn't scale between
// 1-column and 2-column layouts (2-column has ~2x the body budget) or
// between chord+lyrics and lyrics-only mode (very different line heights),
// but a percentage of the actual height budget does.
const BREAK_WASTE_RATIO = 0.14;

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
  // 👇 Made this noticeably stronger. Before, the gap was `base * 0.2 *
  // metaLyricsGap` — base is a font-scale value, so a unit change in the
  // slider only moved the gap by a handful of px on a 3300px-tall page,
  // which is why it barely felt like it did anything. Now the gap is
  // anchored at its old value when metaLyricsGap === 1 (so nothing looks
  // different by default), but every unit away from 1 adds/removes a
  // real, page-proportional chunk of space — enough to meaningfully push
  // the lyrics block down the page (e.g. toward a rough vertical-center
  // look on short songs) instead of a barely-visible nudge.
  const bodyGapBase = Math.max(base * 0.2, 10);
  const STRONG_GAP_PER_UNIT = PAGE_HEIGHT * 0.08;
  const bodyGap = Math.max(
    0,
    bodyGapBase + (metaLyricsGap - 1) * STRONG_GAP_PER_UNIT,
  );
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

// 👇 NEW: picks the best page-break index out of the candidates collected
// while accumulating height (see generatePages). Walks candidates from the
// one closest to the natural (fully-packed) cutoff backwards, and takes the
// first one that doesn't waste more than BREAK_WASTE_RATIO of the page.
// If nothing qualifies, falls back to the natural cutoff itself (a hard
// cut) rather than a distant, space-wasting break.
function selectBreakIndex(candidates, naturalEndIndex, maxBodyHeight) {
  for (let i = candidates.length - 1; i >= 0; i--) {
    const cand = candidates[i];
    if (cand.index > naturalEndIndex) continue;
    if (cand.height > maxBodyHeight) continue;
    const waste = maxBodyHeight - cand.height;
    if (waste <= maxBodyHeight * BREAK_WASTE_RATIO) {
      return cand.index;
    }
  }
  return naturalEndIndex;
}

// 👇 NEW: single source of truth for per-line height measurement, used by
// both the page-break pass (generatePages) and the column-split pass
// (buildSingleCanvas). Previously these were two separate, slightly
// different estimates of the same thing, which is exactly what caused
// lines to get cut off once label/block spacing pushed the two estimates
// far enough apart from each other.
function measureLineHeights({
  pageLines,
  startLine,
  chords,
  showChords,
  chordDisplayMode,
  musicKey,
  mctx,
  renderLyricSize,
  renderChordSize,
  lyricFont,
  chordFont,
  colWidth,
  metrics,
}) {
  const { baseChordGap, baseLineGap, baseBlockGap, emptyLineHeight } = metrics;
  let lastWasEmpty = false;
  let isFirstBlock = true;
  return pageLines.map((line, j) => {
    const isBlank = line.trim() === "";
    if (isBlank) {
      const h = lastWasEmpty ? 0 : emptyLineHeight;
      lastWasEmpty = true;
      return h;
    }
    lastWasEmpty = false;
    if (isSectionLabel(line)) {
      const h = computeLabelHeight(
        metrics,
        1.0, // blockSpacing/labelSpacing are applied by the caller if needed;
        1.0, // for the split-measurement pass we only need relative heights.
        isFirstBlock,
      );
      isFirstBlock = false;
      return h;
    }
    const actualIndex = startLine + j;
    const rawChord = showChords ? chords[actualIndex] || "" : "";
    const normalizedChord = normalizeChordCase(rawChord);
    const chordLine =
      chordDisplayMode !== "letters" && musicKey
        ? convertChordLine(normalizedChord, musicKey, chordDisplayMode)
        : normalizedChord;
    mctx.font = `${renderLyricSize}px ${lyricFont}`;
    const wrapped = wrapText(mctx, line, colWidth);
    mctx.font = `700 ${renderChordSize}px ${chordFont}`;
    const chordWrapped = showChords
      ? chordLine
        ? wrapChordLine(mctx, chordLine, colWidth)
        : [""]
      : [];
    return (
      baseChordGap * chordWrapped.length +
      wrapped.length * baseLineGap +
      baseBlockGap
    );
  });
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

  const headerMetricsForBudget =
    pageNum === 0
      ? computeHeaderMetrics(
          scaledFontSize,
          metaLyricsGap,
          { author, musicKey, bpm, capo },
          metaFontSize,
        )
      : null;
  const headerHeightForBudget = headerMetricsForBudget
    ? headerMetricsForBudget.height
    : 0;
  // Real per-column height budget (single column's worth of body space),
  // used below to decide whether column 1 alone can hold everything.
  const singleColBodyBudget =
    PAGE_HEIGHT - headerHeightForBudget - padding - 12 - bottomMargin;

  let columnLines, columnOffsets;
  if (columns === 2) {
    // 👇 Rebuilt again: the previous "fill column 1 to capacity, spill the
    // rest into column 2" approach fixed the old forced-50/50 bug, but
    // over-corrected — column 1 was ALWAYS crammed right up to its budget
    // regardless of how little content there was, while column 2 just got
    // whatever happened to be left (often visibly emptier). What a real
    // 2-up layout does: balance the two columns evenly, and only use a
    // second column at all when the content genuinely doesn't fit in one.
    const lineHeights = measureLineHeights({
      pageLines,
      startLine,
      chords,
      showChords,
      chordDisplayMode,
      musicKey,
      mctx,
      renderLyricSize,
      renderChordSize,
      lyricFont,
      chordFont,
      colWidth,
      metrics,
    });
    const totalHeight = lineHeights.reduce((a, b) => a + b, 0);

    let splitIdx;
    if (totalHeight <= singleColBodyBudget) {
      // Everything comfortably fits in one column — don't force a second,
      // near-empty column just for the sake of using the layout.
      splitIdx = pageLines.length;
    } else {
      // Balance toward the midpoint by height (not raw line count), so
      // wrapped/chorded/label lines all count for their real weight.
      const targetHeight = totalHeight / 2;
      let cumulative = 0;
      splitIdx = pageLines.length;
      for (let i = 0; i < pageLines.length; i++) {
        cumulative += lineHeights[i];
        if (cumulative >= targetHeight) {
          splitIdx = i + 1;
          break;
        }
      }

      // Neither column may exceed its real capacity — a balanced split
      // is only valid if it also fits. Walk the split back if column 1
      // overshot its budget, then forward if column 2 overshot instead
      // (only as far as column 1 still has room).
      let col1Height = lineHeights
        .slice(0, splitIdx)
        .reduce((a, b) => a + b, 0);
      while (splitIdx > 1 && col1Height > singleColBodyBudget) {
        splitIdx--;
        col1Height -= lineHeights[splitIdx];
      }
      let col2Height = totalHeight - col1Height;
      while (
        splitIdx < pageLines.length &&
        col2Height > singleColBodyBudget &&
        col1Height + lineHeights[splitIdx] <= singleColBodyBudget
      ) {
        col1Height += lineHeights[splitIdx];
        col2Height -= lineHeights[splitIdx];
        splitIdx++;
      }

      // Prefer to snap the split to a nearby [Section] label so a block
      // doesn't get sliced across the column break — but only accept a
      // snap that keeps both columns within their budget.
      const SPLIT_LABEL_TOLERANCE = 3;
      const fitsAt = (idx) => {
        const h1 = lineHeights.slice(0, idx).reduce((a, b) => a + b, 0);
        return (
          h1 <= singleColBodyBudget && totalHeight - h1 <= singleColBodyBudget
        );
      };
      let bestSnap = null;
      for (
        let i = splitIdx;
        i <= Math.min(splitIdx + SPLIT_LABEL_TOLERANCE, pageLines.length - 1);
        i++
      ) {
        if (isSectionLabel(pageLines[i]) && fitsAt(i)) {
          bestSnap = i;
          break;
        }
      }
      if (bestSnap === null) {
        for (
          let i = splitIdx - 1;
          i >= Math.max(splitIdx - SPLIT_LABEL_TOLERANCE, 0);
          i--
        ) {
          if (isSectionLabel(pageLines[i]) && fitsAt(i)) {
            bestSnap = i;
            break;
          }
        }
      }
      if (bestSnap !== null) splitIdx = bestSnap;
    }

    // Guard against an empty left column.
    splitIdx = Math.min(Math.max(splitIdx, 1), pageLines.length);

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

      // In lyrics-only mode (showChords === false), reserve zero chord-row
      // height instead of always counting at least one empty chord line —
      // that previously ate a full chordGap per line even when nothing
      // was drawn there, wasting vertical space specifically in this mode.
      mctx.font = `700 ${renderChordSize}px ${chordFont}`;
      const chordWrapped = showChords
        ? chordLine
          ? wrapChordLine(mctx, chordLine, colWidth)
          : [""]
        : [];

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
  // 👇 For a 2-column page, empty/unused columns (e.g. column 2 when
  // everything fit in column 1) should NOT count toward bodyHeight, or
  // the "fill remaining space" pass below would try to stretch spacing
  // across a column that has nothing in it.
  const nonEmptyColHeights = columnsWrapped
    .map((entries, i) => (entries.length > 0 ? colHeights[i] : 0))
    .filter((h, i) => columnsWrapped[i].length > 0);
  const bodyHeight = Math.max(...nonEmptyColHeights, 0);

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

  // 👇 The 1.4x cap below assumed extraSpace is always small "slack" left
  // over from a near-full page (e.g. a hard cut that stopped a little
  // early to avoid slicing a block). But a genuinely sparse page — most
  // often the LAST page of the song, which just holds whatever few lines
  // are left over — has a large extraSpace relative to its own content.
  // Blindly filling that with the same per-unit cap applied it to every
  // single line on a page with very few lines, which is what made spacing
  // balloon dramatically on trailing pages. Fix: only fully justify-fill
  // when the leftover is genuinely small relative to the page (real slack
  // from break selection); scale the fill down the emptier the page is,
  // so a mostly-empty page keeps close-to-normal spacing instead of being
  // stretched to fill the whole remaining page height.
  const FULL_FILL_WASTE_RATIO = 0.3; // leftover at or below this fraction of the page gets fully absorbed into spacing
  const extraSpaceRatio =
    totalBodyHeight > 0 ? extraSpace / totalBodyHeight : 0;
  const fillScale =
    extraSpaceRatio <= FULL_FILL_WASTE_RATIO
      ? 1
      : FULL_FILL_WASTE_RATIO / extraSpaceRatio;
  const effectiveExtraSpace = extraSpace * fillScale;

  const maxExtraPerUnit = scaledFontSize * 1.4;
  const rawExtraPerUnit =
    totalFlexUnits > 0 ? effectiveExtraSpace / totalFlexUnits : 0;
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
      // (skipped entirely in lyrics-only mode, since chordWrapped is [])
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
      // (no-op in lyrics-only mode since chordWrapped.length is 0)
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

    // 👇 Candidate break points collected as we go, each paired with the
    // cumulative height at that point. A candidate's `index` is where the
    // NEXT page would start if we broke there. Fed into selectBreakIndex
    // once we know the natural (fully-packed) cutoff, so we can pick the
    // closest clean break that doesn't waste too much of the page —
    // instead of a fixed line-count lookback, which didn't scale between
    // 1-column/2-column layouts or chord/lyrics-only modes.
    const candidates = [];

    while (endLine < lines.length) {
      const line = lines[endLine];
      const isBlank = line.trim() === "";

      if (isBlank) {
        tempHeight += lastWasEmpty ? 0 : emptyLineHeight;
        lastWasEmpty = true;
        if (endLine > currentLine) {
          candidates.push({ index: endLine + 1, height: tempHeight });
        }
      } else {
        lastWasEmpty = false;
        if (isSectionLabel(line)) {
          if (endLine > currentLine) {
            candidates.push({ index: endLine, height: tempHeight });
          }
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

          // Reserve zero chord rows in lyrics-only mode instead of always
          // counting at least 1 — keeps this height estimate consistent
          // with what buildSingleCanvas actually draws.
          mctx.font = `700 ${renderChordSize}px ${chordFont}`;
          const chordLines = showChords
            ? chordLine
              ? wrapChordLine(mctx, chordLine, colWidth).length
              : 1
            : 0;

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

    endLine = selectBreakIndex(candidates, lastSafeEnd, maxBodyHeight);

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
