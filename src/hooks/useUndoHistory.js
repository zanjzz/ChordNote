// src/hooks/useUndoHistory.js
import { useRef, useCallback } from "react";

// Maximum snapshots kept. 100 steps ≈ 200–400 KB RAM for a typical song.
const MAX_HISTORY = 100;

// Milliseconds to wait after the last change before committing a snapshot.
// Rapid keystrokes are collapsed into one undo step instead of one per char.
const DEBOUNCE_MS = 400;

/**   
 * Undo/redo for { lyrics, chords } content.
 *
 * @param {React.MutableRefObject<boolean>} isRestoringRef
 *   A ref shared with useChordRealignment. Set to true while restoring state
 *   so the realignment hook skips processing during that render cycle,
 *   preventing it from overwriting the just-restored chords.
 *
 * Returns:
 *   pushSnapshot({ lyrics, chords }) — call on every content change (debounced)
 *   flushSnapshot()                  — commit immediately before discrete actions
 *   undo(lyrics, chords, setLyrics, setChords)
 *   redo(lyrics, chords, setLyrics, setChords)
 *   clearHistory()                   — call after load/import/clear
 *   canUndo()                        — boolean, check inside event handlers only
 *   canRedo()
 */
export function useUndoHistory(isRestoringRef) {
  // past[last] is the most recent snapshot before the current live state.
  const pastRef = useRef([]);
  const futureRef = useRef([]);

  // The most recently scheduled (but possibly not yet committed) snapshot.
  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  // The snapshot that was last committed — used to skip no-op pushes.
  const lastCommittedRef = useRef(null);

  const commit = useCallback(() => {
    const snap = pendingRef.current;
    if (!snap) return;

    // Consume the pending snapshot so a subsequent commit() call
    // (e.g. from flushSnapshot inside undo) doesn't re-push it.
    pendingRef.current = null;

    const prev = lastCommittedRef.current;
    if (prev && prev.lyrics === snap.lyrics && prev.chords === snap.chords) {
      return; // nothing actually changed
    }

    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), snap];
    futureRef.current = [];
    lastCommittedRef.current = snap;
  }, []);

  /** Schedule a snapshot. Debounced — safe to call on every keystroke. */
  const pushSnapshot = useCallback(
    (snap) => {
      // Clear the redo stack immediately when new content arrives so that
      // a redo can never restore an abandoned branch — even before the
      // debounce timer fires and commits the snapshot.
      futureRef.current = [];
      pendingRef.current = snap;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(commit, DEBOUNCE_MS);
    },
    [commit],
  );

  /** Flush any pending snapshot immediately. Call before discrete actions. */
  const flushSnapshot = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    commit();
  }, [commit]);

  const undo = useCallback(
    (currentLyrics, currentChords, setLyrics, setChords) => {
      flushSnapshot();
      if (pastRef.current.length === 0) return;

      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);

      futureRef.current = [
        { lyrics: currentLyrics, chords: currentChords },
        ...futureRef.current,
      ];

      // Signal realignment to stand down for this restoration.
      isRestoringRef.current = true;
      setLyrics(previous.lyrics);
      setChords(previous.chords);
      // Reset flag after React has had one tick to process the state updates.
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 0);

      lastCommittedRef.current = previous;
    },
    [flushSnapshot, isRestoringRef],
  );

  const redo = useCallback(
    (currentLyrics, currentChords, setLyrics, setChords) => {
      if (futureRef.current.length === 0) return;

      const next = futureRef.current[0];
      futureRef.current = futureRef.current.slice(1);

      pastRef.current = [
        ...pastRef.current,
        { lyrics: currentLyrics, chords: currentChords },
      ];

      isRestoringRef.current = true;
      setLyrics(next.lyrics);
      setChords(next.chords);
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 0);

      lastCommittedRef.current = next;
    },
    [isRestoringRef],
  );

  /** Clear both stacks — call after load song / import / clear. */
  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    pendingRef.current = null;
    lastCommittedRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const canUndo = () => pastRef.current.length > 0;
  const canRedo = () => futureRef.current.length > 0;

  return { pushSnapshot, flushSnapshot, undo, redo, clearHistory, canUndo, canRedo };
}
