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

// Measures the rendered width of a chord line with inter-token whitespace
// scaled by `chordSpacing`. Leading whitespace and the token glyphs keep
// their natural width; only the gaps *between* tokens (and any leading gap)
// are scaled, matching how the draw loop positions tokens. chordSpacing of
// 1 reproduces the plain measureText width exactly.
function measureChordLineWidth(ctx, line, chordSpacing = 1) {
  if (!line) return 0;
  // Split into [gap, token, gap, token, …]; even indices are whitespace.
  const segments = line.split(/(\S+)/);
  let width = 0;
  segments.forEach((seg, i) => {
    if (seg === "") return;
    const isWhitespace = i % 2 === 0;
    const w = ctx.measureText(seg).width;
    width += isWhitespace ? w * chordSpacing : w;
  });
  return width;
}

export function wrapChordLine(ctx, text, maxWidth, chordSpacing = 1) {
  if (!text) return [""];
  if (measureChordLineWidth(ctx, text, chordSpacing) <= maxWidth) return [text];
  const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);
  const lines = [];
  let current = "";
  tokens.forEach((tok) => {
    const test = current + tok;
    if (
      measureChordLineWidth(ctx, test, chordSpacing) > maxWidth &&
      current.trim() !== ""
    ) {
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

// 👇 NEW: single source of truth for the "gap before a block/label" amount.
// Used by both computeLabelHeight (the measurement pass, for page-break
// and column-split decisions) and the actual draw loop in
// buildSingleCanvas — previously the draw loop duplicated this formula
// inline as `blockGap * blockSpacing`, which worked but meant any future
// change here had to be kept in sync by hand in two places. Also this is
// where blockSpacing's strength lives: before, a slider range of e.g.
// 0.5–2 only ever multiplied `baseBlockGap` (scaledFontSize * 0.18) —
// tiny compared to line/chord gaps, so the control barely did anything
// visible. Anchored so blockSpacing === 1 behaves exactly as before (no
// default-look change), but every unit away from 1 now adds/removes a
// real, visible chunk of space between blocks.
function computeBlockGapAmount(metrics, blockSpacing) {
  const { baseBlockGap, scaledFontSize } = metrics;
  const STRONG_BLOCK_GAP_PER_UNIT = scaledFontSize * 0.9;
  return Math.max(
    0,
    baseBlockGap + (blockSpacing - 1) * STRONG_BLOCK_GAP_PER_UNIT,
  );
}

function computeLabelHeight(metrics, blockSpacing, labelSpacing, isFirstBlock) {
  const { labelTopGap, baseLabelHeight, baseLineGap } = metrics;
  const beforeGap = isFirstBlock
    ? 0
    : computeBlockGapAmount(metrics, blockSpacing);
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

// Single source of truth for the per-line gap values used by both the
// measurement passes (measureLineHeights, generatePages) and the draw
// pass (buildSingleCanvas). All callers must use these instead of
// baseChordGap / baseLineGap so measurement and drawing always agree.
function computeLineGaps(renderChordSize, renderLyricSize, lineHeight) {
  return {
    lineGap: renderLyricSize * lineHeight,
    chordGap: renderChordSize * lineHeight,
  };
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
  lineHeight,
  lyricFont,
  chordFont,
  colWidth,
  metrics,
  chordSpacing = 1.0,
}) {
  const { baseBlockGap, emptyLineHeight } = metrics;
  const { lineGap, chordGap } = computeLineGaps(renderChordSize, renderLyricSize, lineHeight);
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
        1.0,
        1.0,
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
        ? wrapChordLine(mctx, chordLine, colWidth, chordSpacing)
        : [""]
      : [];
    return (
      chordGap * chordWrapped.length +
      wrapped.length * lineGap +
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
  totalPages = 1,
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
  chordSpacing = 1.0,
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
  // Top-ink headroom reserved so the first row's ascenders stay inside the
  // safe area (see bodyTop below). Must be subtracted from the body budget
  // so column-split measurement matches what's actually drawable.
  const topInkForBudget =
    Math.max(renderChordSize, renderLyricSize, renderLabelSize) * 0.8;
  // Real per-column height budget (single column's worth of body space),
  // used below to decide whether column 1 alone can hold everything.
  const singleColBodyBudget =
    PAGE_HEIGHT -
    headerHeightForBudget -
    padding -
    12 -
    topInkForBudget -
    bottomMargin;

  let columnLines, columnOffsets;
  if (columns === 2) {
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
      lineHeight,
      lyricFont,
      chordFont,
      colWidth,
      metrics,
      chordSpacing,
    });
    const totalHeight = lineHeights.reduce((a, b) => a + b, 0);

    let splitIdx;
    if (totalHeight <= singleColBodyBudget) {
      // Everything comfortably fits in one column — don't force a second,
      // near-empty column just for the sake of using the layout.
      splitIdx = pageLines.length;
    } else {
      // Fill column 1 line-by-line up to its height budget, then overflow
      // the remainder into column 2. This is true newspaper column flow:
      // the split lands at the exact line where column 1 runs out of room,
      // NOT snapped to a section boundary. Snapping to sections used to
      // shove an entire block to column 2, leaving a large empty gap at
      // the bottom of column 1 — especially visible at larger font sizes.
      // Line-by-line keeps column 1 as full as it can be while column 2
      // naturally holds only the overflow, so the two columns stay
      // balanced rather than column 2 looking more populated than column 1.
      let cumulative = 0;
      splitIdx = pageLines.length;
      for (let i = 0; i < pageLines.length; i++) {
        const next = cumulative + lineHeights[i];
        if (next > singleColBodyBudget) {
          splitIdx = i;
          break;
        }
        cumulative = next;
      }
      // Never leave column 1 empty — an oversized single first line has
      // to go somewhere.
      splitIdx = Math.max(splitIdx, 1);

      // Don't start column 2 on a blank line or a dangling chord-less
      // separator — if the split lands on a blank line, nudge it forward
      // past the blank so column 2 begins with real content.
      while (
        splitIdx < pageLines.length &&
        pageLines[splitIdx].trim() === ""
      ) {
        splitIdx++;
      }
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
          ? wrapChordLine(mctx, chordLine, colWidth, chordSpacing)
          : [""]
        : [];

      const chordWidth = Math.max(
        0,
        ...chordWrapped.map((c) => measureChordLineWidth(mctx, c, chordSpacing)),
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

  const { lineGap, chordGap } = computeLineGaps(renderChordSize, renderLyricSize, lineHeight);

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
        chordGap * e.chordWrapped.length +
        e.wrapped.length * lineGap +
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

  // The first drawn row's baseline must sit far enough below the top safe
  // area that its glyph ascenders don't poke above `padding` (where the
  // clip region starts). fillText draws from the baseline, and ascenders
  // rise ~0.8× the font size above it. We reserve the tallest possible
  // first-row ascent (chord, lyric, or label font — whichever is largest)
  // so the top row is never clipped on ANY page, including pages with no
  // header. This is applied uniformly so every page's top margin matches.
  const topInk =
    Math.max(renderChordSize, renderLyricSize, renderLabelSize) * 0.8;
  const bodyTop = padding + headerHeight + 12 + topInk;

  const bodyBottom = PAGE_HEIGHT - padding; // bottom safe-area boundary

  columnsWrapped.forEach((entries, colIdx) => {
    const colLeft =
      columns === 2 ? padding + colIdx * (colWidth + COL_GAP) : padding;
    const colCenter = colLeft + colWidth / 2;

    // Clip to the column's horizontal bounds and the page's vertical safe
    // area. Use padding as the top edge (not bodyTop) so that label text,
    // whose baseline sits at bodyTop + labelTopGap, isn't clipped when
    // labelTopGap is smaller than the label font's ascender height.
    // The right edge extends to colLeft + colWidth for normal left-aligned
    // content; for center-aligned single-column we use the full inner width
    // so wide centered text isn't clipped.
    const clipLeft = colLeft;
    const clipRight = columns === 2 ? colLeft + colWidth : PAGE_WIDTH - padding;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipLeft, padding, clipRight - clipLeft, bodyBottom - padding);
    ctx.clip();

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
          cy += computeBlockGapAmount(metrics, blockSpacing);
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
          // Split the chord line into alternating [gap, token, …] segments.
          // Even-indexed segments are whitespace (may be ""); odd are tokens.
          const segments = cline.split(/(\S+)/);
          const leadingGapWidth =
            ctx.measureText(segments[0] || "").width * chordSpacing;

          const gapAfterToken = (i) =>
            ctx.measureText(segments[2 * i + 2] || "").width * chordSpacing;

          // Build token list (same filter as before, but we need the full
          // segments array for accurate gap widths).
          const tokens = segments.filter((_, i) => i % 2 === 1); // odd = tokens

          let currentX = chordStartX + leadingGapWidth;

          if (showChordBg && tokens.length > 0) {
            const bgColor = chordBgColor || chordColor;
            const bgOpacity =
              chordBgOpacity !== undefined ? chordBgOpacity : 0.15;
            const bgPadding = chordBgPadding !== undefined ? chordBgPadding : 4;
            const bgRadius = chordBgRadius !== undefined ? chordBgRadius : 4;

            ctx.save();

            tokens.forEach((token, i) => {
              if (!token) return;
              const tokenMetrics = ctx.measureText(token);
              const textWidth = tokenMetrics.width;
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
              ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + r);
              ctx.lineTo(rectX + rectWidth, rectY + rectHeight - r);
              ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - r, rectY + rectHeight);
              ctx.lineTo(rectX + r, rectY + rectHeight);
              ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - r);
              ctx.lineTo(rectX, rectY + r);
              ctx.quadraticCurveTo(rectX, rectY, rectX + r, rectY);
              ctx.closePath();
              ctx.fill();

              currentX += textWidth + gapAfterToken(i);
            });

            ctx.restore();
          }

          // Draw chord tokens individually so their positions match the
          // highlight positions (both use the same chordSpacing-scaled gaps).
          // This replaces the single fillText(cline) call which couldn't
          // account for scaled whitespace.
          ctx.fillStyle = chordColor;
          let drawX = chordStartX + leadingGapWidth;
          tokens.forEach((token, i) => {
            if (!token) return;
            ctx.fillText(token, drawX, yPos);
            drawX += ctx.measureText(token).width + gapAfterToken(i);
          });
        }
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

    // End of column — restore clip region.
    ctx.restore();
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
  chordSpacing = 1.0,
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
  const renderLabelSize = (labelFontSize || 12) * SCALE_FACTOR;
  mctx.font = `${renderLyricSize}px ${lyricFont}`;

  const lineGaps = computeLineGaps(renderChordSize, renderLyricSize, lineHeight);
  const safetyBuffer = scaledFontSize * 0.75;
  // Must match the topInk reserved in buildSingleCanvas so page breaks
  // leave room for the first row's ascenders on every page/column.
  const topInk =
    Math.max(renderChordSize, renderLyricSize, renderLabelSize) * 0.8;

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
    // Per-column usable height (header only exists on page 0). topInk is
    // reserved once per column since each column's first row needs the
    // same ascender headroom.
    const perColumnBody =
      PAGE_HEIGHT - headerHeight - padding - 12 - topInk - padding;
    const maxBodyHeight = perColumnBody * columnMultiplier - safetyBuffer;

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
              ? wrapChordLine(mctx, chordLine, colWidth, chordSpacing).length
              : 1
            : 0;

          tempHeight +=
            lineGaps.chordGap * chordLines +
            wrapped.length * lineGaps.lineGap +
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
  chordSpacing = 1.0,
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
      chordSpacing,
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
