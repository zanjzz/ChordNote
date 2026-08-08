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

    // First run: just store the initial lines
    if (prevLines === null) {
      prevLinesRef.current = currentLines;
      return;
    }

    // Restore from backup if the lyrics were cleared and then restored exactly
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

    // If lyrics become empty, clear all chords and backup the previous state
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

    // Detect transition from empty to non-empty
    if (prevLines.length > 0 && currentLines.length > 0) {
      const prevEmpty = prevLines.length === 1 && prevLines[0] === "";
      const currentEmpty = currentLines.length === 1 && currentLines[0] === "";

      if (prevEmpty && !currentEmpty) {
        // If we already have chords (restored from backup), keep them
        if (Object.keys(chords).length > 0) {
          prevLinesRef.current = currentLines;
          return;
        }
        // Otherwise start fresh
        setChords({});
        clearedBackupRef.current = null;
        prevLinesRef.current = currentLines;
        return;
      }
    }

    const sameLength = prevLines.length === currentLines.length;

    // If line count is unchanged and no edits, just update reference
    if (sameLength) {
      let same = true;
      for (let i = 0; i < prevLines.length; i++) {
        if (prevLines[i] !== currentLines[i]) {
          same = false;
          break;
        }
      }
      if (same) {
        prevLinesRef.current = currentLines;
        return;
      }

      prevLinesRef.current = currentLines;
      return;
    }

    // Backup the current chords before realignment
    clearedBackupRef.current = {
      lines: prevLines,
      chords: chordsRef.current,
    };

    // Realign chords when lines are inserted or deleted
    setChords((prevChords) => {
      const oldLines = prevLines;
      const newLines = currentLines;
      const oldLen = oldLines.length;
      const newLen = newLines.length;

      if (oldLen === 0 || (oldLen === 1 && oldLines[0] === "")) {
        return {};
      }

      // Find the matching prefix (unchanged lines at the start)
      let prefixLen = 0;
      while (
        prefixLen < oldLen &&
        prefixLen < newLen &&
        oldLines[prefixLen] === newLines[prefixLen]
      ) {
        prefixLen++;
      }

      // Find the matching suffix (unchanged lines at the end)
      let suffixLen = 0;
      const maxSuffix = Math.min(oldLen, newLen) - prefixLen;
      while (
        suffixLen < maxSuffix &&
        oldLines[oldLen - 1 - suffixLen] === newLines[newLen - 1 - suffixLen]
      ) {
        suffixLen++;
      }

      const oldMiddleStart = prefixLen;
      const oldMiddleEnd = oldLen - suffixLen;
      const shift = newLen - oldLen;

      const newChords = {};

      // Preserve chords that belong to unchanged regions
      Object.keys(prevChords).forEach((key) => {
        const idx = Number(key);
        if (idx < oldMiddleStart) {
          // Before the changed block - keep as-is
          newChords[idx] = prevChords[key];
        } else if (idx >= oldMiddleEnd) {
          // After the changed block - shift by net line change
          const newIdx = idx + shift;
          if (newIdx >= 0 && newIdx < newLen) {
            newChords[newIdx] = prevChords[key];
          }
        }
        // Chords inside the changed block are dropped
      });

      // Remove chords that now sit on section labels
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
