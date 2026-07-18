import { useState, useRef, useCallback, useEffect } from "react";

// Drives a panel's height via pointer drag instead of native CSS resize.
// Native resize handles are tiny corner triangles — hard to grab on
// touch, and in this app they were also getting fought by a mobile
// !important height rule. This hook drives height from JS state, so a
// full-width bottom bar can control it directly on any device.
export function useResizableHeight(
  initialHeight,
  { min = 150, max = 2000 } = {},
) {
  const [height, setHeight] = useState(initialHeight);
  const startYRef = useRef(0);
  const startHeightRef = useRef(initialHeight);
  const draggingRef = useRef(false);

  const handleMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      if (e.cancelable) e.preventDefault();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = clientY - startYRef.current;
      setHeight(Math.min(max, Math.max(min, startHeightRef.current + delta)));
    },
    [min, max],
  );

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("touchmove", handleMove);
    window.removeEventListener("touchend", stopDragging);
  }, [handleMove]);

  const startDragging = useCallback(
    (e) => {
      draggingRef.current = true;
      startYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
      startHeightRef.current = height;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", stopDragging);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", stopDragging);
      if (e.cancelable) e.preventDefault();
    },
    [height, handleMove, stopDragging],
  );

  useEffect(() => stopDragging, [stopDragging]); // cleanup on unmount

  return { height, startDragging };
}
