/**
 * Chord Highlight Position Fix — Tests
 *
 * Tests for the leading-space highlight misalignment bugfix in buildSingleCanvas.
 *
 * Key insight about the rendering path:
 *   buildSingleCanvas calls normalizeChordCase(rawChord) before wrapping.
 *   normalizeChordCase uses a regex anchored to single-chord format — it calls
 *   .trim() and only matches single-token chords. For single-token strings with
 *   leading spaces (e.g. "   Am"), normalizeChordCase strips the leading spaces
 *   before the highlight loop sees the string. The bug therefore only manifests
 *   for multi-token chord strings (≥2 chords on a line), where normalizeChordCase
 *   cannot match and returns the string unchanged — including its leading spaces.
 *
 * Strategy:
 *   All tests use multi-token chord strings (e.g. "   Am   G") to ensure leading
 *   spaces survive normalizeChordCase and reach the highlight loop unchanged.
 *   The canvas context is mocked to capture moveTo calls, which reveal the x
 *   position of each highlight pill's rounded-rect path.
 *
 * Design doc reference: Property 1 (Bug Condition), Property 2 (Preservation)
 *   See: .kiro/specs/chord-highlight-position-fix/design.md
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { buildSingleCanvas } from './canvasHelpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Mock Infrastructure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-character width used by the mock measureText.
 * All characters (space and non-space) produce this width so measurements
 * are deterministic and easy to reason about in assertions.
 */
const CHAR_WIDTH = 10;

/**
 * Create a minimal canvas 2D context mock that:
 *   - Implements measureText deterministically (CHAR_WIDTH per character)
 *   - Records every moveTo(x, y) call so we can inspect highlight x-positions
 *   - Stubs all drawing primitives to no-ops
 */
function createMockContext() {
  const moveToLog = [];
  const ctx = {
    font: '',
    fillStyle: '',
    textAlign: '',
    measureText: (text) => ({ width: (text || '').length * CHAR_WIDTH }),
    fillRect: () => {},
    fillText: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    fill: () => {},
    moveTo: (x, y) => { moveToLog.push({ x, y }); },
    lineTo: () => {},
    quadraticCurveTo: () => {},
    _moveToLog: moveToLog,
  };
  return ctx;
}

/**
 * Install a canvas mock, run fn(mockCtx), then clean up.
 * Returns the mockCtx so the caller can inspect it after fn returns.
 */
function withCanvasMock(fn) {
  const mockCtx = createMockContext();
  const origCreateElement = document.createElement.bind(document);
  const spy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => mockCtx,
        toDataURL: () => '',
      };
    }
    return origCreateElement(tag);
  });
  try {
    fn(mockCtx);
  } finally {
    spy.mockRestore();
  }
  return mockCtx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal params for buildSingleCanvas.
 * chordStr is placed in chords[0] for line[0] = 'Hello world'.
 */
function minimalParams(chordStr, overrides = {}) {
  return {
    lines: ['Hello world'],
    chords: { 0: chordStr },
    fontSize: 15,
    columns: 1,
    alignment: 'left',
    title: 'Test',
    author: '',
    musicKey: '',
    bpm: '',
    capo: '',
    chordColor: '#000000',
    startLine: 0,
    endLine: 1,
    pageNum: 1,           // skip header rendering
    totalPages: 1,
    showChords: true,
    showBrackets: true,
    showChordBg: true,
    chordBgColor: '#0F6E56',
    chordBgOpacity: 0.15,
    chordBgPadding: 4,
    chordBgRadius: 4,
    chordFontSize: 15,
    chordFont: 'monospace',
    lyricFontSize: 15,
    lyricFont: 'sans-serif',
    labelFontSize: 12,
    labelFont: 'sans-serif',
    titleFontSize: 24,
    titleColor: '#22221F',
    titleFont: 'sans-serif',
    metaFontSize: 15,
    metaColor: '#77746A',
    metaFont: 'sans-serif',
    labelColor: '#77746A',
    lyricColor: '#22221F',
    chordDisplayMode: 'letters',
    ...overrides,
  };
}

/**
 * For a left-aligned single-column layout:
 *   chordStartX = colLeft = paddingSize (default 130)
 */
const DEFAULT_CHORD_START_X = 130;
const BG_PADDING = 4;
const BG_RADIUS = 4;

/** Width of leading spaces in a chord string (using mock CHAR_WIDTH). */
function leadingSpaceWidthOf(cline) {
  const match = cline.match(/^ */);
  return (match ? match[0].length : 0) * CHAR_WIDTH;
}

/**
 * Expected first moveTo x for the first highlight pill.
 *   After fix: currentX = chordStartX + leadingSpaceWidth
 *   rectX = currentX - bgPadding
 *   moveTo x = rectX + bgRadius
 */
function expectedFirstMoveToX(cline, chordStartX = DEFAULT_CHORD_START_X) {
  return chordStartX + leadingSpaceWidthOf(cline) - BG_PADDING + BG_RADIUS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 1 — Bug Condition Exploration Test (PBT)
//
//   This test encodes EXPECTED behavior.
//   On UNFIXED code:  test FAILS  (confirms the bug exists)
//   On FIXED code:    test PASSES (confirms the fix works)
//
//   NOTE: Tests use multi-token chord strings (≥2 tokens with leading spaces)
//   because normalizeChordCase strips spaces from single-token strings before
//   the highlight loop — the bug only manifests with multiple tokens.
//
//   Property 1: Bug Condition — Leading-Space Highlight Alignment
//   Validates: Requirements 1.1, 1.2, 1.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 1: Bug Condition — Leading-Space Highlight Alignment', () => {

  it('3 leading spaces + two chords: first highlight starts at chordStartX + leadingSpaceWidth', () => {
    // **Validates: Requirements 1.1, 1.2, 1.3**
    // Using "   Am   G" — 3 leading spaces, 2 tokens (normalizeChordCase leaves unchanged)
    const cline = '   Am   G';
    let firstX = null;
    withCanvasMock((ctx) => {
      buildSingleCanvas(minimalParams(cline));
      firstX = ctx._moveToLog.length > 0 ? ctx._moveToLog[0].x : null;
    });

    expect(firstX).not.toBeNull();
    // After fix: moveTo x = 130 (chordStartX) + 30 (3 spaces * 10) - 4 (bgPadding) + 4 (bgRadius) = 160
    expect(firstX).toBeCloseTo(expectedFirstMoveToX(cline), 0);
  });

  it('2 leading spaces + two chords: first highlight offset by leadingSpaceWidth', () => {
    // **Validates: Requirements 1.1, 1.2**
    const cline = '  Dm  F';
    let pillXs = [];
    withCanvasMock((ctx) => {
      buildSingleCanvas(minimalParams(cline));
      pillXs = ctx._moveToLog.map((p) => p.x);
    });

    expect(pillXs.length).toBeGreaterThanOrEqual(2);

    // First pill: chordStartX + 2 spaces offset
    expect(pillXs[0]).toBeCloseTo(expectedFirstMoveToX(cline), 0);

    // Second pill: after advancing past 'Dm' and the '  ' gap
    const leading = leadingSpaceWidthOf(cline);       // 2 * 10 = 20
    const dmWidth = 'Dm'.length * CHAR_WIDTH;          // 20
    const interGap = '  '.length * CHAR_WIDTH;         // 20
    const secondCurrentX = DEFAULT_CHORD_START_X + leading + dmWidth + interGap;
    expect(pillXs[1]).toBeCloseTo(secondCurrentX - BG_PADDING + BG_RADIUS, 0);
  });

  it('center-aligned layout with 3 leading spaces + two chords: highlight offset from centered chordStartX', () => {
    // **Validates: Requirements 1.1, 1.3**
    const cline = '   Am   G';
    let firstX = null;
    withCanvasMock((ctx) => {
      buildSingleCanvas(minimalParams(cline, { alignment: 'center' }));
      firstX = ctx._moveToLog.length > 0 ? ctx._moveToLog[0].x : null;
    });

    expect(firstX).not.toBeNull();

    // Center alignment: chordStartX = colCenter - chordWidth/2
    // PAGE_WIDTH=2550, padding=130 → colWidth=2290 → colCenter=1275
    // chordWidth = measureText('   Am   G').width = 9 * 10 = 90
    const PAGE_WIDTH = 2550;
    const padding = 130;
    const colWidth = PAGE_WIDTH - padding * 2;        // 2290
    const colCenter = padding + colWidth / 2;          // 1275
    const chordWidth = cline.length * CHAR_WIDTH;      // 90
    const centeredChordStartX = colCenter - chordWidth / 2; // 1230

    const leading = leadingSpaceWidthOf(cline);        // 30
    const expectedX = centeredChordStartX + leading - BG_PADDING + BG_RADIUS; // 1260
    expect(firstX).toBeCloseTo(expectedX, 0);
  });

  it('PBT: for any multi-token cline with 1–10 leading spaces, first highlight starts at chordStartX + leadingSpaceWidth', () => {
    // **Validates: Requirements 1.1, 1.2**
    // Multi-token strings ensure normalizeChordCase leaves leading spaces intact.
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.stringMatching(/^[A-G][a-z#m]{0,4}$/),  // chord 1 token
        fc.stringMatching(/^[A-G][a-z#m]{0,4}$/),  // chord 2 token
        (numLeadingSpaces, chord1, chord2) => {
          // "   Am   G" style — two tokens with leading spaces
          const cline = ' '.repeat(numLeadingSpaces) + chord1 + '  ' + chord2;
          let firstX = null;
          withCanvasMock((ctx) => {
            buildSingleCanvas(minimalParams(cline));
            firstX = ctx._moveToLog.length > 0 ? ctx._moveToLog[0].x : null;
          });

          if (firstX === null) return true; // no pill drawn — skip

          const leading = numLeadingSpaces * CHAR_WIDTH;
          const expectedX = DEFAULT_CHORD_START_X + leading - BG_PADDING + BG_RADIUS;
          return Math.abs(firstX - expectedX) < 1;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2 — Preservation Property Tests
//
//   These tests verify that NON-buggy inputs are unaffected by the fix.
//   They PASS on UNFIXED code (baseline) and MUST STILL PASS on fixed code.
//
//   Property 2: Preservation — Non-Leading-Space Rendering Unchanged
//   Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 2: Preservation — Non-Leading-Space Rendering Unchanged', () => {

  it('no-leading-spaces chord: first highlight starts exactly at chordStartX', () => {
    // **Validates: Requirements 3.1**
    const cline = 'Am   G';
    let firstX = null;
    withCanvasMock((ctx) => {
      buildSingleCanvas(minimalParams(cline));
      firstX = ctx._moveToLog.length > 0 ? ctx._moveToLog[0].x : null;
    });

    expect(firstX).not.toBeNull();
    // No leading spaces → leadingSpaceWidth = 0 → currentX = chordStartX
    expect(firstX).toBeCloseTo(DEFAULT_CHORD_START_X - BG_PADDING + BG_RADIUS, 0);
  });

  it('trailing-spaces-only chord: first highlight at chordStartX (unchanged)', () => {
    // **Validates: Requirements 3.2**
    const cline = 'Am   G  ';
    let firstX = null;
    withCanvasMock((ctx) => {
      buildSingleCanvas(minimalParams(cline));
      firstX = ctx._moveToLog.length > 0 ? ctx._moveToLog[0].x : null;
    });

    expect(firstX).not.toBeNull();
    expect(firstX).toBeCloseTo(DEFAULT_CHORD_START_X - BG_PADDING + BG_RADIUS, 0);
  });

  it('showChordBg=false: no highlight pills drawn regardless of leading spaces', () => {
    // **Validates: Requirements 3.3, 3.4**
    // Use multi-token string to ensure leading spaces survive normalizeChordCase
    let moveToCount = 0;
    withCanvasMock((ctx) => {
      buildSingleCanvas(minimalParams('   Am   G', { showChordBg: false }));
      moveToCount = ctx._moveToLog.length;
    });

    expect(moveToCount).toBe(0);
  });

  it('PBT: for any multi-token cline with no leading spaces, first highlight starts at chordStartX', () => {
    // **Validates: Requirements 3.1, 3.2**
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-G][a-z#m]{0,4}$/),  // chord 1 (starts with letter = no leading space)
        fc.stringMatching(/^[A-G][a-z#m]{0,4}$/),  // chord 2
        (chord1, chord2) => {
          const cline = chord1 + '  ' + chord2; // no leading spaces
          let firstX = null;
          withCanvasMock((ctx) => {
            buildSingleCanvas(minimalParams(cline));
            firstX = ctx._moveToLog.length > 0 ? ctx._moveToLog[0].x : null;
          });

          if (firstX === null) return true;

          const expectedX = DEFAULT_CHORD_START_X - BG_PADDING + BG_RADIUS;
          return Math.abs(firstX - expectedX) < 1;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('PBT: showChordBg=false with any chord string (including leading spaces): no pills drawn', () => {
    // **Validates: Requirements 3.3**
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.stringMatching(/^[A-G][a-z#m]{0,4}$/),
        fc.stringMatching(/^[A-G][a-z#m]{0,4}$/),
        (numLeadingSpaces, chord1, chord2) => {
          const cline = ' '.repeat(numLeadingSpaces) + chord1 + '  ' + chord2;
          let moveToCount = 0;
          withCanvasMock((ctx) => {
            buildSingleCanvas(minimalParams(cline, { showChordBg: false }));
            moveToCount = ctx._moveToLog.length;
          });
          return moveToCount === 0;
        }
      ),
      { numRuns: 50 }
    );
  });
});
