# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Leading-Space Highlight Misalignment
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate `currentX` starts at `chordStartX` instead of `chordStartX + leadingSpaceWidth`
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases — chord strings that satisfy `isBugCondition(cline)` (i.e. `cline.match(/^ +/)` is non-null and length > 0)
  - Test cases to cover (from Bug Condition in design):
    - Single chord with 3 leading spaces: `cline = "   Am"`, `showChordBg = true` — assert first highlight pill left-edge is at `chordStartX + ctx.measureText("   ").width`, NOT at `chordStartX`
    - Two chords with 2 leading spaces: `cline = "  Dm  F"` — assert both pills start offset by `ctx.measureText("  ").width`
    - Center-aligned layout with leading spaces: same as first case with `alignment = "center"` — `chordStartX` is `colCenter - chordWidth/2`; highlight should be further right by `leadingSpaceWidth`
  - The test assertions match the Expected Behavior Properties in design (§ Property 1)
  - Run test on UNFIXED code (line 724 of `src/utils/canvasHelpers.js` still reads `let currentX = chordStartX`)
  - **EXPECTED OUTCOME**: Test FAILS — pixel at `chordStartX + leadingSpaceWidth` is NOT the highlight color; pixel at `chordStartX` IS the highlight color
  - Document counterexamples found (e.g. `cline = "   Am"` → highlight drawn 3-space-widths too far left)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Leading-Space Rendering Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - `isBugCondition(cline)` returns `false` for all inputs in this property (no leading spaces, OR `showChordBg = false`)
  - Observe behavior on UNFIXED code for these non-buggy inputs:
    - `cline = "Am   G"` (no leading spaces) → highlight starts at `chordStartX` exactly
    - `cline = "Am   G  "` (trailing spaces only) → highlight starts at `chordStartX` exactly
    - `showChordBg = false` with any chord string → no highlight pixels drawn at all
    - `cline = ""` or whitespace-only → `cline.trim()` guard skips block; nothing drawn
  - Write property-based tests capturing observed behavior (from Preservation Requirements in design):
    - For all non-empty chord strings with no leading spaces: assert first highlight `rectX` equals `chordStartX - bgPadding`
    - For `showChordBg = false`: assert no highlight-color pixels are drawn regardless of leading spaces
    - For strings with trailing/inter-token spaces only: assert highlight positions are unchanged
  - Verify tests PASS on UNFIXED code — this establishes the baseline to preserve
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix chord highlight leading-space misalignment in `buildSingleCanvas`

  - [ ] 3.1 Apply the three-line fix to `src/utils/canvasHelpers.js`
    - Open `src/utils/canvasHelpers.js`
    - Locate the `if (showChordBg && cline.trim())` block inside `entry.chordWrapped.forEach` (around line 715)
    - Confirm `ctx.font` is already set to `700 ${renderChordSize}px ${chordFont}` before this block (line 711) — this ensures `ctx.measureText` uses the correct chord font metrics
    - Replace the single line `let currentX = chordStartX;` (line 724) with the three lines below, immediately after `const spaces = cline.match(/\s+/g) || [];`:
      ```js
      const leadingSpaces = cline.match(/^ */)[0];                         // NEW
      const leadingSpaceWidth = ctx.measureText(leadingSpaces).width;      // NEW
      let currentX = chordStartX + leadingSpaceWidth;                      // CHANGED
      ```
    - Do NOT touch any other line in the file
    - _Bug_Condition: `isBugCondition(cline)` — `cline.match(/^ +/)` is non-null and `[0].length > 0`_
    - _Expected_Behavior: first highlight pill left-edge at `chordStartX + ctx.measureText(leadingSpaces).width` for all inputs satisfying Bug_Condition_
    - _Preservation: all inputs where `isBugCondition(cline)` is false produce pixel-identical output — when `leadingSpaces === ""`, `ctx.measureText("").width === 0`, so `currentX = chordStartX + 0`, identical to before_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ] 3.2 Manually verify correctness by reasoning through the four key scenarios
    - **No-leading-spaces case (Req 2.3, 3.1)**: `cline = "Am   G"` → `cline.match(/^ */)[0]` returns `""` → `ctx.measureText("").width === 0` → `currentX = chordStartX + 0` — identical to before. ✓
    - **Center-aligned layout (Req 3.5)**: `chordStartX = colCenter - entry.chordWidth / 2` (already the centered origin) → leading-space offset adds on top of that correctly. ✓
    - **Two-column layout (Req 3.6)**: each column computes its own `colLeft` and thus its own `chordStartX`; the offset is applied independently per column with no cross-column interference. ✓
    - **Export path (Req 2.4)**: PNG, JPG, and PDF exports all call `buildSingleCanvas` via `downloadPages` → the same fixed code path runs for all output formats. ✓
    - Confirm `ctx.font` is set to the chord font at line 711 — before the `cline.match` and `ctx.measureText` calls — so measurement uses correct font metrics. ✓

  - [ ] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Leading-Space Highlight Alignment
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (highlight at `chordStartX + leadingSpaceWidth`)
    - When this test passes, it confirms `currentX` is now correctly offset
    - Run bug condition exploration test from step 1 against the FIXED code
    - **EXPECTED OUTCOME**: Test PASSES — pixel at `chordStartX + leadingSpaceWidth` IS the highlight color
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Leading-Space Rendering Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2 against the FIXED code
    - **EXPECTED OUTCOME**: All tests PASS — no regressions in the no-leading-spaces path, `showChordBg = false` path, or trailing/inter-token spaces path
    - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Re-run the full test suite (exploration test + preservation tests)
  - Confirm all tests pass with no failures
  - Ask the user if any questions arise
