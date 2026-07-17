import { useEffect } from "react";
import { isSectionLabel } from "../utils/sectionHelpers.js";

export function useChordRealignment({
  lines,
  chords,
  setChords,
  prevLinesRef,
  chordsRef,
  clearedBackupRef,
}) {
  useEffect(() => {
    const prevLines = prevLinesRef.current;
    const currentLines = lines;

    // If prevLines is null (first run), just store and return
    if (prevLines === null) {
      prevLinesRef.current = currentLines;
      return;
    }

    // 👇 NEW: If the current lines exactly match the snapshot we took
    // right before the last time chords were dropped or shifted, restore
    // that snapshot's chords directly. This is what makes Ctrl+Z work:
    // native textarea undo only restores the *text*, it knows nothing
    // about our separate chords state, and a chord that's already been
    // dropped (because its line was deleted) can't be reconstructed from
    // the lines alone — it has to come from a backup taken beforehand.
    // This single check covers both "undo a full clear" and "undo a
    // block delete", so the old clear-specific check further down is
    // now redundant and has been removed.
    if (
      clearedBackupRef.current &&
      currentLines.length === clearedBackupRef.current.lines.length &&
      currentLines.every((l, i) => l === clearedBackupRef.current.lines[i])
    ) {
      setChords(clearedBackupRef.current.chords);
      clearedBackupRef.current = null;
      prevLinesRef.current = currentLines;
      return;
    }

    // If lyrics are completely empty, clear all chords
    if (currentLines.length === 1 && currentLines[0] === "") {
      if (Object.keys(chords).length > 0) {
        clearedBackupRef.current = {
          lines: prevLines,
          chords: chordsRef.current,
        };
        setChords({});
      }
      prevLinesRef.current = currentLines;
      return;
    }

    // Going from empty to non-empty
    if (prevLines.length > 0 && currentLines.length > 0) {
      const prevEmpty = prevLines.length === 1 && prevLines[0] === "";
      const currentEmpty = currentLines.length === 1 && currentLines[0] === "";

      if (prevEmpty && !currentEmpty) {
        if (Object.keys(chords).length > 0) {
          prevLinesRef.current = currentLines;
          return;
        }
        setChords({});
        clearedBackupRef.current = null;
        prevLinesRef.current = currentLines;
        return;
      }
    }

    // 🔥 NEW: Check if lines were only edited, not inserted/deleted
    const sameLength = prevLines.length === currentLines.length;

    // If same length and only edited (no insert/delete), preserve chords exactly
    if (sameLength) {
      let same = true;
      for (let i = 0; i < prevLines.length; i++) {
        if (prevLines[i] !== currentLines[i]) {
          same = false;
          break;
        }
      }
      // If nothing changed, just update ref and return
      if (same) {
        prevLinesRef.current = currentLines;
        return;
      }

      // 🔥 NEW: If length is same and only edited (no insert/delete), keep chords as-is
      // Don't re-shift or realign anything
      prevLinesRef.current = currentLines;
      return;
    }

    // If we get here, the number of lines changed (insert or delete).
    // 👇 NEW: snapshot the chords exactly as they stand right now, before
    // we shift/drop anything below. If the user immediately undoes this
    // change (lines come back to match `prevLines` exactly), the check
    // at the top of this effect will restore this snapshot verbatim.
    clearedBackupRef.current = {
      lines: prevLines,
      chords: chordsRef.current,
    };

    // Realign chords based on diff
    setChords((prevChords) => {
      const oldLines = prevLines;
      const newLines = currentLines;
      const oldLen = oldLines.length;
      const newLen = newLines.length;

      if (oldLen === 0 || (oldLen === 1 && oldLines[0] === "")) {
        return {};
      }

      // Find the length of the matching prefix (lines untouched at the
      // start)...
      let prefixLen = 0;
      while (
        prefixLen < oldLen &&
        prefixLen < newLen &&
        oldLines[prefixLen] === newLines[prefixLen]
      ) {
        prefixLen++;
      }

      // ...and the length of the matching suffix (lines untouched at
      // the end), capped so it never overlaps the prefix we already
      // matched. Together these isolate exactly which block of lines
      // was actually inserted or removed in the middle — instead of
      // assuming everything after the first difference just shifted
      // by a constant amount, which is what silently relocated a
      // deleted line's chord onto its neighbor before.
      let suffixLen = 0;
      const maxSuffix = Math.min(oldLen, newLen) - prefixLen;
      while (
        suffixLen < maxSuffix &&
        oldLines[oldLen - 1 - suffixLen] === newLines[newLen - 1 - suffixLen]
      ) {
        suffixLen++;
      }

      const oldMiddleStart = prefixLen;
      const oldMiddleEnd = oldLen - suffixLen; // exclusive
      const shift = newLen - oldLen;

      const newChords = {};
      Object.keys(prevChords).forEach((key) => {
        const idx = Number(key);
        if (idx < oldMiddleStart) {
          // Before the changed block — untouched.
          newChords[idx] = prevChords[key];
        } else if (idx >= oldMiddleEnd) {
          // After the changed block — shift by however many lines
          // were added/removed.
          const newIdx = idx + shift;
          if (newIdx >= 0 && newIdx < newLen) {
            newChords[newIdx] = prevChords[key];
          }
        }
        // Otherwise idx falls inside the block of lines that was
        // actually inserted/deleted, so its chord has no valid home
        // and is dropped instead of leaking onto a neighboring line.
      });

      const cleaned = {};
      Object.keys(newChords).forEach((key) => {
        const idx = parseInt(key, 10);
        if (idx < newLines.length && !isSectionLabel(newLines[idx])) {
          cleaned[idx] = newChords[idx];
        }
      });
      return cleaned;
    });

    prevLinesRef.current = currentLines;
  }, [lines]);
}
