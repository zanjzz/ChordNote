# Chord Highlight Position Fix — Bugfix Design

## Overview

When a user adds leading spaces to a chord string in the Chords Panel (e.g. `"   Am   G"`)
to align a chord over a specific word in the lyric, the chord highlight pill/box is drawn
starting at the column's left edge instead of where the first visible chord token begins.
The chord text itself renders correctly because `ctx.fillText` draws the raw string with
all its leading spaces. The highlight loop, however, initialises its cursor at `chordStartX`
(no leading-space offset) and splits the string with `.split(/\s+/).filter(...)`, which
discards the leading spaces entirely before advancing the cursor.

The fix is surgical: before the per-token loop, measure the pixel width of any leading
whitespace in the chord line and add it to the initial cursor position. This makes the
first highlight box start exactly where the first visible token's text starts.

---

## Glossary

- **Bug_Condition (C)**: A chord line string (`cline`) that contains one or more leading
  space characters — i.e. `cline.match(/^ +/)` is non-null.
- **Property (P)**: The desired behavior for a buggy input — each highlight pill SHALL be
  drawn so its left edge aligns with the left edge of the corresponding chord token's
  rendered text.
- **Preservation**: All rendering that does NOT involve leading spaces in a chord line must
  be pixel-identical before and after the fix.
- **`buildSingleCanvas`**: The function in `src/utils/canvasHelpers.js` that renders a
  single page canvas. It is the shared rendering path for the Preview modal, PNG export,
  JPG export, and PDF export.
- **`chordStartX`**: The x-coordinate where the chord line's rendering origin sits —
  `colLeft` for left-aligned layouts, `colCenter - entry.chordWidth / 2` for centered.
- **`currentX`**: The running horizontal cursor inside the highlight-drawing loop, tracking
  where the next token's highlight box should start.
- **`cline`**: A single wrapped chord line string (one row of the chord display), potentially
  containing leading spaces added by the user.
- **`leadingSpaceWidth`**: The pixel width of the leading whitespace prefix of `cline`,
  measured with `ctx.measureText`. Zero when `cline` has no leading spaces.

---

## Bug Details

### Bug Condition

The bug manifests when a `cline` value passed to the chord-highlight drawing block inside
`buildSingleCanvas` has one or more leading space characters. The highlight cursor
`currentX` is initialised at `chordStartX` (column origin), but `ctx.fillText(cline, chordStartX, yPos)`
draws the raw string — including the leading spaces — so the text is visually pushed right
by the pixel width of those spaces. The highlight pills are therefore shifted left by
exactly that amount.

**Formal Specification:**

```
FUNCTION isBugCondition(cline)
  INPUT: cline — a string (one wrapped chord line)
  OUTPUT: boolean

  leadingMatch := cline.match(/^ +/)
  RETURN leadingMatch IS NOT NULL
         AND leadingMatch[0].length > 0
END FUNCTION
```

### Examples

| Input `cline`      | Leading chars | Expected highlight X   | Actual highlight X (buggy) |
|--------------------|---------------|------------------------|----------------------------|
| `"   Am   G"`      | 3 spaces      | `chordStartX + W(" ")×3` | `chordStartX` (wrong)      |
| `"  Dm  F  C"`     | 2 spaces      | `chordStartX + W("  ")` | `chordStartX` (wrong)      |
| `"Am   G"`         | 0 spaces      | `chordStartX`          | `chordStartX` (correct)    |
| `"Am"` (centered)  | 0 spaces      | `colCenter - w/2`      | `colCenter - w/2` (correct)|
| `"   Am"` (centered)| 3 spaces     | offset from centered origin | same wrong shift applies  |

*`W(s)` denotes `ctx.measureText(s).width`.*

---

## Expected Behavior

### Preservation Requirements

The following behaviors must be **completely unchanged** by this fix:

**Unchanged Behaviors:**
- Chord strings with no leading spaces render highlight boxes at exactly `chordStartX`
  (no regression for the common case).
- Chord strings with trailing spaces or inter-token spaces (but no leading spaces) render
  highlight boxes at the same positions as before.
- When `showChordBg = false`, no highlight boxes are drawn at all; chord text renders
  unchanged.
- Center-aligned layouts compute `chordStartX` as `colCenter - entry.chordWidth / 2`;
  the leading-space offset is added on top of that, so center alignment is still correct.
- Two-column layouts use each column's own `colLeft` / `chordStartX`; both columns benefit
  from the fix independently with no cross-column interference.
- The `ctx.fillText(cline, chordStartX, yPos)` call is NOT changed; chord text continues
  to render from `chordStartX` including its leading spaces, exactly as today.
- All export formats (PNG, JPG, PDF) are fixed by the same single-path change.
- Canvas re-renders triggered by typography/spacing controls apply the fix consistently.
- Chord realignment, transposition, and Nashville-number conversion operate on the raw
  stored chord string, which is not touched by this fix.

**Scope:**
All inputs where `isBugCondition(cline)` returns `false` produce pixel-identical output
before and after this fix.

---

## Hypothesized Root Cause

The root cause is confirmed (not hypothetical) based on direct code inspection:

1. **Cursor initialisation ignores leading spaces**: `let currentX = chordStartX` places
   the cursor at the column origin. `ctx.fillText` draws from the same origin but includes
   leading-space characters in the rendered output, visually pushing the token text to the
   right. There is no corresponding offset applied to `currentX`.

2. **Token splitting discards leading whitespace**: `cline.split(/\s+/).filter(t => t.length > 0)`
   silently drops the leading space prefix before the loop runs, so there is nothing in the
   `tokens` array that would naturally advance `currentX` past the leading gap.

3. **`spaces` array captures only inter-token gaps**: `cline.match(/\s+/g)` captures the
   spaces array used to advance `currentX` between tokens. Leading spaces may be captured
   as `spaces[0]` depending on whether the regex matches at position 0, but the token loop
   uses `spaces[i]` as the gap *after* token `i` — so even if the leading spaces land in
   `spaces[0]`, they are consumed as the gap after the first token, not before it. This
   means the leading-space width is both missing from the initial offset AND incorrectly
   re-added after the first token, potentially causing a double error in some edge cases.

4. **No other rendering path is affected**: The lyric text path, the label path, the
   header path, and the wrapping/pagination paths do not use this highlight loop and are
   not impacted.

---

## Correctness Properties

Property 1: Bug Condition — Leading-Space Highlight Alignment

_For any_ chord line string `cline` where `isBugCondition(cline)` returns `true` (i.e.
`cline` has one or more leading space characters), the fixed `buildSingleCanvas` SHALL
draw each chord token's highlight pill with its left edge aligned to the rendered left
edge of that token's text — specifically, the first token's highlight SHALL start at
`chordStartX + ctx.measureText(leadingSpaces).width`, where `leadingSpaces` is the
leading whitespace prefix of `cline`.

**Validates: Requirements 2.1, 2.2, 2.4**

Property 2: Preservation — Non-Leading-Space Rendering Unchanged

_For any_ chord line string `cline` where `isBugCondition(cline)` returns `false` (i.e.
`cline` has no leading space characters, OR `showChordBg` is `false`), the fixed
`buildSingleCanvas` SHALL produce pixel-identical highlight and text rendering to the
original code — no change in position, size, color, opacity, or radius of any drawn
element.

**Validates: Requirements 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

---

## Fix Implementation

### Changes Required

**File:** `src/utils/canvasHelpers.js`

**Function:** `buildSingleCanvas`

**Location:** Inside the `entry.chordWrapped.forEach((cline, idx) => { ... })` loop,
inside the `if (showChordBg && cline.trim())` block, immediately before
`let currentX = chordStartX` (currently around line 724).

**Specific Changes:**

1. **Extract the leading whitespace prefix** from `cline` before the tokens loop:
   ```js
   const leadingSpaces = cline.match(/^ */)[0]; // "" when no leading spaces
   ```
   `match(/^ */)` always returns an array (never null), so `[0]` is safe; it returns `""`
   when there are no leading spaces, keeping the zero-offset path identical to today.

2. **Measure the leading-space pixel width** using the already-active chord font context:
   ```js
   const leadingSpaceWidth = ctx.measureText(leadingSpaces).width;
   ```
   This measurement happens after `ctx.font = \`700 ${renderChordSize}px ${chordFont}\``
   has been set, so it uses the same font metrics as the chord text rendering.

3. **Offset the initial `currentX`** by the measured width:
   ```js
   let currentX = chordStartX + leadingSpaceWidth;
   ```
   This is the only line that changes in the existing code. Everything else — the token
   loop, the `spaces` advance, the `ctx.restore()`, the `ctx.fillText` call — stays the
   same.

**Before (buggy):**
```js
const tokens = cline.split(/\s+/).filter((t) => t.length > 0);
const spaces = cline.match(/\s+/g) || [];

let currentX = chordStartX;          // ← cursor starts at column origin
```

**After (fixed):**
```js
const tokens = cline.split(/\s+/).filter((t) => t.length > 0);
const spaces = cline.match(/\s+/g) || [];

const leadingSpaces = cline.match(/^ */)[0];                         // NEW
const leadingSpaceWidth = ctx.measureText(leadingSpaces).width;      // NEW
let currentX = chordStartX + leadingSpaceWidth;                      // CHANGED
```

**Why this is sufficient:**
- When `cline` has no leading spaces, `leadingSpaces === ""` and
  `ctx.measureText("").width === 0`, so `currentX = chordStartX + 0` — identical to
  before. Requirement 2.3 and all 3.x preservation requirements are satisfied.
- When `cline` has leading spaces, `currentX` is shifted right by the exact same number
  of pixels that `ctx.fillText` would skip over when rendering those leading spaces.
  Requirements 2.1 and 2.2 are satisfied.
- The `ctx.fillText(cline, chordStartX, yPos)` call is untouched, so chord text
  rendering is unaffected (Requirement 3.4, 3.8).
- The fix is layout-agnostic: `chordStartX` already encodes the correct origin for
  left-aligned, center-aligned, and both columns — the offset simply adds on top.
  Requirements 3.5 and 3.6 are satisfied.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: (1) run exploratory tests on the **unfixed** code to
confirm the bug manifests as hypothesised, then (2) run fix-checking and preservation tests
on the **fixed** code to confirm correct behavior and no regressions.

---

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples demonstrating the highlight misalignment bug on the
unfixed code, confirming the root cause.

**Test Plan:** Render a canvas with `buildSingleCanvas` using a chord string with leading
spaces, then read back the pixel colors at expected highlight positions. On unfixed code,
the highlight will be drawn to the left of where the token text actually appears —
verifiable by checking that the pixel at the correct (offset) position is NOT the
highlight color, while the pixel at the wrong (unshifted) position IS.

**Test Cases:**

1. **Single chord with 3 leading spaces**: Input `cline = "   Am"` with
   `showChordBg = true`. Expect highlight at `chordStartX + W("   ")`, but on unfixed
   code it appears at `chordStartX`. (Will fail on unfixed code)

2. **Two chords with 2 leading spaces**: Input `cline = "  Dm  F"`. Expect both highlights
   offset by `W("  ")`, but on unfixed code both start from `chordStartX`. (Will fail on
   unfixed code)

3. **Center-aligned layout with leading spaces**: Same as case 1 but `alignment = "center"`.
   `chordStartX` is computed as `colCenter - chordWidth/2`; the highlight should be further
   right by `leadingSpaceWidth`. (Will fail on unfixed code)

4. **No leading spaces (baseline)**: Input `cline = "Am   G"`. Highlight should start at
   `chordStartX`. Should pass on both unfixed and fixed code — confirms baseline is
   unaffected.

**Expected Counterexamples:**
- Highlight pills drawn starting at `chordStartX` rather than
  `chordStartX + leadingSpaceWidth` for all inputs with leading spaces.

---

### Fix Checking

**Goal:** Verify that for all inputs where `isBugCondition(cline)` holds, the fixed
function draws highlights at the correct offset position.

**Pseudocode:**
```
FOR ALL cline WHERE isBugCondition(cline) DO
  canvas := buildSingleCanvas_fixed({ chords containing cline, showChordBg: true, ... })
  leadingW := measureText(leadingSpaces(cline)).width
  ASSERT pixel at (chordStartX + leadingW) IS highlight color
  ASSERT pixel at (chordStartX)            IS NOT highlight color  // when leadingW > 0
END FOR
```

---

### Preservation Checking

**Goal:** Verify that for all inputs where `isBugCondition(cline)` is false, the fixed
function produces pixel-identical output to the original.

**Pseudocode:**
```
FOR ALL cline WHERE NOT isBugCondition(cline) DO
  ASSERT buildSingleCanvas_original(input) pixels = buildSingleCanvas_fixed(input) pixels
END FOR
```

**Testing Approach:** Property-based testing is the right tool here because:
- The space of non-buggy chord strings is large (any string with no leading spaces).
- Manually enumerating edge cases is error-prone; PBT generates them automatically.
- Strong pixel-equality guarantees are only achievable across a wide random sample.

**Test Cases:**

1. **No leading spaces preservation**: Generate random chord strings with no leading
   spaces — verify highlight positions are unchanged by the fix.
2. **`showChordBg = false` preservation**: Any chord string with highlights disabled —
   verify nothing is drawn at the highlight layer regardless of leading spaces.
3. **Trailing/inter-token spaces only**: Strings like `"Am   G  "` — verify first token
   highlight still starts at `chordStartX`, same as before.
4. **Empty chord line**: `cline = ""` — verify no highlight is drawn (the `cline.trim()`
   guard skips the block entirely).

---

### Unit Tests

- Render `buildSingleCanvas` with a chord containing 3 leading spaces; assert highlight
  `rectX` equals `chordStartX + measuredLeadingWidth - bgPadding`.
- Render with a chord containing 0 leading spaces; assert highlight `rectX` equals
  `chordStartX - bgPadding` (unchanged from current behavior).
- Render with `showChordBg = false` and leading spaces; assert no highlight pixels are
  drawn and chord text still renders at the correct x position.
- Render two-column layout with leading-space chords in both columns; assert each column's
  highlights are offset from their respective `colLeft` values independently.
- Render center-aligned layout with leading-space chords; assert highlights are offset from
  the centered `chordStartX`, not from `colLeft`.

### Property-Based Tests

- Generate random non-empty chord strings with no leading spaces (property: highlight
  start x equals `chordStartX`; verifies preservation for the common case).
- Generate random chord strings with varying numbers of leading spaces (1–20); property:
  highlight start x equals `chordStartX + ctx.measureText(leadingSpaces).width`.
- Generate random combinations of `bgPadding`, `bgRadius`, `bgOpacity` with leading-space
  chords; property: only the x-position changes relative to today, all other rect
  dimensions stay the same.

### Integration Tests

- Open the Preview modal with a song that has manually-spaced chords; visually confirm
  highlight pills sit directly behind the chord tokens in both left and center alignment.
- Export as PNG and JPG; confirm the exported image shows the same correct alignment.
- Switch between 1-column and 2-column layouts; confirm alignment is correct in both.
- Adjust typography and spacing controls while the modal is open; confirm every re-render
  applies the offset correctly (no inconsistency across re-renders).
