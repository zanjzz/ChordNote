# Bugfix Requirements Document

## Introduction

When a user manually adds spaces to the left side of a chord in the Chords Panel
(to align a chord over a specific word in the lyric), the chord highlight
(background pill/box drawn behind each chord token) appears shifted to the left
relative to the actual chord text in both the Preview modal canvas and exported
output. The highlight starts at the left edge of the column, while the chord text
starts further right — offset by exactly the width of the leading spaces the user
added. The chord text itself is always drawn correctly; only the highlight
positions are wrong.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a chord string stored for a lyric line contains one or more leading
space characters (e.g., `"   Am   G"`) THEN the system draws each chord's
highlight box starting at the column's left edge (`colLeft`), ignoring the
leading-space offset, so every highlight is shifted left relative to the chord
text it is meant to underlay.

1.2 WHEN multiple chords exist on the same lyric line and the chord string has
leading spaces THEN the system draws all highlight boxes shifted left by the same
pixel amount (the measured width of the leading spaces), causing every highlight
on that line to be misaligned from its corresponding chord token.

1.3 WHEN a chord string has no leading spaces THEN the system draws highlight
boxes correctly aligned with the chord text, confirming that the bug only
manifests when leading spaces are present.

1.4 WHEN the canvas is exported as PNG, JPG, or PDF THEN the system produces the
same misaligned highlight positions as the Preview modal, because the same
`buildSingleCanvas` rendering path is used for all output.

### Expected Behavior (Correct)

2.1 WHEN a chord string stored for a lyric line contains one or more leading
space characters THEN the system SHALL calculate the pixel width of those leading
spaces and offset the initial highlight-drawing cursor (`currentX`) by that amount
before drawing any chord token's highlight box, so the first highlight aligns with
the first visible chord token.

2.2 WHEN multiple chords exist on the same lyric line and the chord string has
leading spaces THEN the system SHALL apply the leading-space offset to the initial
`currentX` value only, and continue advancing `currentX` by each token's width
plus its trailing inter-token spacing as before, so every highlight on that line
aligns with its corresponding chord token.

2.3 WHEN a chord string has no leading spaces THEN the system SHALL CONTINUE TO
draw highlight boxes at the column's left edge, unchanged from the current
correct behavior.

2.4 WHEN the canvas is exported as PNG, JPG, or PDF THEN the system SHALL produce
highlight positions that are correctly aligned with the chord text in all output
formats, because the fix is applied in the shared `buildSingleCanvas` rendering
path.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a chord string has no leading spaces (standard case) THEN the system
SHALL CONTINUE TO render chord highlight boxes correctly aligned with each chord
token, with no change in visual output.

3.2 WHEN a chord string has trailing spaces or only inter-token spaces (spaces
between chords, but no leading spaces) THEN the system SHALL CONTINUE TO render
chord highlight boxes correctly aligned, with no change in visual output.

3.3 WHEN the chord highlight feature is disabled (`showChordBg = false`) THEN
the system SHALL CONTINUE TO skip drawing any highlight boxes entirely, with no
change in behavior.

3.4 WHEN a chord string has leading spaces but chord highlights are disabled
THEN the system SHALL CONTINUE TO draw the chord text at its correct
(leading-space-offset) position with no highlight drawn.

3.5 WHEN the layout uses center alignment THEN the system SHALL CONTINUE TO
center-align chord highlight boxes relative to the column center, with leading
spaces still correctly accounted for in the per-token horizontal position.

3.6 WHEN the layout uses two columns THEN the system SHALL CONTINUE TO draw
chord highlight boxes using each column's own `colLeft` reference, with leading
spaces correctly accounted for in both columns.

3.7 WHEN a chord line wraps across multiple canvas rows THEN the system SHALL
CONTINUE TO draw each wrapped chord row's highlight boxes at the correct
positions, accounting for leading spaces on the first row only (wrapped rows are
split at whitespace boundaries and do not carry leading spaces).

3.8 WHEN the user edits chord spacing in the Chords Panel (adding or removing
spaces on either side of a chord) THEN the system SHALL CONTINUE TO store the raw
chord string including those spaces, and the transposition, Nashville-number
conversion, and realignment logic SHALL CONTINUE TO operate on that raw string
unchanged.

3.9 WHEN the Preview modal is open and the user adjusts any typography or spacing
control THEN the system SHALL CONTINUE TO re-render the canvas correctly, with the
highlight alignment fix applied consistently on every re-render.
