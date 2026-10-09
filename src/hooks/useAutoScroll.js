// src/hooks/useAutoScroll.js
import { useState, useRef, useEffect, useCallback } from "react";

// Fixed set of speed multipliers the user steps through with +/-.
export const SPEED_STEPS = [
  0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4,
];

// Index of the "1.00x" step — used as the default starting speed.
const DEFAULT_SPEED_INDEX = SPEED_STEPS.indexOf(1);

// Scroll rate, in px/sec, at the 1.00x step. Every other step is a
// multiple of this.
const BASE_PX_PER_SEC_AT_1X = 30;

// Cap on a single frame's delta time. Without this, a dropped/backgrounded
// frame (tab switch, GC pause, etc.) produces one oversized dt and the
// scroll visibly jumps instead of gliding. 100ms is generous enough to
// never clip a normal frame (which is ~16ms at 60fps).
const MAX_DT_SECONDS = 0.1;

// How far the real (browser-rounded) scrollTop is allowed to drift from
// the last value we ourselves wrote before we treat it as a manual scroll.
// Browsers round scrollTop to a whole (sometimes device-)pixel, so this
// has to be big enough to absorb that rounding noise or every frame would
// falsely look like a manual scroll and reset our sub-pixel progress.
const MANUAL_SCROLL_DRIFT_PX = 1.5;

/**
 * Smoothly auto-scrolls a scrollable element (a div or textarea) at a
 * user-controlled speed, using requestAnimationFrame so it stays smooth
 * regardless of frame rate.
 *
 * - Only runs while `active` is true (i.e. panel is in focused/modal view).
 * - Tracks scroll position with an internal float accumulator rather than
 *   reading the element's scrollTop back each frame — scrollTop is rounded
 *   to a whole pixel by the browser, so at slow speeds (sub-1px-per-frame)
 *   reading it back would throw away all the fractional progress and the
 *   scroll would appear to never move. The accumulator preserves that
 *   sub-pixel progress across frames so slow speeds are still smooth.
 * - Detects manual scrolling (wheel/touch/drag) by comparing the element's
 *   actual scrollTop to the value WE last wrote (not the raw accumulator —
 *   see MANUAL_SCROLL_DRIFT_PX), and resyncs to it — so the user can scroll
 *   by hand without autoplay fighting them, and it picks back up from
 *   wherever they left it.
 * - Clamps per-frame dt so a dropped/backgrounded frame can't produce a
 *   single oversized scroll jump.
 * - Stops and resets scroll position when `active` becomes false.
 */
export function useAutoScroll(scrollRef, { active }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const accumRef = useRef(0);
  const lastWrittenRef = useRef(null);

  const speed = SPEED_STEPS[speedIndex];
  const speedLabel = `${speed.toFixed(2)}x`;

  const toggle = useCallback(() => setIsPlaying((p) => !p), []);
  const stop = useCallback(() => setIsPlaying(false), []);

  const increaseSpeed = useCallback(() => {
    setSpeedIndex((i) => Math.min(SPEED_STEPS.length - 1, i + 1));
  }, []);

  const decreaseSpeed = useCallback(() => {
    setSpeedIndex((i) => Math.max(0, i - 1));
  }, []);

  // Stop + reset scroll position whenever the panel leaves focused view.
  useEffect(() => {
    if (!active) {
      setIsPlaying(false);
      lastTsRef.current = null;
      accumRef.current = 0;
      lastWrittenRef.current = null;
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // The actual scroll loop.
  useEffect(() => {
    if (!active || !isPlaying) {
      lastTsRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return undefined;
    }

    const step = (ts) => {
      const el = scrollRef.current;
      if (!el) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      if (lastTsRef.current == null) {
        // First frame of this play session — sync the accumulator to
        // wherever the element currently is (e.g. after a manual scroll
        // that happened while paused) before we start adding to it.
        lastTsRef.current = ts;
        accumRef.current = el.scrollTop;
        lastWrittenRef.current = el.scrollTop;
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const dtSeconds = Math.min(
        (ts - lastTsRef.current) / 1000,
        MAX_DT_SECONDS,
      );
      lastTsRef.current = ts;

      const maxScrollTop = el.scrollHeight - el.clientHeight;
      if (maxScrollTop <= 0) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      // If the element's real scrollTop has drifted from the value WE
      // last wrote by more than rounding noise, the user scrolled
      // manually — resync so autoplay continues from there instead of
      // yanking them back.
      if (
        lastWrittenRef.current != null &&
        Math.abs(el.scrollTop - lastWrittenRef.current) > MANUAL_SCROLL_DRIFT_PX
      ) {
        accumRef.current = el.scrollTop;
      }

      const pxPerSecond = BASE_PX_PER_SEC_AT_1X * speed;
      accumRef.current += pxPerSecond * dtSeconds;

      if (accumRef.current >= maxScrollTop) {
        accumRef.current = maxScrollTop;
        el.scrollTop = maxScrollTop;
        lastWrittenRef.current = el.scrollTop;
        setIsPlaying(false); // reached the end — pause automatically
        return;
      }

      // Write the accumulated position. We keep the exact float in
      // accumRef across frames (so slow speeds don't lose sub-pixel
      // progress), and let the browser round scrollTop as it will. We store
      // our INTENDED float in lastWrittenRef — not the rounded read-back —
      // so the manual-scroll drift check compares like-for-like and doesn't
      // false-trigger from the browser's own rounding (which was stalling
      // playback at slow speeds).
      el.scrollTop = accumRef.current;
      lastWrittenRef.current = accumRef.current;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [active, isPlaying, speed, scrollRef]);

  return {
    isPlaying,
    toggle,
    stop,
    speed,
    speedLabel,
    increaseSpeed,
    decreaseSpeed,
    canIncrease: speedIndex < SPEED_STEPS.length - 1,
    canDecrease: speedIndex > 0,
  };
}
